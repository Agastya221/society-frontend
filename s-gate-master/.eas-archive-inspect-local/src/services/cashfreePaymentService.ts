import { Platform } from 'react-native';
import type { CFCallback } from 'react-native-cashfree-pg-sdk';
import { CFEnvironment, CFSession } from 'cashfree-pg-api-contract';
import api from './api';

export type CashfreeTransactionStatus =
  | 'CREATED'
  | 'ACTIVE'
  | 'SUCCESS'
  | 'FAILED'
  | 'USER_DROPPED'
  | 'EXPIRED'
  | 'CANCELLED';

export interface CashfreeInvoiceOrder {
  alreadyPaid: boolean;
  reused?: boolean;
  invoiceId: string;
  transactionId?: string;
  cashfreeOrderId?: string;
  cfOrderId?: string;
  paymentSessionId?: string;
  amount?: number;
  currency?: string;
  status?: CashfreeTransactionStatus;
  paidAt?: string;
}

export interface CashfreeInvoiceStatus {
  invoiceId: string;
  invoiceStatus: 'PENDING' | 'PAID' | 'OVERDUE' | 'WAIVED';
  paidAt?: string;
  transaction: null | {
    id: string;
    status: CashfreeTransactionStatus;
    cashfreeOrderId: string;
    cashfreePaymentId?: string | null;
    paymentSessionId?: string | null;
    amount: number;
    currency: string;
    webhookEventType?: string | null;
    webhookReceivedAt?: string | null;
  };
}

export async function createInvoiceCashfreeOrder(invoiceId: string): Promise<CashfreeInvoiceOrder> {
  const response = await api.post(`/payments/invoices/${invoiceId}/cashfree/order`, {});
  return response.data?.data;
}

export async function getInvoiceCashfreeStatus(
  invoiceId: string,
  syncWithCashfree = true
): Promise<CashfreeInvoiceStatus> {
  const response = await api.get(`/payments/invoices/${invoiceId}/cashfree/status`, {
    params: { sync: syncWithCashfree ? 'true' : 'false' },
  });
  return response.data?.data;
}

export async function startCashfreeWebCheckout(order: CashfreeInvoiceOrder, callback: CFCallback) {
  if (Platform.OS === 'web') {
    throw new Error('Cashfree mobile checkout is available in the Android and iOS app builds.');
  }

  if (!order.paymentSessionId || !order.cashfreeOrderId) {
    throw new Error('Cashfree payment session could not be created.');
  }

  const session = new CFSession(
    order.paymentSessionId,
    order.cashfreeOrderId,
    getCashfreeEnvironment()
  );

  const { CFPaymentGatewayService } = await import('react-native-cashfree-pg-sdk');
  CFPaymentGatewayService.setCallback(callback);
  CFPaymentGatewayService.doWebPayment(session);
}

export async function removeCashfreeCallback() {
  if (Platform.OS === 'web') return;

  try {
    const { CFPaymentGatewayService } = await import('react-native-cashfree-pg-sdk');
    CFPaymentGatewayService.removeCallback();
  } catch {
    // If the native module is not linked yet, there is no callback to remove.
  }
}

function getCashfreeEnvironment(): CFEnvironment {
  return process.env.EXPO_PUBLIC_CASHFREE_ENV === 'production'
    ? CFEnvironment.PRODUCTION
    : CFEnvironment.SANDBOX;
}
