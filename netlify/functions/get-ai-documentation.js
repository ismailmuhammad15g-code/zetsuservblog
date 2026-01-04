// Netlify Function to serve AI documentation as JSON
// This endpoint is accessible at /.netlify/functions/get-ai-documentation

const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json',
    };

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const supabaseUrl = process.env.VITE_SUPABASE_URL;
        const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Supabase configuration missing');
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Get documentation JSON using the RPC function
        const { data, error } = await supabase.rpc('get_ai_documentation_json');

        if (error) {
            throw error;
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(data, null, 2),
        };
    } catch (error) {
        console.error('Error fetching AI documentation:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
