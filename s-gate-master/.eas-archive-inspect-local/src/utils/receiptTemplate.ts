// ─────────────────────────────────────────────────────────────────────────────
// S-Gate Payment Receipt — HTML Template for PDF Generation
// Fintech-grade receipt design (Stripe / Razorpay / MyGate quality)
// ─────────────────────────────────────────────────────────────────────────────

export interface ReceiptData {
  receiptNumber: string;       // e.g. SG-2026-03-0001
  status: 'PAID' | 'PENDING' | 'OVERDUE';
  flat: string;                // e.g. A-302
  society: string;             // e.g. Green Valley Enclave
  billPeriod: string;          // e.g. March 2026
  lineItems: { label: string; amount: number }[];
  totalAmount: number;
  billId: string;              // e.g. 39C03C2D
  dueDate: string;             // e.g. 05-03-26
  paidOn: string;              // e.g. 04-03-26
  paymentMethod: string;       // e.g. UPI
  generatedAt?: string;        // timestamp
}

function formatINR(amount: number): string {
  return '₹' + amount.toLocaleString('en-IN');
}

function generateReceiptNumber(billId: string, dueDate: string): string {
  const d = new Date(dueDate);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const suffix = billId.slice(0, 4).toUpperCase();
  return `SG-${yyyy}-${mm}-${suffix}`;
}

export function buildReceiptNumber(billId: string, dueDate: string): string {
  return generateReceiptNumber(billId, dueDate);
}

export function buildReceiptHTML(data: ReceiptData): string {
  // Status badge colors
  const statusConfig: Record<string, { bg: string; color: string; label: string }> = {
    PAID:    { bg: '#ECFDF5', color: '#059669', label: '✓ Paid' },
    PENDING: { bg: '#FFFBEB', color: '#D97706', label: '⏳ Pending' },
    OVERDUE: { bg: '#FEF2F2', color: '#DC2626', label: '⚠ Overdue' },
  };
  const badge = statusConfig[data.status] || statusConfig.PAID;

  // Line items HTML
  const lineItemsHTML = data.lineItems.map(item => `
    <tr>
      <td style="padding: 12px 0; font-size: 14px; color: #4B5563; border-bottom: 1px solid #F3F4F6;">
        ${item.label}
      </td>
      <td style="padding: 12px 0; font-size: 14px; color: #1F2937; font-weight: 600; text-align: right; border-bottom: 1px solid #F3F4F6;">
        ${formatINR(item.amount)}
      </td>
    </tr>
  `).join('');

  const now = data.generatedAt || new Date().toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Receipt - ${data.receiptNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #F9FAFB;
      color: #1F2937;
      padding: 24px 16px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .receipt-card {
      max-width: 460px;
      margin: 0 auto;
      background: #FFFFFF;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06), 0 1px 4px rgba(0, 0, 0, 0.04);
    }

    /* ── Header ───────────────────────────────────── */
    .header {
      background: linear-gradient(135deg, #FFD60A 0%, #FFCA28 50%, #FFB300 100%);
      padding: 28px 28px 24px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .brand { display: flex; flex-direction: column; }
    .brand-name {
      font-size: 22px;
      font-weight: 800;
      color: #1A1A1A;
      letter-spacing: -0.5px;
    }
    .brand-tagline {
      font-size: 11px;
      font-weight: 500;
      color: rgba(26, 26, 26, 0.6);
      margin-top: 2px;
      letter-spacing: 0.3px;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 6px 14px;
      border-radius: 100px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.2px;
    }

    /* ── Body ──────────────────────────────────────── */
    .body { padding: 28px; }

    .receipt-title {
      font-size: 16px;
      font-weight: 700;
      color: #1F2937;
      margin-bottom: 4px;
    }
    .receipt-number {
      font-size: 12px;
      font-weight: 500;
      color: #9CA3AF;
      margin-bottom: 24px;
      letter-spacing: 0.5px;
    }

    /* ── Info Grid ─────────────────────────────────── */
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 28px;
    }
    .info-item {}
    .info-label {
      font-size: 11px;
      font-weight: 600;
      color: #9CA3AF;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 4px;
    }
    .info-value {
      font-size: 15px;
      font-weight: 600;
      color: #1F2937;
    }

    /* ── Breakdown Card ────────────────────────────── */
    .breakdown-card {
      border: 1px solid #F3F4F6;
      border-radius: 14px;
      padding: 20px;
      margin-bottom: 24px;
    }
    .breakdown-title {
      font-size: 11px;
      font-weight: 700;
      color: #9CA3AF;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 16px;
    }
    .breakdown-table {
      width: 100%;
      border-collapse: collapse;
    }
    .total-divider {
      height: 1px;
      background: #E5E7EB;
      margin: 4px 0;
    }
    .total-row td {
      padding: 16px 0 4px;
    }
    .total-label {
      font-size: 15px;
      font-weight: 700;
      color: #1F2937;
    }
    .total-value {
      font-size: 20px;
      font-weight: 800;
      color: #1F2937;
      text-align: right;
    }

    /* ── Payment Details ───────────────────────────── */
    .details-section {
      margin-bottom: 24px;
    }
    .details-title {
      font-size: 11px;
      font-weight: 700;
      color: #9CA3AF;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 16px;
    }
    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }
    .detail-item {}
    .detail-label {
      font-size: 11px;
      font-weight: 500;
      color: #9CA3AF;
      margin-bottom: 3px;
    }
    .detail-value {
      font-size: 13px;
      font-weight: 600;
      color: #374151;
    }

    /* ── QR Section ────────────────────────────────── */
    .qr-section {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 16px;
      background: #F9FAFB;
      border-radius: 12px;
      margin-bottom: 24px;
    }
    .qr-placeholder {
      width: 64px;
      height: 64px;
      background: #E5E7EB;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .qr-placeholder svg {
      width: 36px;
      height: 36px;
      color: #9CA3AF;
    }
    .qr-text {
      font-size: 11px;
      color: #6B7280;
      line-height: 1.5;
    }
    .qr-text strong {
      color: #374151;
      font-weight: 600;
    }

    /* ── Disclaimer ────────────────────────────────── */
    .disclaimer {
      text-align: center;
      font-size: 11px;
      color: #9CA3AF;
      line-height: 1.6;
      padding-bottom: 4px;
    }

    /* ── Footer ────────────────────────────────────── */
    .footer {
      background: #F9FAFB;
      padding: 16px 28px;
      text-align: center;
      border-top: 1px solid #F3F4F6;
    }
    .footer-text {
      font-size: 11px;
      color: #9CA3AF;
      font-weight: 500;
    }
    .footer-timestamp {
      font-size: 10px;
      color: #D1D5DB;
      margin-top: 4px;
    }

    /* ── Print overrides ──────────────────────────── */
    @media print {
      body { background: #fff; padding: 0; }
      .receipt-card { box-shadow: none; border: 1px solid #E5E7EB; }
    }
  </style>
</head>
<body>
  <div class="receipt-card">

    <!-- ══════════ HEADER ══════════ -->
    <div class="header">
      <div class="brand">
        <div class="brand-name">S-Gate</div>
        <div class="brand-tagline">Smart Society Management</div>
      </div>
      <div class="status-badge" style="background: ${badge.bg}; color: ${badge.color};">
        ${badge.label}
      </div>
    </div>

    <!-- ══════════ BODY ══════════ -->
    <div class="body">

      <!-- Title -->
      <div class="receipt-title">Payment Receipt</div>
      <div class="receipt-number">${data.receiptNumber}</div>

      <!-- User / Bill Info -->
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Flat Number</div>
          <div class="info-value">${data.flat}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Bill Period</div>
          <div class="info-value">${data.billPeriod}</div>
        </div>
      </div>

      <!-- Bill Breakdown -->
      <div class="breakdown-card">
        <div class="breakdown-title">Bill Breakdown</div>
        <table class="breakdown-table">
          ${lineItemsHTML}
        </table>
        <div class="total-divider"></div>
        <table class="breakdown-table">
          <tr class="total-row">
            <td class="total-label">Total Amount</td>
            <td class="total-value">${formatINR(data.totalAmount)}</td>
          </tr>
        </table>
      </div>

      <!-- Payment Details -->
      <div class="details-section">
        <div class="details-title">Payment Details</div>
        <div class="details-grid">
          <div class="detail-item">
            <div class="detail-label">Bill ID</div>
            <div class="detail-value">${data.billId}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Due Date</div>
            <div class="detail-value">${data.dueDate}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Paid On</div>
            <div class="detail-value">${data.paidOn}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Payment Method</div>
            <div class="detail-value">${data.paymentMethod}</div>
          </div>
        </div>
      </div>

      <!-- QR Verification -->
      <div class="qr-section">
        <div class="qr-placeholder">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75H16.5v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75H16.5v-.75z" />
          </svg>
        </div>
        <div class="qr-text">
          <strong>Verify this receipt</strong><br/>
          Scan the QR code or visit sgate.app/verify with receipt number <strong>${data.receiptNumber}</strong>
        </div>
      </div>

      <!-- Disclaimer -->
      <div class="disclaimer">
        This is a computer-generated receipt and does not require a signature.
      </div>

    </div>

    <!-- ══════════ FOOTER ══════════ -->
    <div class="footer">
      <div class="footer-text">Generated via S-Gate App</div>
      <div class="footer-timestamp">${now}</div>
    </div>

  </div>
</body>
</html>
  `;
}
