import { create } from 'zustand';
import type { Notification } from '../types/api';
import * as notificationService from '../services/notification.service';

interface NotificationState {
    // ── State ──────────────────────────────────────────────────────────────
    notifications: Notification[];
    unreadCount: number;

    // ── Actions ────────────────────────────────────────────────────────────
    fetchNotifications: (
        params?: notificationService.GetNotificationsParams
    ) => Promise<void>;
    fetchUnreadCount: () => Promise<void>;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
    notifications: [],
    unreadCount: 0,

    fetchNotifications: async (params?) => {
        try {
            const notifications = await notificationService.getNotifications(params);
            set({ notifications });
        } catch (err) {
            console.error('fetchNotifications failed:', err);
        }
    },

    fetchUnreadCount: async () => {
        try {
            const unreadCount = await notificationService.getUnreadCount();
            set({ unreadCount });
        } catch (err) {
            console.error('fetchUnreadCount failed:', err);
        }
    },

    markAsRead: async (id: string) => {
        // Optimistic update
        set((state) => ({
            notifications: state.notifications.map((n) =>
                n.id === id ? { ...n, isRead: true } : n
            ),
            unreadCount: Math.max(0, state.unreadCount - 1),
        }));
        try {
            await notificationService.markAsRead(id);
        } catch (err) {
            console.error('markAsRead failed:', err);
            // Revert
            set((state) => ({
                notifications: state.notifications.map((n) =>
                    n.id === id ? { ...n, isRead: false } : n
                ),
                unreadCount: state.unreadCount + 1,
            }));
        }
    },

    markAllAsRead: async () => {
        const prevCount = get().unreadCount;
        const prevNotifications = get().notifications;
        // Optimistic update
        set((state) => ({
            notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
            unreadCount: 0,
        }));
        try {
            await notificationService.markAllAsRead();
        } catch (err) {
            console.error('markAllAsRead failed:', err);
            // Revert
            set({ notifications: prevNotifications, unreadCount: prevCount });
        }
    },
}));
