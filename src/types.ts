export interface EmailData {
  from: {
    name?: string;
    email: string;
  };
  to: string[];
  cc?: string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: EmailAttachment[];
  date?: Date;
  threadId?: string;
  messageId?: string;
}

export interface EmailAttachment {
  filename: string;
  contentType: string;
  content: Buffer;
  size: number;
  url?: string;
}

export interface UrgencyAnalysis {
  score: number;           // 0-100, higher = more urgent
  suggestedPriority: number; // 1=Urgent, 2=High, 3=Normal, 4=Low
  reasons: string[];       // Why this urgency level
  keywords: string[];      // Detected urgency keywords
}

export interface RefinedContent {
  title: string;
  description: string;
  summary?: string;
  suggestedLabels?: string[];
  suggestedPriority?: number;
  suggestedAssignee?: string;
  suggestedClient?: string;  // Client/company name detected from content
  actionItems?: string[];
  urgencyAnalysis?: UrgencyAnalysis;
}

export interface LinearTicketData {
  title: string;
  description: string;
  team: string;
  project?: string;
  assignee?: string;
  labels?: string[];
  priority?: number;
}
