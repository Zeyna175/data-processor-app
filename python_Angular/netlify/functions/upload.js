const multipart = require('lambda-multipart-parser');

exports.handler = async (event, context) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      }
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    console.log('Parsing multipart data...');
    
    // Vérifier si le body existe
    if (!event.body) {
      console.log('No body in event');
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Aucune donnée reçue' })
      };
    }

    const result = await multipart.parse(event);
    console.log('Parsed result:', result);
    
    if (!result.files || result.files.length === 0) {
      console.log('No files found in parsed result');
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Aucun fichier fourni' })
      };
    }

    const file = result.files[0];
    console.log('Processing file:', file.filename);
    
    // Traitement du fichier
    const processedData = {
      message: 'Fichier traité avec succès',
      filename: file.filename,
      size: file.content.length,
      type: file.contentType,
      timestamp: new Date().toISOString()
    };

    console.log('File processed successfully');
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(processedData)
    };

  } catch (error) {
    console.error('Error processing request:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Erreur lors du traitement',
        details: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};