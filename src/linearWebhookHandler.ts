import express, { Request, Response } from 'express';
import crypto from 'crypto';
import { processEmail } from './emailHandler.js';
import { updateLinearIssue, getIssue } from './linearApiClient.js';
import { config } from './config.js';

const router = express.Router();

/**
 * Verify Linear webhook signature
 */
function verifyWebhookSignature(
  payload: string,
  signature: string | undefined,
  secret: string
): boolean {
  if (!signature || !secret) {
    console.log('No signature or secret provided, skipping verification');
    return true; // Skip verification if not configured
  }

  const hmac = crypto.createHmac('sha256', secret);
  const expectedSignature = hmac.update(payload).digest('hex');
  
  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );

  if (!isValid) {
    console.error('Webhook signature verification failed');
  }

  return isValid;
}

/**
 * Webhook endpoint for Linear to trigger when issues are created from email
 * 
 * Flow:
 * 1. pm@weapply.se forwards to Linear email → Linear creates ticket
 * 2. Linear webhook triggers this endpoint
 * 3. We fetch the ticket details and original email
 * 4. Refine with AI and update the ticket
 */
router.post('/linear-webhook', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  try {
    // Get raw body for signature verification
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const signature = req.headers['linear-signature'] as string | undefined;
    
    // Verify signature if secret is configured
    if (config.linearWebhookSecret) {
      if (!verifyWebhookSignature(rawBody, signature, config.linearWebhookSecret)) {
        return res.status(401).json({ error: 'Invalid signature' });
      }
      console.log('✓ Webhook signature verified');
    }

    const webhookData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    
    console.log('Received Linear webhook:', JSON.stringify(webhookData, null, 2));
    
    // Linear webhook payload structure
    // Check if this is an issue created event
    if (webhookData.type !== 'Issue' || webhookData.action !== 'create') {
      return res.status(200).json({ message: 'Not an issue creation event' });
    }

    const issueId = webhookData.data?.id;
    const issueIdentifier = webhookData.data?.identifier;

    if (!issueId) {
      return res.status(400).json({ error: 'No issue ID provided' });
    }

    console.log(`Processing Linear issue ${issueIdentifier} (${issueId}) created from email`);

    // Fetch full issue details to get description
    const issueResult = await getIssue(issueId);
    
    if (!issueResult.success || !issueResult.issue) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    const issue = issueResult.issue;

    // Check if issue was created from email
    // Linear includes email content in description when created from email
    const isFromEmail = issue.description?.includes('Original email') || 
                       issue.description?.includes('From:') ||
                       issue.description?.includes('@') ||
                       issue.title?.includes('Fwd:') ||
                       issue.title?.includes('Re:');

    if (!isFromEmail) {
      console.log('Issue not created from email, skipping refinement');
      return res.status(200).json({ message: 'Issue not created from email' });
    }

    // Extract email content from issue description
    // Linear includes the full email in the description when created from email
    const emailContent = issue.description || issue.title;

    console.log('Processing email content for refinement...');

    // Process and refine the email content
    const result = await processEmail(emailContent, {
      team: config.defaultLinearTeam,
      project: config.defaultLinearProject,
    });

    console.log(`Refined email content: ${result.ticketData.title}`);

    // Update the Linear issue with refined content
    const updateResult = await updateLinearIssue(issueId, {
      title: result.ticketData.title,
      description: result.ticketData.description,
      labels: result.ticketData.labels,
      priority: result.ticketData.priority,
    });

    if (updateResult.success) {
      console.log(`✓ Refined and updated issue ${issueIdentifier}`);
    } else {
      console.error(`✗ Failed to update issue: ${updateResult.error}`);
    }

    res.json({
      success: true,
      issueId,
      issueIdentifier,
      refined: {
        title: result.ticketData.title,
        summary: result.refinedContent.summary,
        actionItems: result.refinedContent.actionItems,
      },
      updateResult,
    });
  } catch (error) {
    console.error('Error processing Linear webhook:', error);
    res.status(500).json({
      error: 'Failed to process webhook',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
