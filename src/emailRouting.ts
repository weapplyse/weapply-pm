/**
 * Email Routing Logic
 * 
 * Handles detection of:
 * - Internal vs external senders
 * - Forwarded vs direct emails
 * - Original sender extraction from forwarded emails
 * - Client label assignment (not projects)
 * - Project routing based on sender type
 */

export interface EmailMetadata {
  // Detected sender (could be forwarder or original)
  senderEmail: string;
  senderName?: string;
  senderDomain: string;
  
  // For forwarded emails
  isForwarded: boolean;
  forwarderEmail?: string;
  forwarderDomain?: string;
  originalSenderEmail?: string;
  originalSenderDomain?: string;
  
  // Routing classification
  isInternal: boolean;           // Sender is @weapply.se
  isInternalForward: boolean;    // Forwarded by @weapply.se employee
  isExternalDirect: boolean;     // External sender, not forwarded
  
  // For assignment
  assignToEmail?: string;        // Who should be assigned
  clientDomain?: string;         // Client domain for label creation
}

const INTERNAL_DOMAIN = 'weapply.se';

// Project IDs for the new structure
export const PROJECT_IDS = {
  MAIL_INBOX: '1f70f9a4-c945-402f-a0a5-77f0f207f1ea',
  SLACK_INTAKE: '76d888f2-2482-4c29-bebd-c5dc3a6436d9',
  REFINE_QUEUE: '5ddfdf70-180b-472b-83a5-5a3ecbe70384',
  LINEAR_AUTOMATION: '5d992f68-4c78-4294-91d9-294808bf1d49',
  GENERAL: '8b02c3f0-a9db-49b5-8026-a2f5cacda2f5',
  PROJECT_MANAGEMENT: '335e96f1-490d-41a8-8676-248329f37e4c',
  CLIENTS: '5186127d-5e90-4d63-8b20-bc522c2e4a5d',
  EXTERNAL: '977387e2-8409-4a2d-9661-9fe98bbd0870',
};

/**
 * Extract email metadata from Linear issue content
 */
export function extractEmailMetadata(content: string, title: string): EmailMetadata {
  // Detect if forwarded from title
  const isForwardedFromTitle = /^(Fwd?|FW|Fw):/i.test(title);
  
  // Extract email addresses from content
  // Handle both regular emails and Linear's markdown format [email](mailto:email)
  const mailtoRegex = /mailto:([^)\s]+)/g;
  const regularEmailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
  
  const mailtoEmails = [...content.matchAll(mailtoRegex)].map(m => m[1]);
  const regularEmails = content.match(regularEmailRegex) || [];
  
  // Combine and dedupe, preferring mailto: parsed emails
  const allEmailsSet = new Set([...mailtoEmails, ...regularEmails]);
  const allEmails = [...allEmailsSet].filter(e => 
    !e.includes('linear.app') && // Filter out Linear's system emails
    e.includes('@')
  );
  
  // Parse "From:" line - could be in various formats
  // Handle Linear's markdown format: [email](mailto:email)
  const mailtoMatch = content.match(/From:\s*\[([^\]]+)\]\(mailto:([^)]+)\)/i);
  let fromMatch: RegExpMatchArray | null = null;
  
  if (mailtoMatch) {
    // Clean the mailto email (remove any trailing characters)
    const cleanEmail = mailtoMatch[2].replace(/[)\]>]+$/, '').trim();
    fromMatch = [mailtoMatch[0], '', cleanEmail];
  } else {
    fromMatch = content.match(/From:\s*(?:"?([^"<\n]+)"?\s*)?<?([^>\s\n@]+@[^>\s\n)]+)>?/i);
  }
  const toMatch = content.match(/To:\s*(?:"?([^"<\n]+)"?\s*)?<?([^>\s\n]+@[^>\s\n]+)>?/i);
  
  // Extract sender info
  let senderEmail = '';
  let senderName = '';
  
  if (fromMatch) {
    senderName = fromMatch[1]?.trim() || '';
    senderEmail = fromMatch[2]?.trim().toLowerCase() || '';
  } else if (allEmails.length > 0 && allEmails[0]) {
    // Fallback: first email found
    senderEmail = allEmails[0].toLowerCase();
  }
  
  const senderDomain = extractDomain(senderEmail);
  
  // Detect forwarding patterns in content
  const hasForwardedHeader = /---------- Forwarded message/i.test(content) ||
                             /Begin forwarded message/i.test(content) ||
                             /----- Original Message -----/i.test(content) ||
                             /From:.*\nSent:.*\nTo:/i.test(content);
  
  const isForwarded = isForwardedFromTitle || hasForwardedHeader;
  
  // For forwarded emails, try to find the forwarder
  let forwarderEmail: string | undefined;
  let forwarderDomain: string | undefined;
  let originalSenderEmail: string | undefined;
  let originalSenderDomain: string | undefined;
  
  if (isForwarded) {
    // The first "From:" in Linear's content is usually the forwarder
    forwarderEmail = senderEmail;
    forwarderDomain = senderDomain;
    
    // Look for original sender in forwarded content
    // Handle both markdown and plain text formats
    const originalFromMarkdown = content.match(/(?:Forwarded message|forwarded message|Original Message)[^]*?From:\s*\[([^\]]+)\]\(mailto:([^)]+)\)/i);
    const originalFromPlain = content.match(/(?:Forwarded message|forwarded message|Original Message)[^]*?From:\s*(?:"?[^"<\n]*"?\s*)?<?([^>\s\n@]+@[^>\s\n)]+)>?/i);
    
    if (originalFromMarkdown) {
      originalSenderEmail = originalFromMarkdown[2].replace(/[)\]>]+$/, '').trim().toLowerCase();
      originalSenderDomain = extractDomain(originalSenderEmail);
    } else if (originalFromPlain) {
      originalSenderEmail = originalFromPlain[1].replace(/[)\]>]+$/, '').trim().toLowerCase();
      originalSenderDomain = extractDomain(originalSenderEmail);
    } else {
      // Fallback: look for any email that isn't the forwarder
      const otherEmails = allEmails.filter(e => {
        const cleanEmail = e.replace(/[)\]>]+$/, '').toLowerCase();
        return cleanEmail !== forwarderEmail?.toLowerCase() &&
          !cleanEmail.includes('pm@weapply.se') &&
          !cleanEmail.includes('linear.app');
      });
      
      if (otherEmails.length > 0) {
        originalSenderEmail = otherEmails[0].replace(/[)\]>]+$/, '').toLowerCase();
        originalSenderDomain = extractDomain(originalSenderEmail);
      }
    }
  }
  
  // Determine routing classification
  const isInternal = senderDomain === INTERNAL_DOMAIN;
  const isInternalForward = isForwarded && forwarderDomain === INTERNAL_DOMAIN;
  const isExternalDirect = !isForwarded && senderDomain !== INTERNAL_DOMAIN;
  
  // Determine assignment
  let assignToEmail: string | undefined;
  let clientDomain: string | undefined;
  
  if (isInternal && !isForwarded) {
    // Internal direct email - assign to sender
    assignToEmail = senderEmail;
  } else if (isInternalForward) {
    // Forwarded by internal - assign to forwarder, track client
    assignToEmail = forwarderEmail;
    clientDomain = originalSenderDomain || senderDomain;
  } else if (isExternalDirect) {
    // External direct - track as potential lead
    clientDomain = senderDomain;
  } else if (isForwarded && forwarderDomain !== INTERNAL_DOMAIN) {
    // External forward - unusual, but track both
    clientDomain = originalSenderDomain || senderDomain;
  }
  
  // Filter out internal domain from client domain
  if (clientDomain === INTERNAL_DOMAIN) {
    clientDomain = undefined;
  }
  
  return {
    senderEmail,
    senderName: senderName || undefined,
    senderDomain,
    isForwarded,
    forwarderEmail,
    forwarderDomain,
    originalSenderEmail,
    originalSenderDomain,
    isInternal,
    isInternalForward,
    isExternalDirect,
    assignToEmail,
    clientDomain,
  };
}

/**
 * Extract domain from email address
 */
export function extractDomain(email: string): string {
  if (!email || !email.includes('@')) return '';
  // Clean up the domain (remove trailing special chars)
  const domain = email.split('@')[1]?.toLowerCase() || '';
  return domain.replace(/[)\]>]+$/, '').trim();
}

/**
 * Get source labels based on email metadata
 * Returns exactly ONE source label to avoid conflicts
 */
export function getSourceLabels(metadata: EmailMetadata): string[] {
  // Only return ONE label from the Source group (they're exclusive)
  if (metadata.isInternalForward) {
    return ['Internal Forward'];
  } else if (metadata.isExternalDirect) {
    return ['External Direct'];
  } else if (metadata.isForwarded) {
    return ['Forwarded'];
  } else {
    // Default: just Email for internal direct or other cases
    return ['Email'];
  }
}

/**
 * Get the target project ID based on email routing
 */
export function getTargetProjectId(metadata: EmailMetadata, hasClientLabel: boolean): string {
  // Internal emails (not forwarded) go to Mail Inbox
  if (metadata.isInternal && !metadata.isForwarded) {
    return PROJECT_IDS.MAIL_INBOX;
  }
  
  // Internal forwards with known client go to Clients project
  if (metadata.isInternalForward && metadata.clientDomain) {
    return hasClientLabel ? PROJECT_IDS.CLIENTS : PROJECT_IDS.EXTERNAL;
  }
  
  // External direct emails
  if (metadata.isExternalDirect) {
    // Known client domain -> Clients project
    // Unknown domain -> External project
    return hasClientLabel ? PROJECT_IDS.CLIENTS : PROJECT_IDS.EXTERNAL;
  }
  
  // Default: Mail Inbox for all other refined emails
  return PROJECT_IDS.MAIL_INBOX;
}

/**
 * Generate client label name from domain
 */
export function getClientLabelName(domain: string): string {
  // Clean up domain for label name
  const cleanDomain = domain.replace(/^www\./, '');
  return `Client: ${cleanDomain}`;
}

/**
 * Check if domain should have a client label
 * Skip common personal email providers
 */
export function shouldCreateClientLabel(domain: string): boolean {
  if (!domain) return false;
  
  // Skip internal domain
  if (domain === INTERNAL_DOMAIN) return false;
  
  // Skip common email providers (personal emails)
  const skipDomains = [
    'gmail.com', 'googlemail.com',
    'yahoo.com', 'yahoo.se',
    'hotmail.com', 'outlook.com', 'live.com', 'msn.com',
    'icloud.com', 'me.com', 'mac.com',
    'protonmail.com', 'proton.me',
    'aol.com', 'mail.com',
    'zoho.com', 'yandex.com',
  ];
  
  if (skipDomains.includes(domain.toLowerCase())) return false;
  
  return true;
}

// Backwards compatibility - deprecated, use getClientLabelName
export const getClientProjectName = getClientLabelName;
export const shouldCreateClientProject = shouldCreateClientLabel;
