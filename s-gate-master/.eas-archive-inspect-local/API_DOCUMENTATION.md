🔧 FULL FIX INSTRUCTION (NAV + API)

There are two major issues that need to be fixed properly:
(1) Bottom navigation UI is broken
(2) Notices API handling is incorrect

1. ❌ Bottom Navigation Issues (UI + Labels)
Current Problems
Tab labels are incorrect:
“Notices/in…” → ❌ wrong (truncated + looks like route name)
“Profile/index” → ❌ wrong (internal route leaking into UI)
This indicates that route names are being used instead of proper labels
UI looks unpolished and not production-ready
✅ What I Want

Fix the bottom navigation to EXACTLY this:

Home | Notice | Delivery | Society | Profile
🔥 Requirements
1. Clean Labels (MANDATORY)
Do NOT use route names

Explicitly set labels:

tabBarLabel: 'Notice'
tabBarLabel: 'Profile'
Final labels must be:
Home
Notice
Delivery
Society
Profile
2. Fix Route → Label Mapping

Make sure:

notices/index.tsx → label = Notice
profile/index.tsx → label = Profile

Do NOT show:

/index
folder names
file paths
3. Prevent Text Truncation
Labels should NOT appear like:
“Notices/in…”
Fix by:
adjusting tab width OR
reducing font size slightly OR
ensuring max 1 line label
4. Consistent Styling
All tabs must have:
same font size
same spacing
aligned icons + labels
Active tab highlight should work properly
5. Final Expected Result

👉 Clean, balanced navigation bar
👉 No broken labels
👉 No internal route names visible

2. ❌ Notices API Error (Critical)
Error:
TypeError: data.sort is not a function (it is undefined)
📌 Root Cause

You are calling:

data.sort(...)

But data is not an array

Most likely API response is like:

{
  "success": true,
  "data": [...]
}

So you should NOT use data.sort directly.

✅ Fix This Properly
Step 1: Inspect API Response

Log the response:

console.log(response.data)
Step 2: Safely Extract Array

Update code like this:

const res = await api.get('/community/notices');

// handle different possible shapes safely
const notices = Array.isArray(res.data)
  ? res.data
  : Array.isArray(res.data?.data)
  ? res.data.data
  : [];
Step 3: Apply Sort Safely
const sortedNotices = notices.sort(
  (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
);
Step 4: Add Defensive Check (IMPORTANT)
if (!Array.isArray(notices)) {
  console.warn('Notices is not an array:', notices);
  return;
}
⚠️ Important
Never assume API returns array directly
Always validate before .sort()
Prevent app crash
🎯 FINAL GOAL
Navigation:
Clean labels (no /index, no truncation)
Proper 5 tabs visible
Production-level UI
API:
Notices load correctly
No runtime error
Safe data handling

If needed, refactor both UI and data handling cleanly — don’t patch, fix it properly.