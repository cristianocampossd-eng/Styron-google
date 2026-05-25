import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log("Supabase URL:", supabaseUrl);
console.log("Supabase Key length:", supabaseAnonKey ? supabaseAnonKey.length : 0);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing config!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const tables = [
    'profiles',
    'user_roles',
    'projects',
    'financial_accounts',
    'financial_categories',
    'financial_transactions',
    'financial_entries',
    'service_orders',
    'company_settings',
    'user_permissions'
  ];

  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*');
    if (error) {
      console.log(`❌ Table ${t}: Error: ${error.message} (Code: ${error.code})`);
    } else {
      console.log(`✅ Table ${t}: Returned ${data?.length} rows`);
      if (data && data.length > 0) {
        console.log("   First row:", JSON.stringify(data[0]).slice(0, 500));
      }
    }
  }
}

test();
