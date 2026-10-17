// Runs inside Maestro: the resident of A101 approves the newest pending gate request for their flat,
// exactly as the resident app would. RESIDENT_TOKEN comes from tokens.js (run-tests.sh).
var base = 'https://society-gate-backend-gsrq.onrender.com/api/v1/gate/entry-requests';
var headers = { Authorization: 'Bearer ' + RESIDENT_TOKEN, 'Content-Type': 'application/json' };

var list = json(http.get(base + '?status=PENDING', { headers: headers }).body);
var rows = Array.isArray(list.data) ? list.data : (list.data.entryRequests || []);
if (!rows.length) throw new Error('resident sees no pending request');

var res = http.request(base + '/' + rows[0].id + '/approve', { method: 'PATCH', headers: headers, body: '{}' });
if (res.status !== 200) throw new Error('approve failed: ' + res.status + ' ' + res.body);
output.requestId = rows[0].id;
