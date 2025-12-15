import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hsapss.windsor',
  appName: 'HSAPSS Windsor',
  webDir: 'public',
  server: {
    url: 'https://hsapss-windsor.vercel.app/',
    androidScheme: 'https'
  }
};

export default config;
