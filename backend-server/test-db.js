import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function test() {
    console.log('--- Database Connection Test ---');
    console.log('URL:', SUPABASE_URL);

    // Test 3: List columns of 'users'
    console.log('\n--- Test 3: Column Names ---');
    const { data: colTest, error: colTestError } = await supabase
        .from('users')
        .select('*')
        .limit(1);

    if (colTestError) {
        console.error('❌ Column test failed:', colTestError.message);
    } else {
        // We select no rows but we get the structure if we select from a table with data.
        // Since it's empty, we'll try a select on a non-existent column to see the DB error.
        const { error: errorWithColumns } = await supabase
            .from('users')
            .select('non_existent_column_test_hack');

        // Postgres usually returns 'column "..." does not exist' and then lists some hints.
        if (errorWithColumns) {
            console.log('Postgres Error Info:', errorWithColumns.message);
        }
    }

    // Test 2: Try a dummy insert
    console.log('\n--- Test 2: Dummy Insert ---');
    const dummyPhone = '+910000000000';
    const { data: dummy, error: insertError } = await supabase
        .from('users')
        .insert([{
            phone: dummyPhone,
            name: 'Test user',
            created_at: new Date()
        }]);

    if (insertError) {
        console.error('❌ Insert failed:', insertError.message);
        console.error('Details:', insertError.details);
        console.error('Hint:', insertError.hint);
    } else {
        console.log('✅ Dummy insert worked! (Make sure to delete this user)');
        // Clean up
        await supabase.from('users').delete().eq('phone', dummyPhone);
    }

    // Test 1: Fetch from 'users' table
    const { data: users, error: tableError } = await supabase
        .from('users')
        .select('*')
        .limit(1);

    if (tableError) {
        console.error('❌ Table error (users):', tableError.message);
        if (tableError.code === 'PGRST116') {
            console.log('💡 Table "users" exists but is empty.');
        } else if (tableError.code === '42P01') {
            console.error('💡 Table "users" DOES NOT EXIST.');
        }
    } else {
        console.log('✅ Table "users" exists and connection is working.');
        console.log('Column structure hint:', Object.keys(users[0] || {}).join(', '));
    }

    // Test 2: List all tables (optional info)
    const { data: list, error: listError } = await supabase
        .from('_rpc_call_that_wont_work_anyway_but_just_want_info')
        .select('*');

    // Just try to fetch a known table like trusted_contacts too
    const { data: contacts, error: contactError } = await supabase
        .from('trusted_contacts')
        .select('*')
        .limit(1);

    if (contactError) {
        console.error('❌ Table error (trusted_contacts):', contactError.message);
    } else {
        console.log('✅ Table "trusted_contacts" exists.');
    }
}

test();
