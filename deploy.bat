@echo off
echo ==========================================
echo ZetsuServ - Supabase Deployment Helper
echo ==========================================

echo [1/2] Logging in to Supabase...
echo (If a browser window opens, please verify the login there)
call cmd /c npx supabase login --quiet

echo.
echo [2/2] Deploying verify-otp function...
call cmd /c npx supabase functions deploy verify-otp --project-ref juhkibcxrtjvluyicvao

echo.
echo ==========================================
echo Deployment process finished.
echo ==========================================
pause
