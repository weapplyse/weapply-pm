import express from 'express';
import { config } from './config.js';
import linearWebhookRouter from './linearWebhookHandler.js';

const app = express();

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'weapply-pm'
  });
});

// Linear webhook endpoint
app.use('/webhook', linearWebhookRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Weapply PM - Email to Linear',
    version: '2.0.0',
    endpoints: {
      health: 'GET /health',
      linearWebhook: 'POST /webhook/linear-webhook',
    },
  });
});

// Start server
app.listen(config.port, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║  Weapply PM - Email to Linear Service                      ║
╠════════════════════════════════════════════════════════════╣
║  Server running on port ${config.port.toString().padEnd(33)}║
║  Webhook endpoint: /webhook/linear-webhook                  ║
║  AI Refinement: ${config.enableAIRefinement ? 'Enabled' : 'Disabled'}                                  ║
║  Linear Team: ${config.defaultLinearTeam.padEnd(36)}║
╚════════════════════════════════════════════════════════════╝
  `);
});

export default app;
