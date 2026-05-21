/**
 * Microsoft Teams Integration Service
 *
 * Sends notifications to a Teams channel via a Power Automate "Workflows" webhook.
 *
 * Setup (one-time per channel, by a Microsoft 365 admin):
 *   1. In Teams, open the target channel.
 *   2. Power Automate → Create from template:
 *      "Post to a channel when a webhook request is received".
 *   3. Save the flow and copy the generated HTTP POST URL.
 *   4. Set TEAMS_WEBHOOK_URL to that URL in the backend environment.
 *
 * Payload format: Adaptive Card v1.5 wrapped in the Power Automate message
 * envelope. The legacy Office 365 connector (MessageCard) format is retired
 * and is no longer accepted by new webhooks.
 */

const ADAPTIVE_CARD_VERSION = '1.5';
const DRAFT_PREVIEW_MAX_LENGTH = 500;

function adaptiveCardEnvelope({ body, actions }) {
  return {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        contentUrl: null,
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: ADAPTIVE_CARD_VERSION,
          body,
          actions,
        },
      },
    ],
  };
}

async function postToWebhook(payload) {
  const response = await fetch(process.env.TEAMS_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    console.error('Teams webhook error:', response.status, errorText);
    return false;
  }
  return true;
}

/**
 * Send an input-request notification to a Teams channel.
 */
export async function sendInputRequestToTeams({
  requestedFromName,
  requestedByName,
  prdTitle,
  stage,
  question,
  stageDraft,
  responseUrl,
}) {
  if (!process.env.TEAMS_WEBHOOK_URL) {
    console.warn('TEAMS_WEBHOOK_URL not configured. Skipping Teams notification.');
    return false;
  }

  const truncatedDraft = stageDraft && stageDraft.length > DRAFT_PREVIEW_MAX_LENGTH
    ? stageDraft.substring(0, DRAFT_PREVIEW_MAX_LENGTH) + '…'
    : stageDraft;

  const body = [
    {
      type: 'TextBlock',
      text: `Input Request: ${stage}`,
      size: 'Large',
      weight: 'Bolder',
      color: 'Accent',
      wrap: true,
    },
    {
      type: 'TextBlock',
      text: `${requestedByName} needs your input`,
      weight: 'Bolder',
      wrap: true,
      spacing: 'Small',
    },
    {
      type: 'TextBlock',
      text: `PRD: ${prdTitle}`,
      isSubtle: true,
      size: 'Small',
      wrap: true,
      spacing: 'None',
    },
    {
      type: 'FactSet',
      spacing: 'Medium',
      facts: [
        { title: 'Stage:', value: stage },
        { title: 'Question:', value: question },
      ],
    },
  ];

  if (truncatedDraft) {
    body.push(
      {
        type: 'TextBlock',
        text: 'Current Draft',
        weight: 'Bolder',
        spacing: 'Medium',
        wrap: true,
      },
      {
        type: 'TextBlock',
        text: truncatedDraft,
        isSubtle: true,
        size: 'Small',
        wrap: true,
        spacing: 'Small',
      },
    );
  }

  const payload = adaptiveCardEnvelope({
    body,
    actions: [
      {
        type: 'Action.OpenUrl',
        title: 'View PRD & Respond',
        url: responseUrl,
      },
    ],
  });

  try {
    const ok = await postToWebhook(payload);
    if (ok) {
      console.log('Teams notification sent successfully to', requestedFromName);
    }
    return ok;
  } catch (error) {
    console.error('Failed to send Teams notification:', error);
    return false;
  }
}

/**
 * Notify the responder that their input has been incorporated into the PRD.
 */
export async function notifyInputIncorporated({
  requestedByName,
  requestedFromName,
  prdTitle,
  stage,
  prdUrl,
}) {
  if (!process.env.TEAMS_WEBHOOK_URL) {
    return false;
  }

  const payload = adaptiveCardEnvelope({
    body: [
      {
        type: 'TextBlock',
        text: 'Input Incorporated',
        size: 'Large',
        weight: 'Bolder',
        color: 'Good',
        wrap: true,
      },
      {
        type: 'TextBlock',
        text: `${requestedByName} incorporated your input on "${prdTitle}"`,
        wrap: true,
        spacing: 'Small',
      },
      {
        type: 'FactSet',
        spacing: 'Medium',
        facts: [
          { title: 'Stage:', value: stage },
          { title: 'Status:', value: 'PRD regenerated with your input' },
        ],
      },
    ],
    actions: [
      {
        type: 'Action.OpenUrl',
        title: 'View Updated PRD',
        url: prdUrl,
      },
    ],
  });

  try {
    return await postToWebhook(payload);
  } catch (error) {
    console.error('Failed to send Teams notification:', error);
    return false;
  }
}
