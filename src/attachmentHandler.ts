/**
 * Attachment Handler
 * 
 * Analyzes email attachments, categorizes them, and creates
 * descriptions and sub-issues for actionable content.
 */

import { EmailAttachment } from './types.js';

export interface AttachmentAnalysis {
  filename: string;
  category: AttachmentCategory;
  icon: string;
  description: string;
  size: string;
  isActionable: boolean;
  suggestedAction?: string;
  url?: string;
}

export type AttachmentCategory = 
  | 'document' 
  | 'spreadsheet' 
  | 'image' 
  | 'pdf' 
  | 'archive' 
  | 'code' 
  | 'presentation'
  | 'design'
  | 'video'
  | 'audio'
  | 'other';

// Content type to category mapping
const CONTENT_TYPE_MAP: Record<string, { category: AttachmentCategory; icon: string }> = {
  // Documents
  'application/msword': { category: 'document', icon: '📄' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { category: 'document', icon: '📄' },
  'application/rtf': { category: 'document', icon: '📄' },
  'text/plain': { category: 'document', icon: '📝' },
  'text/markdown': { category: 'document', icon: '📝' },
  
  // Spreadsheets
  'application/vnd.ms-excel': { category: 'spreadsheet', icon: '📊' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { category: 'spreadsheet', icon: '📊' },
  'text/csv': { category: 'spreadsheet', icon: '📊' },
  
  // PDFs
  'application/pdf': { category: 'pdf', icon: '📕' },
  
  // Images
  'image/jpeg': { category: 'image', icon: '🖼️' },
  'image/png': { category: 'image', icon: '🖼️' },
  'image/gif': { category: 'image', icon: '🖼️' },
  'image/webp': { category: 'image', icon: '🖼️' },
  'image/svg+xml': { category: 'image', icon: '🎨' },
  
  // Design files
  'application/x-sketch': { category: 'design', icon: '🎨' },
  'application/x-figma': { category: 'design', icon: '🎨' },
  'image/vnd.adobe.photoshop': { category: 'design', icon: '🎨' },
  'application/postscript': { category: 'design', icon: '🎨' }, // AI/EPS
  
  // Presentations
  'application/vnd.ms-powerpoint': { category: 'presentation', icon: '📽️' },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { category: 'presentation', icon: '📽️' },
  
  // Archives
  'application/zip': { category: 'archive', icon: '📦' },
  'application/x-rar-compressed': { category: 'archive', icon: '📦' },
  'application/x-7z-compressed': { category: 'archive', icon: '📦' },
  'application/gzip': { category: 'archive', icon: '📦' },
  
  // Code
  'text/html': { category: 'code', icon: '💻' },
  'text/css': { category: 'code', icon: '💻' },
  'text/javascript': { category: 'code', icon: '💻' },
  'application/javascript': { category: 'code', icon: '💻' },
  'application/json': { category: 'code', icon: '💻' },
  'application/xml': { category: 'code', icon: '💻' },
  
  // Video
  'video/mp4': { category: 'video', icon: '🎬' },
  'video/quicktime': { category: 'video', icon: '🎬' },
  'video/webm': { category: 'video', icon: '🎬' },
  
  // Audio
  'audio/mpeg': { category: 'audio', icon: '🎵' },
  'audio/wav': { category: 'audio', icon: '🎵' },
  'audio/ogg': { category: 'audio', icon: '🎵' },
};

// File extension fallbacks (when content-type is octet-stream)
const EXTENSION_MAP: Record<string, { category: AttachmentCategory; icon: string }> = {
  // Documents
  '.doc': { category: 'document', icon: '📄' },
  '.docx': { category: 'document', icon: '📄' },
  '.txt': { category: 'document', icon: '📝' },
  '.md': { category: 'document', icon: '📝' },
  '.rtf': { category: 'document', icon: '📄' },
  
  // Spreadsheets
  '.xls': { category: 'spreadsheet', icon: '📊' },
  '.xlsx': { category: 'spreadsheet', icon: '📊' },
  '.csv': { category: 'spreadsheet', icon: '📊' },
  
  // PDFs
  '.pdf': { category: 'pdf', icon: '📕' },
  
  // Images
  '.jpg': { category: 'image', icon: '🖼️' },
  '.jpeg': { category: 'image', icon: '🖼️' },
  '.png': { category: 'image', icon: '🖼️' },
  '.gif': { category: 'image', icon: '🖼️' },
  '.webp': { category: 'image', icon: '🖼️' },
  '.svg': { category: 'image', icon: '🎨' },
  
  // Design
  '.sketch': { category: 'design', icon: '🎨' },
  '.fig': { category: 'design', icon: '🎨' },
  '.psd': { category: 'design', icon: '🎨' },
  '.ai': { category: 'design', icon: '🎨' },
  '.eps': { category: 'design', icon: '🎨' },
  '.xd': { category: 'design', icon: '🎨' },
  
  // Presentations
  '.ppt': { category: 'presentation', icon: '📽️' },
  '.pptx': { category: 'presentation', icon: '📽️' },
  '.key': { category: 'presentation', icon: '📽️' },
  
  // Archives
  '.zip': { category: 'archive', icon: '📦' },
  '.rar': { category: 'archive', icon: '📦' },
  '.7z': { category: 'archive', icon: '📦' },
  '.tar': { category: 'archive', icon: '📦' },
  '.gz': { category: 'archive', icon: '📦' },
  
  // Code
  '.html': { category: 'code', icon: '💻' },
  '.css': { category: 'code', icon: '💻' },
  '.js': { category: 'code', icon: '💻' },
  '.ts': { category: 'code', icon: '💻' },
  '.json': { category: 'code', icon: '💻' },
  '.xml': { category: 'code', icon: '💻' },
  '.py': { category: 'code', icon: '💻' },
  '.rb': { category: 'code', icon: '💻' },
  '.go': { category: 'code', icon: '💻' },
  '.rs': { category: 'code', icon: '💻' },
  '.java': { category: 'code', icon: '💻' },
  '.sql': { category: 'code', icon: '💻' },
  
  // Video
  '.mp4': { category: 'video', icon: '🎬' },
  '.mov': { category: 'video', icon: '🎬' },
  '.webm': { category: 'video', icon: '🎬' },
  '.avi': { category: 'video', icon: '🎬' },
  
  // Audio
  '.mp3': { category: 'audio', icon: '🎵' },
  '.wav': { category: 'audio', icon: '🎵' },
  '.ogg': { category: 'audio', icon: '🎵' },
  '.m4a': { category: 'audio', icon: '🎵' },
};

/**
 * Format file size for display
 */
function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Get category and icon for an attachment
 */
function getCategoryInfo(attachment: EmailAttachment): { category: AttachmentCategory; icon: string } {
  // Try content type first
  if (attachment.contentType && CONTENT_TYPE_MAP[attachment.contentType]) {
    return CONTENT_TYPE_MAP[attachment.contentType];
  }
  
  // Fall back to extension
  const ext = attachment.filename.substring(attachment.filename.lastIndexOf('.')).toLowerCase();
  if (EXTENSION_MAP[ext]) {
    return EXTENSION_MAP[ext];
  }
  
  return { category: 'other', icon: '📎' };
}

/**
 * Determine if attachment is actionable (might need review/work)
 */
function isActionable(category: AttachmentCategory, filename: string): { actionable: boolean; action?: string } {
  const lowerName = filename.toLowerCase();
  
  // Documents usually need review
  if (category === 'document') {
    if (lowerName.includes('spec') || lowerName.includes('requirement')) {
      return { actionable: true, action: 'Review requirements document' };
    }
    if (lowerName.includes('contract') || lowerName.includes('agreement')) {
      return { actionable: true, action: 'Review contract/agreement' };
    }
    if (lowerName.includes('proposal') || lowerName.includes('quote')) {
      return { actionable: true, action: 'Review proposal/quote' };
    }
    return { actionable: true, action: 'Review document' };
  }
  
  // Spreadsheets often contain data or tasks
  if (category === 'spreadsheet') {
    if (lowerName.includes('budget') || lowerName.includes('cost')) {
      return { actionable: true, action: 'Review budget/costs' };
    }
    if (lowerName.includes('timeline') || lowerName.includes('schedule')) {
      return { actionable: true, action: 'Review timeline/schedule' };
    }
    return { actionable: true, action: 'Review spreadsheet data' };
  }
  
  // PDFs might be contracts or specs
  if (category === 'pdf') {
    if (lowerName.includes('invoice')) {
      return { actionable: true, action: 'Process invoice' };
    }
    if (lowerName.includes('contract')) {
      return { actionable: true, action: 'Review contract' };
    }
    return { actionable: true, action: 'Review PDF document' };
  }
  
  // Design files need review
  if (category === 'design') {
    return { actionable: true, action: 'Review design files' };
  }
  
  // Presentations need review
  if (category === 'presentation') {
    return { actionable: true, action: 'Review presentation' };
  }
  
  // Images might be screenshots/mockups
  if (category === 'image') {
    if (lowerName.includes('screenshot') || lowerName.includes('screen')) {
      return { actionable: true, action: 'Review screenshot' };
    }
    if (lowerName.includes('mockup') || lowerName.includes('design')) {
      return { actionable: true, action: 'Review mockup/design' };
    }
    return { actionable: false };
  }
  
  return { actionable: false };
}

/**
 * Generate description based on category and filename
 */
function generateDescription(category: AttachmentCategory, filename: string): string {
  const lowerName = filename.toLowerCase();
  
  switch (category) {
    case 'document':
      if (lowerName.includes('spec')) return 'Specification document';
      if (lowerName.includes('requirement')) return 'Requirements document';
      if (lowerName.includes('contract')) return 'Contract document';
      if (lowerName.includes('proposal')) return 'Proposal document';
      return 'Text document';
      
    case 'spreadsheet':
      if (lowerName.includes('budget')) return 'Budget spreadsheet';
      if (lowerName.includes('timeline')) return 'Timeline/schedule';
      if (lowerName.includes('data')) return 'Data spreadsheet';
      return 'Spreadsheet file';
      
    case 'pdf':
      if (lowerName.includes('invoice')) return 'Invoice PDF';
      if (lowerName.includes('contract')) return 'Contract PDF';
      if (lowerName.includes('report')) return 'Report PDF';
      return 'PDF document';
      
    case 'image':
      if (lowerName.includes('screenshot')) return 'Screenshot';
      if (lowerName.includes('mockup')) return 'Design mockup';
      if (lowerName.includes('logo')) return 'Logo image';
      return 'Image file';
      
    case 'design':
      if (lowerName.includes('.sketch')) return 'Sketch design file';
      if (lowerName.includes('.fig')) return 'Figma design file';
      if (lowerName.includes('.psd')) return 'Photoshop file';
      return 'Design source file';
      
    case 'presentation':
      return 'Presentation file';
      
    case 'archive':
      return 'Archive/compressed file';
      
    case 'code':
      return 'Code/source file';
      
    case 'video':
      return 'Video file';
      
    case 'audio':
      return 'Audio file';
      
    default:
      return 'Attached file';
  }
}

/**
 * Analyze a single attachment
 */
export function analyzeAttachment(attachment: EmailAttachment): AttachmentAnalysis {
  const { category, icon } = getCategoryInfo(attachment);
  const { actionable, action } = isActionable(category, attachment.filename);
  
  return {
    filename: attachment.filename,
    category,
    icon,
    description: generateDescription(category, attachment.filename),
    size: formatSize(attachment.size),
    isActionable: actionable,
    suggestedAction: action,
    url: attachment.url,
  };
}

/**
 * Analyze all attachments and return analysis results
 */
export function analyzeAttachments(attachments: EmailAttachment[]): AttachmentAnalysis[] {
  return attachments.map(analyzeAttachment);
}

/**
 * Format attachments as markdown for ticket description
 */
export function formatAttachmentsMarkdown(analyses: AttachmentAnalysis[]): string {
  if (analyses.length === 0) return '';

  let markdown = '\n\n## Files\n\n';

  for (const att of analyses) {
    const sizeLabel = att.size === '0 B' ? '' : ` · ${att.size}`;
    const name = att.url ? `[${att.filename}](${att.url})` : att.filename;
    const description = att.description ? ` — ${att.description}` : '';
    markdown += `- ${att.icon} ${name}${sizeLabel}${description}\n`;
    if (att.suggestedAction) {
      markdown += `  - ⚡ ${att.suggestedAction}\n`;
    }
  }

  return markdown;
}

/**
 * Format attachments as a compact summary line
 */
export function formatAttachmentsSummaryLine(analyses: AttachmentAnalysis[]): string {
  if (analyses.length === 0) return '';

  const links = analyses.map((att) => {
    return att.url ? `[${att.filename}](${att.url})` : att.filename;
  });

  return `**Files:** ${links.join(', ')}`;
}

/**
 * Render previews for image attachments
 */
export function formatAttachmentPreviewsMarkdown(analyses: AttachmentAnalysis[]): string {
  const previews = analyses.filter(att => att.url && att.category === 'image');
  if (previews.length === 0) return '';

  let markdown = '\n\n## File Previews\n\n';
  for (const att of previews) {
    markdown += `![${att.filename}](${att.url})\n\n`;
  }

  return markdown.trimEnd();
}

/**
 * Get actionable attachments that might need sub-issues
 */
export function getActionableAttachments(analyses: AttachmentAnalysis[]): AttachmentAnalysis[] {
  return analyses.filter(a => a.isActionable);
}

/**
 * Generate sub-issue data for actionable attachments
 */
export interface SubIssueData {
  title: string;
  description: string;
  labels: string[];
}

export function generateAttachmentSubIssues(analyses: AttachmentAnalysis[]): SubIssueData[] {
  const actionable = getActionableAttachments(analyses);
  
  return actionable.map(att => {
    let labels: string[] = ['Task'];
    
    // Add relevant labels based on category
    if (att.category === 'design') {
      labels.push('Design');
    } else if (att.category === 'document' || att.category === 'pdf') {
      if (att.filename.toLowerCase().includes('contract') || 
          att.filename.toLowerCase().includes('invoice')) {
        labels.push('Accounting');
      } else {
        labels.push('PM');
      }
    } else if (att.category === 'spreadsheet') {
      labels.push('PM');
    }
    
    const attachmentLabel = att.url ? `[${att.filename}](${att.url})` : att.filename;
    const sizeLine = att.size === '0 B' ? '' : `**Size**: ${att.size}`;
    const linkLine = att.url ? `**Link**: ${att.url}` : '';
    const descriptionLines = [
      `**Attachment**: ${attachmentLabel}`,
      `**Type**: ${att.description}`,
      sizeLine,
      linkLine,
      '',
      'This attachment was included in the parent ticket and may require action.',
    ].filter(Boolean);

    return {
      title: `${att.suggestedAction || 'Review attachment'}: ${att.filename}`,
      description: descriptionLines.join('\n'),
      labels,
    };
  });
}
