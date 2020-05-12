export interface EventEmitter {
  emit(eventName: string, ...args: any[]): void;
}
