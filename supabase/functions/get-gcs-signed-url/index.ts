
// @ts-ignore - Deno imports only work in Supabase Edge Functions
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore
import { Storage } from "npm:@google-cloud/storage"
// @ts-ignore
import serviceAccount from "./service-account.json" assert { type: "json" }

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req: Request) => {
    // ✅ HANDLE CORS PREFLIGHT
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { filename, contentType, folder = 'posts' } = await req.json()

        if (!filename || !contentType) {
            throw new Error('Filename and ContentType are required')
        }

        // Validate folder to prevent arbitrary directory writing
        const allowedFolders = ['posts', 'avatars', 'covers', 'profileimg', 'ai-posts']
        if (!allowedFolders.includes(folder)) {
            throw new Error('Invalid folder. Must be posts, avatars, covers, profileimg, or ai-posts.')
        }

        // Initialize Storage
        const storage = new Storage({
            projectId: serviceAccount.project_id,
            credentials: {
                client_email: serviceAccount.client_email,
                private_key: serviceAccount.private_key,
            },
        })

        const bucketName = 'myapp-post-images-2026' // You might want to make this dynamic or env var
        const bucket = storage.bucket(bucketName)

        // Naming Strategy
        let filePath = ''
        const now = new Date()
        const timestamp = now.getTime()
        const random = Math.floor(Math.random() * 10000)

        // Sanitize filename
        const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')

        if (folder === 'posts') {
            // posts/{year}/{month}/{timestamp}-{random}-{filename}
            const year = now.getFullYear()
            const month = String(now.getMonth() + 1).padStart(2, '0')
            filePath = `posts/${year}/${month}/${timestamp}-${random}-${sanitizedFilename}`
        } else if (folder === 'profileimg') {
            // profileimg/{timestamp}-{random}-{filename}
            filePath = `profileimg/${timestamp}-${random}-${sanitizedFilename}`
        } else {
            // avatars/{timestamp}-{random}-{filename}
            // covers/{timestamp}-{random}-{filename}
            filePath = `${folder}/${timestamp}-${random}-${sanitizedFilename}`
        }

        const file = bucket.file(filePath)

        // Generate Signed URL
        const [uploadUrl] = await file.getSignedUrl({
            version: 'v4',
            action: 'write',
            expires: Date.now() + 5 * 60 * 1000, // 5 minutes
            contentType: contentType,
        })

        // Public URL (assuming bucket is public-read for these objects)
        const publicUrl = `https://storage.googleapis.com/${bucketName}/${filePath}`

        return new Response(
            JSON.stringify({ uploadUrl, publicUrl, filePath }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )
    } catch (error: any) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return new Response(
            JSON.stringify({ error: message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        )
    }
})
