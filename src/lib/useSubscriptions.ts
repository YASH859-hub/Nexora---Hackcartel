import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { useAuth } from './AuthContext';

export interface Subscription {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  billing_cycle: 'monthly' | 'yearly' | 'quarterly';
  renewal_date: string;
  status: 'active' | 'cancelled' | 'paused';
  category: string;
  created_at: string;
  updated_at: string;
}

export function useSubscriptions() {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all subscriptions for current user
  const fetchSubscriptions = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('renewal_date', { ascending: true });

      if (err) throw err;
      setSubscriptions(data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching subscriptions');
    } finally {
      setLoading(false);
    }
  };

  // Add new subscription
  const addSubscription = async (subData: Omit<Subscription, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { data, error: err } = await supabase
        .from('subscriptions')
        .insert([{ ...subData, user_id: user.id }])
        .select()
        .single();

      if (err) throw err;
      setSubscriptions([...subscriptions, data]);
      return data;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Error adding subscription');
    }
  };

  // Update subscription
  const updateSubscription = async (id: string, updates: Partial<Subscription>) => {
    try {
      const { data, error: err } = await supabase
        .from('subscriptions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (err) throw err;
      setSubscriptions(subscriptions.map(sub => sub.id === id ? data : sub));
      return data;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Error updating subscription');
    }
  };

  // Delete subscription
  const deleteSubscription = async (id: string) => {
    try {
      const { error: err } = await supabase
        .from('subscriptions')
        .delete()
        .eq('id', id);

      if (err) throw err;
      setSubscriptions(subscriptions.filter(sub => sub.id !== id));
    } catch (err) {
      throw err instanceof Error ? err : new Error('Error deleting subscription');
    }
  };

  // Calculate total monthly cost
  const getTotalMonthlyCost = () => {
    return subscriptions
      .filter(sub => sub.status === 'active')
      .reduce((total, sub) => {
        const multiplier = sub.billing_cycle === 'monthly' ? 1 : sub.billing_cycle === 'quarterly' ? 1/3 : 1/12;
        return total + (sub.amount * multiplier);
      }, 0);
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [user]);

  return {
    subscriptions,
    loading,
    error,
    fetchSubscriptions,
    addSubscription,
    updateSubscription,
    deleteSubscription,
    getTotalMonthlyCost,
  };
}
