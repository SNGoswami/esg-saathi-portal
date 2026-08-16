export {};

declare global {
  interface Window {
    CY?: {
      showPreferences?: () => void;
    };
  }
}