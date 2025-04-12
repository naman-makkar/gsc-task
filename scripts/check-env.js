// This script checks if necessary environment variables are set
require('dotenv').config({ path: '.env.local' });

console.log('Checking environment variables...');

const envVars = {
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing',
  
  // Google OAuth
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? '✅ Set' : '❌ Missing',
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI ? '✅ Set' : '❌ Missing',
  
  // JWT
  JWT_SECRET: process.env.JWT_SECRET ? '✅ Set' : '❌ Missing',
};

console.table(envVars);

// Check if any variables are missing
const missingVars = Object.entries(envVars).filter(([_, value]) => value === '❌ Missing');

if (missingVars.length > 0) {
  console.error('\n❌ Missing environment variables detected. Please add them to your .env.local file.');
  process.exit(1);
} else {
  console.log('\n✅ All environment variables are set!');
}

// Quick sanity check on URL values
if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('http')) {
  console.warn('⚠️ NEXT_PUBLIC_SUPABASE_URL does not start with http. This might be an issue.');
}

if (process.env.GOOGLE_REDIRECT_URI && !process.env.GOOGLE_REDIRECT_URI.startsWith('http')) {
  console.warn('⚠️ GOOGLE_REDIRECT_URI does not start with http. This might be an issue.');
} 