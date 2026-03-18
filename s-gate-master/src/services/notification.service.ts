import api from './api';
import type { Notification } from '../types/api';

export interface GetNotificationsParams {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
}

export const getNotifications = async (
    params?: GetNotificationsParams
): Promise<Notification[]> => {
    const res = await api.get('/resident/notifications', { params });
    const data = res.data?.data;
    return Array.isArray(data) ? data : (data?.notifications ?? []);
};

export const getUnreadCount = async (): Promise<number> => {
    const res = await api.get('/resident/notifications/unread-count');
    return res.data.data?.unreadCount ?? 0;
};

export const markAsRead = async (id: string): Promise<void> => {
    await api.patch(`/resident/notifications/${id}/read`);
};

export const markAllAsRead = async (): Promise<void> => {
    await api.patch('/resident/notifications/read-all');
};
