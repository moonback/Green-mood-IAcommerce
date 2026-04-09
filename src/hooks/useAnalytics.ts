import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface FunnelDaily {
  event_date: string;
  total_sessions: number;
  unique_visitors: number;
  cart_adds: number;
  checkout_starts: number;
  conversion_count: number;
  conversion_rate_percent: number;
}

export function useAnalyticsFunnel() {
  return useQuery({
    queryKey: ['analytics-funnel'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('analytics_funnel_daily')
        .select('*')
        .order('event_date', { ascending: false });
      
      if (error) throw error;
      return data as FunnelDaily[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
