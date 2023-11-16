export type ScheduledNotification = {
  inSeconds: number;
  message: string;
  title?: string;
  timestamp: number;
  sound?: string;
  id: string;
};
