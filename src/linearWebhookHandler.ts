import express, { Request, Response } from 'express';
import crypto from 'crypto';
import { processEmail } from './emailHandler.js';
import { updateLinearIssue, getIssue, getUserIdByEmail, addIssueToProject, getTeamId, createSubIssue, removeFromProject, getOrCreateClientLabel, checkClientLabelExists, linkRelatedIssues, hasSubIssueWithPrefix } from './linearApiClient.js';
import { config } from './config.js';
import { extractEmailMetadata, getSourceLabels, getClientLabelName, shouldCreateClientLabel, getTargetProjectId, EmailMetadata, PROJECT_IDS } from './emailRouting.js';
import { analyzeAttachments, formatAttachmentsMarkdown, generateAttachmentSubIssues, AttachmentAnalysis } from './attachmentHandler.js';
import { EmailAttachment } from './types.js';
import { findRelatedTickets, recordTicket, formatRelatedTicketsMarkdown, extractMessageId, RelatedTicket } from './threadTracker.js';
import { analyzeImagesInContent, formatImageAnalysisMarkdown, ImageAnalysis } from './imageAnalyzer.js';
import { notifySlackUrgent } from './slackNotifier.js';

const router = express.Router();

/**
 * Processing cache to prevent duplicate processing of the same issue
 * Maps issueId -> timestamp when processing started
 */
const processingCache = new Map<string, number>();
const PROCESSING_COOLDOWN_MS = 30000; // 30 seconds cooldown

/**
 * Check if an issue is currently being processed or was recently processed
 */
function isRecentlyProcessed(issueId: string): boolean {
  const lastProcessed = processingCache.get(issueId);
  if (!lastProcessed) return false;
  
  const elapsed = Date.now() - lastProcessed;
  return elapsed < PROCESSING_COOLDOWN_MS;
}

/**
 * Mark an issue as being processed
 */
function markAsProcessing(issueId: string): void {
  processingCache.set(issueId, Date.now());
  
  // Clean up old entries (older than 5 minutes)
  const fiveMinutesAgo = Date.now() - 300000;
  for (const [id, timestamp] of processingCache.entries()) {
    if (timestamp < fiveMinutesAgo) {
      processingCache.delete(id);
    }
  }
}

/**
 * Valid file extensions that we consider as attachments
 */
const VALID_ATTACHMENT_EXTENSIONS = [
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',  // Documents
  'zip', 'rar', '7z', 'tar', 'gz',                      // Archives
  'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp',    // Images
  'sketch', 'fig', 'psd', 'ai', 'xd',                   // Design files
  'txt', 'md', 'csv', 'json', 'xml',                    // Text/data
  'mp3', 'wav', 'mp4', 'mov', 'avi',                    // Media
];

/**
 * Check if a string looks like an actual file attachment
 */
function isValidAttachment(filename: string): boolean {
  // Skip email addresses
  if (filename.includes('@')) return false;
  
  // Skip URLs (www., http, etc.)
  if (filename.toLowerCase().startsWith('www.')) return false;
  if (filename.toLowerCase().startsWith('http')) return false;
  
  // Skip common domain TLDs that aren't file extensions
  const domainTLDs = ['com', 'org', 'net', 'io', 'se', 'no', 'dk', 'de', 'uk', 'fi', 
                      'fr', 'es', 'it', 'nl', 'be', 'at', 'ch', 'eu', 'co', 'us', 
                      'ca', 'au', 'nz', 'jp', 'cn', 'kr', 'ru', 'br', 'mx', 'in',
                      'nr', 'info', 'biz', 'app', 'dev'];
  
  const ext = filename.split('.').pop()?.toLowerCase();
  if (!ext) return false;
  
  // Must be a valid attachment extension, not a domain TLD
  if (domainTLDs.includes(ext)) return false;
  if (!VALID_ATTACHMENT_EXTENSIONS.includes(ext)) return false;
  
  return true;
}

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
    if (isValidAttachment(filename) && !attachments.some(a => a.filename === filename)) {
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
    if (isValidAttachment(filename) && !attachments.some(a => a.filename === filename)) {
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
    if (isValidAttachment(filename) && !attachments.some(a => a.filename === filename)) {
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
    const creatorId = webhookData.data?.creatorId;
    const currentProjectId = webhookData.data?.projectId;

    if (!issueId) {
      return res.status(400).json({ error: 'No issue ID in webhook payload' });
    }

    // Check if this issue was recently processed (prevent duplicate processing)
    if (isRecentlyProcessed(issueId)) {
      console.log(`⏳ Issue ${issueIdentifier} was recently processed, skipping (cooldown)`);
      return res.status(200).json({ 
        message: 'Skipped - issue recently processed (cooldown)',
        issueIdentifier 
      });
    }

    // Mark as processing immediately
    markAsProcessing(issueId);

    // Check if issue is from Slack Intake project (created via Slack integration)
    const isFromSlack = currentProjectId === PROJECT_IDS.SLACK_INTAKE;

    console.log(`\n📨 Processing issue ${issueIdentifier}: "${issueTitle}"`);
    if (isFromSlack) {
      console.log('💬 Issue created from Slack');
    }

    // Fetch full issue details
    const issueResult = await getIssue(issueId);
    
    if (!issueResult.success || !issueResult.issue) {
      console.error(`❌ Could not fetch issue: ${issueResult.error}`);
      return res.status(404).json({ error: 'Issue not found', details: issueResult.error });
    }

    const issue = issueResult.issue;
    const emailContent = issue.description || issue.title;

    // Skip if already refined (check for our marker in description)
    // For manual refinement: check if "## Summary" AND "## Action Items" are both present (refined format)
    const hasRefinedMarkers = issue.description?.includes('## Summary') && 
                              (issue.description?.includes('## Action Items') || issue.description?.includes('**Original Email**'));
    
    if (hasRefinedMarkers) {
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

    // For manual refinement or Slack issues, always proceed regardless of email patterns
    if (!isManualRefinement && !isFromEmail && !isFromSlack) {
      console.log('ℹ️  Issue not from email or Slack, skipping refinement');
      return res.status(200).json({ 
        message: 'Skipped - issue not created from email or Slack',
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

    // Extract attachment info from Linear issue attachments (not from description text)
    // Linear stores email attachments separately in the issue.attachments field
    let attachmentAnalyses: AttachmentAnalysis[] = [];
    
    if (issue.attachments && issue.attachments.length > 0) {
      console.log(`📎 Attachments found in Linear: ${issue.attachments.length}`);
      
      // Convert Linear attachments to EmailAttachment format
      const emailAttachments: EmailAttachment[] = issue.attachments
        .filter(att => {
          // Skip the "original email" attachment (usually has subtitle like "pelle@weapply.se")
          // We only want actual file attachments
          if (att.subtitle && att.subtitle.includes('@')) {
            return false;
          }
          
          // Extract filename from title or URL
          let filename = att.title;
          if (!filename || filename === att.subtitle) {
            // Try to extract from URL
            const urlMatch = att.url.match(/\/([^\/]+\.(pdf|doc|docx|xls|xlsx|csv|png|jpg|jpeg|gif|zip|txt|md|json|xml|ppt|pptx))(\?|$)/i);
            if (urlMatch) {
              filename = urlMatch[1];
            } else {
              // Fallback: use title or skip
              filename = att.title || 'unknown';
            }
          }
          
          // Validate it's a real attachment (not just a link)
          return isValidAttachment(filename);
        })
        .map(att => {
          // Extract filename from title or URL
          let filename = att.title;
          if (!filename || filename === att.subtitle) {
            const urlMatch = att.url.match(/\/([^\/]+\.(pdf|doc|docx|xls|xlsx|csv|png|jpg|jpeg|gif|zip|txt|md|json|xml|ppt|pptx))(\?|$)/i);
            if (urlMatch) {
              filename = urlMatch[1];
            } else {
              filename = att.title || 'unknown';
            }
          }
          
          return {
            filename,
            contentType: guessContentType(filename),
            content: Buffer.from(''), // We don't download the actual content
            size: 0, // Size unknown without downloading
          };
        });
      
      if (emailAttachments.length > 0) {
        attachmentAnalyses = analyzeAttachments(emailAttachments);
        console.log(`📎 Processed ${attachmentAnalyses.length} file attachment(s):`);
        for (const att of attachmentAnalyses) {
          console.log(`  - ${att.icon} ${att.filename} ${att.isActionable ? '⚡' : ''}`);
        }
      } else {
        console.log(`  ℹ️  No file attachments found (only email links)`);
      }
    } else {
      // Fallback: try to extract from description text (for backwards compatibility)
      const attachmentInfo = extractAttachmentInfo(emailContent);
      if (attachmentInfo.length > 0) {
        attachmentAnalyses = analyzeAttachments(attachmentInfo);
        console.log(`📎 Attachments detected from description: ${attachmentAnalyses.length}`);
        for (const att of attachmentAnalyses) {
          console.log(`  - ${att.icon} ${att.filename} (${att.size}) ${att.isActionable ? '⚡' : ''}`);
        }
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
    // For Slack issues, keep them in Slack Intake (don't re-route)
    const targetProjectId = isFromSlack 
      ? PROJECT_IDS.SLACK_INTAKE 
      : getTargetProjectId(emailMetadata, hasClientLabel);
    const projectNames: Record<string, string> = {
      [PROJECT_IDS.MAIL_INBOX]: 'Mail Inbox',
      [PROJECT_IDS.CLIENTS]: 'Clients',
      [PROJECT_IDS.EXTERNAL]: 'External',
      [PROJECT_IDS.REFINE_QUEUE]: 'Refine Queue',
      [PROJECT_IDS.SLACK_INTAKE]: 'Slack Intake',
    };
    console.log(`  📁 Target project: ${projectNames[targetProjectId] || targetProjectId}`);

    // Add source labels based on source type
    let sourceLabels: string[];
    if (isFromSlack) {
      // Slack-created issues get "Slack" label instead of email routing labels
      sourceLabels = ['Slack'];
    } else {
      sourceLabels = getSourceLabels(emailMetadata);
    }
    
    // Filter out any source labels that AI might have suggested (we add them ourselves)
    const aiLabels = (result.ticketData.labels || []).filter(l => 
      !['Email', 'Internal Forward', 'External Direct', 'Forwarded', 'Internal', 'Unknown Sender', 'Slack'].includes(l) &&
      !l.startsWith('Client:') && // Don't duplicate client labels
      !l.startsWith('Request Source') // Don't duplicate source labels (handled by getSourceLabels)
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

    // AI Image Analysis (WET-33) - analyze screenshots/mockups
    let imageAnalyses: ImageAnalysis[] = [];
    if (config.openaiApiKey) {
      imageAnalyses = await analyzeImagesInContent(emailContent, 3);
      if (imageAnalyses.length > 0) {
        finalDescription += formatImageAnalysisMarkdown(imageAnalyses);
        console.log(`🖼️  Analyzed ${imageAnalyses.length} image(s)`);
      }
    }

    // Thread tracking: Find related tickets (WET-31, WET-32)
    let relatedTickets: RelatedTicket[] = [];
    if (emailMetadata.senderEmail && !isFromSlack) {
      relatedTickets = findRelatedTickets(
        emailMetadata.senderEmail,
        issue.title,
        emailContent
      );
      
      if (relatedTickets.length > 0) {
        console.log(`🔗 Found ${relatedTickets.length} related ticket(s):`);
        for (const r of relatedTickets) {
          console.log(`   - ${r.issueIdentifier} (${r.confidence}): ${r.reason}`);
        }
        
        // Add related tickets section to description
        finalDescription += formatRelatedTicketsMarkdown(relatedTickets);
      }
    }

    console.log(`✓ Refined: "${result.ticketData.title}"`);
    console.log(`  Summary: ${(result.refinedContent.summary || '').substring(0, 100)}...`);
    console.log(`  Action items: ${(result.refinedContent.actionItems || []).length}`);
    console.log(`  Labels: ${JSON.stringify(uniqueLabels)}`);
    console.log(`  Priority: ${result.ticketData.priority}`);
    if (attachmentAnalyses.length > 0) {
      console.log(`  Attachments: ${attachmentAnalyses.length}`);
    }
    if (relatedTickets.length > 0) {
      console.log(`  Related: ${relatedTickets.length} ticket(s)`);
    }

    // Determine assignee based on source
    let assigneeId: string | undefined;
    let assigneeEmail: string | undefined;
    
    if (isFromSlack && creatorId) {
      // For Slack issues, assign to the creator
      assigneeId = creatorId;
      console.log(`  👤 Auto-assigning to creator (Slack): ${creatorId}`);
    } else if (emailMetadata.assignToEmail) {
      // For email issues, check if sender email belongs to a Linear user
      const userId = await getUserIdByEmail(emailMetadata.assignToEmail);
      if (userId) {
        assigneeEmail = emailMetadata.assignToEmail;
        console.log(`  👤 Auto-assigning to: ${assigneeEmail}`);
      }
    }

    // Update the Linear issue (move out of Triage to Backlog)
    const updateResult = await updateLinearIssue(issueId, {
      title: result.ticketData.title,
      description: finalDescription,
      labels: uniqueLabels,
      priority: result.ticketData.priority,
      assignee: assigneeEmail,
      assigneeId: assigneeId,
      state: 'Backlog',  // Move from Triage to Backlog after refinement
    });

    // Add to target project (not client project anymore)
    if (updateResult.success && !isManualRefinement) {
      await addIssueToProject(issueId, targetProjectId);
      console.log(`  ✓ Added to ${projectNames[targetProjectId]}`);
    }

    // Create sub-issues for actionable attachments (max 3 to prevent spam)
    const MAX_ATTACHMENT_SUBISSUES = 3;
    if (updateResult.success && attachmentAnalyses.length > 0) {
      const subIssues = generateAttachmentSubIssues(attachmentAnalyses);
      const limitedSubIssues = subIssues.slice(0, MAX_ATTACHMENT_SUBISSUES);
      
      if (limitedSubIssues.length > 0) {
        console.log(`📋 Creating ${limitedSubIssues.length} attachment sub-issue(s)${subIssues.length > MAX_ATTACHMENT_SUBISSUES ? ` (limited from ${subIssues.length})` : ''}...`);
        
        const teamId = await getTeamId(config.defaultLinearTeam);
        if (teamId) {
          for (const subIssue of limitedSubIssues) {
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

    // Link related issues and record for future tracking (WET-31, WET-32)
    if (updateResult.success && relatedTickets.length > 0) {
      console.log('🔗 Linking related issues...');
      for (const related of relatedTickets.filter(r => r.confidence === 'high')) {
        try {
          await linkRelatedIssues(issueId, related.issueId);
          console.log(`  ✓ Linked to ${related.issueIdentifier}`);
        } catch (err) {
          console.error(`  ✗ Failed to link: ${err}`);
        }
      }
    }

    // Record this ticket for future thread matching
    if (updateResult.success && emailMetadata.senderEmail) {
      const messageId = extractMessageId(emailContent);
      recordTicket(
        issueId,
        issueIdentifier,
        emailMetadata.senderEmail,
        issue.title,
        messageId
      );
    }

    // For manual refinement: create sub-issue with original content and remove from Refine Queue
    if (isManualRefinement && updateResult.success) {
      const teamId = await getTeamId(config.defaultLinearTeam);
      if (teamId) {
        // Check if "Original:" sub-issue already exists (prevent duplicates)
        const hasOriginalSubIssue = await hasSubIssueWithPrefix(issueId, 'Original:');
        
        if (!hasOriginalSubIssue) {
          console.log('📝 Creating sub-issue with original content...');
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
        } else {
          console.log('ℹ️  Original sub-issue already exists, skipping');
        }
        
        // Remove from Refine Queue by clearing the project
        await removeFromProject(issueId);
        console.log('  ✓ Removed from Refine Queue');
      }
    }

    const duration = Date.now() - startTime;

    if (updateResult.success) {
      console.log(`✅ Updated ${issueIdentifier} in ${duration}ms\n`);
      
      // Send Slack notification for urgent tickets (priority 1)
      if (result.ticketData.priority === 1) {
        const issueUrl = `https://linear.app/weapply/issue/${issueIdentifier}`;
        await notifySlackUrgent({
          issueIdentifier,
          title: result.ticketData.title,
          summary: result.refinedContent.summary || result.ticketData.title,
          url: issueUrl,
          priority: result.ticketData.priority,
          sender: emailMetadata.senderEmail,
          clientLabel: clientLabelName,
        });
      }
      
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
