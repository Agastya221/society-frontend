import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ImageStyle, StyleSheet, Text, View } from 'react-native';
import { getImageViewUrl } from '../services/uploadService';

interface S3ImageProps {
    fileId: string;  // UUID from upload response
    style?: ImageStyle;
    className?: string;
}

// In-memory cache for view URLs to avoid refetching
// Key: fileId (UUID), Value: presigned view URL
const viewUrlCache = new Map<string, string>();

/**
 * S3Image Component
 * Fetches presigned view URL from backend using fileId (UUID)
 * Handles loading state and errors gracefully
 * 
 * IMPORTANT: Pass fileId (UUID), NOT s3Key
 */
export function S3Image({ fileId, style, className }: S3ImageProps) {
    const [viewUrl, setViewUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const fetchViewUrl = async () => {
            try {
                // Check cache first
                const cachedUrl = viewUrlCache.get(fileId);
                if (cachedUrl) {
                    if (isMounted) {
                        setViewUrl(cachedUrl);
                        setLoading(false);
                    }
                    return;
                }

                // Fetch from backend using fileId
                const url = await getImageViewUrl(fileId);
                
                // Cache the URL
                viewUrlCache.set(fileId, url);

                if (isMounted) {
                    setViewUrl(url);
                    setLoading(false);
                }
            } catch (err) {
                console.error('Failed to fetch view URL for fileId:', fileId, err);
                if (isMounted) {
                    setError(true);
                    setLoading(false);
                }
            }
        };

        fetchViewUrl();

        return () => {
            isMounted = false;
        };
    }, [fileId]);

    if (loading) {
        return (
            <View style={[styles.container, style]} className={className}>
                <ActivityIndicator size="small" color="#9CA3AF" />
            </View>
        );
    }

    if (error || !viewUrl) {
        return (
            <View style={[styles.container, style]} className={className}>
                <Text style={styles.errorText}>📷</Text>
            </View>
        );
    }

    return (
        <Image
            source={{ uri: viewUrl }}
            style={style}
            className={className}
            resizeMode="cover"
        />
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorText: {
        fontSize: 24,
        opacity: 0.3,
    },
});
