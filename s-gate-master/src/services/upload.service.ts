import api from './api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GetPresignedUrlPayload {
    context: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    documentType?: string;
}

export interface PresignedUrlResult {
    uploadUrl: string;
    s3Key: string;
}

export interface ConfirmUploadPayload {
    s3Key: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    documentType?: string;
    onboardingRequestId?: string;
}

// ─── Functions ────────────────────────────────────────────────────────────────

export const getPresignedUrl = async (
    data: GetPresignedUrlPayload
): Promise<PresignedUrlResult> => {
    const endpoint =
        data.context === 'onboarding'
            ? '/resident/onboarding/upload/presigned-url'
            : '/upload/presigned-url';
    const res = await api.post(endpoint, data);
    return res.data.data;
};

export const confirmUpload = async (
    data: ConfirmUploadPayload
): Promise<unknown> => {
    const res = await api.post('/resident/onboarding/upload/confirm', data);
    return res.data.data;
};

export const getViewUrl = async (id: string): Promise<string> => {
    const res = await api.get(`/upload/${id}/view-url`);
    return res.data.data?.viewUrl;
};

export const getEntryPhotoUrl = async (id: string): Promise<string> => {
    const res = await api.get(`/upload/entry-photo/${id}`);
    return res.data.data?.viewUrl;
};
