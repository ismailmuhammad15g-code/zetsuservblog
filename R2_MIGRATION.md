# R2 Migration Guide

## Step 1: Add Environment Variables to Supabase

Go to your Supabase Dashboard:
1. **Project Settings** → **Edge Functions** → **Manage secrets**
2. Add these secrets:

```
R2_ACCESS_KEY_ID = f9ef7a3142a0b6cfb2c6c8dc18d5e528
R2_SECRET_ACCESS_KEY = a13e98683d8d25a793bb036c06d1842bbff2933948f96fe613b7207c2788919a
R2_ENDPOINT = https://56c75157a099276e7efc245cac6c8964.r2.cloudflarestorage.com
R2_BUCKET_NAME = zetsuservstorage
```

## Step 2: Deploy the new Edge Function

```bash
npx supabase functions deploy get-r2-signed-url
```

## Step 3: Update Frontend Code

Find all references to `get-gcs-signed-url` and replace with `get-r2-signed-url`

## Step 4: Make R2 Bucket Public (Optional)

If you want files to be publicly accessible:

1. Go to Cloudflare Dashboard → R2
2. Select your bucket `zetsuservstorage`
3. Settings → **Public Access** → Enable
4. Or setup a custom domain for better URLs

## Step 5: Test

Upload a file and verify the URL works!
