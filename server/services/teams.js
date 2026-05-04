/**
 * Microsoft Teams Integration Service
 * Purpose: Send input request notifications to team members via Teams webhooks
 */

/**
 * Sends an input request notification to Microsoft Teams
 * @param {Object} params
 * @param {string} params.requestedFromName - Name of person being asked
 * @param {string} params.requestedByName - Name of person requesting
 * @param {string} params.prdTitle - PRD title
 * @param {string} params.stage - Stage name (human-readable)
 * @param {string} params.question - The question being asked
 * @param {string} params.stageDraft - Current AI draft (optional)
 * @param {string} params.responseUrl - URL to respond to the request
 * @returns {Promise<boolean>} Success status
 */
export async function sendInputRequestToTeams({
  requestedFromName,
  requestedByName,
  prdTitle,
  stage,
  question,
  stageDraft,
  responseUrl
}) {
  if (!process.env.TEAMS_WEBHOOK_URL) {
    console.warn('TEAMS_WEBHOOK_URL not configured. Skipping Teams notification.');
    return false;
  }

  // Truncate draft if too long (Teams has message size limits)
  const truncatedDraft = stageDraft
    ? stageDraft.length > 500
      ? stageDraft.substring(0, 500) + '...'
      : stageDraft
    : null;

  // Build Teams MessageCard (Legacy card format - works everywhere)
  const message = {
    "@type": "MessageCard",
    "@context": "https://schema.org/extensions",
    "summary": `Input Request from ${requestedByName}`,
    "themeColor": "f472b6", // Rian pink
    "title": `🔔 Input Request: ${stage}`,
    "sections": [
      {
        "activityTitle": `${requestedByName} needs your input`,
        "activitySubtitle": `PRD: ${prdTitle}`,
        "activityImage": "https://www.rian.io/favicon.ico", // Rian logo
        "facts": [
          {
            "name": "Stage:",
            "value": stage
          },
          {
            "name": "Question:",
            "value": question
          }
        ],
        "text": truncatedDraft ? `**Current Draft:**\n\n${truncatedDraft}` : null
      }
    ],
    "potentialAction": [
      {
        "@type": "OpenUri",
        "name": "📝 View PRD & Respond",
        "targets": [
          {
            "os": "default",
            "uri": responseUrl
          }
        ]
      }
    ]
  };

  try {
    const response = await fetch(process.env.TEAMS_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Teams webhook error:', response.status, errorText);
      return false;
    }

    console.log('Teams notification sent successfully to', requestedFromName);
    return true;
  } catch (error) {
    console.error('Failed to send Teams notification:', error);
    return false;
  }
}

/**
 * Sends a notification when input is incorporated into PRD
 * @param {Object} params
 * @param {string} params.requestedByName - Name of person who requested input
 * @param {string} params.requestedFromName - Name of person who provided input
 * @param {string} params.prdTitle - PRD title
 * @param {string} params.stage - Stage name
 * @param {string} params.prdUrl - URL to view the updated PRD
 */
export async function notifyInputIncorporated({
  requestedByName,
  requestedFromName,
  prdTitle,
  stage,
  prdUrl
}) {
  if (!process.env.TEAMS_WEBHOOK_URL) {
    return false;
  }

  const message = {
    "@type": "MessageCard",
    "@context": "https://schema.org/extensions",
    "summary": `Your input was incorporated`,
    "themeColor": "4ade80", // Green
    "title": `✅ Input Incorporated`,
    "sections": [
      {
        "activityTitle": `${requestedByName} incorporated your input`,
        "activitySubtitle": `PRD: ${prdTitle}`,
        "facts": [
          {
            "name": "Stage:",
            "value": stage
          },
          {
            "name": "Status:",
            "value": "AI regenerated with your input"
          }
        ]
      }
    ],
    "potentialAction": [
      {
        "@type": "OpenUri",
        "name": "View Updated PRD",
        "targets": [
          {
            "os": "default",
            "uri": prdUrl
          }
        ]
      }
    ]
  };

  try {
    await fetch(process.env.TEAMS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
    return true;
  } catch (error) {
    console.error('Failed to send Teams notification:', error);
    return false;
  }
}
