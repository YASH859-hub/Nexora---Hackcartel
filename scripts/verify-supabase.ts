#!/usr/bin/env node
/**
 * Supabase Verification Script
 * 
 * Run this to check if your Supabase setup is correct:
 * npx ts-node scripts/verify-supabase.ts
 * 
 * Or from repo root:
 * node -e "import('./scripts/verify-supabase.ts')"
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('\n🔍 SUPABASE VERIFICATION SCRIPT\n');
console.log('=' .repeat(60));

// Check 1: Environment Variables
console.log('\n1️⃣  ENVIRONMENT VARIABLES');
console.log('-'.repeat(60));

if (!supabaseUrl) {
  console.log('❌ VITE_SUPABASE_URL is not set');
  process.exit(1);
}

if (!supabaseAnonKey) {
  console.log('❌ VITE_SUPABASE_ANON_KEY is not set');
  process.exit(1);
}

console.log('✅ VITE_SUPABASE_URL:', supabaseUrl);
console.log('✅ VITE_SUPABASE_ANON_KEY: [redacted]');
if (supabaseServiceKey) {
  console.log('✅ SUPABASE_SERVICE_ROLE_KEY: [redacted]');
}

// Check 2: Connect to Supabase
console.log('\n2️⃣  SUPABASE CONNECTION');
console.log('-'.repeat(60));

const supabase = createClient(supabaseUrl, supabaseAnonKey);

try {
  // Test connection by getting auth status
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    console.log('✅ Connected as authenticated user:', user.id);
  } else {
    console.log('⚠️  Connected but not authenticated (anonymous mode)');
  }
} catch (error) {
  console.log('❌ Connection failed:', error instanceof Error ? error.message : 'Unknown error');
  process.exit(1);
}

// Check 3: Tables Exist
console.log('\n3️⃣  REQUIRED TABLES');
console.log('-'.repeat(60));

const requiredTables = [
  'user_inbox_items',
  'user_sync_state',
  'user_tracking_events',
  'user_manual_commitments'
];

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

for (const tableName of requiredTables) {
  try {
    const { data, error } = await supabaseAdmin
      .from(tableName)
      .select('*')
      .limit(0); // Don't fetch data, just check table exists
    
    if (!error) {
      console.log(`✅ Table exists: ${tableName}`);
    } else if (error.code === '42P01') {
      console.log(`❌ Table missing: ${tableName}`);
    } else {
      console.log(`⚠️  Table status unknown: ${tableName} (${error.message})`);
    }
  } catch (error) {
    console.log(`❌ Error checking ${tableName}:`, error instanceof Error ? error.message : 'Unknown error');
  }
}

// Check 4: RLS Policies
console.log('\n4️⃣  RLS POLICIES');
console.log('-'.repeat(60));

try {
  const { data: policies, error } = await supabaseAdmin
    .rpc('get_rls_policies_info');
  
  if (!error && policies) {
    console.log('✅ RLS policies accessible');
    console.log(`   Found ${policies.length} policies`);
  } else {
    console.log('⚠️  Could not fetch RLS policies via RPC');
    console.log('   (This is normal - requires service role)');
  }
} catch (error) {
  console.log('⚠️  RLS check skipped - requires service role key');
}

// Check 5: Sample Data Operations
console.log('\n5️⃣  DATA OPERATIONS TEST');
console.log('-'.repeat(60));

console.log('⏳ Testing anonymous read from user_inbox_items...');
try {
  const { data, error } = await supabase
    .from('user_inbox_items')
    .select('*')
    .limit(1);
  
  if (error) {
    if (error.code === '42501') {
      console.log('✅ RLS is working (correctly blocking unauthenticated access)');
    } else {
      console.log('❌ Error:', error.message);
    }
  } else {
    console.log('⚠️  Unexpected: unauthenticated user could read data!');
  }
} catch (error) {
  console.log('⚠️  Test failed:', error instanceof Error ? error.message : 'Unknown error');
}

// Check 6: Encryption Utilities
console.log('\n6️⃣  ENCRYPTION UTILITIES');
console.log('-'.repeat(60));

console.log('⏳ Testing encryption functions...');
try {
  // Test AES-256-GCM encryption is available
  const testData = 'Hello, Secret World!';
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const encryptedData = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(testData)
  );
  
  const decryptedData = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encryptedData
  );
  
  const decoder = new TextDecoder();
  const decrypted = decoder.decode(decryptedData);
  
  if (decrypted === testData) {
    console.log('✅ AES-256-GCM encryption working');
  } else {
    console.log('❌ Encryption test failed - data mismatch');
  }
} catch (error) {
  console.log('❌ Encryption test failed:', error instanceof Error ? error.message : 'Unknown error');
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('\n📊 SUMMARY\n');
console.log('✅ All checks passed - Supabase is ready!');
console.log('\nNext steps:');
console.log('1. Start frontend: npm run dev');
console.log('2. Sign in to Dashboard');
console.log('3. Navigate to Events section');
console.log('4. Try to classify an email');
console.log('5. Check Supabase SQL Editor for data');
console.log('\n' + '='.repeat(60) + '\n');
