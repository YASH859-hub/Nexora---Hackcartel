import { supabase } from './supabase';

/**
 * Sign up a new user with email and password
 */
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  
  if (error) throw error;
  return data;
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) throw error;
  return data;
}

/**
 * Sign out the current user
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Get the current authenticated user
 */
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) throw error;
  return user;
}

/**
 * Insert data into a table
 */
export async function insertData(table: string, data: any) {
  const { data: insertedData, error } = await supabase
    .from(table)
    .insert([data])
    .select();
  
  if (error) throw error;
  return insertedData;
}

/**
 * Fetch data from a table
 */
export async function fetchData(table: string, filter?: any) {
  let query = supabase.from(table).select('*');
  
  if (filter) {
    Object.entries(filter).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data;
}

/**
 * Update data in a table
 */
export async function updateData(table: string, id: string, updates: any) {
  const { data, error } = await supabase
    .from(table)
    .update(updates)
    .eq('id', id)
    .select();
  
  if (error) throw error;
  return data;
}

/**
 * Delete data from a table
 */
export async function deleteData(table: string, id: string) {
  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', id);
  
  if (error) throw error;
  return true;
}
