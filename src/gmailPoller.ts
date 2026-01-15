#!/usr/bin/env node
/**
 * Gmail Poller - Fetches emails from pm@weapply.se and creates Linear tickets
 * Run this as a cron job or background service
 */

import { initGmailAPI, processGmailEmails } from './gmailService.js';
import { config } from './config.js';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  // Check for Gmail credentials
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    console.error('Missing Gmail API credentials!');
    console.error('Required environment variables:');
    console.error('  - GOOGLE_CLIENT_ID');
    console.error('  - GOOGLE_CLIENT_SECRET');
    console.error('  - GOOGLE_REFRESH_TOKEN');
    process.exit(1);
  }

  // Initialize Gmail API
  try {
    initGmailAPI({
      clientId,
      clientSecret,
      refreshToken,
    });
    console.log('✓ Gmail API initialized');
  } catch (error) {
    console.error('Failed to initialize Gmail API:', error);
    process.exit(1);
  }

  // Process emails
  try {
    const result = await processGmailEmails({
      team: config.defaultLinearTeam,
      project: config.defaultLinearProject,
      maxEmails: 10,
    });

    console.log('\n📊 Summary:');
    console.log(`  Processed: ${result.processed}`);
    console.log(`  Created: ${result.created}`);
    console.log(`  Errors: ${result.errors}`);
  } catch (error) {
    console.error('Error processing emails:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
