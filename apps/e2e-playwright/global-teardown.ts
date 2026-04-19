export default async function globalTeardown() {
  const harnesses = (globalThis as any).__viteHarnesses as
    | Array<{ close: () => Promise<void> }>
    | undefined;
  if (harnesses?.length) {
    await Promise.all(harnesses.map((harness) => harness.close()));
    return;
  }

  const harness = (globalThis as any).__viteHarness as
    | { close: () => Promise<void> }
    | undefined;

  if (harness) {
    await harness.close();
  }
}
