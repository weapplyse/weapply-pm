import express, { Request, Response } from 'express';
import crypto from 'crypto';
import { processEmail } from './emailHandler.js';
import { updateLinearIssue, getIssue, getUserIdByEmail, addIssueToProject, getTeamId, createSubIssue, removeFromProject, getOrCreateClientLabel, checkClientLabelExists } from './linearApiClient.js';
import { config } from './config.js';
import { extractEmailMetadata, getSourceLabels, getClientLabelName, shouldCreateClientLabel, getTargetProjectId, EmailMetadata, PROJECT_IDS } from './emailRouting.js';
import { analyzeAttachments, formatAttachmentsMarkdown, generateAttachmentSubIssues, AttachmentAnalysis } from './attachmentHandler.js';
import { EmailAttachment } from './types.js';

const router = express.Router();

/**
 * Extract attachment information from Linear email description
 * Linear includes attachments as links like: [filename.pdf](url) or mentions them in text
 */
function extractAttachmentInfo(content: string): EmailAttachment[] {
  const attachments: EmailAttachment[] = [];
  
  // Pattern 1: Markdown links that look like attachments
  // [filename.ext](url) or [📎 filename.ext](url)
  const linkPattern = /\[(?:📎\s*)?([^\]]+\.[a-zA-Z0-9]+)\]\([^)]+\)/g;
  let match;
  
  while ((match = linkPattern.exec(content)) !== null) {
    const filename = match[1].trim();
    // Skip common non-attachment links
    if (!filename.match(/\.(html|htm|com|org|net|io)$/i)) {
      attachments.push({
        filename,
        contentType: guessContentType(filename),
        content: Buffer.from(''), // Placeholder - we don't have actual content
        size: 0, // Unknown size from Linear
      });
    }
  }
  
  // Pattern 2: Plain text mentions of attachments
  // "Attached: filename.ext" or "Attachment: filename.ext"
  const attachedPattern = /(?:attached?|attachment):\s*([^\s]+\.[a-zA-Z0-9]+)/gi;
  while ((match = attachedPattern.exec(content)) !== null) {
    const filename = match[1].trim();
    if (!attachments.some(a => a.filename === filename)) {
      attachments.push({
        filename,
        contentType: guessContentType(filename),
        content: Buffer.from(''),
        size: 0,
      });
    }
  }
  
  // Pattern 3: Detect filenames in brackets or after common phrases
  // "see [filename.pdf]" or "please review filename.xlsx"
  const filePattern = /(?:see|review|check|attached|find)\s+(?:\[)?([a-zA-Z0-9_-]+\.[a-zA-Z0-9]+)(?:\])?/gi;
  while ((match = filePattern.exec(content)) !== null) {
    const filename = match[1].trim();
    const validExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip', 'png', 'jpg', 'jpeg', 'gif', 'sketch', 'fig', 'psd', 'ai'];
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext && validExtensions.includes(ext) && !attachments.some(a => a.filename === filename)) {
      attachments.push({
        filename,
        contentType: guessContentType(filename),
        content: Buffer.from(''),
        size: 0,
      });
    }
  }
  
  return attachments;
}

/**
 * Guess content type from filename extension
 */
function guessContentType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const types: Record<string, string> = {
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'zip': 'application/zip',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'sketch': 'application/x-sketch',
    'fig': 'application/x-figma',
    'psd': 'image/vnd.adobe.photoshop',
    'ai': 'application/postscript',
    'txt': 'text/plain',
    'md': 'text/markdown',
    'csv': 'text/csv',
    'json': 'application/json',
    'html': 'text/html',
    'css': 'text/css',
    'js': 'text/javascript',
    'ts': 'text/typescript',
  };
  return types[ext || ''] || 'application/octet-stream';
}

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
 * 5. Route to appropriate project (Mail Inbox, Clients, External)
 * 6. Add client labels for external senders
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
    
    // Handle different event types
    if (webhookData.type !== 'Issue') {
      return res.status(200).json({ 
        message: 'Ignored - not an issue event',
        type: webhookData.type,
        action: webhookData.action
      });
    }

    // Check for manual refinement trigger (issue added to Refine Queue project)
    const isManualRefinement = 
      webhookData.action === 'update' && 
      webhookData.data?.projectId === PROJECT_IDS.REFINE_QUEUE;

    // Only process issue creation events OR manual refinement
    if (webhookData.action !== 'create' && !isManualRefinement) {
      return res.status(200).json({ 
        message: 'Ignored - not an issue creation or refinement event',
        type: webhookData.type,
        action: webhookData.action
      });
    }

    if (isManualRefinement) {
      console.log('🪄 Manual refinement triggered via Refine Queue project');
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

    // Skip if already refined (check for our marker in description) - unless manual refinement
    if (!isManualRefinement && issue.description?.includes('## Summary') && issue.description?.includes('**Original Email**')) {
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

    // For manual refinement, always proceed regardless of source
    if (!isManualRefinement && !isFromEmail) {
      console.log('ℹ️  Issue not from email, skipping refinement');
      return res.status(200).json({ 
        message: 'Skipped - issue not created from email',
        issueIdentifier 
      });
    }
    
    // Store original content for manual refinement (to create sub-issue later)
    const originalTitle = issue.title;
    const originalDescription = issue.description || '';

    // Extract email metadata for routing
    const emailMetadata = extractEmailMetadata(emailContent, issue.title);
    
    console.log('📧 Email Metadata:');
    console.log(`  Sender: ${emailMetadata.senderEmail} (${emailMetadata.isInternal ? 'internal' : 'external'})`);
    console.log(`  Forwarded: ${emailMetadata.isForwarded ? 'Yes' : 'No'}`);
    if (emailMetadata.isForwarded) {
      console.log(`  Forwarder: ${emailMetadata.forwarderEmail}`);
      console.log(`  Original sender: ${emailMetadata.originalSenderEmail || 'unknown'}`);
    }
    console.log(`  Route: ${emailMetadata.isInternalForward ? 'Internal Forward' : emailMetadata.isExternalDirect ? 'External Direct' : emailMetadata.isInternal ? 'Internal' : 'External'}`);

    // Extract attachment info from email content
    // Linear email intake includes attachments as links in the description
    const attachmentInfo = extractAttachmentInfo(emailContent);
    let attachmentAnalyses: AttachmentAnalysis[] = [];
    
    if (attachmentInfo.length > 0) {
      attachmentAnalyses = analyzeAttachments(attachmentInfo);
      console.log(`📎 Attachments detected: ${attachmentAnalyses.length}`);
      for (const att of attachmentAnalyses) {
        console.log(`  - ${att.icon} ${att.filename} (${att.size}) ${att.isActionable ? '⚡' : ''}`);
      }
    }

    console.log('🤖 Refining content with AI...');

    // Process and refine the email content
    const result = await processEmail(emailContent, {
      team: config.defaultLinearTeam,
      project: config.defaultLinearProject,
    });

    // Handle client labels (instead of client projects)
    let hasClientLabel = false;
    let clientLabelName: string | undefined;
    const additionalLabels: string[] = [];
    
    if (emailMetadata.clientDomain && shouldCreateClientLabel(emailMetadata.clientDomain)) {
      clientLabelName = getClientLabelName(emailMetadata.clientDomain);
      
      // Check if label exists or create it
      const labelResult = await getOrCreateClientLabel(clientLabelName);
      if (labelResult) {
        hasClientLabel = true;
        additionalLabels.push(clientLabelName);
        console.log(`  🏷️  Client label: ${clientLabelName} (${labelResult.created ? 'created' : 'existing'})`);
      }
    } else if (emailMetadata.isExternalDirect || (emailMetadata.isForwarded && !emailMetadata.isInternalForward)) {
      // External sender without a client domain (e.g., gmail) - add Unknown Sender label
      additionalLabels.push('Unknown Sender');
      console.log(`  🏷️  Adding Unknown Sender label`);
    }

    // Determine target project based on routing
    const targetProjectId = getTargetProjectId(emailMetadata, hasClientLabel);
    const projectNames: Record<string, string> = {
      [PROJECT_IDS.MAIL_INBOX]: 'Mail Inbox',
      [PROJECT_IDS.CLIENTS]: 'Clients',
      [PROJECT_IDS.EXTERNAL]: 'External',
      [PROJECT_IDS.REFINE_QUEUE]: 'Refine Queue',
    };
    console.log(`  📁 Target project: ${projectNames[targetProjectId] || targetProjectId}`);

    // Add source labels based on email routing
    const sourceLabels = getSourceLabels(emailMetadata);
    
    // Filter out any source labels that AI might have suggested (we add them ourselves)
    const aiLabels = (result.ticketData.labels || []).filter(l => 
      !['Email', 'Internal Forward', 'External Direct', 'Forwarded', 'Internal', 'Unknown Sender'].includes(l) &&
      !l.startsWith('Client:') // Don't duplicate client labels
    );
    
    // Combine: AI labels first, then additional labels (client/unknown), then source labels
    // Limit to avoid conflicts
    const allLabels = [...aiLabels.slice(0, 3), ...additionalLabels, ...sourceLabels];
    // Remove duplicates
    const uniqueLabels = [...new Set(allLabels)];

    // Add attachment section to description if attachments exist
    let finalDescription = result.ticketData.description;
    if (attachmentAnalyses.length > 0) {
      finalDescription += formatAttachmentsMarkdown(attachmentAnalyses);
    }

    console.log(`✓ Refined: "${result.ticketData.title}"`);
    console.log(`  Summary: ${(result.refinedContent.summary || '').substring(0, 100)}...`);
    console.log(`  Action items: ${(result.refinedContent.actionItems || []).length}`);
    console.log(`  Labels: ${JSON.stringify(uniqueLabels)}`);
    console.log(`  Priority: ${result.ticketData.priority}`);
    if (attachmentAnalyses.length > 0) {
      console.log(`  Attachments: ${attachmentAnalyses.length}`);
    }

    // Determine assignee based on email routing
    let assigneeEmail: string | undefined;
    if (emailMetadata.assignToEmail) {
      // Check if this email belongs to a Linear user
      const userId = await getUserIdByEmail(emailMetadata.assignToEmail);
      if (userId) {
        assigneeEmail = emailMetadata.assignToEmail;
        console.log(`  👤 Auto-assigning to: ${assigneeEmail}`);
      }
    }

    // Update the Linear issue
    const updateResult = await updateLinearIssue(issueId, {
      title: result.ticketData.title,
      description: finalDescription,
      labels: uniqueLabels,
      priority: result.ticketData.priority,
      assignee: assigneeEmail,
    });

    // Add to target project (not client project anymore)
    if (updateResult.success && !isManualRefinement) {
      await addIssueToProject(issueId, targetProjectId);
      console.log(`  ✓ Added to ${projectNames[targetProjectId]}`);
    }

    // Create sub-issues for actionable attachments
    if (updateResult.success && attachmentAnalyses.length > 0) {
      const subIssues = generateAttachmentSubIssues(attachmentAnalyses);
      const actionableCount = subIssues.length;
      
      if (actionableCount > 0) {
        console.log(`📋 Creating ${actionableCount} attachment sub-issue(s)...`);
        
        const teamId = await getTeamId(config.defaultLinearTeam);
        if (teamId) {
          for (const subIssue of subIssues) {
            try {
              const subResult = await createSubIssue(
                teamId,
                issueId,
                subIssue.title,
                subIssue.description,
                subIssue.labels
              );
              if (subResult.success) {
                console.log(`  ✓ Created: ${subIssue.title.substring(0, 50)}...`);
              }
            } catch (err) {
              console.error(`  ✗ Failed to create sub-issue: ${err}`);
            }
          }
        }
      }
    }

    // For manual refinement: create sub-issue with original content and remove from Refine Queue
    if (isManualRefinement && updateResult.success) {
      console.log('📝 Creating sub-issue with original content...');
      
      const teamId = await getTeamId(config.defaultLinearTeam);
      if (teamId) {
        // Create sub-issue with original content
        const originalSubIssue = await createSubIssue(
          teamId,
          issueId,
          `Original: ${originalTitle.substring(0, 60)}`,
          `## Original Content (Pre-Refinement)\n\n**Original Title:** ${originalTitle}\n\n**Original Description:**\n\n${originalDescription || '(No description)'}`,
          ['Documentation']
        );
        
        if (originalSubIssue.success) {
          console.log('  ✓ Created original content sub-issue');
        }
        
        // Remove from Refine Queue by clearing the project
        await removeFromProject(issueId);
        console.log('  ✓ Removed from Refine Queue');
      }
    }

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
          targetProject: projectNames[targetProjectId],
          clientLabel: clientLabelName,
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
