export type FeatureWheel = {
  groups: FeatureWheelGroup[];
};

export enum FeatureWheelMode {
  DEFAULT,
  PROGRESS,
  CONTEMPORARY
}

export type FeatureWheelGroup = {
  label: string;
  spokes: FeatureWheelSpoke[];
  color?: string;
};

export type FeatureWheelSpoke = {
  label: string;
  /**
   * Contemporaries are the products that has this feature
   */
  contemporaries: FeatureWheelContemporary[];
  isDivider?: boolean;
  /**
   * Progress is a number between 0 and 1 that represents the progress of the feature.
   */
  progress?: number;
  isProminent?: boolean;
  isNovel?: boolean;
};

export type FeatureWheelContemporary = {
  label: string;
  icon: string;
  value: number;
};
