import { buildUpiLink, cleanUtr, isValidUtr, UPI_ID_PATTERN } from '@/services/duePayments';

describe('UPI payment link', () => {
  const payee = { upiId: 'dalmaheights@okhdfcbank', payeeName: 'Dalma Heights Residency' };

  it('carries the payee, the exact amount and the currency', () => {
    const link = buildUpiLink(payee, 2500, 'October 2026 dues A-101');
    expect(link.startsWith('upi://pay?')).toBe(true);
    const params = new URLSearchParams(link.slice('upi://pay?'.length));
    expect(params.get('pa')).toBe('dalmaheights@okhdfcbank');
    expect(params.get('pn')).toBe('Dalma Heights Residency');
    expect(params.get('am')).toBe('2500.00');
    expect(params.get('cu')).toBe('INR');
    expect(params.get('tn')).toBe('October 2026 dues A-101');
  });

  it('keeps paise and never rounds the amount to a different number', () => {
    expect(new URLSearchParams(buildUpiLink(payee, 2499.5, 'x').split('?')[1]).get('am')).toBe('2499.50');
    expect(new URLSearchParams(buildUpiLink(payee, 2750.75, 'x').split('?')[1]).get('am')).toBe('2750.75');
  });

  it('encodes names and notes so special characters cannot change the link', () => {
    const link = buildUpiLink({ upiId: 'a.b-c_d@ybl', payeeName: 'Tower & Co = Society' }, 100, 'dues & fees=1');
    const params = new URLSearchParams(link.split('?')[1]);
    expect(params.get('pn')).toBe('Tower & Co = Society');
    expect(params.get('tn')).toBe('dues & fees=1');
    expect(params.get('pa')).toBe('a.b-c_d@ybl');
    // only the five expected parameters, nothing injected through the text
    expect([...params.keys()].sort()).toEqual(['am', 'cu', 'pa', 'pn', 'tn']);
  });

  it('shortens a long note to the 50 characters UPI apps accept', () => {
    const note = 'x'.repeat(80);
    expect(new URLSearchParams(buildUpiLink(payee, 1, note).split('?')[1]).get('tn')).toHaveLength(50);
  });
});

describe('UPI ID and reference number checks', () => {
  it('accepts real UPI IDs and refuses malformed ones', () => {
    for (const ok of ['society@okhdfcbank', 'dalma.heights-1@ybl', '9876543210@paytm', 'a_b@upi']) {
      expect(UPI_ID_PATTERN.test(ok)).toBe(true);
    }
    for (const bad of ['no-at-sign', 'a@b', 'two@@ybl', 'has space@ybl', '@ybl', 'name@']) {
      expect(UPI_ID_PATTERN.test(bad)).toBe(false);
    }
  });

  it('cleans a typed reference number: no spaces, upper case', () => {
    expect(cleanUtr('  4281 6392 1047 ')).toBe('428163921047');
    expect(cleanUtr('t26101812ab')).toBe('T26101812AB');
  });

  it('accepts 8 to 22 letters or digits only', () => {
    expect(isValidUtr('428163921047')).toBe(true);
    expect(isValidUtr('4281 6392 1047')).toBe(true);
    expect(isValidUtr('1234567')).toBe(false);
    expect(isValidUtr('1'.repeat(23))).toBe(false);
    expect(isValidUtr('ABC-12345678')).toBe(false);
  });
});
