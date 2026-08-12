export interface OTPResult {
  type?: string;
  success?: boolean;
  message?: string;
  reqId?: string;
}

export const OTPWidget: {
  initializeWidget(widgetId: string, tokenAuth: string): void;
  sendOTP(input: { identifier: string }): Promise<OTPResult>;
  verifyOTP(input: { reqId: string; otp: string }): Promise<OTPResult>;
};
