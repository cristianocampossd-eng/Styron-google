import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// Check if service role key is available under common names
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

console.log("Supabase URL:", supabaseUrl);
console.log("Service Key found:", !!serviceKey);

if (!supabaseUrl || !serviceKey) {
  console.log("Missing Supabase Service Key or URL! Let's try downloading using anon key first.");
}

const supabase = createClient(supabaseUrl, serviceKey || process.env.VITE_SUPABASE_ANON_KEY);

async function inspect() {
  console.log("\n--- EXECUTING INSPECTION ---");
  
  // 1. Fetch attachments
  const { data: attachments, error: attError } = await supabase.from('service_order_attachments').select('*');
  if (attError) {
    console.error("❌ Error fetching attachments:", attError.message);
  } else {
    console.log(`\nFound ${attachments.length} attachments:`);
    attachments.forEach(a => console.log(`Attachment ID: ${a.id}, OS ID: ${a.service_order_id}, url: ${a.file_url}`));
  }

  // 2. Fetch service orders
  const { data: orders, error: ordError } = await supabase.from('service_orders').select('*');
  if (ordError) {
    console.error("❌ Error fetching service orders:", ordError.message);
  } else {
    console.log(`\nFound ${orders.length} service orders:`);
    orders.forEach(o => console.log(`OS ID: ${o.id}, Code: ${o.os_code}, Title: ${o.title}, Created By: ${o.created_by}, Assigned To: ${o.assigned_to}`));
  }

  // 3. Fetch profiles
  const { data: profiles, error: profError } = await supabase.from('profiles').select('*');
  if (profError) {
    console.error("❌ Error fetching profiles:", profError.message);
  } else {
    console.log(`\nFound ${profiles.length} profiles:`);
    profiles.forEach(p => console.log(`Profile ID: ${p.id}, Name: ${p.name}, Email: ${p.email}`));
  }
}

inspect();
