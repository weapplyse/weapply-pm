import OpenAI from 'openai';
import { config } from './config.js';
import { EmailData, RefinedContent } from './types.js';
import { extractTextContent } from './emailParser.js';

const openai = new OpenAI({
  apiKey: config.openaiApiKey,
});

export async function refineEmailContent(email: EmailData): Promise<RefinedContent> {
  if (!config.enableAIRefinement || !config.openaiApiKey) {
    // Fallback to basic refinement without AI
    return basicRefinement(email);
  }

  const emailText = extractTextContent(email);
  const truncatedText = emailText.substring(0, config.maxEmailLength);
  
  const prompt = `You are helping to convert an email into a well-structured Linear ticket. 

Email Details:
- From: ${email.from.name || email.from.email} <${email.from.email}>
- Subject: ${email.subject}
- Date: ${email.date?.toISOString() || 'Unknown'}

Email Content:
${truncatedText}

Please provide:
1. A clear, concise title for the Linear ticket (max 100 characters)
2. A well-formatted description that includes:
   - Context from the email
   - Key information
   - Any important details
3. A brief summary (2-3 sentences)
4. Suggested labels (if any are appropriate, max 3)
5. Suggested priority (0-4, where 0=No priority, 1=Urgent, 2=High, 3=Normal, 4=Low)
6. Action items extracted from the email (if any)
7. Suggested assignee email (if you can infer from context, otherwise leave empty)

Format your response as JSON with this structure:
{
  "title": "ticket title",
  "description": "formatted description",
  "summary": "brief summary",
  "suggestedLabels": ["label1", "label2"],
  "suggestedPriority": 3,
  "actionItems": ["item1", "item2"],
  "suggestedAssignee": "email@example.com or empty string"
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
