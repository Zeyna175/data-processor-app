exports.handler = async (event, context) => {
  const { httpMethod, body, path } = event;
  
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  };

  if (httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  try {
    const targetUrl = `https://data-processor-api-aeuh.onrender.com/api${path.replace('/.netlify/functions/proxy', '')}`;
    
    const response = await fetch(targetUrl, {
      method: httpMethod,
      headers: {
        'Content-Type': event.headers['content-type'] || 'application/json'
      },
      body: httpMethod !== 'GET' ? body : undefined
    });

    const data = await response.text();
    
    return {
      statusCode: response.status,
      headers: {
        ...headers,
        'Content-Type': response.headers.get('content-type') || 'application/json'
      },
      body: data
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};