import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.expensetracker.app',
  appName: 'Expense Tracker',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    cleartext: true,
    allowNavigation: ['*'],
  },
  android: {
    buildOptions: {
      signingConfig: 'debug'
    }
  },
  plugins: {
    LocalNotification: {
      smallIcon: 'ic_stat_notify',
      iconColor: '#4f46e5'
    }
  }
};

export default config;
