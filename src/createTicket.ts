#!/usr/bin/env node
/**
 * Script to create a Linear ticket from processed email data
 * This can be used as a CLI tool or imported as a module
 */

import { readFileSync } from 'fs';
import { processEmail } from './emailHandler.js';

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: createTicket <email-file> [--team=TEAM] [--project=PROJECT]');
    console.error('Example: createTicket email.eml --team=Weapply --project=MyProject');
    process.exit(1);
  }

  const emailFile = args[0];
  const options: { team?: string; project?: string } = {};

  // Parse options
  args.slice(1).forEach(arg => {
    if (arg.startsWith('--team=')) {
      options.team = arg.split('=')[1];
    } else if (arg.startsWith('--project=')) {
      options.project = arg.split('=')[1];
    }
  });

  try {
    // Read email file
    const rawEmail = readFileSync(emailFile);
    
    // Process email
    const result = await processEmail(rawEmail, options);

    // Output ticket data as JSON (can be piped to MCP or used directly)
    console.log(JSON.stringify({
      ticket: result.ticketData,
      email: {
        from: result.emailData.from.email,
        subject: result.emailData.subject,
      },
      refined: result.refinedContent,
    }, null, 2));

    console.error('\n✓ Email processed successfully');
    console.error(`  Title: ${result.ticketData.title}`);
    console.error(`  Team: ${result.ticketData.team}`);
    console.error(`  Use MCP mcp_linear_create_issue to create the ticket`);
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
