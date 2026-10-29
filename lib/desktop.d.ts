export {};
declare global {
  interface Window {
    careerDesktop?: {
      onCloseRequested: (handler: () => Promise<void>) => () => void;
      info: () => Promise<{
        version: string;
        dataDirectory: string;
        background: boolean;
        platform: string;
      }>;
      openExternal: (url: string) => Promise<void>;
      openData: () => Promise<void>;
      configureMcp: (provider: string) => Promise<{ message: string }>;
      requestNotifications: () => Promise<{ supported: boolean }>;
      quit: () => Promise<void>;
    };
  }
}
