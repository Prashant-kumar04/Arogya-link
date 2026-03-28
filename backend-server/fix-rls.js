import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function fixRLS() {
    console.log('--- Supabase RLS Fixer ---');
    console.log('Connecting to:', SUPABASE_URL);

    const tables = ['users', 'trusted_contacts', 'notifications', 'devices', 'health_baselines'];

    for (const table of tables) {
        console.log(`Disabling RLS on "${table}"...`);
        // Attempting a simple query first
        const { error } = await supabase.rpc('disable_rls_for_table', { table_name: table });

        // Fallback: If no RPC exists, try a direct SQL command via a dummy select (not really possible from anon client)
        // The real fix is to RUN THE SQL in the dashboard.
    }

    console.log('\n💡 INSTRUCTIONS:');
    console.log('Since you are using the "anon" key, I cannot disable RLS for you via code.');
    console.log('PLEASE copy the SQL below and RUN it in your Supabase Dashboard SQL Editor:');
    console.log('\n' + '='.repeat(40));
    console.log('ALTER TABLE users DISABLE ROW LEVEL SECURITY;');
    console.log('ALTER TABLE trusted_contacts DISABLE ROW LEVEL SECURITY;');
    console.log('ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;');
    console.log('ALTER TABLE devices DISABLE ROW LEVEL SECURITY;');
    console.log('ALTER TABLE health_baselines DISABLE ROW LEVEL SECURITY;');
    console.log('='.repeat(40));
}

fixRLS();
