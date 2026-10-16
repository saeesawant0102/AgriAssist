export const env = {
  FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY || 'demo-key',
  FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'demo-agriassist.firebaseapp.com',
  FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'demo-agriassist',
  FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID || '1:123456789:web:abcdef',
  USE_EMULATORS: import.meta.env.VITE_USE_EMULATORS === 'true',
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  CURRENCY_CODE: import.meta.env.VITE_CURRENCY_CODE || 'INR',
  AREA_UNIT: import.meta.env.VITE_AREA_UNIT || 'hectares',
};
