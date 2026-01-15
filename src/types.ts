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
}

export interface RefinedContent {
  title: string;
  description: string;
  summary?: string;
  suggestedLabels?: string[];
  suggestedPriority?: number;
  suggestedAssignee?: string;
  actionItems?: string[];
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
