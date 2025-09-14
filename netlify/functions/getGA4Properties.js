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
    console.log('Loading GA4 properties from environment variables...');
    
    // Get all environment variables
    const envVars = process.env;
    console.log('Available environment variables:', Object.keys(envVars).filter(key => key.startsWith('GA4_')));
    
    const properties = [];
    
    // Look for GA4_PROPERTY_ID pattern (GA4_PROPERTY_ID, GA4_PROPERTY_ID1, GA4_PROPERTY_ID2, etc.)
    Object.keys(envVars).forEach(key => {
      if (key.match(/^GA4_PROPERTY_ID\d*$/)) {
        const propertyId = envVars[key];
        console.log(`Found property: ${key} = ${propertyId}`);
        
        let propertyName = 'GA4 Property';
        
        if (key === 'GA4_PROPERTY_ID') {
          propertyName = 'Main GA4 Property';
        } else {
          // Extract number from key (e.g., GA4_PROPERTY_ID1 -> Property 1)
          const match = key.match(/GA4_PROPERTY_ID(\d+)/);
          if (match) {
            propertyName = `GA4 Property ${match[1]}`;
          }
        }
        
        properties.push({
          id: propertyId,
          name: propertyName
        });
      }
    });

    console.log('Found properties:', properties);

    // If no properties found, check for the basic required variables
    if (properties.length === 0) {
      const basicPropertyId = envVars.GA4_PROPERTY_ID;
      if (basicPropertyId) {
        console.log('Using basic GA4_PROPERTY_ID:', basicPropertyId);
        properties.push({
          id: basicPropertyId,
          name: 'Main GA4 Property'
        });
      } else {
        console.log('No GA4 properties found in environment variables');
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify([]),
        };
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(properties),
    };

  } catch (error) {
    console.error('Error loading GA4 properties:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to load GA4 properties',
        details: error.message 
      }),
    };
  }
};