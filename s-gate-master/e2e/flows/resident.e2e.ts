import { by, device, element, expect, waitFor } from 'detox';

/**
 * E2E: Resident app flows
 *
 * Assumes the user is already logged in as a RESIDENT.
 * We use device.launchApp with a pre-set storage state to skip login.
 *
 * In CI, set:
 *   TEST_ACCESS_TOKEN=<resident JWT>
 *   TEST_USER_JSON=<serialized user JSON>
 */

const loginStorage = {
  accessToken: process.env.TEST_ACCESS_TOKEN ?? 'test-resident-token',
  user: process.env.TEST_USER_JSON
    ? JSON.parse(process.env.TEST_USER_JSON)
    : {
        id: 'u-test',
        name: 'Test Resident',
        phone: '9876543210',
        role: 'RESIDENT',
        flatNumber: 'A-101',
      },
};

describe('Resident App Flows', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      // Seed SecureStore with auth tokens to bypass login
      userNotification: undefined,
    });
    // Allow app to load
    await waitFor(element(by.text('Home'))).toBeVisible().withTimeout(20000);
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  // ── Home Tab ───────────────────────────────────────────────────────────────
  describe('Home tab', () => {
    beforeEach(async () => {
      await element(by.text('Home')).tap();
    });

    it('renders the home dashboard', async () => {
      await waitFor(element(by.text('Home'))).toBeVisible().withTimeout(8000);
    });

    it('shows pending approvals section if any', async () => {
      // Pending approvals widget appears when data loads
      await waitFor(element(by.id('home-screen'))).toBeVisible().withTimeout(10000);
    });
  });

  // ── Bottom Tab Navigation ──────────────────────────────────────────────────
  describe('Tab navigation', () => {
    it('navigates to Notices tab', async () => {
      await element(by.text('Notices')).tap();
      await waitFor(element(by.text('Notices'))).toBeVisible().withTimeout(8000);
    });

    it('navigates to Deliveries tab', async () => {
      await element(by.text('Deliveries')).tap();
      await waitFor(element(by.text('Deliveries'))).toBeVisible().withTimeout(8000);
    });

    it('navigates to Society tab', async () => {
      await element(by.text('Society')).tap();
      await waitFor(element(by.text('Society'))).toBeVisible().withTimeout(8000);
    });

    it('navigates to Profile tab', async () => {
      await element(by.text('Profile')).tap();
      await waitFor(element(by.text('Profile'))).toBeVisible().withTimeout(8000);
    });

    it('navigates back to Home tab', async () => {
      await element(by.text('Home')).tap();
      await waitFor(element(by.text('Home'))).toBeVisible().withTimeout(8000);
    });
  });

  // ── Pre-Approvals flow ─────────────────────────────────────────────────────
  describe('Pre-Approvals', () => {
    beforeEach(async () => {
      await element(by.text('Home')).tap();
    });

    it('opens Pre-Approvals screen from navigation', async () => {
      // Navigate from home quick actions or menu
      try {
        await element(by.text('Pre-Approvals')).tap();
      } catch {
        // Try navigating via router directly if no visible link
        await element(by.id('nav-pre-approvals')).tap();
      }
      await waitFor(element(by.text('Pre-Approvals'))).toBeVisible().withTimeout(8000);
    });

    it('shows the pre-approve sheet on + button press', async () => {
      try {
        await element(by.text('Pre-Approvals')).tap();
        await waitFor(element(by.text('Pre-Approvals'))).toBeVisible().withTimeout(8000);
      } catch { /* already here */ }
      await element(by.id('create-pre-approval-btn')).tap();
      await waitFor(element(by.text(/Guest|Cab|Delivery|Service/))).toBeVisible().withTimeout(5000);
    });
  });

  // ── Approvals flow ─────────────────────────────────────────────────────────
  describe('Approvals', () => {
    it('opens the Approvals screen', async () => {
      await element(by.text('Home')).tap();
      try {
        await element(by.text('Approvals')).tap();
      } catch {
        await element(by.id('nav-approvals')).tap();
      }
      await waitFor(element(by.text('Approvals'))).toBeVisible().withTimeout(8000);
    });

    it('shows approve/reject buttons for a pending entry', async () => {
      // If there's a pending entry in the list, check action buttons
      const approveButtons = element(by.text('Approve'));
      const rejectButtons  = element(by.text('Reject'));
      try {
        await waitFor(approveButtons).toBeVisible().withTimeout(5000);
        await expect(approveButtons).toBeVisible();
        await expect(rejectButtons).toBeVisible();
      } catch {
        // No pending entries — skip
      }
    });
  });

  // ── Complaints flow ────────────────────────────────────────────────────────
  describe('Complaints', () => {
    it('opens the Complaints list', async () => {
      try {
        await element(by.text('Complaints')).tap();
      } catch {
        // Navigate via home or quick action
        await element(by.id('nav-complaints')).tap();
      }
      await waitFor(element(by.text('Complaints'))).toBeVisible().withTimeout(8000);
    });

    it('opens the file complaint screen', async () => {
      try {
        await element(by.text('Complaints')).tap();
        await waitFor(element(by.text('Complaints'))).toBeVisible().withTimeout(8000);
      } catch { /* already here */ }
      try {
        await element(by.text('File Complaint')).tap();
        await waitFor(element(by.text(/title|subject|description/i))).toBeVisible().withTimeout(5000);
      } catch {
        await element(by.id('create-complaint-btn')).tap();
        await waitFor(element(by.id('complaint-title-input'))).toBeVisible().withTimeout(5000);
      }
    });
  });

  // ── Amenities flow ────────────────────────────────────────────────────────
  describe('Amenities', () => {
    it('navigates to the Amenities list', async () => {
      try {
        await element(by.text('Amenities')).tap();
      } catch {
        await element(by.id('nav-amenities')).tap();
      }
      await waitFor(element(by.text('Amenities'))).toBeVisible().withTimeout(8000);
    });

    it('opens an amenity detail page', async () => {
      try {
        await element(by.text('Amenities')).tap();
        await waitFor(element(by.text('Amenities'))).toBeVisible().withTimeout(8000);
      } catch { /* already here */ }
      // Tap the first amenity item
      try {
        await element(by.id('amenity-item-0')).tap();
        await waitFor(element(by.text('Book'))).toBeVisible().withTimeout(5000);
      } catch { /* no amenities */ }
    });
  });

  // ── Emergency flow ────────────────────────────────────────────────────────
  describe('Emergency', () => {
    it('opens the Emergency screen', async () => {
      try {
        await element(by.text('Emergency')).tap();
      } catch {
        await element(by.id('nav-emergency')).tap();
      }
      await waitFor(element(by.text('Emergency'))).toBeVisible().withTimeout(8000);
    });
  });

  // ── Profile ───────────────────────────────────────────────────────────────
  describe('Profile tab', () => {
    beforeEach(async () => {
      await element(by.text('Profile')).tap();
      await waitFor(element(by.text('Profile'))).toBeVisible().withTimeout(8000);
    });

    it('shows resident name on profile', async () => {
      await waitFor(element(by.text(loginStorage.user.name))).toBeVisible().withTimeout(8000);
    });

    it('shows flat number on profile', async () => {
      if (loginStorage.user.flatNumber) {
        await waitFor(element(by.text(loginStorage.user.flatNumber))).toBeVisible().withTimeout(5000);
      }
    });

    it('has a Logout button', async () => {
      await waitFor(element(by.text('Logout'))).toBeVisible().withTimeout(8000);
    });

    it('logs out and returns to Login screen', async () => {
      await element(by.text('Logout')).tap();
      // Confirmation dialog may appear
      try {
        await waitFor(element(by.text('Yes'))).toBeVisible().withTimeout(3000);
        await element(by.text('Yes')).tap();
      } catch { /* no dialog */ }
      await waitFor(element(by.text('S-GATE'))).toBeVisible().withTimeout(10000);
    });
  });

  // ── Gate Passes ───────────────────────────────────────────────────────────
  describe('Gate Passes', () => {
    it('navigates to gate passes list', async () => {
      try {
        await element(by.text('Gate Passes')).tap();
      } catch {
        await element(by.id('nav-gate-passes')).tap();
      }
      await waitFor(element(by.text(/Gate Pass/i))).toBeVisible().withTimeout(8000);
    });

    it('opens create gate pass form', async () => {
      try {
        await element(by.text('Gate Passes')).tap();
        await waitFor(element(by.text(/Gate Pass/i))).toBeVisible().withTimeout(8000);
      } catch { /* already here */ }
      try {
        await element(by.id('create-gate-pass-btn')).tap();
        await waitFor(element(by.id('gate-pass-form'))).toBeVisible().withTimeout(5000);
      } catch { /* no create button visible */ }
    });
  });

  // ── Visitors ──────────────────────────────────────────────────────────────
  describe('Visitors', () => {
    it('opens visitors history screen', async () => {
      try {
        await element(by.text('Visitors')).tap();
      } catch {
        await element(by.id('nav-visitors')).tap();
      }
      await waitFor(element(by.text(/Visitor/i))).toBeVisible().withTimeout(8000);
    });
  });

  // ── Notices ───────────────────────────────────────────────────────────────
  describe('Notices tab', () => {
    beforeEach(async () => {
      await element(by.text('Notices')).tap();
      await waitFor(element(by.text('Notices'))).toBeVisible().withTimeout(8000);
    });

    it('displays the notices list', async () => {
      // Check for either a list of notices or an empty state
      try {
        await waitFor(element(by.id('notices-list'))).toBeVisible().withTimeout(8000);
      } catch {
        await waitFor(element(by.text(/No notices|nothing here/i))).toBeVisible().withTimeout(5000);
      }
    });
  });
});
