import { DatabaseProvider, IDatabaseProvider } from "./types";
import { SurrealDatabaseProvider } from "./surreal.provider";
import { DynamoDBDatabaseProvider } from "./dynamodb.provider";

/**
 * Provider factory that creates the appropriate database provider based on environment configuration
 */
export class DatabaseProviderFactory {
  private static instance: IDatabaseProvider | null = null;

  /**
   * Gets the database provider instance based on the DB_PROVIDER environment variable
   * Defaults to Surreal if not specified
   */
  static getProvider(): IDatabaseProvider {
    if (!this.instance) {
      const providerType =
        process.env.DB_PROVIDER?.toLowerCase() as DatabaseProvider;

      switch (providerType) {
        case DatabaseProvider.DYNAMODB:
          console.log("Using DynamoDB database provider");
          this.instance = new DynamoDBDatabaseProvider();
          break;
        case DatabaseProvider.SURREAL:
        default:
          console.log("Using Surreal database provider");
          this.instance = new SurrealDatabaseProvider();
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
  static getProviderType(): DatabaseProvider {
    const providerType =
      process.env.DB_PROVIDER?.toLowerCase() as DatabaseProvider;
    return providerType === DatabaseProvider.DYNAMODB
      ? DatabaseProvider.DYNAMODB
      : DatabaseProvider.SURREAL;
  }
}

// Export the provider types and instances for easy access
export { DatabaseProvider, IDatabaseProvider } from "./types";
export { SurrealDatabaseProvider } from "./surreal.provider";
export { DynamoDBDatabaseProvider } from "./dynamodb.provider";
