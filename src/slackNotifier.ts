/**
 * Slack Notifier - Send urgent ticket alerts to Slack
 * 
 * Sends notifications to a configured Slack channel when urgent tickets are created.
 */

import { config } from './config.js';

export interface SlackNotification {
  issueIdentifier: string;
  title: string;
  summary: string;
  url: string;
  priority: number;
  sender?: string;
  clientLabel?: string;
}

/**
 * Send notification to Slack for urgent tickets
 */
export async function notifySlackUrgent(notification: SlackNotification): Promise<boolean> {
  if (!config.slackWebhookUrl) {
    console.log('⚠️  Slack webhook URL not configured, skipping notification');
    return false;
  }

  // Only notify for Urgent priority (1)
  if (notification.priority !== 1) {
    return false;
  }

  try {
    const message = buildSlackMessage(notification);
    
    const response = await fetch(config.slackWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (response.ok) {
      console.log(`🔔 Slack notification sent for ${notification.issueIdentifier}`);
      return true;
    } else {
      console.error(`❌ Slack notification failed: ${response.status} ${response.statusText}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Slack notification error:', error);
    return false;
  }
}

/**
 * Build Slack message payload
 */
function buildSlackMessage(notification: SlackNotification) {
  const clientInfo = notification.clientLabel ? ` • ${notification.clientLabel}` : '';
  const senderInfo = notification.sender ? `\n_From: ${notification.sender}_` : '';
  
  return {
    text: `🚨 URGENT: ${notification.title}`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `🚨 *URGENT TICKET* <!here>\n\n*<${notification.url}|${notification.issueIdentifier}: ${notification.title}>*${clientInfo}${senderInfo}`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: notification.summary.length > 200 
            ? notification.summary.substring(0, 200) + '...' 
            : notification.summary,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '📋 View Ticket',
              emoji: true,
            },
            url: notification.url,
            style: 'primary',
          },
        ],
      },
      {
        type: 'divider',
      },
    ],
  };
}

/**
 * Test Slack connection
 */
export async function testSlackConnection(): Promise<boolean> {
  if (!config.slackWebhookUrl) {
    return false;
  }

  try {
    const response = await fetch(config.slackWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: '✅ Weapply PM Slack integration test successful!',
      }),
    });

    return response.ok;
  } catch {
    return false;
  }
}
