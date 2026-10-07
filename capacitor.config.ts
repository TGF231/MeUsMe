import type { CapacitorConfig } from '@capacitor/cli'

// Empacota o build web (dist/) no app Android.
const config: CapacitorConfig = {
  appId: 'app.meusme',
  appName: 'MeUsMe',
  webDir: 'dist',
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_meusme',
      iconColor: '#7d0e0e',
    },
  },
}

export default config
