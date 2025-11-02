export default async function globalTeardown() {
  const harness = (globalThis as any).__viteHarness as
    | { close: () => Promise<void> }
    | undefined;

  if (harness) {
    await harness.close();
  }
}
