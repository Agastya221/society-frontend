import axios from 'axios';
import { MSG91_WIDGET_ID, MSG91_TOKEN_AUTH } from '@/constants/msg91';

const BASE_URL = 'https://control.msg91.com/api/v5/widget';

export const sendOtp = async (identifier: string) => {
    try {
        const response = await axios.post(`${BASE_URL}/sendOTP`, {
            widgetId: MSG91_WIDGET_ID,
            tokenAuth: MSG91_TOKEN_AUTH,
            identifier, // e.g. "919876543210"
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const verifyOtp = async (reqId: string, otp: string) => {
    try {
        const response = await axios.post(`${BASE_URL}/verifyOTP`, {
            widgetId: MSG91_WIDGET_ID,
            tokenAuth: MSG91_TOKEN_AUTH,
            reqId,
            otp,
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const retryOtp = async (reqId: string, retryChannel: number | null = null) => {
    try {
        const payload: any = {
            widgetId: MSG91_WIDGET_ID,
            tokenAuth: MSG91_TOKEN_AUTH,
            reqId,
        };
        if (retryChannel) {
            payload.retryChannel = retryChannel;
        }

        const response = await axios.post(`${BASE_URL}/retryOTP`, payload);
        return response.data;
    } catch (error) {
        throw error;
    }
};
