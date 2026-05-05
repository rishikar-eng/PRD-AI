import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

console.log('Testing Input Request flow...\n');

// Step 1: Get a project ID to test with
console.log('1. Fetching existing projects...');
const { data: projects } = await supabase
  .from('projects')
  .select('id, title')
  .limit(1)
  .single();

if (!projects) {
  console.error('❌ No projects found. Create a project first.');
  process.exit(1);
}

console.log(`✓ Using project: ${projects.title} (${projects.id})`);

// Step 2: Get team members to request from
console.log('\n2. Fetching team members...');
const { data: team } = await supabase
  .from('team_expertise')
  .select('*')
  .eq('active', true);

console.log(`✓ Found ${team.length} active team members:`);
team.forEach(member => {
  console.log(`  - ${member.user_name} (${member.role})`);
});

// Step 3: Create a test input request
console.log('\n3. Creating test input request...');
const testRequest = {
  prd_id: projects.id,
  stage: 'owner_review',
  stage_draft: '# Test PRD Draft\n\nThis is a test PRD for input requests.',
  requested_by: 'ojas@rian.io',
  requested_from: 'adwait.natekar@rian.io',
  question: 'Can you review the technical feasibility of using Lambda for audio conversion (files >10min)?',
  status: 'pending'
};

const { data: created, error: createError } = await supabase
  .from('input_requests')
  .insert(testRequest)
  .select()
  .single();

if (createError) {
  console.error('❌ Failed to create input request:', createError.message);
  process.exit(1);
}

console.log('✓ Input request created!');
console.log(`  ID: ${created.id}`);
console.log(`  From: ${created.requested_by}`);
console.log(`  To: ${created.requested_from}`);
console.log(`  Question: ${created.question}`);

// Step 4: Fetch input requests for this PRD
console.log('\n4. Fetching input requests for this PRD...');
const { data: requests } = await supabase
  .from('input_requests')
  .select('*')
  .eq('prd_id', projects.id);

console.log(`✓ Found ${requests.length} input request(s) for this PRD`);

// Step 5: Simulate response
console.log('\n5. Simulating expert response...');
const { data: updated, error: updateError } = await supabase
  .from('input_requests')
  .update({
    response: 'Lambda has a 15-minute timeout. For files >10min, we should use Fargate with SQS.',
    status: 'responded',
    responded_at: new Date().toISOString()
  })
  .eq('id', created.id)
  .select()
  .single();

if (updateError) {
  console.error('❌ Failed to update request:', updateError.message);
} else {
  console.log('✓ Response added!');
  console.log(`  Response: ${updated.response}`);
  console.log(`  Status: ${updated.status}`);
}

// Clean up - delete test request
console.log('\n6. Cleaning up test data...');
const { error: deleteError } = await supabase
  .from('input_requests')
  .delete()
  .eq('id', created.id);

if (!deleteError) {
  console.log('✓ Test request deleted');
}

console.log('\n✓ Input Request flow test complete!');
process.exit(0);
