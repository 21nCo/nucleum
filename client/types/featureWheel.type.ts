import type {
  Contemporary,
  Distribution
} from "../components/featureWheel/comparer.type";
import type { IFaq } from "../landing/shared/landing.type";

export type IFwCategory = {
  label: string;
  color?: string;
};

export type IListContentItem = {
  label: string;
  icon?: string;
};

export type IFwFeature = IFeatureWheelSpoke & {
  category: string;
  description: string;
  image?: string;
  icon?: string;
  learnMoreLink?: string;
  ratingCriteria?: IListContentItem[];
  /**
   * Notes on how our product excels at this feature, additional notes like
   * upcoming sub features for our product or other relevant information
   */
  notes?: string;
  /**
   * Properties of contemporaries to be shown in the comparison table
   */
  comparisionProperties?: string[];
};

export type IFeatureWheel = {
  groups: IFeatureWheelGroup[];
  product: string;
};

export enum FeatureWheelMode {
  DEFAULT = "default",
  PROGRESS = "progress",
  COMPARER = "comparer"
}

export type IFeatureWheelGroup = {
  label: string;
  spokes: IFeatureWheelSpoke[];
  color?: string;
};

export type IFeatureWheelSpoke = {
  label: string;
  shortLabel?: string;
  /**
   * Contemporaries are the products that has this feature
   */
  contemporaries: IFeatureWheelContemporary[];
  isDivider?: boolean;
  /**
   * Progress is a number between 0 and 1 that represents the progress of the feature.
   */
  progress?: number;
  isProminent?: boolean;
  isNovel?: boolean;
  isHideForComparer?: boolean;
  /**
   * Indicates if the feature is planned but not yet implemented
   */
  isPlanned?: boolean;
};

export type IContemporaryBase = {
  label: Contemporary;
  /**
   * Additional way to specify the icon if the label.toLowerCase() is not
   * the same as the icon name - in cases like label having spaces or special characters
   */
  icon?: string;
  isHideForComparer?: boolean;
};

export type IFeatureWheelContemporary = IContemporaryBase & {
  value: number;
  notes?: string;
};

export type IContemporary = IContemporaryBase & {
  url: string;
  /**
   * Price in USD per month billed annually
   */
  price?: number;
  /**
   * Whether the source code is open, available, or closed
   */
  sourcingType?: SourcingType;
  /**
   * Where the app is available
   */
  distribution?: {
    available: Distribution[];
    description?: string;
    link?: string;
  };
  /**
   * FAQs for the app
   */
  faqs?: IFaq[];
  whenToChoose?: IListContentItem[];
  switchFromDocumentation?: string;
  latestAnalysisDate?: string;
};

export enum SourcingType {
  OPEN = "OPEN",
  SOURCE_AVAILABLE = "AVAILABLE",
  PARTIAL = "PARTIAL",
  CLOSED = "CLOSED"
}
