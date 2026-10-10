import * as FileSystem from 'expo-file-system/legacy';
import api from './api';

interface PresignedUrlResponse {
    success: boolean;
    message: string;
    data: {
        uploadUrl: string;
        s3Key: string;
    };
}

interface UploadContext {
    context: 'entry-photo' | 'onboarding' | 'staff-photo';
    documentType?: string; // For onboarding: 'AADHAR_CARD', 'PAN_CARD', etc.
}

interface FileInfo {
    fileName: string;
    mimeType: string;
    fileSize: number;
}

/**
 * Get file info from URI
 */
/**
 * Exact byte size of a local file. S3 presigned URLs are signed for the exact
 * Content-Length, so a guessed size makes the upload fail — never guess.
 */
const getExactFileSize = async (uri: string): Promise<number> => {
    try {
        const info = await FileSystem.getInfoAsync(uri);
        const size = info.exists ? (info as any).size : undefined;
        if (typeof size === 'number' && size > 0) return size;
    } catch {
        // fall through to the blob fallback
    }

    try {
        const blob = await (await fetch(uri)).blob();
        if (typeof blob.size === 'number' && blob.size > 0) return blob.size;
    } catch {
        // fall through
    }

    throw new Error('Could not read the file size. Please pick the file again and retry.');
};

const getFileInfo = async (uri: string): Promise<FileInfo> => {
    const fileSize = await getExactFileSize(uri);
    const fileName = uri.split('/').pop() || 'image.jpg';

    // Determine MIME type from extension
    const extension = fileName.split('.').pop()?.toLowerCase();
    let mimeType = 'image/jpeg';
    if (extension === 'png') mimeType = 'image/png';
    if (extension === 'webp') mimeType = 'image/webp';
    if (extension === 'pdf') mimeType = 'application/pdf';

    return {
        fileName,
        mimeType,
        fileSize,
    };
};

/**
 * Get presigned URL from backend
 */
const getPresignedUrl = async (
    fileName: string,
    mimeType: string,
    fileSize: number,
    context: UploadContext
): Promise<{ uploadUrl: string; s3Key: string }> => {
    const payload: any = {
        context: context.context,
        fileName,
        mimeType,
        fileSize,
    };

    // Add documentType only for onboarding context
    if (context.documentType) {
        payload.documentType = context.documentType;
    }

    const endpoint =
        context.context === 'onboarding'
            ? '/resident/onboarding/upload/presigned-url'
            : '/upload/presigned-url';

    const response = await api.post<PresignedUrlResponse>(endpoint, payload);

    if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to get upload URL');
    }

    return response.data.data;
};

/**
 * Upload file to S3 using presigned URL
 */
const uploadToS3 = async (
    localUri: string,
    uploadUrl: string,
    mimeType: string
): Promise<void> => {
    try {
        // Method 1: Using fetch with blob
        const response = await fetch(localUri);
        const blob = await response.blob();

        const uploadResponse = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': mimeType,
            },
            body: blob,
        });

        if (!uploadResponse.ok) {
            throw new Error(`S3 upload failed: ${uploadResponse.status}`);
        }
    } catch (error) {
        // Method 2: Fallback using FileSystem.uploadAsync
        console.log('Blob upload failed, trying FileSystem.uploadAsync...', error);

        const uploadResult = await FileSystem.uploadAsync(uploadUrl, localUri, {
            httpMethod: 'PUT',
            headers: {
                'Content-Type': mimeType,
            },
        });

        if (uploadResult.status !== 200) {
            throw new Error(`S3 upload failed: ${uploadResult.status}`);
        }
    }
};

/**
 * Main function: Upload image and return S3 key
 */
export const uploadImage = async (
    localUri: string,
    context: UploadContext
): Promise<string> => {
    try {
        // Step 1: Get file info
        const { fileName, mimeType, fileSize } = await getFileInfo(localUri);

        // Step 2: Get presigned URL from backend
        const { uploadUrl, s3Key } = await getPresignedUrl(
            fileName,
            mimeType,
            fileSize,
            context
        );

        // Step 3: Upload to S3
        await uploadToS3(localUri, uploadUrl, mimeType);

        // Step 4: Return S3 key (NOT local URI!)
        console.log('✅ Image uploaded successfully:', s3Key);
        return s3Key;
    } catch (error) {
        console.error('❌ Image upload error:', error);
        throw error;
    }
};

/**
 * Upload multiple images
 */
export const uploadMultipleImages = async (
    localUris: string[],
    context: UploadContext
): Promise<string[]> => {
    const s3Keys: string[] = [];

    for (const uri of localUris) {
        const s3Key = await uploadImage(uri, context);
        s3Keys.push(s3Key);
    }

    return s3Keys;
};

/**
 * Confirm upload for onboarding documents (saves to DB)
 */
export const confirmDocumentUpload = async (
    s3Key: string,
    fileName: string,
    mimeType: string,
    fileSize: number,
    documentType: string,
    onboardingRequestId: string
): Promise<any> => {
    const response = await api.post('/resident/onboarding/upload/confirm', {
        s3Key,
        fileName,
        mimeType,
        fileSize,
        documentType,
        onboardingRequestId,
    });

    if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to confirm upload');
    }

    return response.data.data;
};

/**
 * Get view URL for a document/image
 */
export const getImageViewUrl = async (documentId: string): Promise<string> => {
    const response = await api.get(`/upload/${documentId}/view-url`);

    if (!response.data.success) {
        throw new Error('Failed to get view URL');
    }

    return response.data.data.viewUrl;
};

/**
 * Get view URL for an entry photo
 */
export const getEntryPhotoViewUrl = async (entryRequestId: string): Promise<string> => {
    const response = await api.get(`/upload/entry-photo/${entryRequestId}`);

    if (!response.data.success) {
        throw new Error('Failed to get entry photo URL');
    }

    return response.data.data.viewUrl;
};
