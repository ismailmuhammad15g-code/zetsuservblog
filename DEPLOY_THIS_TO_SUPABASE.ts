// Cloudflare R2 Upload Function
// Copy this entire code to Supabase Dashboard → Edge Functions → Create Function

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { S3Client, PutObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3.400.0"
import { getSignedUrl } from "https://esm.sh/@aws-sdk/s3-request-presigner@3.400.0"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { filename, contentType, folder = 'posts' } = await req.json()

        if (!filename || !contentType) {
            throw new Error('Filename and ContentType are required')
        }

        // Validate folder
        const allowedFolders = ['posts', 'avatars', 'covers', 'profileimg', 'ai-posts', 'soundpost']
        if (!allowedFolders.includes(folder)) {
            throw new Error('Invalid folder. Must be posts, avatars, covers, profileimg, ai-posts, or soundpost.')
        }

        // Get R2 credentials from environment variables
        const R2_ACCESS_KEY_ID = Deno.env.get('R2_ACCESS_KEY_ID')
        const R2_SECRET_ACCESS_KEY = Deno.env.get('R2_SECRET_ACCESS_KEY')
        const R2_ENDPOINT = Deno.env.get('R2_ENDPOINT')
        const R2_BUCKET_NAME = Deno.env.get('R2_BUCKET_NAME') || 'zetsuservstorage'
        const R2_PUBLIC_URL = Deno.env.get('R2_PUBLIC_URL')

        if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_ENDPOINT) {
            throw new Error('R2 credentials not configured')
        }

        // Initialize S3 Client for R2
        const s3Client = new S3Client({
            region: 'auto',
            endpoint: R2_ENDPOINT,
            credentials: {
                accessKeyId: R2_ACCESS_KEY_ID,
                secretAccessKey: R2_SECRET_ACCESS_KEY,
            },
        })

        // Generate file path
        const now = new Date()
        const timestamp = now.getTime()
        const random = Math.floor(Math.random() * 10000)
        const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')

        let filePath = ''
        if (folder === 'posts') {
            const year = now.getFullYear()
            const month = String(now.getMonth() + 1).padStart(2, '0')
            filePath = `posts/${year}/${month}/${timestamp}-${random}-${sanitizedFilename}`
        } else if (folder === 'profileimg') {
            filePath = `profileimg/${timestamp}-${random}-${sanitizedFilename}`
        } else if (folder === 'soundpost') {
            filePath = `soundpost/${timestamp}-${random}-${sanitizedFilename}`
        } else {
            filePath = `${folder}/${timestamp}-${random}-${sanitizedFilename}`
        }

        // Create presigned URL for upload
        const command = new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: filePath,
            ContentType: contentType,
        })

        const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 })

        // Generate public URL
        const publicUrl = R2_PUBLIC_URL
            ? `${R2_PUBLIC_URL}/${filePath}`
            : `${R2_ENDPOINT}/${R2_BUCKET_NAME}/${filePath}`

        return new Response(
            JSON.stringify({ uploadUrl, publicUrl, filePath }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )
    } catch (error: any) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        console.error('R2 Upload Error:', message)
        return new Response(
            JSON.stringify({ error: message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        )
    }
})
