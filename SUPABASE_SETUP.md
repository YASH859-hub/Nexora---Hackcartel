# Supabase Setup Guide for Nexora

This guide will help you set up Supabase as the database for your Nexora project.

## Prerequisites

- A Supabase account (sign up at https://app.supabase.com)
- Node.js and npm installed
- Git for version control

## Step 1: Create a Supabase Project

1. Go to [Supabase](https://app.supabase.com)
2. Click **"New Project"**
3. Enter a **Project Name** (e.g., `nexora-dev`)
4. Set a strong **Database Password**
5. Select your **Region** (closest to your users)
6. Click **"Create new project"** and wait for it to initialize

## Step 2: Get Your Credentials

1. Once your project is created, go to **Settings → API**
2. Copy your:
   - **Project URL** (VITE_SUPABASE_URL)
   - **anon public** key (VITE_SUPABASE_ANON_KEY)

## Step 3: Set Up Environment Variables

1. Create a `.env.local` file in the root of your project (next to `package.json`)
2. Add your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**⚠️ Important:** Never commit `.env.local` to version control. It's already in `.gitignore`.

## Step 4: Create Tables

In the Supabase dashboard, go to **SQL Editor** and create your tables. Here are some example tables for Nexora:

### Users Profile Table
```sql
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE,
  full_name text,
  avatar_url text,
  created_at timestamp DEFAULT NOW(),
  updated_at timestamp DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own profile
CREATE POLICY "Users can read their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);
```

### Bills Table
```sql
CREATE TABLE public.bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  amount numeric NOT NULL,
  due_date date NOT NULL,
  status text DEFAULT 'pending',
  category text,
  created_at timestamp DEFAULT NOW(),
  updated_at timestamp DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

-- Allow users to read only their own bills
CREATE POLICY "Users can read their own bills"
  ON public.bills
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to insert their own bills
CREATE POLICY "Users can insert their own bills"
  ON public.bills
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### Subscriptions Table
```sql
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  amount numeric NOT NULL,
  billing_cycle text DEFAULT 'monthly', -- monthly, yearly, quarterly
  renewal_date date NOT NULL,
  status text DEFAULT 'active',
  category text,
  created_at timestamp DEFAULT NOW(),
  updated_at timestamp DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow users to read only their own subscriptions
CREATE POLICY "Users can read their own subscriptions"
  ON public.subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);
```

## Step 5: Use Supabase in Your App

### Basic Authentication Example

```typescript
import { signIn, signUp, signOut, getCurrentUser } from '@/lib/database';

// Sign up
await signUp('user@example.com', 'password');

// Sign in
await signIn('user@example.com', 'password');

// Get current user
const user = await getCurrentUser();

// Sign out
await signOut();
```

### Database Operations Example

```typescript
import { fetchData, insertData, updateData, deleteData } from '@/lib/database';

// Fetch bills
const bills = await fetchData('bills', { user_id: userId });

// Insert new bill
await insertData('bills', {
  user_id: userId,
  name: 'Electricity Bill',
  amount: 100,
  due_date: '2024-05-15',
  category: 'utilities'
});

// Update bill status
await updateData('bills', billId, { status: 'paid' });

// Delete bill
await deleteData('bills', billId);
```

### Using in React Components

```typescript
import { useState, useEffect } from 'react';
import { fetchData, getCurrentUser } from '@/lib/database';

export function BillsList() {
  const [bills, setBills] = useState([]);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      const user = await getCurrentUser();
      setUserId(user?.id);
      
      if (user) {
        const userBills = await fetchData('bills', { user_id: user.id });
        setBills(userBills);
      }
    };

    loadData();
  }, []);

  return (
    <div>
      {bills.map(bill => (
        <div key={bill.id}>{bill.name} - ${bill.amount}</div>
      ))}
    </div>
  );
}
```

## Step 6: Real-time Updates (Optional)

To listen for real-time changes:

```typescript
const subscription = supabase
  .from('bills')
  .on('*', payload => {
    console.log('Change received!', payload)
  })
  .subscribe()

// Clean up
subscription.unsubscribe()
```

## Testing

1. Navigate to your Supabase dashboard
2. Go to the **SQL Editor** tab
3. Test your queries directly before using them in your app
4. Check **Auth** tab to see created users

## Troubleshooting

- **Missing environment variables**: Ensure `.env.local` has the correct Supabase URL and key
- **Authentication errors**: Check that your user exists in the Supabase **Auth** tab
- **RLS policy errors**: Make sure your RLS (Row Level Security) policies match your user IDs
- **CORS issues**: Configure allowed origins in Supabase Settings → Security

## Resources

- [Supabase Docs](https://supabase.com/docs)
- [JavaScript Client Docs](https://supabase.com/docs/reference/javascript)
- [Authentication Guide](https://supabase.com/docs/guides/auth)
- [SQL Tips](https://supabase.com/docs/guides/database)

Good luck! 🚀
