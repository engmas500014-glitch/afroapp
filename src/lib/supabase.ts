import { createClient } from '@supabase/supabase-js';

const getSupabaseConfig = () => {
  let url = '';
  let key = '';
  if (typeof window !== 'undefined') {
    url = localStorage.getItem('custom_supabase_url') || '';
    key = localStorage.getItem('custom_supabase_anon_key') || '';
  }
  return {
    url: url || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://db.afroapp.site',
    key: key || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE'
  };
};

const config = getSupabaseConfig();

export const supabase = createClient(config.url, config.key, {
  global: {
    headers: {
      'ngrok-skip-browser-warning': 'true'
    }
  }
});

