import api from './api';
import type { Notification } from '../types/api';

export interface GetNotificationsParams {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
}

import { useAuthStore } from '../store/useAuthStore';

const getBasePath = () => {
    const role = useAuthStore.getState().role;
    return (role === 'SUPER_ADMIN' || role === 'ADMIN') ? '/admin' : '/resident';
};

export const getNotifications = async (
    params?: GetNotificationsParams
): Promise<Notification[]> => {
    const res = await api.get(`${getBasePath()}/notifications`, { params });
    const data = res.data?.data;
    return Array.isArray(data) ? data : (data?.notifications ?? []);
};

export const getUnreadCount = async (): Promise<number> => {
    const res = await api.get(`${getBasePath()}/notifications/unread-count`);
    return res.data.data?.unreadCount ?? 0;
};

export const markAsRead = async (id: string): Promise<void> => {
    await api.patch(`${getBasePath()}/notifications/${id}/read`);
};

export const markAllAsRead = async (): Promise<void> => {
    await api.patch(`${getBasePath()}/notifications/read-all`);
};
