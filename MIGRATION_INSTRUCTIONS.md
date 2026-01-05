# Shop Inventory and Daily Rewards System - Database Migration

## Manual Migration Required

Since this project doesn't have Supabase CLI configured, you need to manually run the SQL migration in your Supabase Dashboard.

### Steps to Apply Migration:

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar
4. Click on **New Query**
5. Copy and paste the contents of `supabase/shop_inventory_system.sql`
6. Click **Run** to execute the migration

### What This Migration Does:

1. **Creates `user_inventory` table** - Stores purchased shop items for each user
2. **Creates `daily_rewards` table** - Tracks daily login rewards (10 ZCoins per day)
3. **Creates `daily_missions` table** - Defines available daily missions
4. **Creates `user_mission_progress` table** - Tracks user progress on daily missions
5. **Creates database functions**:
   - `claim_daily_reward()` - Handles daily reward claims
   - `check_daily_reward_status()` - Checks if user can claim reward
   - `complete_daily_mission()` - Handles mission completion
6. **Ensures `zgold` column exists** in `game_profiles` table
7. **Sets up RLS policies** for all tables

### Features Enabled:

✅ Shop purchases are now saved to the database
✅ Purchased items appear in player stats page
✅ Daily login reward system (10 ZCoins every 24 hours)
✅ Daily missions system with rewards
✅ Countdown timer showing when next reward is available
✅ Confetti celebration animations on rewards
✅ Sound effects on reward claims
✅ Premium currency (ZGold) support

### Testing the System:

After running the migration:

1. **Test Shop Purchases:**
   - Go to `/shop` page
   - Purchase an item
   - Check that ZCoins/ZGold are deducted
   - Go to player stats page to see purchased items

2. **Test Daily Rewards:**
   - Click on the shopkeeper character in the shop page
   - Click "استلم الآن" (Claim Now) on the daily login reward
   - Verify you receive 10 ZCoins
   - Check that the countdown timer appears for the next reward

3. **Test Daily Missions:**
   - Click on the shopkeeper character in the shop page
   - Complete a mission by clicking "أكمل" (Complete)
   - Verify you receive the mission reward

### Important Notes:

- Daily rewards reset at midnight UTC
- Each mission can only be completed once per day
- Purchased items are permanently stored in the database
- The system uses Row Level Security (RLS) to ensure users can only access their own data

### Troubleshooting:

If you encounter errors:
1. Make sure the `game_profiles` table exists
2. Check that all referenced columns exist in the database
3. Verify RLS is enabled on all tables
4. Check the Supabase logs for detailed error messages
