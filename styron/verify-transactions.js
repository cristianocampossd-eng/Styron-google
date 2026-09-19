import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing config!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkData() {
  const accountsRes = await supabase.from('financial_accounts').select('id, name, balance');
  console.log("--- ACCOUNTS ---");
  console.log(JSON.stringify(accountsRes.data, null, 2));

  const txsRes = await supabase.from('financial_transactions').select('id, description, account_id, value, transaction_date, type').limit(15);
  console.log("--- TRANSACTIONS SAMPLES ---");
  console.log(JSON.stringify(txsRes.data, null, 2));
}

checkData();
