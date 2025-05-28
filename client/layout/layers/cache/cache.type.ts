export enum CacheKey {
  //Resource cache keys
  COUNT = "count",
  SUB_TYPE_COUNTS = "sub-type-counts",
  ITEM_COUNTS = "item-counts",
  /**
   * Cache for bulk resources like nodes - with default filters applied
   */
  LIBRARY_DEFAULT_RECORDS = "library-default-records",

  //Global cache keys
  CALENDAR_CACHE = "calendar-cache",
  TYPED_COLLECTION_CACHE = "typed-collection-cache"
}
