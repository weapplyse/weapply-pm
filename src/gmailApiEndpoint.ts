import express, { Request, Response } from 'express';
import { initGmailAPI, processGmailEmails } from './gmailService.js';
import { config } from './config.js';

const router = express.Router();

/**
 * Endpoint to manually trigger email processing
 */
router.post('/process', async (req: Request, res: Response) => {
  try {
    // Check if Gmail API is initialized
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
      return res.status(500).json({
        error: 'Gmail API not configured',
        message: 'Missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_REFRESH_TOKEN',
      });
    }

    // Initialize if not already done
    if (!process.env.GMAIL_INITIALIZED) {
      initGmailAPI({
        clientId,
        clientSecret,
        refreshToken,
      });
      process.env.GMAIL_INITIALIZED = 'true';
    }

    // Process emails
    const result = await processGmailEmails({
      team: req.body.team || config.defaultLinearTeam,
      project: req.body.project || config.defaultLinearProject,
      maxEmails: req.body.maxEmails || 10,
    });

    res.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('Error processing Gmail emails:', error);
    res.status(500).json({
      error: 'Failed to process emails',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
