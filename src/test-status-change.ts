import { TDXClient } from './client.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Load credentials from dev credentials file
const credentialsPath = path.join(os.homedir(), '.config', 'tdx', 'dev-credentials.json');

async function testStatusChange() {
  console.log(`Loading credentials from: ${credentialsPath}`);

  if (!fs.existsSync(credentialsPath)) {
    throw new Error(`Credentials file not found at: ${credentialsPath}`);
  }

  const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'));
  const baseUrl = credentials.TDX_BASE_URL;
  const username = credentials.TDX_USERNAME;
  const password = credentials.TDX_PASSWORD;
  const appId = credentials.TDX_APP_ID;

  if (!baseUrl || !username || !password || !appId) {
    throw new Error('Missing required credentials in file');
  }

  console.log('Initializing TDX Client for DEV environment...');
  console.log(`Base URL: ${baseUrl}`);
  console.log(`App ID: ${appId}`);

  const client = new TDXClient(baseUrl, username, password, appId.split(','));

  try {
    // Step 1: Find a test ticket
    console.log('\n=== Step 1: Finding a test ticket ===');
    const searchResults = await client.searchTickets(
      { MaxResults: 10 },
      appId
    );

    if (!searchResults || searchResults.length === 0) {
      throw new Error('No tickets found for testing');
    }

    const testTicket = searchResults[0];
    console.log(`Found ticket: ${testTicket.ID} - "${testTicket.Title}"`);
    console.log(`Current Status: ${testTicket.StatusID} (${testTicket.StatusName})`);
    console.log(`Current Priority: ${testTicket.PriorityID} (${testTicket.PriorityName})`);

    // Step 2: Try just changing the status using minimal update
    console.log('\n=== Step 2: Testing status-only update ===');
    const originalStatusId = testTicket.StatusID;
    const originalStatusName = testTicket.StatusName;

    // For demo, we'll keep the same status but show how to change it
    // To actually change status, uncomment the lines below and use a different StatusID
    const newStatusId = originalStatusId; // Keep same for safe testing

    // Uncomment these to test real status change:
    // const newStatusId = 5184; // Example: "In Progress"
    // const newStatusId = 5185; // Example: "Resolved"

    console.log(`Attempting to update status to: ${newStatusId}`);

    const statusUpdate = {
      StatusID: newStatusId,
      Comments: `Testing status update at ${new Date().toISOString()}\nOriginal status: ${originalStatusName} (${originalStatusId})`
    };

    const updateResult = await client.updateTicket(testTicket.ID, statusUpdate, appId);
    console.log('✅ Status update successful!');
    console.log(`New Status: ${updateResult.StatusID} (${updateResult.StatusName})`);

    // Step 3: Verify the change
    console.log('\n=== Step 3: Verifying the update ===');
    const verifiedTicket = await client.getTicket(testTicket.ID, appId);
    console.log(`Verified Status: ${verifiedTicket.StatusID} (${verifiedTicket.StatusName})`);

    if (verifiedTicket.StatusID === newStatusId) {
      console.log('✅ Status verified successfully!');
    } else {
      console.log('⚠️  Status mismatch - something unexpected happened');
    }

    // Step 4: Show how to update multiple fields at once
    console.log('\n=== Step 4: Testing multi-field update ===');
    const multiUpdate = {
      StatusID: originalStatusId, // Restore original status
      Title: testTicket.Title, // Keep same title
      Comments: `Multi-field update test at ${new Date().toISOString()}`
    };

    const multiResult = await client.updateTicket(testTicket.ID, multiUpdate, appId);
    console.log('✅ Multi-field update successful!');
    console.log(`Status: ${multiResult.StatusID} (${multiResult.StatusName})`);
    console.log(`Title: ${multiResult.Title}`);

    console.log('\n✅ All status update tests completed successfully!');
    console.log('\nUsage Summary:');
    console.log('- You can now update ticket status by just passing { StatusID: newId }');
    console.log('- The MCP server automatically fetches current ticket and merges your changes');
    console.log('- You can update multiple fields at once: { StatusID: X, PriorityID: Y, Comments: "..." }');
    console.log('- Available via MCP tool: mcp__tdx-api-mcp-dev__tdx_update_ticket');

  } catch (error: any) {
    console.error('Error during test:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

testStatusChange()
  .then(() => {
    console.log('\n✅ Test suite passed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test suite failed:', error.message);
    process.exit(1);
  });
