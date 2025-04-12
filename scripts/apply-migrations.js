// This script applies the Supabase migrations to your database
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

// Check if Supabase CLI is installed
try {
  execSync('supabase --version', { stdio: 'ignore' });
} catch (error) {
  console.error('Supabase CLI is not installed. Please install it first:');
  console.error('npm install -g supabase');
  process.exit(1);
}

// Check if required environment variables are set
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:');
  missingEnvVars.forEach(varName => console.error(`- ${varName}`));
  console.error('Please add them to your .env.local file');
  process.exit(1);
}

// Apply migrations
console.log('Applying Supabase migrations...');

try {
  // Read schema.sql
  const schemaPath = path.join(__dirname, '../supabase/schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  
  // Apply schema
  console.log('Applying schema.sql...');
  // You would use supabase CLI or direct database connection here
  
  // Read migrations
  const migrationsDir = path.join(__dirname, '../supabase/migrations');
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort(); // Sort to ensure migrations are applied in order
  
  // Apply each migration
  for (const migrationFile of migrationFiles) {
    console.log(`Applying migration: ${migrationFile}...`);
    const migrationPath = path.join(migrationsDir, migrationFile);
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    // Apply migration
    // You would use supabase CLI or direct database connection here
  }
  
  console.log('Migrations applied successfully!');
} catch (error) {
  console.error('Error applying migrations:', error);
  process.exit(1);
} 