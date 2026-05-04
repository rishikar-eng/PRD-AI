/**
 * Test script to verify Microsoft Teams webhook is working
 *
 * Usage:
 *   node test-teams-webhook.js <webhook-url>
 *
 * Example:
 *   node test-teams-webhook.js "https://rianio.webhook.office.com/webhookb2/..."
 */

const webhookUrl = process.argv[2];

if (!webhookUrl) {
  console.error('❌ Error: Please provide the webhook URL as an argument');
  console.log('\nUsage:');
  console.log('  node test-teams-webhook.js "<webhook-url>"');
  process.exit(1);
}

const testMessage = {
  "@type": "MessageCard",
  "@context": "https://schema.org/extensions",
  "summary": "Test Message from PRD Pipeline",
  "themeColor": "f472b6",
  "title": "🧪 Teams Webhook Test",
  "sections": [
    {
      "activityTitle": "PRD Pipeline Setup Test",
      "activitySubtitle": "If you see this, your webhook is working!",
      "facts": [
        {
          "name": "Status:",
          "value": "✅ Successfully configured"
        },
        {
          "name": "Timestamp:",
          "value": new Date().toLocaleString()
        }
      ],
      "text": "You can now receive PRD input request notifications in this channel."
    }
  ]
};

console.log('📤 Sending test message to Teams...\n');

fetch(webhookUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(testMessage),
})
  .then(response => {
    if (response.ok) {
      console.log('✅ SUCCESS! Check your Teams channel for the test message.');
      console.log('   The webhook is configured correctly.');
    } else {
      return response.text().then(text => {
        console.error('❌ FAILED! Status:', response.status);
        console.error('   Response:', text);
        console.log('\nTroubleshooting:');
        console.log('  1. Check that the webhook URL is correct');
        console.log('  2. Verify the webhook hasn\'t been removed from Teams');
        console.log('  3. Try creating a new webhook in Teams');
      });
    }
  })
  .catch(error => {
    console.error('❌ ERROR:', error.message);
    console.log('\nTroubleshooting:');
    console.log('  1. Check your internet connection');
    console.log('  2. Verify the webhook URL is valid');
  });
