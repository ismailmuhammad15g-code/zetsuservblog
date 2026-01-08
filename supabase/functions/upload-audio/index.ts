import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders })
    }

    try {
        const formData = await req.formData()
        // Helper: Check if 'file' or 'fileToUpload' exists
        const file = formData.get('file') || formData.get('fileToUpload')

        if (!file) {
            return new Response(
                JSON.stringify({ error: 'No file uploaded' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        // Forward to Catbox.moe
        const catboxFormData = new FormData()
        catboxFormData.append('reqtype', 'fileupload')
        catboxFormData.append('fileToUpload', file)

        console.log('Forwarding file to Catbox...')

        const catboxResponse = await fetch('https://catbox.moe/user/api.php', {
            method: 'POST',
            body: catboxFormData,
        })

        if (!catboxResponse.ok) {
            const errorText = await catboxResponse.text()
            console.error('Catbox API Error:', errorText)
            throw new Error(`Catbox API Error: ${catboxResponse.status} ${errorText}`)
        }

        const audioUrl = await catboxResponse.text()
        console.log('Upload success:', audioUrl)

        return new Response(
            JSON.stringify({ url: audioUrl }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error: any) {
        console.error('Proxy Error:', error)
        return new Response(
            JSON.stringify({ error: error.message || 'Unknown error' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
