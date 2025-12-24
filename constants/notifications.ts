// Notification Messages Configuration
// Centralized location for all notification content

export const NOTIFICATION_MESSAGES = {
  // Daily Practice Reminder (9:00 AM)
  dailyReminder: {
    title: '🎯 Daily Practice Time!',
    body: 'Ready to level up your coding skills? Start your practice session now!',
  },

  // Streak Reminder (After 48 hours of inactivity)
  streakReminder: {
    title: '🔥 Keep Your Streak Going!',
    body: "Don't break the chain! Practice for just 5 minutes to maintain your streak.",
  },

  // Motivational Messages (Throughout the day)
  motivational: [
    {
      title: '💪 You Got This!',
      body: 'Every expert was once a beginner. Keep practicing!',
      hour: 10,
      minute: 0,
    },
    {
      title: '🚀 Time to Code!',
      body: 'A few questions today = Interview ready tomorrow!',
      hour: 14,
      minute: 0,
    },
    {
      title: '⭐ Quick Practice?',
      body: 'Just 10 minutes of practice can make a difference!',
      hour: 18,
      minute: 0,
    },
    {
      title: '🎓 Learn Something New',
      body: 'Challenge yourself with a new topic today!',
      hour: 20,
      minute: 0,
    },
  ],

  // Test Notification
  test: {
    title: '🎯 Test Notification',
    body: 'Notifications are working perfectly! You\'re all set to receive practice reminders.',
  },

  // Achievement Notifications (for future use)
  achievements: {
    rankUp: {
      title: '🏆 Rank Up!',
      body: 'Congratulations! You\'ve achieved a new hacker rank!',
    },
    streakMilestone: {
      title: '🔥 Streak Milestone!',
      body: 'Amazing! You\'ve practiced {days} days in a row!',
    },
    questionsMilestone: {
      title: '🎯 Milestone Reached!',
      body: 'You\'ve solved {count} questions! Keep it up!',
    },
  },
};

// Notification Configuration
export const NOTIFICATION_CONFIG = {
  // Default notification time for daily reminder
  defaultReminderTime: '09:00',
  
  // Colors
  primaryColor: '#00FF94', // Your app's primary color
  
  // Sound (optional)
  sound: true,
  
  // Badge (optional)
  badge: true,
};

