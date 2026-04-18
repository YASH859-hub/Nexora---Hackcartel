import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://yzllccjyrcxqrqbxvmrz.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY. Put it in .env.local before running the seed script.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const priorityItems = [
  {
    seed_key: 'demo-amex-gold-bill',
    title: 'AMEX Gold Bill',
    summary: 'Card payment due before the statement deadline.',
    category: 'financial',
    priority: 'high',
    next_action: 'Open the bill and make the payment today.',
    due_at: '2026-06-14T09:00:00.000Z',
    source_type: 'email',
    source_ref: 'demo-amex-gold-bill',
    metadata: { amount_inr: 12500 },
  },
  {
    seed_key: 'demo-netflix-renewal',
    title: 'Netflix Renewal',
    summary: 'Subscription renewal scheduled for this week.',
    category: 'financial',
    priority: 'medium',
    next_action: 'Review the renewal or cancel before the charge hits.',
    due_at: '2026-06-16T09:00:00.000Z',
    source_type: 'manual',
    source_ref: 'demo-netflix-renewal',
    metadata: { source: 'seeded demo item' },
  },
  {
    seed_key: 'demo-rent-payment',
    title: 'Rent Payment',
    summary: 'Monthly rent transfer needs to be prepared.',
    category: 'financial',
    priority: 'high',
    next_action: 'Schedule the transfer and confirm the payment window.',
    due_at: '2026-06-18T09:00:00.000Z',
    source_type: 'manual',
    source_ref: 'demo-rent-payment',
    metadata: { amount_inr: 8000 },
  },
  {
    seed_key: 'demo-team-sync',
    title: 'Team Sync',
    summary: 'Weekly calendar sync with the product team.',
    category: 'work',
    priority: 'medium',
    next_action: 'Prepare the project update and join on time.',
    due_at: '2026-06-12T10:00:00.000Z',
    source_type: 'calendar',
    source_ref: 'demo-team-sync',
    metadata: { location: 'Google Meet' },
  },
];

const manualCommitments = [
  {
    seed_key: 'demo-manual-rent',
    name: 'Rent Payment',
    amount: 8000,
    due_date: '2026-06-18',
    priority: 'high',
    note: 'Monthly rent',
  },
  {
    seed_key: 'demo-manual-gym',
    name: 'Gym Membership',
    amount: 2500,
    due_date: '2026-06-20',
    priority: 'medium',
    note: 'Renew before the billing cycle ends',
  },
];

async function upsertRows(tableName, rows) {
  const { error } = await supabase
    .from(tableName)
    .upsert(rows, { onConflict: 'seed_key' });

  if (error) {
    throw error;
  }
}

async function main() {
  console.log('Seeding injected dashboard data...');

  await upsertRows('injected_priority_items', priorityItems);
  await upsertRows('manual_financial_commitments', manualCommitments);

  console.log(`Seeded ${priorityItems.length} priority items and ${manualCommitments.length} manual commitments.`);
}

main().catch((error) => {
  if (error && typeof error === 'object' && 'code' in error && error.code === 'PGRST205') {
    console.error('Seed failed: apply SUPABASE_DASHBOARD_SCHEMA.sql in Supabase first, then rerun this script.');
    process.exit(1);
  }

  console.error('Seed failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
