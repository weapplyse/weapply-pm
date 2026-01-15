import { simpleParser, ParsedMail } from 'mailparser';
import { EmailData, EmailAttachment } from './types.js';

export async function parseEmail(rawEmail: string | Buffer): Promise<EmailData> {
  const parsed: ParsedMail = await simpleParser(rawEmail);

  const attachments: EmailAttachment[] = parsed.attachments?.map((att: any) => ({
    filename: att.filename || 'unnamed',
    contentType: att.contentType || 'application/octet-stream',
    content: att.content as Buffer,
    size: att.size || 0,
  })) || [];

  return {
    from: {
      name: parsed.from?.name || undefined,
      email: parsed.from?.text || parsed.from?.value?.[0]?.address || '',
    },
    to: parsed.to?.value?.map((addr: any) => addr.address) || [],
    cc: parsed.cc?.value?.map((addr: any) => addr.address),
    subject: parsed.subject || '(No Subject)',
    text: parsed.text || undefined,
    html: parsed.html || undefined,
    attachments: attachments.length > 0 ? attachments : undefined,
    date: parsed.date,
    threadId: parsed.inReplyTo || parsed.references?.[0] || undefined,
    messageId: parsed.messageId,
  };
}

export function extractTextContent(email: EmailData): string {
  // Prefer plain text, fallback to HTML stripped of tags
  if (email.text) {
    return email.text;
  }
  
  if (email.html) {
    // Simple HTML tag removal (for basic cases)
    return email.html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }
  
  return '';
}
