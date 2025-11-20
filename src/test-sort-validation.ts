import { readFileSync, existsSync } from 'fs';
import { TDXClient } from './client.js';
import { decodePassword, validateEnvVars } from './utils.js';
import { homedir } from 'os';
import { join } from 'path';

// Load production credentials from JSON file
const credPath = join(homedir(), '.config', 'tdx-mcp', 'prod-credentials.json');

if (!existsSync(credPath)) {
  console.error('❌ Production credentials file not found:', credPath);
  process.exit(1);
}

const credentials = JSON.parse(readFileSync(credPath, 'utf8'));

const TDX_BASE_URL = credentials.TDX_BASE_URL || '';
const TDX_USERNAME = credentials.TDX_USERNAME || '';
const TDX_PASSWORD = credentials.TDX_PASSWORD || '';
const TDX_TICKET_APP_IDS = credentials.TDX_TICKET_APP_IDS || '';

// Validate required fields
try {
  validateEnvVars(
    { TDX_BASE_URL, TDX_USERNAME, TDX_PASSWORD, TDX_TICKET_APP_IDS },
    ['TDX_BASE_URL', 'TDX_USERNAME', 'TDX_PASSWORD', 'TDX_TICKET_APP_IDS']
  );
} catch (error) {
  console.error('❌ Missing required fields in credentials file');
  process.exit(1);
}

// Decode password
const decodedPassword = decodePassword(TDX_PASSWORD);

// Parse comma-separated app IDs
const appIds = TDX_TICKET_APP_IDS.split(',').map((id: string) => id.trim()).filter((id: string) => id.length > 0);

console.log('🔧 Testing Sort Validation\n');

const client = new TDXClient(TDX_BASE_URL, TDX_USERNAME, decodedPassword, appIds);

async function testSortValidation() {
  try {
    console.log('📊 Test 1: Valid sort column (TicketID)');
    const validResult = await client.runReport(273426, undefined, true, 'TicketID');
    if (validResult.SortOrder && validResult.SortOrder.length > 0) {
      console.log('✅ Valid sort accepted - SortOrder:', validResult.SortOrder);
    } else {
      console.log('❌ Valid sort rejected - SortOrder is empty');
    }

    console.log('\n📊 Test 2: Invalid sort column (ID)');
    const invalidResult = await client.runReport(273426, undefined, true, 'ID');
    if (!invalidResult.SortOrder || invalidResult.SortOrder.length === 0) {
      console.log('✅ Invalid sort detected - SortOrder is empty (validation should trigger)');
      console.log('   This would cause an error in the handler with column list');
    } else {
      console.log('❌ Invalid sort was accepted - SortOrder:', invalidResult.SortOrder);
    }

    console.log('\n📊 Test 3: Valid sort with DESC');
    const descResult = await client.runReport(273426, undefined, true, 'TicketID DESC');
    if (descResult.SortOrder && descResult.SortOrder.length > 0 && !descResult.SortOrder[0].IsAscending) {
      console.log('✅ Valid DESC sort accepted - SortOrder:', descResult.SortOrder);
    } else {
      console.log('❌ DESC sort failed - SortOrder:', descResult.SortOrder);
    }

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
  }
}

testSortValidation();
