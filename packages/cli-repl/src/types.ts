export interface Bus {
  on: (eventName: string, listener: (...args: any[]) => void) => void;
  emit: (eventName: string, ...args: any[]) => void;
}

export class UserConfig {
  userId = '';
  enableTelemetry = false;
  disableGreetingMessage = false;
}

