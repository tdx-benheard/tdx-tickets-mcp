# Working On: TeamDynamix API Tag Support

## Current Status (2025-10-06)

### ✅ COMPLETED

Successfully implemented tag add/delete functionality for the TeamDynamix API MCP server.

### What We Accomplished

1. **Investigated API Tag Behavior**
   - Discovered POST `/api/{appId}/tickets/{id}/tags` works correctly
   - Discovered DELETE `/api/{appId}/tickets/{id}/tags` works correctly
   - Both return HTTP 200 with empty string `""` on success
   - Tags are stored in database and visible in TeamDynamix UI

2. **Identified API Limitation**
   - Found that GET `/api/{appId}/tickets/{id}` does NOT return tags
   - Traced issue to git commit `ed7a6cb5356` (July 25, 2025)
   - API rollback removed `Tags` property from response model (problem #27053287)
   - Tags endpoints still work, but retrieval via GET was removed

3. **Implemented MCP Tools**
   - Added `tdx_add_ticket_tags` tool
   - Added `tdx_delete_ticket_tags` tool
   - Updated `client.ts` with `addTicketTags()` and `deleteTicketTags()` methods
   - Updated `handlers.ts` with handler implementations
   - Updated `index.ts` tool routing

4. **Updated Documentation**
   - Updated README.md with tag tool descriptions and limitations
   - Updated claude.md with API endpoints and tag notes
   - Created `Tag rollback issue.md` with complete investigation details

### Testing Results

**Production Environment (ticket #29060683):**
- ✅ Added tags: "test1", "test2", "test3", "test4" - SUCCESS
- ✅ Verified tags visible in UI - SUCCESS
- ✅ Deleted tags: "test", "test1", "test2", "test3", "test4" - SUCCESS
- ✅ Only "Clauded" tag remaining - SUCCESS
- ❌ GET ticket does not return Tags field - EXPECTED (due to rollback)

### Files Modified

**Core Implementation:**
- `src/client.ts` - Added `addTicketTags()` and `deleteTicketTags()` methods
- `src/tools.ts` - Added tool schemas for add/delete tags
- `src/handlers.ts` - Added `handleAddTicketTags()` and `handleDeleteTicketTags()`
- `src/index.ts` - Added routing for new tag tools

**Documentation:**
- `README.md` - Added tag tool documentation with limitations
- `claude.md` - Updated API endpoints section with tag info
- `Tag rollback issue.md` - Complete investigation writeup

**Test Files:**
- `src/test-tags-prod.ts` - Tests adding tags (multiple variations)
- `src/test-delete-tags.ts` - Tests deleting tags
- `src/test-get-ticket.ts` - Tests retrieving full ticket data
- `src/test-get-tags.ts` - Tests various tag retrieval endpoints
- `src/test-raw-get.ts` - Raw axios test to verify Tags field absence
- `src/test-tags-via-edit.ts` - Tests if EditTicket returns tags

### Key Findings

1. **Empty String = Success**
   - POST and DELETE `/tags` endpoints return `""` (empty string) on success
   - HTTP 200 status code confirms success
   - HTTP 304 indicates no changes made (tags already exist/don't exist)

2. **Tags Work But Aren't Retrieved**
   - Tags are stored correctly in TeamDynamix database
   - Tags visible in TeamDynamix web UI
   - Tags NOT returned in API GET ticket responses
   - This is intentional due to July 2025 rollback

3. **Production vs Local Code Mismatch**
   - Local development branch has Tags property in code
   - Production API has rolled back code without Tags property
   - Rollback was for problem ticket #27053287
   - Source code shows history: add → modify → rollback

### API Behavior Summary

| Endpoint | Method | Works? | Returns Tags? | Notes |
|----------|--------|--------|---------------|-------|
| `/api/{appId}/tickets/{id}` | GET | ✅ | ❌ | Tags field removed in rollback |
| `/api/{appId}/tickets/{id}` | POST | ✅ | ❌ | Edit ticket (full update) |
| `/api/{appId}/tickets/{id}/tags` | POST | ✅ | N/A | Add tags, returns empty string |
| `/api/{appId}/tickets/{id}/tags` | DELETE | ✅ | N/A | Delete tags, returns empty string |
| `/api/{appId}/tickets/{id}/tags` | GET | ❌ | N/A | 405 Method Not Allowed |

### Next Steps

- ✅ Build and test changes
- ✅ Verify MCP tools work in Claude Desktop/Code
- 🔄 Consider monitoring for re-implementation of Tags property in future releases
- 🔄 Clean up test files (optional)

### Recommendations for Users

1. **Adding/Deleting Tags:**
   - Use `tdx_add_ticket_tags` and `tdx_delete_ticket_tags` tools
   - Tags will be stored successfully
   - Empty response means success

2. **Verifying Tags:**
   - Check TeamDynamix web interface to see tags
   - Tags will NOT appear in `tdx_get_ticket` responses
   - This is a known limitation, not a bug

3. **Tracking Tags:**
   - Keep manual record if needed
   - MCP server cannot retrieve tags via API
   - UI is the only reliable source of truth

## Conclusion

Tag add/delete functionality is fully implemented and working. The limitation of not being able to retrieve tags via API is documented and understood. This is due to an intentional API rollback in production that removed the Tags property from GET responses while keeping the tag storage functionality intact.

---

## Additional Investigation (2025-10-07)

### Report Data Limits Investigation

**Question:** Does the API limit report results when retrieving data?

**Answer:** NO - Reports return ALL matching data without row limits.

**Key Findings:**
1. **No MaxResults enforcement in query generation:**
   - Searched QueryBuilder.cs for `MaxResults`, `TOP`, `LIMIT` patterns - none found
   - Report.MaxResults property exists but is not referenced in query building

2. **Complete dataset returned:**
   - ReportService.cs:1460 - `dataAdapter.Fill(dataSet, "Results")` fills entire dataset
   - ReportService.cs:1493 - `return dataSet.Tables[0]` returns complete DataTable
   - No row limiting code in data retrieval path

3. **Only practical limit is SQL timeout:**
   - 90-second command timeout (ReportService.cs:1450)
   - Reports exceeding threshold logged as "slow reports" but still return all data
   - Memory and network constraints may also apply

**Documentation Updates:**
- Updated claude.md with report data limit notes
- Updated README.md with important notes on `tdx_run_report` tool
- Clarified that reports cannot accept runtime parameters/filters
