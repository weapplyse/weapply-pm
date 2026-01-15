/**
 * Urgency Detection System
 * 
 * Analyzes email content for urgency indicators and calculates
 * a priority score based on keywords, patterns, and context.
 */

import { UrgencyAnalysis } from './types.js';

export type { UrgencyAnalysis };

// Urgency keywords with weights
const URGENCY_KEYWORDS: Record<string, number> = {
  // Critical - weight 30
  'urgent': 30,
  'emergency': 30,
  'critical': 30,
  'asap': 30,
  'immediately': 30,
  'right now': 30,
  'right away': 30,
  
  // High - weight 20
  'important': 20,
  'priority': 20,
  'deadline': 20,
  'time-sensitive': 20,
  'time sensitive': 20,
  'as soon as possible': 20,
  'blocking': 20,
  'blocked': 20,
  'broken': 20,
  'down': 20,
  'outage': 20,
  'not working': 20,
  "doesn't work": 20,
  "can't access": 20,
  'cannot access': 20,
  
  // Medium-High - weight 15
  'please help': 15,
  'need help': 15,
  'help needed': 15,
  'stuck': 15,
  'failing': 15,
  'failed': 15,
  'error': 15,
  'crash': 15,
  'crashing': 15,
  
  // Medium - weight 10
  'soon': 10,
  'quickly': 10,
  'fast': 10,
  'waiting': 10,
  'overdue': 10,
  'late': 10,
  'delayed': 10,
  
  // Low urgency indicators - weight -10
  'when you have time': -10,
  'no rush': -10,
  'not urgent': -10,
  'low priority': -10,
  'whenever': -10,
  'at your convenience': -10,
  'nice to have': -10,
  'future': -10,
};

// Impact keywords (business/customer impact)
const IMPACT_KEYWORDS: Record<string, number> = {
  // High impact
  'customers affected': 25,
  'customer impact': 25,
  'revenue': 25,
  'money': 20,
  'losing': 20,
  'lost': 15,
  'sales': 15,
  'production': 20,
  'live': 15,
  'public': 15,
  
  // Security
  'security': 25,
  'breach': 30,
  'hack': 30,
  'vulnerability': 25,
  'exploit': 25,
  'leak': 20,
  'exposed': 20,
  
  // SLA/Contract
  'sla': 20,
  'contract': 15,
  'agreement': 10,
  'deadline': 15,
  'due date': 15,
  'due today': 25,
  'due tomorrow': 20,
  'expires': 20,
};

// Panic patterns (emotional urgency)
const PANIC_PATTERNS = [
  { pattern: /!{2,}/g, weight: 10, name: 'Multiple exclamation marks' },
  { pattern: /HELP/g, weight: 15, name: 'HELP in caps' },
  { pattern: /URGENT/g, weight: 20, name: 'URGENT in caps' },
  { pattern: /ASAP/g, weight: 20, name: 'ASAP in caps' },
  { pattern: /CRITICAL/g, weight: 20, name: 'CRITICAL in caps' },
  { pattern: /EMERGENCY/g, weight: 25, name: 'EMERGENCY in caps' },
  { pattern: /[A-Z]{5,}/g, weight: 5, name: 'Extended caps text' },
  { pattern: /please.*help/i, weight: 10, name: 'Please help pattern' },
  { pattern: /call me/i, weight: 15, name: 'Request for call' },
  { pattern: /phone/i, weight: 10, name: 'Phone mentioned' },
];

// Time-sensitive patterns
const TIME_PATTERNS = [
  { pattern: /today/i, weight: 15, name: 'Today mentioned' },
  { pattern: /tonight/i, weight: 15, name: 'Tonight mentioned' },
  { pattern: /this morning/i, weight: 15, name: 'This morning' },
  { pattern: /this afternoon/i, weight: 15, name: 'This afternoon' },
  { pattern: /right now/i, weight: 20, name: 'Right now' },
  { pattern: /immediately/i, weight: 20, name: 'Immediately' },
  { pattern: /\d+ minutes/i, weight: 15, name: 'Minutes mentioned' },
  { pattern: /\d+ hours/i, weight: 10, name: 'Hours mentioned' },
  { pattern: /end of day/i, weight: 15, name: 'End of day' },
  { pattern: /eod/i, weight: 15, name: 'EOD' },
];

/**
 * Analyze email content for urgency signals
 */
export function analyzeUrgency(content: string, subject: string): UrgencyAnalysis {
  const fullText = `${subject}\n${content}`.toLowerCase();
  const originalText = `${subject}\n${content}`;
  
  let score = 0;
  const reasons: string[] = [];
  const detectedKeywords: string[] = [];
  
  // Check urgency keywords
  for (const [keyword, weight] of Object.entries(URGENCY_KEYWORDS)) {
    if (fullText.includes(keyword.toLowerCase())) {
      score += weight;
      detectedKeywords.push(keyword);
      if (weight >= 20) {
        reasons.push(`Contains "${keyword}"`);
      }
    }
  }
  
  // Check impact keywords
  for (const [keyword, weight] of Object.entries(IMPACT_KEYWORDS)) {
    if (fullText.includes(keyword.toLowerCase())) {
      score += weight;
      detectedKeywords.push(keyword);
      if (weight >= 20) {
        reasons.push(`Business impact: "${keyword}"`);
      }
    }
  }
  
  // Check panic patterns (on original text for case sensitivity)
  for (const { pattern, weight, name } of PANIC_PATTERNS) {
    const matches = originalText.match(pattern);
    if (matches && matches.length > 0) {
      score += weight * Math.min(matches.length, 3); // Cap at 3x
      reasons.push(name);
    }
  }
  
  // Check time patterns
  for (const { pattern, weight, name } of TIME_PATTERNS) {
    if (pattern.test(fullText)) {
      score += weight;
      reasons.push(name);
    }
  }
  
  // Check for multiple indicators (compound urgency)
  if (detectedKeywords.length >= 3) {
    score += 15;
    reasons.push('Multiple urgency indicators');
  }
  
  // Normalize score to 0-100
  score = Math.min(100, Math.max(0, score));
  
  // Map score to priority
  let suggestedPriority: number;
  if (score >= 60) {
    suggestedPriority = 1; // Urgent
    if (!reasons.some(r => r.includes('Urgent'))) {
      reasons.unshift('High urgency score detected');
    }
  } else if (score >= 35) {
    suggestedPriority = 2; // High
  } else if (score >= 15) {
    suggestedPriority = 3; // Normal
  } else {
    suggestedPriority = score < 0 ? 4 : 3; // Low if negative indicators, else Normal
  }
  
  return {
    score,
    suggestedPriority,
    reasons: reasons.slice(0, 5), // Top 5 reasons
    keywords: detectedKeywords.slice(0, 10), // Top 10 keywords
  };
}

/**
 * Get priority name from number
 */
export function getPriorityName(priority: number): string {
  switch (priority) {
    case 1: return 'Urgent';
    case 2: return 'High';
    case 3: return 'Normal';
    case 4: return 'Low';
    default: return 'Normal';
  }
}

/**
 * Combine AI suggested priority with detected urgency
 * Uses the more urgent of the two
 */
export function combinePriority(aiPriority: number, detectedPriority: number): number {
  // Return the more urgent (lower number)
  return Math.min(aiPriority, detectedPriority);
}
