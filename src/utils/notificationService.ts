import { PushNotificationItem } from '../types';
import { playNotificationPing } from './soundEffects';

type NotificationListener = (notification: PushNotificationItem) => void;

class NotificationManager {
  private listeners: Set<NotificationListener> = new Set();
  private hasRequestedNativePermission = false;

  public subscribe(listener: NotificationListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public async requestNativePermission(): Promise<NotificationPermission | 'unsupported'> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    this.hasRequestedNativePermission = true;
    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch {
      return 'denied';
    }
  }

  public getPermissionStatus(): NotificationPermission | 'unsupported' {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  }

  public notify(params: {
    title: string;
    message: string;
    type: PushNotificationItem['type'];
    participantName?: string;
    eventId?: string;
  }): PushNotificationItem {
    const item: PushNotificationItem = {
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title: params.title,
      message: params.message,
      type: params.type,
      timestamp: new Date().toISOString(),
      read: false,
      participantName: params.participantName,
      eventId: params.eventId,
    };

    // Play subtle audio cue
    playNotificationPing();

    // Fire native web push if permission granted
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(params.title, {
          body: params.message,
          icon: '/favicon.ico',
        });
      } catch {
        // Ignore fallback
      }
    }

    // Broadcast to UI subscribers
    this.listeners.forEach(fn => fn(item));

    return item;
  }
}

export const notificationService = new NotificationManager();
