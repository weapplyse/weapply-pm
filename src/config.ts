import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // OpenAI for content refinement
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  
  // Linear API
  linearApiKey: process.env.LINEAR_API_KEY || '',
  linearWebhookSecret: process.env.LINEAR_WEBHOOK_SECRET || '',
  defaultLinearTeam: process.env.DEFAULT_LINEAR_TEAM || 'WeTest',
  defaultLinearProject: process.env.DEFAULT_LINEAR_PROJECT || '',
  
  // Feature flags
  enableAIRefinement: process.env.ENABLE_AI_REFINEMENT !== 'false',
  
  // Limits
  maxEmailLength: parseInt(process.env.MAX_EMAIL_LENGTH || '5000', 10),
};
