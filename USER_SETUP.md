# User Database Setup Instructions

## Step 1: Run Database Schema in Supabase

1. Go to your Supabase dashboard: [supabase.com](https://supabase.com)
2. Select your project
3. Go to **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy all the SQL from `DATABASE_SETUP.sql` in this project
6. Paste it into the SQL editor
7. Click **Run** to execute the schema creation

This will create:
- `users` table (stores user profiles)
- `bills` table (stores bill information)
- `subscriptions` table (stores subscription information)
- Row-Level Security (RLS) policies to ensure users can only access their own data
- Indexes for better performance

## Step 2: Test User Creation

### Sign Up Flow:
1. Make sure the dev server is running: `npm run dev`
2. Open http://localhost:3001
3. Click the **"Start"** button on the hero page
4. Click **"Sign up"** toggle
5. Fill in:
   - **Full Name**: Any name (e.g., "John Doe")
   - **Email**: Any email (e.g., "test@example.com")
   - **Password**: 6+ characters
6. Click **"Sign Up"** button

### Expected Result:
- Success message: "Account created! Please sign in."
- You'll need to sign in with the same email/password
- After sign in, you'll be redirected to the dashboard
- Check Supabase to verify the user was created in the `users` table

### To Verify in Supabase:
1. Go to Supabase dashboard
2. Go to **SQL Editor** or **Table Editor**
3. View the `users` table
4. You should see your new user with:
   - `id`: Auto-generated UUID
   - `email`: Email you signed up with
   - `full_name`: Name you entered
   - `created_at`: Timestamp of creation

## Step 3: Update .env.local

Make sure your `.env.local` file has the correct credentials:

```
VITE_SUPABASE_URL=your_actual_supabase_url
VITE_SUPABASE_ANON_KEY=your_actual_anon_key
DATABASE_URL=your_database_url
```

Get these from your Supabase project settings → API.

## How It Works

### Authentication Flow:
1. **Sign Up**: 
   - User enters full name, email, and password
   - Creates auth account in Supabase `auth.users` table
   - Creates profile in `users` table with id, email, and full_name
   
2. **Sign In**:
   - User enters email and password
   - Supabase authenticates against `auth.users`
   - App fetches user profile from `users` table
   - User redirected to dashboard

3. **Dashboard**:
   - Protected route that requires authentication
   - Shows user's bills and subscriptions
   - Automatic logout available in profile dropdown

## Testing Steps

1. Start dev server: `npm run dev`
2. Create multiple test users
3. Verify each user's data in Supabase
4. Test sign out and sign in
5. Verify bills/subscriptions are user-isolated

## Troubleshooting

**Issue**: "Error creating user profile" after sign up
- **Solution**: Make sure you've run the DATABASE_SETUP.sql in Supabase and the `users` table exists

**Issue**: Sign up works but can't sign in
- **Solution**: After sign up, you must click the confirmation link in the email (or disable email confirmation in Supabase settings for testing)

**Issue**: Users table is empty after sign up
- **Solution**: Check browser console for errors; ensure RLS policies allow inserts with `WITH CHECK (true)`

## Next Steps

After users are stored:
- Create UI components to display bills and subscriptions
- Add functionality to create/edit/delete bills
- Implement subscription cost calculations
- Add filtering and search features
