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

async function checkColumns() {
  const { data, error } = await supabase.from('financial_transactions').select('due_date').limit(1);
  if (error) {
    console.log("❌ Error selecting due_date from financial_transactions:", error.message, error.code);
  } else {
    console.log("✅ Column due_date exists in financial_transactions! Returned:", data);
  }
}

checkColumns();
