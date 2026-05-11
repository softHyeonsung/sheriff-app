declare module 'firebase/auth/react-native' {
  import { Auth, Persistence } from 'firebase/auth';
  export * from 'firebase/auth';
  export const getReactNativePersistence: (storage: any) => Persistence;
  export const initializeAuth: (app: any, settings: any) => Auth;
}