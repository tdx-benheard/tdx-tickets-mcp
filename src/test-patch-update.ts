import { TDXClient } from './client.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Load credentials from dev credentials file
const credentialsPath = path.join(os.homedir(), '.config', 'tdx', 'dev-credentials.json');

async function testPatchUpdate() {
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

    // Step 2: Try minimal PATCH update with just status
    console.log('\n=== Step 2: Testing PATCH with minimal fields (status only) ===');
    const minimalUpdate = {
      StatusID: testTicket.StatusID, // Keep same status
      Comments: `PATCH test at ${new Date().toISOString()}`
    };

    console.log('PATCH payload:', JSON.stringify(minimalUpdate, null, 2));

    const updateResult = await client.updateTicket(testTicket.ID, minimalUpdate, appId);
    console.log('✅ PATCH update successful!');
    console.log('Result:', JSON.stringify(updateResult, null, 2));

    // Step 3: Verify the update
    console.log('\n=== Step 3: Verifying update ===');
    const updatedTicket = await client.getTicket(testTicket.ID, appId);
    console.log(`Status after update: ${updatedTicket.StatusID} (${updatedTicket.StatusName})`);

    // Step 4: Try changing status to a different value (optional)
    // Get available statuses from the first ticket
    console.log('\n=== Step 4: Attempting status change (optional) ===');
    console.log('Current status:', testTicket.StatusID);
    console.log('To test changing status, you would use a different valid StatusID');
    console.log('Example StatusIDs: 5183 (New), 5184 (In Progress), 5185 (Resolved), etc.');

    /*
    // Uncomment to test actual status change
    const newStatusId = 5184; // Replace with a valid status ID
    const statusChange = {
      StatusID: newStatusId,
      Comments: 'Testing status change via PATCH'
    };
    const statusChangeResult = await client.updateTicket(testTicket.ID, statusChange, appId);
    console.log('Status change successful:', statusChangeResult);
    */

    console.log('\n✅ PATCH update test completed successfully!');

  } catch (error: any) {
    console.error('Error during test:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

testPatchUpdate()
  .then(() => {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  });
