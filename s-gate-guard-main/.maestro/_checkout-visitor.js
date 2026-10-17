// Runs inside Maestro after a test admitted a visitor: marks them as gone so test visitors do not pile up
// under "Inside now". GUARD_TOKEN comes from tokens.js (run-tests.sh).
var api = 'https://society-gate-backend-gsrq.onrender.com/api/v1';
var headers = { Authorization: 'Bearer ' + GUARD_TOKEN, 'Content-Type': 'application/json' };

var request = json(http.get(api + '/gate/entry-requests/' + output.requestId, { headers: headers }).body).data;
var entryId = request.entryId || (request.entryRequest && request.entryRequest.entryId);
if (!entryId) throw new Error('admitted request has no entry: ' + JSON.stringify(request).slice(0, 200));

var res = http.request(api + '/guard/entries/' + entryId + '/checkout', { method: 'PATCH', headers: headers, body: '{}' });
if (res.status !== 200) throw new Error('checkout failed: ' + res.status + ' ' + res.body);
