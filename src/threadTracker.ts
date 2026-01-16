/**
 * Thread Tracker
 * 
 * Tracks email threads and detects duplicate/related tickets.
 * - Parses email headers (Message-ID, References, In-Reply-To)
 * - Matches Re:/Fwd: subjects to existing tickets
 * - Links related tickets together
 */

import { config } from './config.js';

// In-memory cache for recent tickets (last 7 days)
// In production, this should be persisted to a database
interface TicketRecord {
  issueId: string;
  issueIdentifier: string;
  senderEmail: string;
  senderDomain: string;
  subject: string;
  normalizedSubject: string;
  messageId?: string;
  createdAt: Date;
}

const ticketCache: Map<string, TicketRecord> = new Map();
const messageIdIndex: Map<string, string> = new Map(); // messageId -> issueId
const CACHE_TTL_DAYS = 7;

/**
 * Normalize subject line for matching
 * Removes Re:, Fwd:, FW:, etc. and extra whitespace
 */
export function normalizeSubject(subject: string): string {
  return subject
    .replace(/^(Re|Fwd?|FW|Fw|AW|SV|VS|Antw|Rif):\s*/gi, '') // Remove reply/forward prefixes
    .replace(/\s+/g, ' ')  // Normalize whitespace
    .trim()
    .toLowerCase();
}

/**
 * Extract Message-ID from email content
 */
export function extractMessageId(content: string): string | undefined {
  // Match Message-ID: <xxx@xxx>
  const match = content.match(/Message-ID:\s*<([^>]+)>/i);
  return match ? match[1] : undefined;
}

/**
 * Extract References header from email content
 * Returns array of message IDs this email references
 */
export function extractReferences(content: string): string[] {
  // Match References: <id1> <id2> ...
  const match = content.match(/References:\s*([^\n]+)/i);
  if (!match) return [];
  
  const refs = match[1].match(/<([^>]+)>/g) || [];
  return refs.map(r => r.replace(/[<>]/g, ''));
}

/**
 * Extract In-Reply-To header
 */
export function extractInReplyTo(content: string): string | undefined {
  const match = content.match(/In-Reply-To:\s*<([^>]+)>/i);
  return match ? match[1] : undefined;
}

/**
 * Check if subject indicates a reply
 */
export function isReplySubject(subject: string): boolean {
  return /^(Re|AW|SV|VS|Antw|Rif):/i.test(subject);
}

/**
 * Check if subject indicates a forward
 */
export function isForwardSubject(subject: string): boolean {
  return /^(Fwd?|FW|Fw):/i.test(subject);
}

/**
 * Store a ticket in the cache for future matching
 */
export function recordTicket(
  issueId: string,
  issueIdentifier: string,
  senderEmail: string,
  subject: string,
  messageId?: string
): void {
  const normalizedSubject = normalizeSubject(subject);
  const senderDomain = senderEmail.split('@')[1]?.toLowerCase() || '';
  
  const record: TicketRecord = {
    issueId,
    issueIdentifier,
    senderEmail: senderEmail.toLowerCase(),
    senderDomain,
    subject,
    normalizedSubject,
    messageId,
    createdAt: new Date(),
  };
  
  // Store by issue ID
  ticketCache.set(issueId, record);
  
  // Index by message ID if available
  if (messageId) {
    messageIdIndex.set(messageId, issueId);
  }
  
  // Clean up old entries
  cleanupCache();
  
  console.log(`📝 Recorded ticket for tracking: ${issueIdentifier} - "${normalizedSubject.substring(0, 50)}..."`);
}

/**
 * Find related tickets based on email content
 */
export interface RelatedTicket {
  issueId: string;
  issueIdentifier: string;
  matchType: 'thread' | 'subject' | 'sender';
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

export function findRelatedTickets(
  senderEmail: string,
  subject: string,
  content: string
): RelatedTicket[] {
  const related: RelatedTicket[] = [];
  const normalizedSubject = normalizeSubject(subject);
  const senderDomain = senderEmail.split('@')[1]?.toLowerCase() || '';
  
  // 1. Check by Message-ID references (highest confidence - same thread)
  const inReplyTo = extractInReplyTo(content);
  const references = extractReferences(content);
  const allRefs = inReplyTo ? [inReplyTo, ...references] : references;
  
  for (const ref of allRefs) {
    const issueId = messageIdIndex.get(ref);
    if (issueId) {
      const record = ticketCache.get(issueId);
      if (record) {
        related.push({
          issueId: record.issueId,
          issueIdentifier: record.issueIdentifier,
          matchType: 'thread',
          confidence: 'high',
          reason: `Reply to ${record.issueIdentifier} (same email thread)`,
        });
      }
    }
  }
  
  // 2. Check by normalized subject + same sender domain (high confidence)
  if (related.length === 0) {
    for (const [_, record] of ticketCache) {
      // Same subject, same sender domain
      if (record.normalizedSubject === normalizedSubject && 
          record.senderDomain === senderDomain) {
        related.push({
          issueId: record.issueId,
          issueIdentifier: record.issueIdentifier,
          matchType: 'subject',
          confidence: 'high',
          reason: `Same subject from ${senderDomain}`,
        });
      }
    }
  }
  
  // 3. Check by exact sender + similar subject (medium confidence)
  if (related.length === 0) {
    for (const [_, record] of ticketCache) {
      if (record.senderEmail === senderEmail.toLowerCase()) {
        // Check if subjects are similar (one contains the other)
        if (normalizedSubject.includes(record.normalizedSubject) ||
            record.normalizedSubject.includes(normalizedSubject)) {
          related.push({
            issueId: record.issueId,
            issueIdentifier: record.issueIdentifier,
            matchType: 'sender',
            confidence: 'medium',
            reason: `Similar subject from same sender`,
          });
        }
      }
    }
  }
  
  // 4. Check for recent tickets from same sender (low confidence)
  if (related.length === 0) {
    const recentFromSender = Array.from(ticketCache.values())
      .filter(r => r.senderEmail === senderEmail.toLowerCase())
      .filter(r => {
        const ageHours = (Date.now() - r.createdAt.getTime()) / (1000 * 60 * 60);
        return ageHours < 24; // Only last 24 hours
      })
      .slice(0, 3); // Max 3 suggestions
    
    for (const record of recentFromSender) {
      related.push({
        issueId: record.issueId,
        issueIdentifier: record.issueIdentifier,
        matchType: 'sender',
        confidence: 'low',
        reason: `Recent ticket from same sender`,
      });
    }
  }
  
  return related;
}

/**
 * Clean up old entries from cache
 */
function cleanupCache(): void {
  const cutoff = Date.now() - (CACHE_TTL_DAYS * 24 * 60 * 60 * 1000);
  
  for (const [issueId, record] of ticketCache) {
    if (record.createdAt.getTime() < cutoff) {
      ticketCache.delete(issueId);
      if (record.messageId) {
        messageIdIndex.delete(record.messageId);
      }
    }
  }
}

/**
 * Get cache stats (for debugging)
 */
export function getCacheStats(): { tickets: number; messageIds: number } {
  return {
    tickets: ticketCache.size,
    messageIds: messageIdIndex.size,
  };
}

/**
 * Format related tickets for display in description
 */
export function formatRelatedTicketsMarkdown(related: RelatedTicket[]): string {
  if (related.length === 0) return '';
  
  let md = '\n\n---\n\n## 🔗 Related Tickets\n\n';
  
  for (const r of related) {
    const icon = r.confidence === 'high' ? '🔴' : r.confidence === 'medium' ? '🟡' : '🟢';
    md += `- ${icon} **${r.issueIdentifier}** - ${r.reason}\n`;
  }
  
  return md;
}
