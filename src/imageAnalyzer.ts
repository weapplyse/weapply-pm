/**
 * Image Analyzer
 * 
 * Uses GPT-4 Vision to analyze screenshots, mockups, and error screens
 * attached to emails.
 */

import OpenAI from 'openai';
import { config } from './config.js';

const openai = new OpenAI({
  apiKey: config.openaiApiKey,
});

export interface ImageAnalysis {
  filename: string;
  url: string;
  type: 'screenshot' | 'mockup' | 'error' | 'document' | 'photo' | 'unknown';
  description: string;
  extractedText?: string;
  suggestedActions?: string[];
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Check if a file is an analyzable image
 */
export function isAnalyzableImage(filename: string, contentType?: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));
  
  if (imageExtensions.includes(ext)) {
    return true;
  }
  
  if (contentType && contentType.startsWith('image/')) {
    return true;
  }
  
  return false;
}

/**
 * Extract image URLs from Linear description content
 */
export function extractImageUrls(content: string): Array<{ filename: string; url: string }> {
  const images: Array<{ filename: string; url: string }> = [];
  
  // Match markdown image syntax: ![alt](url) or [filename.ext](url)
  const patterns = [
    /!\[([^\]]*)\]\(([^)]+)\)/g,  // ![alt](url)
    /\[([^\]]+\.(?:png|jpg|jpeg|gif|webp))\]\(([^)]+)\)/gi,  // [image.png](url)
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const filename = match[1] || 'image';
      const url = match[2];
      
      // Skip non-image URLs
      if (url && (url.includes('linear') || isAnalyzableImage(filename) || isAnalyzableImage(url))) {
        images.push({
          filename: filename || url.split('/').pop() || 'image',
          url,
        });
      }
    }
  }
  
  // Also check for direct image URLs
  const urlPattern = /(https?:\/\/[^\s]+\.(?:png|jpg|jpeg|gif|webp))/gi;
  let match;
  while ((match = urlPattern.exec(content)) !== null) {
    const url = match[1];
    if (!images.some(img => img.url === url)) {
      images.push({
        filename: url.split('/').pop() || 'image',
        url,
      });
    }
  }
  
  return images;
}

/**
 * Analyze an image using GPT-4 Vision
 */
export async function analyzeImage(
  imageUrl: string,
  filename: string,
  context?: string
): Promise<ImageAnalysis | null> {
  if (!config.openaiApiKey) {
    console.log('⚠️  OpenAI API key not configured, skipping image analysis');
    return null;
  }

  try {
    const systemPrompt = `You are an image analyzer for a project management system. Analyze the provided image and determine:

1. **Type**: Is this a screenshot, UI mockup, error screen, document scan, or photo?
2. **Description**: Describe what you see in 1-2 sentences.
3. **Extracted Text**: If there's any visible text (especially error messages, UI text, or important content), extract it.
4. **Suggested Actions**: Based on what you see, suggest 1-3 potential action items.

Respond in JSON format:
{
  "type": "screenshot|mockup|error|document|photo|unknown",
  "description": "Brief description of the image",
  "extractedText": "Any visible text, especially errors or important content",
  "suggestedActions": ["Action 1", "Action 2"],
  "confidence": "high|medium|low"
}`;

    const userPrompt = context 
      ? `Analyze this image (${filename}) in the context of: ${context}`
      : `Analyze this image (${filename})`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',  // GPT-4 with vision
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: userPrompt },
            { type: 'image_url', image_url: { url: imageUrl, detail: 'auto' } },
          ],
        },
      ],
      max_tokens: 500,
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return null;
    }

    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      filename,
      url: imageUrl,
      type: parsed.type || 'unknown',
      description: parsed.description || 'Unable to analyze image',
      extractedText: parsed.extractedText || undefined,
      suggestedActions: parsed.suggestedActions || undefined,
      confidence: parsed.confidence || 'low',
    };
  } catch (error) {
    console.error(`❌ Error analyzing image ${filename}:`, error);
    return null;
  }
}

/**
 * Analyze multiple images from content
 */
export async function analyzeImagesInContent(
  content: string,
  maxImages: number = 3
): Promise<ImageAnalysis[]> {
  const images = extractImageUrls(content);
  
  if (images.length === 0) {
    return [];
  }

  console.log(`🖼️  Found ${images.length} image(s) to analyze`);

  const analyses: ImageAnalysis[] = [];
  const toAnalyze = images.slice(0, maxImages);

  for (const img of toAnalyze) {
    console.log(`  Analyzing: ${img.filename}...`);
    const analysis = await analyzeImage(img.url, img.filename);
    if (analysis) {
      analyses.push(analysis);
      console.log(`    ✓ Type: ${analysis.type}, Confidence: ${analysis.confidence}`);
    }
  }

  return analyses;
}

/**
 * Format image analyses as markdown for description
 */
export function formatImageAnalysisMarkdown(analyses: ImageAnalysis[]): string {
  if (analyses.length === 0) return '';

  let md = '\n\n---\n\n## 🖼️ Image Analysis\n\n';

  for (const analysis of analyses) {
    const typeIcon = {
      screenshot: '📸',
      mockup: '🎨',
      error: '⚠️',
      document: '📄',
      photo: '📷',
      unknown: '🖼️',
    }[analysis.type] || '🖼️';

    md += `### ${typeIcon} ${analysis.filename}\n\n`;
    md += `**Description:** ${analysis.description}\n\n`;

    if (analysis.extractedText) {
      md += `**Extracted Text:**\n\`\`\`\n${analysis.extractedText}\n\`\`\`\n\n`;
    }

    if (analysis.suggestedActions && analysis.suggestedActions.length > 0) {
      md += `**Suggested Actions:**\n`;
      for (const action of analysis.suggestedActions) {
        md += `- [ ] ${action}\n`;
      }
      md += '\n';
    }
  }

  return md;
}
