-- ============================================================
-- CLEANUP SCRIPT: DELETE ALL PROOF IMAGES (RAM ONLY POLICY)
-- ============================================================

-- 1. DELETE ALL OBJECTS IN 'proof-images' BUCKET
-- This removes files physically from storage.
-- NOTE: Supabase Storage stores metadata in `storage.objects`.
DELETE FROM storage.objects WHERE bucket_id = 'proof-images';

-- 2. (OPTIONAL) IF YOU WANT TO KEEP THE BUCKET BUT EMPTY
-- The bucket itself remains for future temporary use if needed, 
-- but we just wiped all files.

DO $$
BEGIN
    RAISE NOTICE 'Deleted all files from proof-images bucket to enforce RAM-only policy.';
END $$;
