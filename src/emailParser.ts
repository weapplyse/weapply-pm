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

  const fromAddress = Array.isArray(parsed.from) ? parsed.from[0] : parsed.from;
  const toAddresses = Array.isArray(parsed.to) ? parsed.to : (parsed.to ? [parsed.to] : []);
  const ccAddresses = parsed.cc ? (Array.isArray(parsed.cc) ? parsed.cc : [parsed.cc]) : undefined;

  return {
    from: {
      name: (fromAddress as any)?.name || undefined,
      email: (fromAddress as any)?.address || (fromAddress as any)?.text || '',
    },
    to: toAddresses.map((addr: any) => addr.address || addr.text || '') || [],
    cc: ccAddresses?.map((addr: any) => addr.address || addr.text),
    subject: parsed.subject || '(No Subject)',
    text: parsed.text || undefined,
    html: parsed.html || undefined,
    attachments: attachments.length > 0 ? attachments : undefined,
    date: parsed.date,
    threadId: parsed.inReplyTo || (parsed.references && Array.isArray(parsed.references) ? parsed.references[0] : parsed.references) || undefined,
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
