import { TDXClient } from './client.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Load credentials from dev credentials file
const credentialsPath = path.join(os.homedir(), '.config', 'tdx', 'dev-credentials.json');

async function testStatusUpdate() {
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
    // Step 1: Search for a test ticket
    console.log('\n=== Step 1: Finding a test ticket ===');
    const searchResults = await client.searchTickets(
      { MaxResults: 5 },
      appId
    );

    if (!searchResults || searchResults.length === 0) {
      throw new Error('No tickets found for testing');
    }

    const testTicket = searchResults[0];
    console.log(`Found ticket: ${testTicket.ID} - "${testTicket.Title}"`);
    console.log(`Current Status ID: ${testTicket.StatusID} (${testTicket.StatusName})`);

    // Step 2: Get full ticket details
    console.log('\n=== Step 2: Getting ticket details ===');
    const ticket = await client.getTicket(testTicket.ID, appId);
    console.log('Available Status ID:', ticket.StatusID);
    console.log('Available Status Name:', ticket.StatusName);

    // Step 3: Try updating the status
    console.log('\n=== Step 3: Testing status update ===');

    // For POST endpoint, we need to include all required fields from the original ticket
    // This is effectively a full update (same as editTicket)
    const testUpdate = {
      // Required fields that must be preserved
      TypeID: ticket.TypeID,
      FormID: ticket.FormID,
      Title: ticket.Title,
      AccountID: ticket.AccountID,
      StatusID: ticket.StatusID, // Keep same status for now
      PriorityID: ticket.PriorityID,

      // Requestor info (at least one required)
      RequestorUid: ticket.RequestorUid,

      // Optional: Add a comment
      Comments: `Test status update via MCP at ${new Date().toISOString()}`
    };

    console.log('Update payload:', JSON.stringify(testUpdate, null, 2));

    const updateResult = await client.updateTicket(testTicket.ID, testUpdate, appId);
    console.log('Update successful!');
    console.log('Result:', JSON.stringify(updateResult, null, 2));

    // Step 4: Verify the update
    console.log('\n=== Step 4: Verifying update ===');
    const updatedTicket = await client.getTicket(testTicket.ID, appId);
    console.log(`Status after update: ${updatedTicket.StatusID} (${updatedTicket.StatusName})`);
    console.log('✅ Status update test completed successfully!');

    // Step 5: Try updating to a different status (optional - uncomment to test real change)
    /*
    console.log('\n=== Step 5: Testing real status change ===');
    console.log('To test changing status, uncomment this section and provide a valid StatusID');
    const newStatusId = 5184; // Replace with valid status ID for your system (e.g., "In Progress")
    const statusChangeUpdate = {
      // All required fields must be included
      TypeID: ticket.TypeID,
      FormID: ticket.FormID,
      Title: ticket.Title,
      AccountID: ticket.AccountID,
      PriorityID: ticket.PriorityID,
      RequestorUid: ticket.RequestorUid,
      // Change the status
      StatusID: newStatusId,
      Comments: 'Testing status change via MCP'
    };
    const statusChangeResult = await client.updateTicket(testTicket.ID, statusChangeUpdate, appId);
    console.log('Status change result:', statusChangeResult);
    const verifyStatusChange = await client.getTicket(testTicket.ID, appId);
    console.log(`New status: ${verifyStatusChange.StatusID} (${verifyStatusChange.StatusName})`);
    */

  } catch (error: any) {
    console.error('Error during test:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

testStatusUpdate()
  .then(() => {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  });
