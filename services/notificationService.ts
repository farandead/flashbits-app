import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NOTIFICATION_MESSAGES, NOTIFICATION_CONFIG } from '@/constants/notifications';

// Configure how notifications should be handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const NOTIFICATION_SETTINGS_KEY = '@notification_settings';
const NOTIFICATION_IDS_KEY = '@notification_ids';

export type NotificationSettings = {
  enabled: boolean;
  dailyReminder: boolean;
  dailyReminderTime: string; // Format: "HH:MM"
  practiceStreakReminder: boolean;
  motivationalNotifications: boolean;
};

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  dailyReminder: true,
  dailyReminderTime: '09:00',
  practiceStreakReminder: true,
  motivationalNotifications: true,
};

class NotificationService {
  private scheduledNotificationIds: string[] = [];

  /**
   * Request notification permissions from the user
   */
  async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#00FF94',
        });
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      return finalStatus === 'granted';
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  /**
   * Get notification settings from storage
   */
  async getSettings(): Promise<NotificationSettings> {
    try {
      const settingsJson = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
      if (settingsJson) {
        return JSON.parse(settingsJson);
      }
      return DEFAULT_SETTINGS;
    } catch (error) {
      console.error('Error getting notification settings:', error);
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * Save notification settings to storage
   */
  async saveSettings(settings: NotificationSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
      // Re-schedule notifications with new settings
      await this.scheduleAllNotifications(settings);
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      this.scheduledNotificationIds = [];
      await AsyncStorage.setItem(NOTIFICATION_IDS_KEY, JSON.stringify([]));
    } catch (error) {
      console.error('Error canceling notifications:', error);
    }
  }

  /**
   * Schedule all notifications based on settings
   */
  async scheduleAllNotifications(settings: NotificationSettings): Promise<void> {
    // Cancel existing notifications first
    await this.cancelAllNotifications();

    if (!settings.enabled) {
      return;
    }

    const newIds: string[] = [];

    // Schedule daily reminder
    if (settings.dailyReminder) {
      const id = await this.scheduleDailyReminder(settings.dailyReminderTime);
      if (id) newIds.push(id);
    }

    // Schedule practice streak reminder (every 2 days if no practice)
    if (settings.practiceStreakReminder) {
      const id = await this.scheduleStreakReminder();
      if (id) newIds.push(id);
    }

    // Schedule motivational notifications
    if (settings.motivationalNotifications) {
      const ids = await this.scheduleMotivationalNotifications();
      newIds.push(...ids);
    }

    this.scheduledNotificationIds = newIds;
    await AsyncStorage.setItem(NOTIFICATION_IDS_KEY, JSON.stringify(newIds));
  }

  /**
   * Schedule daily practice reminder
   */
  private async scheduleDailyReminder(time: string): Promise<string | null> {
    try {
      const [hours, minutes] = time.split(':').map(Number);
      
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: NOTIFICATION_MESSAGES.dailyReminder.title,
          body: NOTIFICATION_MESSAGES.dailyReminder.body,
          sound: NOTIFICATION_CONFIG.sound,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          color: NOTIFICATION_CONFIG.primaryColor,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          hour: hours,
          minute: minutes,
          repeats: true,
        },
      });

      return id;
    } catch (error) {
      console.error('Error scheduling daily reminder:', error);
      return null;
    }
  }

  /**
   * Schedule streak reminder (48 hours)
   */
  private async scheduleStreakReminder(): Promise<string | null> {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: NOTIFICATION_MESSAGES.streakReminder.title,
          body: NOTIFICATION_MESSAGES.streakReminder.body,
          sound: NOTIFICATION_CONFIG.sound,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          color: NOTIFICATION_CONFIG.primaryColor,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 48 * 60 * 60, // 48 hours
          repeats: true,
        },
      });

      return id;
    } catch (error) {
      console.error('Error scheduling streak reminder:', error);
      return null;
    }
  }

  /**
   * Schedule motivational notifications at different times
   */
  private async scheduleMotivationalNotifications(): Promise<string[]> {
    const ids: string[] = [];

    try {
      for (const message of NOTIFICATION_MESSAGES.motivational) {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: message.title,
            body: message.body,
            sound: NOTIFICATION_CONFIG.sound,
            priority: Notifications.AndroidNotificationPriority.DEFAULT,
            color: NOTIFICATION_CONFIG.primaryColor,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
            hour: message.hour,
            minute: message.minute,
            repeats: true,
          },
        });
        ids.push(id);
      }
    } catch (error) {
      console.error('Error scheduling motivational notifications:', error);
    }

    return ids;
  }

  /**
   * Send immediate notification (for testing or special events)
   */
  async sendImmediateNotification(title: string, body: string): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          color: '#00FF94',
        },
        trigger: null, // Send immediately
      });
    } catch (error) {
      console.error('Error sending immediate notification:', error);
    }
  }

  /**
   * Get all scheduled notifications (for debugging)
   */
  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }
}

export const notificationService = new NotificationService();

