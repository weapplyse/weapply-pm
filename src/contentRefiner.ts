import OpenAI from 'openai';
import { config } from './config.js';
import { EmailData, RefinedContent } from './types.js';
import { extractTextContent } from './emailParser.js';

const openai = new OpenAI({
  apiKey: config.openaiApiKey,
});

// Available labels in WeTest team - use exact names from Linear API
const AVAILABLE_LABELS = {
  type: ['Bug', 'Feature', 'Improvement', 'Task', 'Research', 'Epic', 'Change request'],
  area: ['Frontend', 'Backend', 'Database', 'Admin', 'API', 'Devops', 'UX/UI'],
  owner: ['Software', 'Production', 'Hardware', 'Embedded', 'Rollout'],
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

AVAILABLE LABELS (use EXACT names, pick at most ONE from each group):

Type (pick ONE - required):
${AVAILABLE_LABELS.type.map(l => `  - ${l}`).join('\n')}

Tech Area (pick at most ONE if relevant):
${AVAILABLE_LABELS.area.map(l => `  - ${l}`).join('\n')}

Owner (pick at most ONE if you know which team):
${AVAILABLE_LABELS.owner.map(l => `  - ${l}`).join('\n')}

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
  "suggestedLabels": ["Task", "Backend"],
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
