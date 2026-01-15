import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  linearApiKey: process.env.LINEAR_API_KEY || '',
  webhookSecret: process.env.WEBHOOK_SECRET || '',
  defaultLinearTeam: process.env.DEFAULT_LINEAR_TEAM || 'Weapply',
  defaultLinearProject: process.env.DEFAULT_LINEAR_PROJECT || '',
  enableAIRefinement: process.env.ENABLE_AI_REFINEMENT !== 'false',
  autoCreateTickets: process.env.AUTO_CREATE_TICKETS !== 'false',
  maxEmailLength: parseInt(process.env.MAX_EMAIL_LENGTH || '5000', 10),
};
