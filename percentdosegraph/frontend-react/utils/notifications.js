// Push Notifications Utility
class NotificationManager {
  constructor() {
    this.permission = null;
    this.registration = null;
  }

  // Request notification permission
  async requestPermission() {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    try {
      this.permission = await Notification.requestPermission();
      return this.permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  // Check if notifications are supported and permitted
  isSupported() {
    return 'Notification' in window && 'serviceWorker' in navigator;
  }

  // Show a notification
  show(title, options = {}) {
    if (this.permission !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    const defaultOptions = {
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      timestamp: Date.now(),
      ...options,
    };

    if ('serviceWorker' in navigator && this.registration) {
      this.registration.showNotification(title, defaultOptions);
    } else {
      new Notification(title, defaultOptions);
    }
  }

  // Schedule a dose reminder notification
  scheduleDoseReminder(medicationName, doseTime, doseAmount) {
    const title = `Dose Reminder: ${medicationName}`;
    const body = `Time for your ${doseAmount} dose of ${medicationName}`;

    // For demo purposes, show notification immediately
    // In production, you'd calculate delay and use setTimeout or a scheduling library
    setTimeout(() => {
      this.show(title, {
        body,
        tag: `dose-${medicationName}`,
        requireInteraction: true,
        actions: [
          {
            action: 'taken',
            title: 'Mark as Taken',
          },
          {
            action: 'snooze',
            title: 'Snooze 1 hour',
          },
        ],
      });
    }, 1000); // Show after 1 second for demo
  }

  // Handle notification click
  handleNotificationClick(event) {
    event.notification.close();

    if (event.action === 'taken') {
      // Handle marking dose as taken
      console.log('Dose marked as taken');
    } else if (event.action === 'snooze') {
      // Handle snoozing
      console.log('Notification snoozed');
    } else {
      // Default action - focus window
      event.waitUntil(
        self.clients.matchAll({ type: 'window' }).then(clientList => {
          if (clientList.length > 0) {
            return clientList[0].focus();
          }
          return self.clients.openWindow('/');
        })
      );
    }
  }

  // Initialize notification manager
  async init() {
    if (!this.isSupported()) {
      return false;
    }

    // Register service worker if not already registered
    if ('serviceWorker' in navigator) {
      try {
        this.registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered for notifications');
      } catch (error) {
        console.error('Service Worker registration failed:', error);
        return false;
      }
    }

    // Request permission
    const granted = await this.requestPermission();
    if (granted) {
      console.log('Notification permission granted');
    }

    return granted;
  }
}

// Create singleton instance
const notificationManager = new NotificationManager();

export default notificationManager;
