// Declare global types in a separate file
declare global {
  namespace NodeJS {
    interface Global {
      testAgent: {
        id: string;
        context: string;
        db: string;
        region: string;
      };
      testUtils: {
        cleanDb: () => Promise<void>;
        createTestData: () => Promise<void>;
      };
    }
  }
}
