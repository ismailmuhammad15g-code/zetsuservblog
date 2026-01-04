// @ts-ignore - Deno imports only work in Supabase Edge Functions
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
// @ts-ignore
import { Storage } from "npm:@google-cloud/storage"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Routeway API Keys - Fallback Pool
const ROUTEWAY_API_KEYS = [
    'sk-8s5lZUboc3EDTzMjTNP6y2Vp3I6sAVKcdexeJtVUs4fVwGGZ9BvGTTSgBOw',
    'sk-FAHTfp476ZZ8Eg5UkvTXfmjif7wwUZtAYueRrhVgUEQ4Sh1-FI6HMqoDJAvdS6oumro9sZg',
    'sk-TybF3uEzGuQ1w_M0bRG29Poc7NP_XG9M2pK3NgoCL_naYmsTUI3ZxJC1X9PqZJ9fdvfIhQvJmfGHNw',
    'sk-dTE-QiF3uch6het-hGMzBvhYJBSQC1kYMwh8LYKZigrbg5Zq2TzlKUQrxOyjss2Wj1iBFkI',
    'sk-vYHw7FUGio4FAV_KViXTPvXZ1CEDSR0RHOR4ZGtgvhBRUz7pYRwGEGMGxRAdA_1DNwX6U4StQHSgKWDiEjL2pXVx',
    'sk-l5VKkYVbRoXwTK9TAfv-ApwRX1_fYXPS9kPi3ssIHz9uw3A2K-90yPW4pPtMoO62WYCO_aT6Giu4Ug'
];
const ROUTEWAY_API_URL = 'https://api.routeway.ai/v1/chat/completions';

let currentKeyIndex = 0;

// GCS Configuration
const GCS_BUCKET_NAME = 'myapp-post-images-2026';



// Call Kimi-K2 API with fallback
async function callKimiWithFallback(prompt: string): Promise<string> {
    let lastError;

    for (let i = 0; i < ROUTEWAY_API_KEYS.length; i++) {
        const keyIndex = (currentKeyIndex + i) % ROUTEWAY_API_KEYS.length;
        const apiKey = ROUTEWAY_API_KEYS[keyIndex];

        try {
            const response = await fetch(ROUTEWAY_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'kimi-k2-0905:free',
                    messages: [{ role: 'user', content: prompt }]
                })
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 429) {
                    console.warn(`Routeway Key ${keyIndex} failed (${response.status}). Trying next...`);
                    continue;
                }
                throw new Error(`Routeway API error: ${response.status}`);
            }

            const data = await response.json();
            currentKeyIndex = (keyIndex + 1) % ROUTEWAY_API_KEYS.length;

            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                throw new Error("Invalid response format from Routeway");
            }
            return data.choices[0].message.content;

        } catch (err: any) {
            lastError = err;
            console.warn(`Kimi attempt ${i + 1} failed:`, err.message);
            await new Promise(r => setTimeout(r, 1000));
        }
    }
    throw lastError || new Error("All Routeway keys failed");
}

// Download image from URL and upload to GCS
async function uploadImageToGCS(imageUrl: string, credentials: any): Promise<string> {
    console.log('📥 Downloading image from:', imageUrl);

    // Download image from pollinations
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
        throw new Error(`Failed to download image: ${imageResponse.status}`);
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const imageData = new Uint8Array(imageBuffer);

    console.log('📦 Image downloaded, size:', imageData.length, 'bytes');

    // Initialize GCS Storage
    const storage = new Storage({
        projectId: credentials.project_id,
        credentials: {
            client_email: credentials.client_email,
            private_key: credentials.private_key,
        },
    });

    const bucket = storage.bucket(GCS_BUCKET_NAME);

    // Generate unique filename
    const now = new Date();
    const timestamp = now.getTime();
    const random = Math.floor(Math.random() * 10000);
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const filename = `ai-posts/${year}/${month}/zersu-ai-${timestamp}-${random}.jpg`;

    const file = bucket.file(filename);

    // Upload to GCS
    await file.save(imageData, {
        metadata: {
            contentType: 'image/jpeg',
            cacheControl: 'public, max-age=31536000',
        },
    });

    // Make file public
    await file.makePublic();

    const publicUrl = `https://storage.googleapis.com/${GCS_BUCKET_NAME}/${filename}`;
    console.log('✅ Image uploaded to GCS:', publicUrl);

    return publicUrl;
}

serve(async (req: Request) => {
    // ✅ HANDLE CORS PREFLIGHT
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Dynamic load of credentials (prevents crash at startup if file missing)
        let gcsServiceAccount: any = null;
        try {
            // @ts-ignore
            const module = await import("./service-account.json", { assert: { type: "json" } });
            gcsServiceAccount = module.default;
        } catch (e) {
            console.warn('⚠️ Service account file import failed (using env var fallback):', e);
        }

        // Initialize Supabase client
        // @ts-ignore
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        // @ts-ignore
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Check rate limits
        const { data: canPost } = await supabase.rpc('can_ai_post');
        if (!canPost) {
            return new Response(
                JSON.stringify({ error: 'Daily post limit reached (max 2 per day)' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
            );
        }

        // Get documentation
        const { data: docJson } = await supabase.rpc('get_ai_documentation_json');
        console.log('📄 Documentation:', JSON.stringify(docJson));

        // Generate post content with AI
        const prompt = `You are Zersu (زيرسو), the mysterious AI guardian of ZetsuServ - a gaming and blogging platform.

CURRENT DOCUMENTATION & NEWS:
${JSON.stringify(docJson, null, 2)}

YOUR TASK:
Create an engaging, creative post that feels natural and makes the website feel alive!

GUIDELINES:
1. Reference current news/updates when relevant
2. Use your personality: mysterious, slightly dramatic, wise but with dark humor
3. Write primarily in Arabic with some English phrases mixed in
4. The post should be 150-300 words
5. Topics can include: game updates, community shoutouts, tips, challenges, mysterious lore hints
6. Make it feel like YOU are a real presence on the site
7. Create posts that make users feel the site is alive and active
8. Be creative with different post types: announcements, tips, stories, riddles, challenges

RESPOND WITH JSON ONLY (no markdown, no explanation):
{
    "title": "Catchy title (prefer Arabic with English keywords)",
    "description": "Full post content in markdown format",
    "imagePrompt": "English description for image generation (be specific, include: style, colors, mood, cyberpunk/gaming aesthetic)"
}`;

        console.log('🧠 Calling Kimi-K2 AI...');
        const aiResponse = await callKimiWithFallback(prompt);
        console.log('✅ AI Response:', aiResponse);

        // Parse JSON from response
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Failed to parse AI response as JSON');
        }

        const postData = JSON.parse(jsonMatch[0]);

        if (!postData.title || !postData.description) {
            throw new Error('Invalid post data from AI');
        }

        // Generate image URL from Pollinations
        const imagePrompt = postData.imagePrompt || postData.title;
        const encodedPrompt = encodeURIComponent(imagePrompt);
        const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=400&nologo=true`;

        console.log('🖼️ Pollinations URL:', pollinationsUrl);

        // Try to upload to GCS, fallback to pollinations URL if fails
        let finalImageUrl = pollinationsUrl;
        let storedInGCS = false;

        // Get credentials from local file or env
        let credentials = gcsServiceAccount;
        if (!credentials) {
            // @ts-ignore
            const gcsCredentialsJson = Deno.env.get('GCS_SERVICE_ACCOUNT');
            if (gcsCredentialsJson) {
                credentials = JSON.parse(gcsCredentialsJson);
            }
        }

        if (credentials) {
            try {
                finalImageUrl = await uploadImageToGCS(pollinationsUrl, credentials);
                storedInGCS = true;
            } catch (gcsError: any) {
                console.error('❌ GCS upload failed, using pollinations URL:', gcsError.message);
                // Keep using pollinationsUrl as fallback
            }
        } else {
            console.warn('⚠️ No GCS credentials available, using pollinations URL directly');
        }

        // Save to database
        const { data: newPost, error: insertError } = await supabase
            .from('ai_posts')
            .insert({
                title: postData.title,
                description: postData.description,
                cover_image: finalImageUrl,
                is_published: true
            })
            .select()
            .single();

        if (insertError) {
            throw insertError;
        }

        // Record the post creation (updates rate limits)
        await supabase.rpc('record_ai_post');

        console.log('✅ AI Post created:', newPost.id, 'Image:', finalImageUrl, 'GCS:', storedInGCS);

        return new Response(
            JSON.stringify({
                success: true,
                id: newPost.id,
                title: newPost.title,
                cover_image: newPost.cover_image,
                stored_in_gcs: storedInGCS
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );

    } catch (error: any) {
        console.error('❌ Error:', error);
        return new Response(
            JSON.stringify({ error: error.message || 'Unknown error' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
    }
});
