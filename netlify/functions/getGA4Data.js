const { BetaAnalyticsDataClient } = require('@google-analytics/data');

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

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
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
      GOOGLE_PRIVATE_KEY,
    } = process.env;

    // Validate required environment variables
    if (!GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY) {
      console.error('Missing required environment variables:', {
        hasClientEmail: !!GOOGLE_CLIENT_EMAIL,
        hasPrivateKey: !!GOOGLE_PRIVATE_KEY,
      });
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required GA4 credentials. Please configure GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY in Netlify environment variables.' 
        }),
      };
    }

    // Parse request body
    const requestBody = JSON.parse(event.body);
    const { propertyId, startDate, endDate, dimensions, metrics, segments = [], audiences = [] } = requestBody;

    // Validate request parameters
    if (!propertyId || !startDate || !endDate || !dimensions || !metrics) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required parameters: propertyId, startDate, endDate, dimensions, metrics' 
        }),
      };
    }

    console.log('GA4 Data Request:', {
      propertyId,
      startDate,
      endDate,
      dimensions,
      metrics,
      segments,
      audiences
    });

    // Initialize the GA4 client with credentials from environment variables
    const analyticsDataClient = new BetaAnalyticsDataClient({
      credentials: {
        client_email: GOOGLE_CLIENT_EMAIL,
        private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Handle escaped newlines
      },
      projectId: 'your-project-id', // This can be any string for service account auth
    });

    // Build the GA4 API request
    const reportRequest = {
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate,
          endDate,
        },
      ],
      dimensions: dimensions.map(name => ({ name })),
      metrics: metrics.map(name => ({ name })),
      orderBys: [
        {
          dimension: {
            dimensionName: 'date',
          },
        },
      ],
    };

    // Add dimension filters for segments if provided
    if (segments && segments.length > 0) {
      const segmentFilters = [];
      
      segments.forEach(segment => {
        // Map segment names to GA4 dimension filters
        if (segment === 'New Users') {
          segmentFilters.push({
            filter: {
              fieldName: 'newVsReturning',
              stringFilter: {
                matchType: 'EXACT',
                value: 'new'
              }
            }
          });
        } else if (segment === 'Returning Users') {
          segmentFilters.push({
            filter: {
              fieldName: 'newVsReturning',
              stringFilter: {
                matchType: 'EXACT',
                value: 'returning'
              }
            }
          });
        } else if (segment.includes('Users')) {
          // Handle device-based segments
          const deviceType = segment.replace(' Users', '').toLowerCase();
          if (['mobile', 'desktop', 'tablet'].includes(deviceType)) {
            segmentFilters.push({
              filter: {
                fieldName: 'deviceCategory',
                stringFilter: {
                  matchType: 'EXACT',
                  value: deviceType
                }
              }
            });
          }
        }
        // Add more segment mappings as needed
      });

      if (segmentFilters.length > 0) {
        if (segmentFilters.length === 1) {
          reportRequest.dimensionFilter = segmentFilters[0];
        } else {
          // Multiple segments - use OR logic
          reportRequest.dimensionFilter = {
            orGroup: {
              expressions: segmentFilters
            }
          };
        }
      }
    }

    console.log('Final GA4 API Request:', JSON.stringify(reportRequest, null, 2));

    // Make the GA4 API call
    const [response] = await analyticsDataClient.runReport(reportRequest);

    // Process the response
    const processedData = [];
    
    if (response.rows) {
      response.rows.forEach(row => {
        const dataPoint = {};
        
        // Add dimension values
        row.dimensionValues.forEach((dimensionValue, index) => {
          const dimensionName = dimensions[index];
          let value = dimensionValue.value;
          
          // Handle date formatting for GA4 date dimension
          if (dimensionName === 'date') {
            // GA4 returns dates in YYYYMMDD format, convert to YYYY-MM-DD
            if (value && value.length === 8 && /^\d{8}$/.test(value)) {
              const year = value.substring(0, 4);
              const month = value.substring(4, 6);
              const day = value.substring(6, 8);
              value = `${year}-${month}-${day}`;
            }
          }
          
          dataPoint[dimensionName] = value;
        });
        
        // Add metric values
        row.metricValues.forEach((metricValue, index) => {
          const metricName = metrics[index];
          dataPoint[metricName] = parseFloat(metricValue.value) || 0;
        });
        
        processedData.push(dataPoint);
      });
    }

    // Prepare metadata
    const metadata = {
      dimensionHeaders: response.dimensionHeaders?.map(header => header.name) || dimensions,
      metricHeaders: response.metricHeaders?.map(header => header.name) || metrics,
      rowCount: response.rowCount || 0,
      dataLastRefreshed: new Date().toISOString(),
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        data: processedData,
        metadata,
        success: true,
      }),
    };

  } catch (error) {
    console.error('GA4 API Error:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to fetch GA4 data';
    
    if (error.message.includes('PERMISSION_DENIED')) {
      errorMessage = 'Permission denied. Please check your service account has access to the GA4 property.';
    } else if (error.message.includes('INVALID_ARGUMENT')) {
      errorMessage = 'Invalid request parameters. Please check your dimensions and metrics.';
    } else if (error.message.includes('UNAUTHENTICATED')) {
      errorMessage = 'Authentication failed. Please check your service account credentials.';
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: errorMessage,
        details: error.message 
      }),
    };
  }
};