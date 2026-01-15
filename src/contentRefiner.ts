import OpenAI from 'openai';
import { config } from './config.js';
import { EmailData, RefinedContent } from './types.js';
import { extractTextContent } from './emailParser.js';

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
    'Project Mgmt',  // Project management
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
  
  const prompt = `You are helping to convert an email into a well-structured Linear ticket for the WeTest team.

Email Details:
- From: ${email.from.name || email.from.email} <${email.from.email}>
- Subject: ${email.subject}
- Date: ${email.date?.toISOString() || 'Unknown'}

Email Content:
${truncatedText}

AVAILABLE LABELS (use EXACT names, pick at most ONE from each category):

TYPE (required - pick ONE):
${AVAILABLE_LABELS.type.join(', ')}

DEPARTMENT (pick ONE if clear):
${AVAILABLE_LABELS.dept.join(', ')}

CLIENT STATUS (pick ONE if applicable):
${AVAILABLE_LABELS.client.join(', ')}

TECH STACK (pick ONE if technical):
${AVAILABLE_LABELS.tech.join(', ')}

PROJECT PHASE (pick ONE if applicable):
${AVAILABLE_LABELS.phase.join(', ')}

BILLING (pick if finance-related):
${AVAILABLE_LABELS.billing.join(', ')}

Always include "Email" as source label since this comes from email.

INSTRUCTIONS:
1. Create a clear, actionable title (max 80 characters, no email prefixes like "Re:" or "Fwd:")
2. Write a concise summary (2-3 sentences)
3. Extract concrete action items as tasks
4. Select appropriate labels from the EXACT list above (max 3 labels)
5. Suggest priority: 1=Urgent, 2=High, 3=Normal (default), 4=Low
6. Format the description cleanly - focus on what needs to be done

Format your response as JSON:
{
  "title": "actionable title",
  "description": "clean, well-formatted description focusing on the actual request/issue",
  "summary": "brief summary of what this ticket is about",
  "suggestedLabels": ["Bug", "Development", "Active Client", "Backend", "Email"],
  "suggestedPriority": 3,
  "actionItems": ["specific action 1", "specific action 2"],
  "suggestedAssignee": ""
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at converting emails and documents into well-structured project management tickets. Always respond with valid JSON.',
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
    
    // Ensure all fields are present
    return {
      title: refined.title || email.subject,
      description: refined.description || emailText,
      summary: refined.summary,
      suggestedLabels: refined.suggestedLabels || [],
      suggestedPriority: refined.suggestedPriority ?? 3,
      actionItems: refined.actionItems || [],
      suggestedAssignee: refined.suggestedAssignee || undefined,
    };
  } catch (error) {
    console.error('Error refining content with AI:', error);
    // Fallback to basic refinement
    return basicRefinement(email);
  }
}

function basicRefinement(email: EmailData): RefinedContent {
  const emailText = extractTextContent(email);
  
  return {
    title: email.subject || '(No Subject)',
    description: emailText || 'No content available',
    summary: emailText.substring(0, 200) + (emailText.length > 200 ? '...' : ''),
    suggestedLabels: [],
    suggestedPriority: 3,
    actionItems: [],
  };
}
