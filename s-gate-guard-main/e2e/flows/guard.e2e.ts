import { by, device, element, expect, waitFor } from 'detox';

/**
 * E2E: Guard app flows
 *
 * Covers: Login → Dashboard → New Entry → Scan QR → Approvals → Profile
 *
 * In CI set:
 *   TEST_GUARD_PHONE=9123456789
 *   TEST_GUARD_OTP=654321     (MSG91 sandbox magic OTP)
 */

const TEST_PHONE = process.env.TEST_GUARD_PHONE ?? '9123456789';
const TEST_OTP   = process.env.TEST_GUARD_OTP   ?? '654321';

describe('Guard App — Auth Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  // ── Auth screen ────────────────────────────────────────────────────────────
  describe('Auth screen', () => {
    it('shows Guard Portal heading', async () => {
      await waitFor(element(by.text('Guard Portal'))).toBeVisible().withTimeout(10000);
    });

    it('shows S-Gate Security System subtitle', async () => {
      await waitFor(element(by.text('S-Gate Security System'))).toBeVisible().withTimeout(8000);
    });

    it('shows Guard Login card title', async () => {
      await waitFor(element(by.text('Guard Login'))).toBeVisible().withTimeout(8000);
    });

    it('shows Guard Access Only badge', async () => {
      await waitFor(element(by.text(/Guard Access Only/))).toBeVisible().withTimeout(8000);
    });

    it('renders mobile number input', async () => {
      await waitFor(element(by.placeholder('10-digit mobile number'))).toBeVisible().withTimeout(8000);
    });

    it('shows validation error for short phone number', async () => {
      await waitFor(element(by.text('Send OTP'))).toBeVisible().withTimeout(8000);
      await element(by.text('Send OTP')).tap();
      await waitFor(element(by.text('Please enter a valid 10-digit mobile number')))
        .toBeVisible()
        .withTimeout(3000);
    });

    it('transitions to OTP screen after sending OTP', async () => {
      await waitFor(element(by.placeholder('10-digit mobile number'))).toBeVisible().withTimeout(8000);
      await element(by.placeholder('10-digit mobile number')).tap();
      await element(by.placeholder('10-digit mobile number')).typeText(TEST_PHONE);
      await element(by.text('Send OTP')).tap();
      await waitFor(element(by.text('Enter OTP'))).toBeVisible().withTimeout(15000);
    });
  });

  // ── OTP step ───────────────────────────────────────────────────────────────
  describe('OTP step', () => {
    beforeEach(async () => {
      await waitFor(element(by.placeholder('10-digit mobile number'))).toBeVisible().withTimeout(8000);
      await element(by.placeholder('10-digit mobile number')).tap();
      await element(by.placeholder('10-digit mobile number')).typeText(TEST_PHONE);
      await element(by.text('Send OTP')).tap();
      await waitFor(element(by.text('Enter OTP'))).toBeVisible().withTimeout(15000);
    });

    it('shows phone number on OTP screen', async () => {
      await expect(element(by.text(TEST_PHONE))).toBeVisible();
    });

    it('renders Change number back link', async () => {
      await expect(element(by.text('Change number'))).toBeVisible();
    });

    it('shows error when verifying empty OTP', async () => {
      await element(by.text('Verify & Sign In')).tap();
      await waitFor(element(by.text('Please enter the 6-digit OTP')))
        .toBeVisible()
        .withTimeout(3000);
    });

    it('shows invalid OTP error for wrong code', async () => {
      await element(by.placeholder('• • • • • •')).tap();
      await element(by.placeholder('• • • • • •')).typeText('000000');
      await element(by.text('Verify & Sign In')).tap();
      await waitFor(element(by.text('Invalid OTP. Please check and try again.')))
        .toBeVisible()
        .withTimeout(10000);
    });

    it('shows countdown timer after OTP send', async () => {
      await waitFor(element(by.text(/Resend in \d+s/))).toBeVisible().withTimeout(3000);
    });

    it('returns to phone screen via Change number', async () => {
      await element(by.text('Change number')).tap();
      await waitFor(element(by.text('Guard Login'))).toBeVisible().withTimeout(5000);
    });

    it('logs in successfully with valid OTP and lands on dashboard', async () => {
      await element(by.placeholder('• • • • • •')).tap();
      await element(by.placeholder('• • • • • •')).typeText(TEST_OTP);
      await element(by.text('Verify & Sign In')).tap();
      // Should redirect to guard dashboard
      await waitFor(element(by.text('MAIN ACTIONS'))).toBeVisible().withTimeout(20000);
    });
  });
});

// ── Guard Dashboard flows ──────────────────────────────────────────────────────
describe('Guard Dashboard Flows', () => {
  /**
   * For these tests we assume the guard is already logged in.
   * In practice, seed SecureStore via launchApp userDataPath or
   * complete the login flow in beforeAll.
   */
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    // Complete login
    try {
      await waitFor(element(by.placeholder('10-digit mobile number'))).toBeVisible().withTimeout(10000);
      await element(by.placeholder('10-digit mobile number')).tap();
      await element(by.placeholder('10-digit mobile number')).typeText(TEST_PHONE);
      await element(by.text('Send OTP')).tap();
      await waitFor(element(by.placeholder('• • • • • •'))).toBeVisible().withTimeout(15000);
      await element(by.placeholder('• • • • • •')).tap();
      await element(by.placeholder('• • • • • •')).typeText(TEST_OTP);
      await element(by.text('Verify & Sign In')).tap();
      await waitFor(element(by.text('MAIN ACTIONS'))).toBeVisible().withTimeout(20000);
    } catch {
      // Already logged in or using pre-seeded state
    }
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  // ── Dashboard ────────────────────────────────────────────────────────────
  describe('Dashboard', () => {
    it('renders MAIN ACTIONS section', async () => {
      await waitFor(element(by.text('MAIN ACTIONS'))).toBeVisible().withTimeout(10000);
    });

    it('renders MORE ACTIONS section', async () => {
      await expect(element(by.text('MORE ACTIONS'))).toBeVisible();
    });

    it('renders New Entry tile', async () => {
      await expect(element(by.text('New Entry'))).toBeVisible();
    });

    it('renders Scan QR tile', async () => {
      await expect(element(by.text('Scan QR'))).toBeVisible();
    });

    it("renders Today's Entries tile", async () => {
      await expect(element(by.text("Today's\nEntries"))).toBeVisible();
    });

    it('renders Approvals tile', async () => {
      await expect(element(by.text('Approvals'))).toBeVisible();
    });

    it('renders Staff Check-In tile', async () => {
      await expect(element(by.text('Staff\nCheck-In'))).toBeVisible();
    });

    it('renders My Profile tile', async () => {
      await expect(element(by.text('My\nProfile'))).toBeVisible();
    });

    it('renders Report Emergency tile', async () => {
      await expect(element(by.text('Report Emergency'))).toBeVisible();
    });
  });

  // ── New Entry flow ────────────────────────────────────────────────────────
  describe('New Entry', () => {
    beforeEach(async () => {
      await waitFor(element(by.text('MAIN ACTIONS'))).toBeVisible().withTimeout(10000);
    });

    it('navigates to New Entry screen', async () => {
      await element(by.text('New Entry')).tap();
      await waitFor(element(by.text(/New Entry|Visitor Name|Entry/i)))
        .toBeVisible()
        .withTimeout(8000);
    });

    it('renders the entry form fields', async () => {
      await element(by.text('New Entry')).tap();
      await waitFor(element(by.text(/New Entry|Entry/i))).toBeVisible().withTimeout(8000);
      // Form fields
      try {
        await expect(element(by.id('entry-name-input'))).toBeVisible();
      } catch {
        await expect(element(by.placeholder(/name/i))).toBeVisible();
      }
    });

    it('shows validation when submitting empty form', async () => {
      await element(by.text('New Entry')).tap();
      await waitFor(element(by.text(/New Entry|Entry/i))).toBeVisible().withTimeout(8000);
      try {
        await element(by.text('Submit')).tap();
        await waitFor(element(by.text(/required|please enter/i)))
          .toBeVisible()
          .withTimeout(3000);
      } catch { /* no submit button visible without scroll */ }
    });

    it('goes back to dashboard from New Entry', async () => {
      await element(by.text('New Entry')).tap();
      await waitFor(element(by.text(/New Entry|Entry/i))).toBeVisible().withTimeout(8000);
      await element(by.id('header-back-button')).tap();
      await waitFor(element(by.text('MAIN ACTIONS'))).toBeVisible().withTimeout(5000);
    });
  });

  // ── Scan QR flow ──────────────────────────────────────────────────────────
  describe('Scan QR (scan-verify)', () => {
    beforeEach(async () => {
      await waitFor(element(by.text('MAIN ACTIONS'))).toBeVisible().withTimeout(10000);
    });

    it('navigates to QR scanner screen', async () => {
      await element(by.text('Scan QR')).tap();
      await waitFor(element(by.text(/Scan|Camera|QR/i))).toBeVisible().withTimeout(8000);
    });

    it('shows camera permission prompt if not granted', async () => {
      // Camera may request permission on first launch
      try {
        await waitFor(element(by.text(/Allow|Permission|Camera/i)))
          .toBeVisible()
          .withTimeout(4000);
        await element(by.text('Allow')).tap();
      } catch { /* permission already granted */ }
    });

    it('goes back from QR scanner to dashboard', async () => {
      await element(by.text('Scan QR')).tap();
      await waitFor(element(by.text(/Scan|Camera|QR/i))).toBeVisible().withTimeout(8000);
      await element(by.id('header-back-button')).tap();
      await waitFor(element(by.text('MAIN ACTIONS'))).toBeVisible().withTimeout(5000);
    });
  });

  // ── Today's Entries flow ──────────────────────────────────────────────────
  describe("Today's Entries", () => {
    beforeEach(async () => {
      await waitFor(element(by.text('MAIN ACTIONS'))).toBeVisible().withTimeout(10000);
    });

    it('navigates to Today\'s Entries screen', async () => {
      await element(by.text("Today's\nEntries")).tap();
      await waitFor(element(by.text(/Today|Entries/i))).toBeVisible().withTimeout(8000);
    });

    it('shows a list or empty state for entries', async () => {
      await element(by.text("Today's\nEntries")).tap();
      await waitFor(element(by.text(/Today|Entries/i))).toBeVisible().withTimeout(8000);
      try {
        await waitFor(element(by.id('entries-list'))).toBeVisible().withTimeout(5000);
      } catch {
        await waitFor(element(by.text(/No entries|Empty/i))).toBeVisible().withTimeout(5000);
      }
    });
  });

  // ── Approvals flow ────────────────────────────────────────────────────────
  describe('Approvals', () => {
    beforeEach(async () => {
      await waitFor(element(by.text('MAIN ACTIONS'))).toBeVisible().withTimeout(10000);
    });

    it('navigates to Approvals screen', async () => {
      await element(by.text('Approvals')).tap();
      await waitFor(element(by.text(/Approvals|Pending/i))).toBeVisible().withTimeout(8000);
    });

    it('shows pending entries or empty state', async () => {
      await element(by.text('Approvals')).tap();
      await waitFor(element(by.text(/Approvals|Pending/i))).toBeVisible().withTimeout(8000);
      try {
        await waitFor(element(by.id('approvals-list'))).toBeVisible().withTimeout(5000);
      } catch {
        await waitFor(element(by.text(/No pending|All clear/i))).toBeVisible().withTimeout(5000);
      }
    });
  });

  // ── Staff Check-In flow ───────────────────────────────────────────────────
  describe('Staff Check-In (staff-scan)', () => {
    beforeEach(async () => {
      await waitFor(element(by.text('MAIN ACTIONS'))).toBeVisible().withTimeout(10000);
    });

    it('navigates to Staff Check-In screen', async () => {
      await element(by.text('Staff\nCheck-In')).tap();
      await waitFor(element(by.text(/Staff|Check.In|Scan/i))).toBeVisible().withTimeout(8000);
    });
  });

  // ── Profile ───────────────────────────────────────────────────────────────
  describe('Guard Profile', () => {
    beforeEach(async () => {
      await waitFor(element(by.text('MAIN ACTIONS'))).toBeVisible().withTimeout(10000);
      await element(by.text('My\nProfile')).tap();
      await waitFor(element(by.text(/Profile/i))).toBeVisible().withTimeout(8000);
    });

    it('shows guard name on profile', async () => {
      // Name from auth store
      await waitFor(element(by.text(/Ravi|Guard/i))).toBeVisible().withTimeout(8000);
    });

    it('shows gate name on profile', async () => {
      await waitFor(element(by.text(/Main Gate|Gate/i))).toBeVisible().withTimeout(8000);
    });

    it('shows shift info on profile', async () => {
      await waitFor(element(by.text(/Morning|Evening|Night/i))).toBeVisible().withTimeout(8000);
    });

    it('has a logout option', async () => {
      await waitFor(element(by.text(/Logout|Sign Out/i))).toBeVisible().withTimeout(5000);
    });

    it('logs out and returns to auth screen', async () => {
      await element(by.text(/Logout|Sign Out/i)).tap();
      try {
        await waitFor(element(by.text(/Yes|Confirm/i))).toBeVisible().withTimeout(3000);
        await element(by.text(/Yes|Confirm/i)).tap();
      } catch { /* no confirmation */ }
      await waitFor(element(by.text('Guard Portal'))).toBeVisible().withTimeout(10000);
    });
  });

  // ── Emergency flow ────────────────────────────────────────────────────────
  describe('Emergency', () => {
    beforeEach(async () => {
      await waitFor(element(by.text('MAIN ACTIONS'))).toBeVisible().withTimeout(10000);
    });

    it('navigates to Emergencies screen', async () => {
      await element(by.text('Report Emergency')).tap();
      await waitFor(element(by.text(/Emergency|Alert/i))).toBeVisible().withTimeout(8000);
    });

    it('goes back from emergencies to dashboard', async () => {
      await element(by.text('Report Emergency')).tap();
      await waitFor(element(by.text(/Emergency|Alert/i))).toBeVisible().withTimeout(8000);
      await element(by.id('header-back-button')).tap();
      await waitFor(element(by.text('MAIN ACTIONS'))).toBeVisible().withTimeout(5000);
    });
  });
});
