const { BetaAnalyticsDataClient } = require('@google-analytics/data');
const { GoogleAuth } = require('google-auth-library');

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Get environment variables from Netlify
    const {
      GOOGLE_CLIENT_EMAIL,
      GOOGLE_PRIVATE_KEY
    } = process.env;

    // Validate required environment variables
    if (!GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY) {
      console.log('Missing GA4 credentials, returning default audiences');
      
      // Return default audiences if credentials are missing
      const defaultAudiences = [
        'All Users',
        'Purchasers',
        'Cart Abandoners',
        'Frequent Visitors',
        'New Visitors',
        'Returning Visitors',
        'High Value Customers',
        'Mobile Users',
        'Desktop Users',
        'Tablet Users'
      ];

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(defaultAudiences),
      };
    }

    const propertyId = event.queryStringParameters?.propertyId;
    if (!propertyId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Property ID is required' }),
      };
    }

    console.log('Fetching audiences for property:', propertyId);

    // Initialize Google Auth
    const auth = new GoogleAuth({
      credentials: {
        client_email: GOOGLE_CLIENT_EMAIL,
        private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: [
        'https://www.googleapis.com/auth/analytics.readonly',
        'https://www.googleapis.com/auth/analytics.manage.users.readonly'
      ],
    });

    const authClient = await auth.getClient();
    const audiences = ['All Users']; // Always include this

    try {
      // Fetch custom audiences using GA4 Admin API
      console.log('Fetching custom audiences from GA4 Admin API...');
      
      // Try multiple API endpoints to get comprehensive audience data
      const apiEndpoints = [
        `https://analyticsadmin.googleapis.com/v1beta/properties/${propertyId}/audiences`,
        `https://analyticsadmin.googleapis.com/v1alpha/properties/${propertyId}/audiences`
      ];
      
      const accessToken = await authClient.getAccessToken();
      console.log('Got access token for Admin API');
      
      // Try each API endpoint
      for (const apiUrl of apiEndpoints) {
        try {
          console.log(`Trying API endpoint: ${apiUrl}`);
          
          const audienceResponse = await fetch(apiUrl, {
            headers: {
              'Authorization': `Bearer ${accessToken.token}`,
              'Content-Type': 'application/json',
            },
          });

          console.log(`API response status for ${apiUrl}:`, audienceResponse.status);

          if (audienceResponse.ok) {
            const audienceData = await audienceResponse.json();
            console.log('Custom audiences response:', JSON.stringify(audienceData, null, 2));
            
            if (audienceData.audiences && audienceData.audiences.length > 0) {
              console.log(`Found ${audienceData.audiences.length} custom audiences from ${apiUrl}`);
              
              audienceData.audiences.forEach(audience => {
                if (audience.displayName && !audiences.includes(audience.displayName)) {
                  console.log(`Adding custom audience: ${audience.displayName}`);
                  audiences.push(audience.displayName);
                }
              });
              
              // If we found audiences, break out of the loop
              if (audienceData.audiences.length > 0) {
                break;
              }
            }
          } else {
            const errorText = await audienceResponse.text();
            console.warn(`Failed to fetch from ${apiUrl}:`, audienceResponse.status, audienceResponse.statusText, errorText);
          }
        } catch (endpointError) {
          console.warn(`Error with endpoint ${apiUrl}:`, endpointError.message);
        }
      }
      
      // Also try to get audience insights from the Data API
      console.log('Attempting to discover audiences through Data API cohort analysis...');
      
      try {
        const cohortResponse = await analyticsDataClient.runReport({
          property: `properties/${propertyId}`,
          dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
          dimensions: [{ name: 'cohort' }],
          metrics: [{ name: 'activeUsers' }],
          limit: 20,
          orderBys: [
            {
              metric: {
                metricName: 'activeUsers'
              },
              desc: true
            }
          ]
        });
        
        if (cohortResponse[0].rows && cohortResponse[0].rows.length > 0) {
          cohortResponse[0].rows.forEach(row => {
            if (row.dimensionValues && row.dimensionValues[0]) {
              const cohortValue = row.dimensionValues[0].value;
              if (cohortValue && cohortValue !== '(not set)' && cohortValue !== '(not provided)') {
                const audienceName = `Cohort: ${cohortValue}`;
                if (!audiences.includes(audienceName)) {
                  audiences.push(audienceName);
                }
              }
            }
          });
        }
      } catch (cohortError) {
        console.warn('Failed to fetch cohort data:', cohortError.message);
      }

      // Also try to get audiences through the Data API by querying cohort data
      console.log('Attempting to discover audiences through Data API...');
      
      const analyticsDataClient = new BetaAnalyticsDataClient({
        credentials: {
          client_email: GOOGLE_CLIENT_EMAIL,
          private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        },
        projectId: 'your-project-id',
      });

      // Query various dimensions that might represent audience segments
      const audienceQueries = [
        { dimension: 'cohort', name: 'Cohort' },
        { dimension: 'userAgeBracket', name: 'Age Group' },
        { dimension: 'userGender', name: 'Gender' },
        { dimension: 'interests', name: 'Interest' },
        { dimension: 'brandingInterest', name: 'Branding Interest' },
        { dimension: 'inMarketCategory', name: 'In-Market Category' },
        { dimension: 'lifetimeValue', name: 'Lifetime Value' },
        { dimension: 'country', name: 'Country' },
        { dimension: 'deviceCategory', name: 'Device' },
        { dimension: 'sessionDefaultChannelGroup', name: 'Channel' }
      ];

      for (const query of audienceQueries) {
        try {
          console.log(`Querying audience dimension: ${query.dimension}`);
          
          const [response] = await analyticsDataClient.runReport({
            property: `properties/${propertyId}`,
            dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
            dimensions: [{ name: query.dimension }],
            metrics: [{ name: 'activeUsers' }],
            limit: 15, // Limit to top 15 values per dimension
            orderBys: [
              {
                metric: {
                  metricName: 'activeUsers'
                },
                desc: true
              }
            ]
          });

          if (response.rows && response.rows.length > 0) {
            response.rows.forEach(row => {
              if (row.dimensionValues && row.dimensionValues[0]) {
                const value = row.dimensionValues[0].value;
                if (value && value !== '(not set)' && value !== '(not provided)' && value !== '(other)') {
                  let audienceName = '';
                  
                  // Create meaningful audience names based on dimension and value
                  switch (query.dimension) {
                    case 'userAgeBracket':
                      audienceName = `Age ${value}`;
                      break;
                    case 'userGender':
                      audienceName = `${value.charAt(0).toUpperCase() + value.slice(1)} Users`;
                      break;
                    case 'interests':
                      audienceName = `Interest: ${value}`;
                      break;
                    case 'brandingInterest':
                      audienceName = `Brand Interest: ${value}`;
                      break;
                    case 'inMarketCategory':
                      audienceName = `In-Market: ${value}`;
                      break;
                    case 'lifetimeValue':
                      audienceName = `LTV: ${value}`;
                      break;
                    case 'country':
                      audienceName = `Users from ${value}`;
                      break;
                    case 'deviceCategory':
                      audienceName = `${value.charAt(0).toUpperCase() + value.slice(1)} Users`;
                      break;
                    case 'sessionDefaultChannelGroup':
                      audienceName = `${value} Traffic`;
                      break;
                    case 'cohort':
                      audienceName = `Cohort: ${value}`;
                      break;
                    default:
                      audienceName = `${query.name}: ${value}`;
                  }
                  
                  if (audienceName && !audiences.includes(audienceName)) {
                    audiences.push(audienceName);
                  }
                }
              }
            });
          }
        } catch (dimensionError) {
          console.warn(`Failed to query audience dimension ${query.dimension}:`, dimensionError.message);
          // Continue with other dimensions
        }
      }

      // Add common predefined audiences that might not be captured above
      const commonAudiences = [
        'Purchasers',
        'Cart Abandoners',
        'Frequent Visitors',
        'New Visitors',
        'Returning Visitors',
        'High Value Customers',
        'Mobile App Users',
        'Newsletter Subscribers',
        'Blog Readers',
        'Product Page Viewers',
        'Category Browsers',
        'Search Users',
        'Video Watchers',
        'Download Users',
        'Contact Form Users',
        'Tech Enthusiasts',
        'Sports Fans',
        'Fashion Interested',
        'Travel Enthusiasts',
        'Engaged Users',
        'Converters',
        'Non-Converters'
      ];

      // Add common audiences that aren't already included
      commonAudiences.forEach(audience => {
        if (!audiences.includes(audience)) {
          audiences.push(audience);
        }
      });

      console.log('Final audiences list:', audiences);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(audiences),
      };

    } catch (apiError) {
      console.warn('GA4 API call failed, returning default audiences:', apiError.message);
      
      // Return default audiences if API call fails
      const defaultAudiences = [
        'All Users',
        'Purchasers',
        'Cart Abandoners',
        'Frequent Visitors',
        'New Visitors',
        'Returning Visitors',
        'High Value Customers',
        'Mobile Users',
        'Desktop Users',
        'Tablet Users',
        'Mobile App Users',
        'Newsletter Subscribers',
        'Blog Readers',
        'Product Page Viewers',
        'Category Browsers',
        'Search Users',
        'Video Watchers',
        'Download Users',
        'Contact Form Users',
        'Tech Enthusiasts',
        'Sports Fans',
        'Fashion Interested',
        'Travel Enthusiasts'
      ];

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(defaultAudiences),
      };
    }

  } catch (error) {
    console.error('GA4 Audiences API Error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to fetch GA4 audiences',
        details: error.message 
      }),
    };
  }
};