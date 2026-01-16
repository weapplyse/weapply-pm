import OpenAI from 'openai';
import { config } from './config.js';
import { EmailData, RefinedContent } from './types.js';
import { extractTextContent } from './emailParser.js';
import { analyzeUrgency, combinePriority, getPriorityName, UrgencyAnalysis } from './urgencyDetector.js';

const openai = new OpenAI({
  apiKey: config.openaiApiKey,
});

// Available labels for development agency - use exact names from Linear API
const AVAILABLE_LABELS = {
  // Type of work (pick ONE)
  type: [
    'Bug',           // Something broken
    'Feature',       // New functionality
    'Improvement',   // Enhancement to existing
    'Task',          // General work item
    'Support',       // Support request
    'Meeting',       // Meeting notes/follow-up
    'Documentation', // Docs updates
    'Maintenance',   // Regular maintenance
    'Hotfix',        // Urgent production fix
    'Refactor',      // Code refactoring
  ],
  // Department (pick ONE)
  dept: [
    'Development',   // Dev team
    'Design',        // Design/UX team
    'PM',  // Project management
    'Accounting',    // Finance/accounting
    'Sales',         // Sales/BD
    'Operations',    // Ops/DevOps
  ],
  // Client status (pick ONE if applicable)
  client: [
    'New Lead',      // Potential new client
    'Active Client', // Current paying client
    'Prospect',      // In sales pipeline
    'Former Client', // Past client
    'Internal',      // Internal company work
  ],
  // Tech stack (pick ONE)
  tech: [
    'Frontend',      // UI, React, browser
    'Backend',       // API, server, business logic
    'Mobile',        // iOS, Android, React Native
    'Database',      // PostgreSQL, data issues
    'Infrastructure',// AWS, servers, deployment
    'Integration',   // Third-party integrations
    'Security',      // Security related
    'AI/ML',         // AI/ML features
  ],
  // Project phase (pick ONE if applicable)
  phase: [
    'Discovery',     // Requirements gathering
    'Planning',      // Project planning
    'In Development',// Active development
    'Review',        // Code/client review
    'Testing',       // QA phase
    'Deployment',    // Launch
    'Post-Launch',   // Maintenance/support
  ],
  // Billing (pick if finance related)
  billing: [
    'Quote',         // Estimate needed
    'Invoice',       // Invoice related
    'Payment',       // Payment tracking
    'Contract',      // Contract/agreement
    'Overdue',       // Overdue payment
  ],
  // Source (auto-set for emails)
  source: [
    'Email',         // From email
    'Meeting Notes', // From meeting
    'Chat',          // From Slack/Teams
    'Phone',         // From phone call
    'Portal',        // From client portal
  ],
};

export async function refineEmailContent(email: EmailData): Promise<RefinedContent> {
  if (!config.enableAIRefinement || !config.openaiApiKey) {
    return basicRefinement(email);
  }

  const emailText = extractTextContent(email);
  const truncatedText = emailText.substring(0, config.maxEmailLength);
  
  // 🔥 Analyze urgency from content BEFORE AI refinement
  const urgencyAnalysis = analyzeUrgency(emailText, email.subject);
  console.log('🚨 Urgency Analysis:', {
    score: urgencyAnalysis.score,
    suggestedPriority: getPriorityName(urgencyAnalysis.suggestedPriority),
    keywords: urgencyAnalysis.keywords.slice(0, 5),
    reasons: urgencyAnalysis.reasons.slice(0, 3),
  });
  
  // Add urgency context to prompt if detected
  const urgencyContext = urgencyAnalysis.score >= 35 
    ? `\n\n⚠️ URGENCY DETECTED (score: ${urgencyAnalysis.score}/100):
- Detected keywords: ${urgencyAnalysis.keywords.slice(0, 5).join(', ') || 'none'}
- Reasons: ${urgencyAnalysis.reasons.slice(0, 3).join(', ') || 'none'}
- Suggested minimum priority: ${getPriorityName(urgencyAnalysis.suggestedPriority)} (${urgencyAnalysis.suggestedPriority})
Consider this when assigning priority. Do NOT lower priority below the detected level.`
    : '';
  
  // Detect email context for better prompting
  const isForwarded = /^(Fwd?|FW):/i.test(email.subject);
  const isReply = /^Re:/i.test(email.subject);
  const hasAttachments = email.attachments && email.attachments.length > 0;
  const senderDomain = email.from.email.split('@')[1]?.toLowerCase();
  const isInternal = senderDomain === 'weapply.se';
  
  const contextHints = [];
  if (isForwarded) contextHints.push('This is a FORWARDED email - extract the original request');
  if (isReply) contextHints.push('This is a REPLY in a thread - focus on the latest message');
  if (hasAttachments) contextHints.push(`Has ${email.attachments!.length} attachment(s) - mention them in the description`);
  if (isInternal) contextHints.push('Internal sender from @weapply.se');
  
  const prompt = `You are a senior project manager at WeApply, a development agency. Convert this email into a clear, actionable Linear ticket.

## EMAIL METADATA
- **From**: ${email.from.name || email.from.email} <${email.from.email}>
- **Subject**: ${email.subject}
- **Date**: ${email.date?.toISOString() || 'Unknown'}
${contextHints.length > 0 ? `- **Context**: ${contextHints.join('; ')}` : ''}

## EMAIL CONTENT
${truncatedText}

---

## LABELING RULES
Select labels using EXACT names. Pick ONE from each relevant category:

**TYPE** (required):
${AVAILABLE_LABELS.type.map(l => `• ${l}`).join('\n')}

**DEPARTMENT** (if clear who should handle):
${AVAILABLE_LABELS.dept.map(l => `• ${l}`).join('\n')}

**CLIENT STATUS** (if client-related):
${AVAILABLE_LABELS.client.map(l => `• ${l}`).join('\n')}

**TECH STACK** (if technical work):
${AVAILABLE_LABELS.tech.map(l => `• ${l}`).join('\n')}

**PHASE** (if project context is clear):
${AVAILABLE_LABELS.phase.map(l => `• ${l}`).join('\n')}

**BILLING** (if finance-related):
${AVAILABLE_LABELS.billing.map(l => `• ${l}`).join('\n')}

⚠️ Do NOT include source labels - those are added automatically.

## TITLE GUIDELINES
- Max 80 characters, action-oriented
- Remove "Re:", "Fwd:", "FW:" prefixes
- Good: "Fix login button not responding on mobile Safari"
- Good: "Design new onboarding flow for mobile app"
- Good: "Quote request for e-commerce platform development"
- Bad: "Bug" (too vague)
- Bad: "FW: RE: RE: Quick question about the thing" (cleanup needed)
- Bad: "Need help!!!!" (unclear what's needed)

## LANGUAGE DETECTION
**IMPORTANT**: Detect the language of the email content.
- If the email is primarily in **Swedish**, write the title, description, summary, and action items in **Swedish**.
- If the email is primarily in **English** or any other language, respond in **English**.
- Match the tone and formality of the original email.

## DESCRIPTION FORMAT
Structure the description as:
1. **Context**: Brief background (1-2 sentences)
2. **Request/Issue**: What needs to be done or what's wrong
3. **Details**: Relevant specifics (steps to reproduce, requirements, etc.)
4. **Attachments**: If any, briefly note what's attached
5. **Original Sender**: If forwarded, who originally sent it
${urgencyContext}

## PRIORITY SCALE
- **1 (Urgent)**: Production down, security issue, blocked customer, explicit "urgent"
- **2 (High)**: Customer impact, deadline this week, important client
- **3 (Normal)**: Standard requests, general work (default)
- **4 (Low)**: Nice to have, future consideration, internal housekeeping

---

Respond with valid JSON:
{
  "title": "Clear, actionable title describing the work",
  "description": "Well-formatted description with context and details",
  "summary": "1-2 sentence summary for quick scanning",
  "suggestedLabels": ["Support", "Development", "Active Client", "Backend"],
  "suggestedPriority": 3,
  "actionItems": ["First concrete action", "Second concrete action"],
  "suggestedAssignee": ""
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an expert project manager at a software development agency. Your role is to:
1. Convert incoming emails into clear, actionable Linear tickets
2. Extract the core request or issue from often messy email threads
3. Identify the type of work, relevant technology, and urgency level
4. Write professional descriptions that developers can act on immediately
5. Always respond with valid JSON in the exact format requested

Focus on clarity and actionability. A good ticket should tell someone exactly what to do without reading the original email.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    const refined = JSON.parse(response) as RefinedContent;
    
    // Combine AI priority with detected urgency (use more urgent)
    const aiPriority = refined.suggestedPriority ?? 3;
    const finalPriority = combinePriority(aiPriority, urgencyAnalysis.suggestedPriority);
    
    if (finalPriority !== aiPriority) {
      console.log(`🔺 Priority elevated from ${getPriorityName(aiPriority)} to ${getPriorityName(finalPriority)} due to urgency detection`);
    }
    
    // Ensure all fields are present
    return {
      title: refined.title || email.subject,
      description: refined.description || emailText,
      summary: refined.summary,
      suggestedLabels: refined.suggestedLabels || [],
      suggestedPriority: finalPriority,
      actionItems: refined.actionItems || [],
      suggestedAssignee: refined.suggestedAssignee || undefined,
      urgencyAnalysis, // Include for reference
    };
  } catch (error) {
    console.error('Error refining content with AI:', error);
    // Fallback to basic refinement with urgency
    return basicRefinement(email, analyzeUrgency(extractTextContent(email), email.subject));
  }
}

function basicRefinement(email: EmailData, urgency?: UrgencyAnalysis): RefinedContent {
  const emailText = extractTextContent(email);
  const urgencyAnalysis = urgency || analyzeUrgency(emailText, email.subject);
  
  return {
    title: email.subject || '(No Subject)',
    description: emailText || 'No content available',
    summary: emailText.substring(0, 200) + (emailText.length > 200 ? '...' : ''),
    suggestedLabels: [],
    suggestedPriority: urgencyAnalysis.suggestedPriority,
    actionItems: [],
    urgencyAnalysis,
  };
}
