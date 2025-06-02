import { SyncProvider, ISyncProvider } from "./types";
import { SurrealSyncProvider } from "./surreal.provider";
import { DynamoDBSyncProvider } from "./dynamodb.provider";

/**
 * Provider factory that creates the appropriate sync provider based on environment configuration
 */
export class SyncProviderFactory {
  private static instance: ISyncProvider | null = null;

  /**
   * Gets the sync provider instance based on the SYNC_PROVIDER environment variable
   * Defaults to Surreal if not specified
   */
  static getProvider(): ISyncProvider {
    if (!this.instance) {
      const providerType =
        process.env.SYNC_PROVIDER?.toLowerCase() as SyncProvider;

      switch (providerType) {
        case SyncProvider.SURREAL:
          console.log("Using Surreal sync provider");
          this.instance = new SurrealSyncProvider();
          break;
        case SyncProvider.DYNAMODB:
        default:
          console.log("Using DynamoDB sync provider");
          this.instance = new DynamoDBSyncProvider();
          break;
      }
    }

    return this.instance;
  }

  /**
   * Resets the provider instance (useful for testing)
   */
  static resetProvider(): void {
    this.instance = null;
  }

  /**
   * Gets the current provider type from environment
   */
  static getProviderType(): SyncProvider {
    const providerType =
      process.env.SYNC_PROVIDER?.toLowerCase() as SyncProvider;
    return providerType === SyncProvider.DYNAMODB
      ? SyncProvider.DYNAMODB
      : SyncProvider.SURREAL;
  }
}

// Export the provider types and instances for easy access
export { SyncProvider, ISyncProvider } from "./types";
export { SurrealSyncProvider } from "./surreal.provider";
export { DynamoDBSyncProvider } from "./dynamodb.provider";
