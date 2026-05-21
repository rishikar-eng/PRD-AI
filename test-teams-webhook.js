/**
 * Test script to verify a Microsoft Teams Power Automate webhook is working.
 *
 * Payload format: Adaptive Card v1.5 wrapped in the Power Automate message
 * envelope. The legacy MessageCard format used by Office 365 connectors is
 * retired and will fail with new "Workflows" webhooks.
 *
 * Usage:
 *   node test-teams-webhook.js <webhook-url>
 *
 * Example:
 *   node test-teams-webhook.js "https://prod-XX.westus.logic.azure.com:443/workflows/..."
 */

const webhookUrl = process.argv[2];

if (!webhookUrl) {
  console.error('❌ Error: Please provide the webhook URL as an argument');
  console.log('\nUsage:');
  console.log('  node test-teams-webhook.js "<webhook-url>"');
  process.exit(1);
}

const testMessage = {
  type: 'message',
  attachments: [
    {
      contentType: 'application/vnd.microsoft.card.adaptive',
      contentUrl: null,
      content: {
        $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
        type: 'AdaptiveCard',
        version: '1.5',
        body: [
          {
            type: 'TextBlock',
            text: 'Teams Webhook Test',
            size: 'Large',
            weight: 'Bolder',
            color: 'Accent',
            wrap: true,
          },
          {
            type: 'TextBlock',
            text: 'If you see this, your Power Automate webhook is working.',
            wrap: true,
            spacing: 'Small',
          },
          {
            type: 'FactSet',
            spacing: 'Medium',
            facts: [
              { title: 'Status:', value: 'Successfully configured' },
              { title: 'Timestamp:', value: new Date().toLocaleString() },
            ],
          },
          {
            type: 'TextBlock',
            text: 'You can now receive PRD input request notifications in this channel.',
            wrap: true,
            isSubtle: true,
            spacing: 'Medium',
          },
        ],
      },
    },
  ],
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
