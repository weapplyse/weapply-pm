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
    console.log('⚠️  No signature verification (secret not configured)');
    return true;
  }

  const hmac = crypto.createHmac('sha256', secret);
  const expectedSignature = hmac.update(payload).digest('hex');
  
  try {
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );

    if (!isValid) {
      console.error('❌ Webhook signature verification failed');
    }

    return isValid;
  } catch {
    return false;
  }
}

/**
 * Linear Webhook Handler
 * 
 * Flow:
 * 1. pm@weapply.se → Linear intake email → Linear creates ticket
 * 2. Linear webhook triggers this endpoint
 * 3. We refine the content with AI
 * 4. Update the Linear ticket with refined content
 */
router.post('/linear-webhook', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    // Get raw body for signature verification
    const rawBody = JSON.stringify(req.body);
    const signature = req.headers['linear-signature'] as string | undefined;
    
    // Verify signature
    if (config.linearWebhookSecret) {
      if (!verifyWebhookSignature(rawBody, signature, config.linearWebhookSecret)) {
        return res.status(401).json({ error: 'Invalid signature' });
      }
      console.log('✓ Signature verified');
    }

    const webhookData = req.body;
    
    // Only process issue creation events
    if (webhookData.type !== 'Issue' || webhookData.action !== 'create') {
      return res.status(200).json({ 
        message: 'Ignored - not an issue creation event',
        type: webhookData.type,
        action: webhookData.action
      });
    }

    const issueId = webhookData.data?.id;
    const issueIdentifier = webhookData.data?.identifier;
    const issueTitle = webhookData.data?.title;

    if (!issueId) {
      return res.status(400).json({ error: 'No issue ID in webhook payload' });
    }

    console.log(`\n📨 Processing issue ${issueIdentifier}: "${issueTitle}"`);

    // Fetch full issue details
    const issueResult = await getIssue(issueId);
    
    if (!issueResult.success || !issueResult.issue) {
      console.error(`❌ Could not fetch issue: ${issueResult.error}`);
      return res.status(404).json({ error: 'Issue not found', details: issueResult.error });
    }

    const issue = issueResult.issue;
    const emailContent = issue.description || issue.title;

    // Skip if already refined (check for our marker in description)
    if (issue.description?.includes('## Summary') && issue.description?.includes('**Original Email**')) {
      console.log('ℹ️  Issue already refined, skipping');
      return res.status(200).json({ 
        message: 'Skipped - issue already refined',
        issueIdentifier 
      });
    }

    // Check if this looks like an email-created issue or needs refinement
    const isFromEmail = 
      emailContent.includes('From:') ||
      emailContent.includes('mailto:') ||
      emailContent.includes('@') ||
      issue.title.includes('Fwd:') ||
      issue.title.includes('Re:') ||
      issue.title.includes('FW:') ||
      issue.title.includes('Fw:');

    if (!isFromEmail) {
      console.log('ℹ️  Issue not from email, skipping refinement');
      return res.status(200).json({ 
        message: 'Skipped - issue not created from email',
        issueIdentifier 
      });
    }

    console.log('🤖 Refining content with AI...');

    // Process and refine the email content
    const result = await processEmail(emailContent, {
      team: config.defaultLinearTeam,
      project: config.defaultLinearProject,
    });

    console.log(`✓ Refined: "${result.ticketData.title}"`);
    console.log(`  Summary: ${(result.refinedContent.summary || '').substring(0, 100)}...`);
    console.log(`  Action items: ${(result.refinedContent.actionItems || []).length}`);
    console.log(`  Labels: ${JSON.stringify(result.ticketData.labels || [])}`);
    console.log(`  Priority: ${result.ticketData.priority}`);

    // Update the Linear issue
    const updateResult = await updateLinearIssue(issueId, {
      title: result.ticketData.title,
      description: result.ticketData.description,
      labels: result.ticketData.labels,
      priority: result.ticketData.priority,
    });

    const duration = Date.now() - startTime;

    if (updateResult.success) {
      console.log(`✅ Updated ${issueIdentifier} in ${duration}ms\n`);
      
      res.json({
        success: true,
        issueIdentifier,
        refined: {
          title: result.ticketData.title,
          summary: result.refinedContent.summary || '',
          actionItems: result.refinedContent.actionItems || [],
          priority: result.ticketData.priority,
        },
        duration: `${duration}ms`,
      });
    } else {
      console.error(`❌ Failed to update: ${updateResult.error}`);
      res.status(500).json({
        success: false,
        error: 'Failed to update issue',
        details: updateResult.error,
        issueIdentifier,
      });
    }
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
