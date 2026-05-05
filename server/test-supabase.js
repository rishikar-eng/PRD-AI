import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

console.log('Testing Supabase connection...');
console.log('URL:', process.env.SUPABASE_URL);

// Test 1: List tables
console.log('\n1. Checking projects table...');
const { data: projects, error: projectsError } = await supabase
  .from('projects')
  .select('*')
  .limit(5);

if (projectsError) {
  console.error('❌ Projects table error:', projectsError.message);
} else {
  console.log('✓ Projects table exists!');
  console.log(`  Found ${projects.length} projects`);
}

// Test 2: Check if input_requests table exists
console.log('\n2. Checking input_requests table...');
const { data: requests, error: requestsError } = await supabase
  .from('input_requests')
  .select('*')
  .limit(1);

if (requestsError) {
  console.error('❌ Input requests table error:', requestsError.message);
  console.log('  Table probably doesn\'t exist yet - need to run migration');
} else {
  console.log('✓ Input requests table exists!');
}

// Test 3: Check team_expertise table
console.log('\n3. Checking team_expertise table...');
const { data: team, error: teamError } = await supabase
  .from('team_expertise')
  .select('*');

if (teamError) {
  console.error('❌ Team expertise table error:', teamError.message);
  console.log('  Table probably doesn\'t exist yet - need to run migration');
} else {
  console.log('✓ Team expertise table exists!');
  console.log(`  Found ${team.length} team members`);
}

console.log('\n✓ Supabase connection test complete!');
process.exit(0);
