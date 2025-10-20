export type TimeEntry = {
  id: string;
  issueId: string;
  startTime: string;
  endTime: string | null;
  duration: number | null;
};

export type TimerState = {
  active: boolean;
  entry: TimeEntry | null;
  issueId: string | null;
};

export type TimerDisplayState = {
  active: boolean;
  issueId: string | null;
  startTime: string | null;
  elapsed: number;
};
