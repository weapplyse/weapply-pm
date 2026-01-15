import express, { Request, Response } from 'express';
import { processEmail } from './emailHandler.js';
import { updateLinearIssue, getIssue } from './linearApiClient.js';
import { config } from './config.js';

const router = express.Router();

/**
 * Webhook endpoint for Linear to trigger when issues are created from email
 * 
 * Flow:
 * 1. pm@weapply.se forwards to Linear email → Linear creates ticket
 * 2. Linear webhook triggers this endpoint
 * 3. We fetch the ticket details and original email
 * 4. Refine with AI and update the ticket
 */
router.post('/linear-webhook', async (req: Request, res: Response) => {
  try {
    const webhookData = req.body;
    
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
                       issue.description?.includes('@weapply.se');

    if (!isFromEmail) {
      // Not from email, skip refinement
      return res.status(200).json({ message: 'Issue not created from email' });
    }

    // Extract email content from issue description
    // Linear includes the full email in the description when created from email
    const emailContent = issue.description || issue.title;

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
