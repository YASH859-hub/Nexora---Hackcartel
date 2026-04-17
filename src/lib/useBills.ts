import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { useAuth } from './AuthContext';

export interface Bill {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue';
  category: string;
  created_at: string;
  updated_at: string;
}

export function useBills() {
  const { user } = useAuth();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all bills for current user
  const fetchBills = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('bills')
        .select('*')
        .eq('user_id', user.id)
        .order('due_date', { ascending: true });

      if (err) throw err;
      setBills(data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching bills');
    } finally {
      setLoading(false);
    }
  };

  // Add new bill
  const addBill = async (billData: Omit<Bill, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { data, error: err } = await supabase
        .from('bills')
        .insert([{ ...billData, user_id: user.id }])
        .select()
        .single();

      if (err) throw err;
      setBills([...bills, data]);
      return data;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Error adding bill');
    }
  };

  // Update bill
  const updateBill = async (id: string, updates: Partial<Bill>) => {
    try {
      const { data, error: err } = await supabase
        .from('bills')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (err) throw err;
      setBills(bills.map(bill => bill.id === id ? data : bill));
      return data;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Error updating bill');
    }
  };

  // Delete bill
  const deleteBill = async (id: string) => {
    try {
      const { error: err } = await supabase
        .from('bills')
        .delete()
        .eq('id', id);

      if (err) throw err;
      setBills(bills.filter(bill => bill.id !== id));
    } catch (err) {
      throw err instanceof Error ? err : new Error('Error deleting bill');
    }
  };

  useEffect(() => {
    fetchBills();
  }, [user]);

  return {
    bills,
    loading,
    error,
    fetchBills,
    addBill,
    updateBill,
    deleteBill,
  };
}
