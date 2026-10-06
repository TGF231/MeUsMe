import type { CapacitorConfig } from '@capacitor/cli'

// App Android: o mesmo código web, empacotado. O build web (dist/) vai para dentro do APK.
const config: CapacitorConfig = {
  appId: 'app.meusme',
  appName: 'MeUsMe',
  webDir: 'dist',
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_meusme',
      iconColor: '#2f6f5e',
    },
  },
}

export default config
