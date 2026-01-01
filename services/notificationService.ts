import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NOTIFICATION_MESSAGES, NOTIFICATION_CONFIG } from '@/constants/notifications';
import { debugError, debug, debugSuccess } from '@/utils/debug';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '@/config/firebase';

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

// Get user-specific AsyncStorage key (for offline fallback)
const getUserSettingsKey = (userId?: string): string => {
  return userId ? `${NOTIFICATION_SETTINGS_KEY}:${userId}` : `${NOTIFICATION_SETTINGS_KEY}:guest`;
};

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
   * Check current notification permission status
   */
  async getPermissionStatus(): Promise<{
    status: Notifications.PermissionStatus;
    granted: boolean;
    canAskAgain: boolean;
  }> {
    try {
      const permissions = await Notifications.getPermissionsAsync();
      return {
        status: permissions.status,
        granted: permissions.status === 'granted',
        canAskAgain: permissions.canAskAgain ?? true,
      };
    } catch (error) {
      debugError('api', 'Error getting notification permissions:', error);
      return {
        status: Notifications.PermissionStatus.UNDETERMINED,
        granted: false,
        canAskAgain: true,
      };
    }
  }

  /**
   * Request notification permissions from the user
   * Returns true if permissions are granted, false otherwise
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
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
        });
        finalStatus = status;
      }

      return finalStatus === 'granted';
    } catch (error) {
      debugError('api', 'Error requesting notification permissions:', error);
      return false;
    }
  }

  /**
   * Get notification settings from Firestore (user-specific, synced across devices)
   * Falls back to AsyncStorage if Firestore is unavailable
   * 
   * @param userId - Optional user ID. If not provided, uses current authenticated user
   */
  async getSettings(userId?: string): Promise<NotificationSettings> {
    const currentUserId = userId || auth.currentUser?.uid;
    
    try {
      // Try Firestore first (user-specific, synced across devices)
      if (currentUserId) {
        try {
          const userRef = doc(db, 'users', currentUserId);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            const userData = userSnap.data();
            if (userData.notificationSettings) {
              const settings = userData.notificationSettings as NotificationSettings;
              debug('firebase', 'Loaded notification settings from Firestore');
              
              // Cache in AsyncStorage for offline access
              const settingsKey = getUserSettingsKey(currentUserId);
              await AsyncStorage.setItem(settingsKey, JSON.stringify(settings));
              
              return {
                ...DEFAULT_SETTINGS,
                ...settings,
              };
            }
          }
        } catch (firestoreError) {
          debugError('firebase', 'Error loading from Firestore, falling back to AsyncStorage:', firestoreError);
          // Fall through to AsyncStorage
        }
      }
      
      // Fallback to AsyncStorage (for offline access or guest users)
      const settingsKey = getUserSettingsKey(currentUserId);
      const settingsJson = await AsyncStorage.getItem(settingsKey);
      if (settingsJson) {
        const settings = JSON.parse(settingsJson);
        debug('storage', 'Loaded notification settings from AsyncStorage');
        return {
          ...DEFAULT_SETTINGS,
          ...settings,
        };
      }
      
      // Return defaults if nothing found
      return { ...DEFAULT_SETTINGS };
    } catch (error) {
      debugError('storage', 'Error getting notification settings:', error);
      return { ...DEFAULT_SETTINGS };
    }
  }

  /**
   * Save notification settings to Firestore (user-specific, synced across devices)
   * Also saves to AsyncStorage as offline fallback
   * 
   * @param settings - Notification settings to save
   * @param userId - Optional user ID. If not provided, uses current authenticated user
   */
  async saveSettings(settings: NotificationSettings, userId?: string): Promise<void> {
    const currentUserId = userId || auth.currentUser?.uid;
    
    try {
      // Merge with existing settings to preserve any fields not being updated
      const existingSettings = await this.getSettings(currentUserId);
      const mergedSettings: NotificationSettings = {
        ...existingSettings,
        ...settings,
      };
      
      // Save to Firestore if user is authenticated (primary storage, synced across devices)
      if (currentUserId) {
        try {
          const userRef = doc(db, 'users', currentUserId);
          await setDoc(
            userRef,
            {
              notificationSettings: mergedSettings,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
          debugSuccess('firebase', 'Saved notification settings to Firestore');
        } catch (firestoreError) {
          debugError('firebase', 'Error saving to Firestore, using AsyncStorage fallback:', firestoreError);
          // Continue to save to AsyncStorage as fallback
        }
      }
      
      // Always save to AsyncStorage as fallback (for offline access and guest users)
      const settingsKey = getUserSettingsKey(currentUserId);
      await AsyncStorage.setItem(settingsKey, JSON.stringify(mergedSettings));
      
      // Re-schedule notifications with new settings
      await this.scheduleAllNotifications(mergedSettings);
    } catch (error) {
      debugError('storage', 'Error saving notification settings:', error);
    }
  }

  /**
   * Initialize notification settings for a user
   * Checks if user previously enabled notifications and automatically requests permissions
   * This handles the case where user reinstalls the app and needs to re-grant permissions
   * Only requests permissions if user has explicitly enabled notifications
   * 
   * @param userId - User ID to initialize settings for
   * @returns true if permissions were granted, false otherwise
   */
  async initializeNotificationsForUser(userId: string): Promise<boolean> {
    try {
      // Get user's saved preference from Firestore
      const settings = await this.getSettings(userId);
      
      // Only request permissions if user explicitly enabled notifications
      // If disabled, respect their choice and don't request permissions
      if (settings.enabled) {
        debug('firebase', 'User previously enabled notifications, requesting permissions...');
        
        const hasPermission = await this.requestPermissions();
        
        if (hasPermission) {
          debugSuccess('firebase', 'Notification permissions granted, scheduling notifications');
          // Re-schedule notifications since permissions are now granted
          await this.scheduleAllNotifications(settings);
          return true;
        } else {
          debug('firebase', 'Notification permissions not granted, but user preference is preserved');
          // User's preference is still saved as enabled, they just need to grant permissions
          return false;
        }
      } else {
        debug('firebase', 'User has notifications disabled, skipping permission request');
        // User has disabled notifications - respect their choice
        // Cancel any existing notifications and clear badge
        await this.cancelAllNotifications();
        try {
          await Notifications.setBadgeCountAsync(0);
        } catch (error) {
          debugError('api', 'Error clearing badge:', error);
        }
        return false;
      }
    } catch (error) {
      debugError('firebase', 'Error initializing notifications for user:', error);
      return false;
    }
  }

  /**
   * Disable notifications and clear all scheduled notifications
   * Also clears notification badge
   * Note: On iOS, permissions cannot be programmatically revoked - user must do it in Settings
   */
  async disableNotifications(userId?: string): Promise<void> {
    try {
      // Cancel all scheduled notifications
      await this.cancelAllNotifications();
      
      // Clear notification badge
      try {
        await Notifications.setBadgeCountAsync(0);
        debug('api', 'Notification badge cleared');
      } catch (error) {
        debugError('api', 'Error clearing notification badge:', error);
      }
      
      // Update settings to disabled
      const currentSettings = await this.getSettings(userId);
      const disabledSettings: NotificationSettings = {
        ...currentSettings,
        enabled: false,
        dailyReminder: false,
        practiceStreakReminder: false,
        motivationalNotifications: false,
      };
      
      // Save disabled state to Firestore
      await this.saveSettings(disabledSettings, userId);
      
      debugSuccess('api', 'Notifications disabled and all scheduled notifications canceled');
    } catch (error) {
      debugError('api', 'Error disabling notifications:', error);
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
      debugError('api', 'Error canceling notifications:', error);
    }
  }

  /**
   * Schedule all notifications based on settings
   */
  async scheduleAllNotifications(settings: NotificationSettings): Promise<void> {
    // Cancel existing notifications first
    await this.cancelAllNotifications();

    if (!settings.enabled) {
      // Clear notification badge when notifications are disabled
      try {
        await Notifications.setBadgeCountAsync(0);
        debug('api', 'Notification badge cleared');
      } catch (error) {
        debugError('api', 'Error clearing notification badge:', error);
      }
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
      debugError('api', 'Error scheduling daily reminder:', error);
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
      debugError('api', 'Error scheduling streak reminder:', error);
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
      debugError('api', 'Error scheduling motivational notifications:', error);
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
      debugError('api', 'Error sending immediate notification:', error);
    }
  }

  /**
   * Get all scheduled notifications (for debugging)
   */
  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      debugError('api', 'Error getting scheduled notifications:', error);
      return [];
    }
  }

  /**
   * Schedule a test notification that repeats every 2 minutes
   * Useful for testing notification functionality
   */
  async scheduleTestNotification(): Promise<string | null> {
    try {
      // First check if we have permissions
      const permissionStatus = await this.getPermissionStatus();
      if (!permissionStatus.granted) {
        debugError('api', 'Cannot schedule test notification: permissions not granted');
        return null;
      }

      // Cancel any existing test notifications first
      const existing = await Notifications.getAllScheduledNotificationsAsync();
      for (const notification of existing) {
        if (notification.identifier.startsWith('test-notification-')) {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
      }

      const id = await Notifications.scheduleNotificationAsync({
        identifier: 'test-notification-2min',
        content: {
          title: NOTIFICATION_MESSAGES.test.title,
          body: NOTIFICATION_MESSAGES.test.body,
          sound: NOTIFICATION_CONFIG.sound,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          color: NOTIFICATION_CONFIG.primaryColor,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 2 * 60, // 2 minutes
          repeats: true,
        },
      });

      return id;
    } catch (error) {
      debugError('api', 'Error scheduling test notification:', error);
      return null;
    }
  }

  /**
   * Cancel the test notification
   */
  async cancelTestNotification(): Promise<void> {
    try {
      const existing = await Notifications.getAllScheduledNotificationsAsync();
      for (const notification of existing) {
        if (notification.identifier.startsWith('test-notification-')) {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
      }
    } catch (error) {
      debugError('api', 'Error canceling test notification:', error);
    }
  }
}

export const notificationService = new NotificationService();

