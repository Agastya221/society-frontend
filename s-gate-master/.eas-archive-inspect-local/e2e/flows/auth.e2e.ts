import { by, device, element, expect, waitFor } from 'detox';

/**
 * E2E: Authentication flow
 *
 * Tests the OTP-based login flow for residents.
 * Pre-requisites:
 *   - A test phone number registered in the backend
 *   - MSG91 test OTP (or use MSG91 sandbox/magic OTP mode)
 *
 * In CI, set environment variables:
 *   TEST_PHONE=9876543210
 *   TEST_OTP=123456   (MSG91 sandbox magic OTP)
 */

const TEST_PHONE = process.env.TEST_PHONE ?? '9876543210';
const TEST_OTP   = process.env.TEST_OTP   ?? '123456';

describe('Auth Flow — Resident Login', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  // ── Onboarding splash → Login ──────────────────────────────────────────────
  describe('Splash / Onboarding', () => {
    it('shows splash or navigates directly to Login', async () => {
      // Either the onboarding screen or login appears first
      try {
        await waitFor(element(by.text('S-GATE'))).toBeVisible().withTimeout(10000);
      } catch {
        // Already on login
        await waitFor(element(by.text('Welcome'))).toBeVisible().withTimeout(10000);
      }
    });
  });

  // ── Login screen: Phone step ───────────────────────────────────────────────
  describe('Phone step', () => {
    it('renders the phone input screen', async () => {
      await waitFor(element(by.text('Welcome\nHome'))).toBeVisible().withTimeout(10000);
      await expect(element(by.text('+91'))).toBeVisible();
      await expect(element(by.text('Send OTP'))).toBeVisible();
    });

    it('shows validation error for invalid phone', async () => {
      await waitFor(element(by.text('Send OTP'))).toBeVisible().withTimeout(8000);
      await element(by.text('Send OTP')).tap();
      await waitFor(element(by.text('Please enter a valid 10-digit Indian mobile number')))
        .toBeVisible()
        .withTimeout(3000);
    });

    it('accepts a valid 10-digit phone number', async () => {
      await waitFor(element(by.id('phone-input'))).toBeVisible().withTimeout(8000);
      await element(by.id('phone-input')).tap();
      await element(by.id('phone-input')).typeText(TEST_PHONE);
      await expect(element(by.id('phone-input'))).toHaveText(TEST_PHONE);
    });

    it('sends OTP and shows OTP screen', async () => {
      await waitFor(element(by.id('phone-input'))).toBeVisible().withTimeout(8000);
      await element(by.id('phone-input')).tap();
      await element(by.id('phone-input')).typeText(TEST_PHONE);
      await element(by.text('Send OTP')).tap();

      // Wait for OTP screen — either the heading or "6-DIGIT CODE" label
      await waitFor(element(by.text('6-DIGIT CODE'))).toBeVisible().withTimeout(15000);
    });
  });

  // ── Login screen: OTP step ─────────────────────────────────────────────────
  describe('OTP step', () => {
    beforeEach(async () => {
      // Navigate to OTP screen first
      await waitFor(element(by.id('phone-input'))).toBeVisible().withTimeout(8000);
      await element(by.id('phone-input')).tap();
      await element(by.id('phone-input')).typeText(TEST_PHONE);
      await element(by.text('Send OTP')).tap();
      await waitFor(element(by.text('6-DIGIT CODE'))).toBeVisible().withTimeout(15000);
    });

    it('renders phone number confirmation on OTP screen', async () => {
      await expect(element(by.text(`+91 ${TEST_PHONE}`))).toBeVisible();
    });

    it('renders Verify & Continue button', async () => {
      await expect(element(by.text('Verify & Continue'))).toBeVisible();
    });

    it('shows error when verifying with empty OTP', async () => {
      await element(by.text('Verify & Continue')).tap();
      await waitFor(element(by.text('Please enter the 6-digit OTP')))
        .toBeVisible()
        .withTimeout(3000);
    });

    it('shows resend countdown after OTP is sent', async () => {
      await waitFor(element(by.text(/Resend OTP in \d+s/))).toBeVisible().withTimeout(3000);
    });

    it('completes login and lands on Home tab with valid OTP', async () => {
      // This test requires MSG91 sandbox / magic OTP
      await waitFor(element(by.id('otp-hidden-input'))).toBeVisible().withTimeout(5000);
      await element(by.id('otp-hidden-input')).tap();
      await element(by.id('otp-hidden-input')).typeText(TEST_OTP);
      await element(by.text('Verify & Continue')).tap();

      // Should land on home dashboard
      await waitFor(element(by.text('Home'))).toBeVisible().withTimeout(20000);
    });

    it('returns to phone screen when back arrow is pressed', async () => {
      // Back button is top-right circle arrow
      await element(by.id('otp-back-button')).tap();
      await waitFor(element(by.text('Welcome\nHome'))).toBeVisible().withTimeout(5000);
    });
  });

  // ── Feature pills (bottom of login) ───────────────────────────────────────
  describe('Feature pills', () => {
    it('displays SECURE, RESIDENT, ASSIST pills', async () => {
      await waitFor(element(by.text('SECURE'))).toBeVisible().withTimeout(8000);
      await expect(element(by.text('RESIDENT'))).toBeVisible();
      await expect(element(by.text('ASSIST'))).toBeVisible();
    });

    it('shows powered-by footer', async () => {
      await waitFor(element(by.text(/POWERED BY S-GATE TECHNOLOGY/)))
        .toBeVisible()
        .withTimeout(8000);
    });
  });
});
