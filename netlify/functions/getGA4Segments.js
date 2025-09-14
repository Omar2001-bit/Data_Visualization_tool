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
      console.log('Missing GA4 credentials, returning default segments');
      
      // Return default segments if credentials are missing
      const defaultSegments = [
        'All Users',
        'New Users',
        'Returning Users',
        'Mobile Users',
        'Desktop Users',
        'Tablet Users',
        'Organic Traffic',
        'Paid Traffic',
        'Direct Traffic',
        'Social Traffic',
        'Email Traffic',
        'Referral Traffic',
        'Converters',
        'Non-Converters',
        'High Value Users',
        'Engaged Users'
      ];

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(defaultSegments),
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

    console.log('Fetching segments for property:', propertyId);

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

    try {
      // Fetch custom segments using GA4 Management API
      console.log('Fetching custom segments from GA4 Management API...');
      
      const segments = [];
      
      // Initialize the GA4 client for data queries
      const analyticsDataClient = new BetaAnalyticsDataClient({
        credentials: {
          client_email: GOOGLE_CLIENT_EMAIL,
          private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        },
        projectId: 'your-project-id',
      });

      // First, try to fetch custom segments from GA4 Admin API
      try {
        console.log('Attempting to fetch custom segments from Admin API...');
        
        const adminApiUrl = `https://analyticsadmin.googleapis.com/v1beta/properties/${propertyId}/customDimensions`;
        
        const customDimensionsResponse = await fetch(adminApiUrl, {
          headers: {
            'Authorization': `Bearer ${await authClient.getAccessToken()}`,
            'Content-Type': 'application/json',
          },
        });

        if (customDimensionsResponse.ok) {
          const customDimensionsData = await customDimensionsResponse.json();
          console.log('Custom dimensions response:', customDimensionsData);
          
          if (customDimensionsData.customDimensions && customDimensionsData.customDimensions.length > 0) {
            customDimensionsData.customDimensions.forEach(dimension => {
              if (dimension.displayName) {
                segments.push(`Custom: ${dimension.displayName}`);
              }
            });
          }
        }
        
        // Also try to fetch custom metrics that could be used for segmentation
        const customMetricsUrl = `https://analyticsadmin.googleapis.com/v1beta/properties/${propertyId}/customMetrics`;
        
        const customMetricsResponse = await fetch(customMetricsUrl, {
          headers: {
            'Authorization': `Bearer ${await authClient.getAccessToken()}`,
            'Content-Type': 'application/json',
          },
        });

        if (customMetricsResponse.ok) {
          const customMetricsData = await customMetricsResponse.json();
          console.log('Custom metrics response:', customMetricsData);
          
          if (customMetricsData.customMetrics && customMetricsData.customMetrics.length > 0) {
            customMetricsData.customMetrics.forEach(metric => {
              if (metric.displayName) {
                segments.push(`Custom Metric: ${metric.displayName}`);
              }
            });
          }
        }
        
      } catch (adminError) {
        console.warn('Failed to fetch custom dimensions/metrics:', adminError.message);
      }

      // Query standard dimensions to create segments
      const standardDimensions = [
        'userType', 'deviceCategory', 'sessionDefaultChannelGroup', 'country', 
        'city', 'operatingSystem', 'browser', 'newVsReturning', 'userAgeBracket', 
        'userGender', 'language', 'source', 'medium', 'campaign'
      ];

      for (const dimension of standardDimensions) {
        try {
          console.log(`Querying dimension: ${dimension}`);
          
          const [response] = await analyticsDataClient.runReport({
            property: `properties/${propertyId}`,
            dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
            dimensions: [{ name: dimension }],
            metrics: [{ name: 'activeUsers' }],
            limit: 10,
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
                  let segmentName = createSegmentName(dimension, value);
                  
                  if (segmentName && !segments.includes(segmentName)) {
                    segments.push(segmentName);
                  }
                }
              }
            });
          }
        } catch (dimensionError) {
          console.warn(`Failed to query dimension ${dimension}:`, dimensionError.message);
        }
      }

      // Add default segments
      const defaultSegments = ['All Users', 'New Users', 'Returning Users'];
      defaultSegments.forEach(segment => {
        if (!segments.includes(segment)) {
          segments.unshift(segment); // Add to beginning
        }
      });

      console.log('Final segments list:', segments);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(segments),
      };

    } catch (apiError) {
      console.warn('GA4 API call failed, returning default segments:', apiError.message);
      
      // Return default segments if API call fails
      const defaultSegments = [
        'All Users',
        'New Users',
        'Returning Users',
        'Mobile Users',
        'Desktop Users',
        'Tablet Users',
        'Organic Traffic',
        'Paid Traffic',
        'Direct Traffic',
        'Social Traffic',
        'Email Traffic',
        'Referral Traffic',
        'Converters',
        'Non-Converters',
        'High Value Users',
        'Engaged Users'
      ];

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(defaultSegments),
      };
    }

  } catch (error) {
    console.error('GA4 Segments API Error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to fetch GA4 segments',
        details: error.message 
      }),
    };
  }
};

function createSegmentName(dimension, value) {
  switch (dimension) {
    case 'userType':
      return value === 'new' ? 'New Users' : 'Returning Users';
    case 'deviceCategory':
      return `${value.charAt(0).toUpperCase() + value.slice(1)} Users`;
    case 'sessionDefaultChannelGroup':
      return `${value} Traffic`;
    case 'newVsReturning':
      return value === 'new' ? 'New Visitors' : 'Returning Visitors';
    case 'userAgeBracket':
      return `Age ${value}`;
    case 'userGender':
      return `${value.charAt(0).toUpperCase() + value.slice(1)} Users`;
    case 'country':
      return `Users from ${value}`;
    case 'city':
      return `Users from ${value}`;
    case 'operatingSystem':
      return `${value} Users`;
    case 'browser':
      return `${value} Users`;
    case 'language':
      return `${value} Language Users`;
    case 'source':
      return `Traffic from ${value}`;
    case 'medium':
      return `${value} Medium Traffic`;
    case 'campaign':
      return `Campaign: ${value}`;
    default:
      return `${dimension}: ${value}`;
  }
}