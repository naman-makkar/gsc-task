const path = require('path');
// This script creates the report_intents table using the Supabase JS client
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.local') });
const { createClient } = require('@supabase/supabase-js');

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Required Supabase environment variables are missing.');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Executes a raw SQL query using Supabase RPC
 */
async function execSql(sqlQuery) {
  const { error } = await supabase.rpc('exec_sql', { sql_query: sqlQuery });
  if (error) {
    console.error(`Error executing SQL: ${sqlQuery}`, error);
    throw error;
  }
  console.log(`Successfully executed: ${sqlQuery.substring(0, 100)}...`);
}

async function manageReportIntentsTable() {
  console.log('Managing report_intents table...');
  
  try {
    // Define the table structure
    const tableSql = `
    CREATE TABLE IF NOT EXISTS report_intents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      report_id TEXT NOT NULL,
      query TEXT NOT NULL,
      intent TEXT NOT NULL,
      category TEXT,
      funnel_stage TEXT,
      main_keywords JSONB, -- Use JSONB for flexibility with keywords array
      analyzed_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(query) -- Ensures we don't store duplicate analysis for the same query
    );
    `;
    
    // Create the table if it doesn't exist
    await execSql(tableSql);
    
    // Define columns to check/add
    const columns = [
      { name: 'category', type: 'TEXT' },
      { name: 'funnel_stage', type: 'TEXT' },
      { name: 'main_keywords', type: 'JSONB' }
    ];

    // Check and add columns if they don't exist
    for (const col of columns) {
      await execSql(`
      DO $$
      BEGIN
          IF NOT EXISTS (
              SELECT FROM information_schema.columns
              WHERE table_schema = 'public' AND table_name = 'report_intents' AND column_name = '${col.name}'
          ) THEN
              ALTER TABLE public.report_intents ADD COLUMN ${col.name} ${col.type};
              RAISE NOTICE 'Column ${col.name} added.';
          ELSE
              RAISE NOTICE 'Column ${col.name} already exists.';
          END IF;
      END $$;
      `);
    }
    
    console.log('✅ report_intents table schema is up to date');
  } catch (error) {
    console.error('❌ Failed to manage report_intents table:', error.message);
    process.exit(1);
  }
}

// Run the function
manageReportIntentsTable()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  }); 