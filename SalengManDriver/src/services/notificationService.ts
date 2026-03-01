import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { api } from '../config/api';
import { getToken } from './auth';

class NotificationService {
    private lastSeenNotifyId: number | null = null;
    private pollingInterval: number | null = null;
    private STORAGE_KEY = 'saleng_driver_last_seen_notify_id';

    async init() {
        // Guard against non-Tauri environments
        if (!(window as any).__TAURI_INTERNALS__) {
            console.log('[NotificationService] Running in browser: Skipping system notification initialization');
            return;
        }

        console.log('[NotificationService] Initializing...');

        // Load last seen ID from storage
        const storedId = localStorage.getItem(this.STORAGE_KEY);
        if (storedId) {
            this.lastSeenNotifyId = parseInt(storedId);
            console.log(`[NotificationService] Loaded last seen ID: ${this.lastSeenNotifyId}`);
        }

        try {
            const hasPermission = await isPermissionGranted();
            console.log(`[NotificationService] Has permission: ${hasPermission}`);

            if (!hasPermission) {
                console.log('[NotificationService] Requesting permission...');
                const permission = await requestPermission();
                console.log(`[NotificationService] Permission result: ${permission}`);
                if (permission !== 'granted') {
                    console.warn('[NotificationService] Notification permission not granted');
                    return;
                }
            }

            // Start polling
            this.startPolling();
        } catch (err) {
            console.error('[NotificationService] Initialization error:', err);
        }
    }

    private async checkNewNotifications() {
        const token = getToken();
        if (!token) {
            console.log('[NotificationService] Skipping check: No token');
            return;
        }

        try {
            console.log('[NotificationService] Polling for new notifications...');
            const notifications = await api.getNotifications(token);

            if (notifications && notifications.length > 0) {
                const latest = notifications[0];
                console.log(`[NotificationService] Latest ID on server: ${latest.notify_id} (Last seen: ${this.lastSeenNotifyId})`);

                // Initialize if null (first time ever)
                if (this.lastSeenNotifyId === null) {
                    this.updateLastSeenId(latest.notify_id);
                    return;
                }

                // Check for new notifications
                if (latest.notify_id > this.lastSeenNotifyId) {
                    console.log(`[NotificationService] Found ${latest.notify_id - this.lastSeenNotifyId} new notification(s)`);

                    this.updateLastSeenId(latest.notify_id);

                    // Trigger system notification
                    if ((window as any).__TAURI_INTERNALS__) {
                        sendNotification({
                            title: latest.notify_header,
                            body: latest.notify_content
                            // Note: icon is omitted to use default app icon and avoid path issues on Android
                        });
                        console.log('[NotificationService] System notification sent');
                    }
                }
            }
        } catch (error) {
            console.error('[NotificationService] Polling error:', error);
        }
    }

    private updateLastSeenId(id: number) {
        this.lastSeenNotifyId = id;
        localStorage.setItem(this.STORAGE_KEY, id.toString());
    }

    startPolling() {
        if (this.pollingInterval) return;

        console.log('[NotificationService] Starting polling (10s interval)');
        // Poll every 10 seconds for testing
        this.pollingInterval = window.setInterval(() => {
            this.checkNewNotifications();
        }, 10000);

        // Initial check
        this.checkNewNotifications();
    }

    stopPolling() {
        if (this.pollingInterval) {
            console.log('[NotificationService] Stopping polling');
            window.clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }
}

export const notificationService = new NotificationService();
