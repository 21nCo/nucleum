import type { createSearchProvider } from '@searchfn/datafn-provider';
import { MemoryAdapter } from '@searchfn/adapter-memory';

type SearchAdapter = Parameters<typeof createSearchProvider>[0];
type IndexParams = Parameters<SearchAdapter['index']>[0];
type SearchParams = Parameters<SearchAdapter['search']>[0];
type SearchAllParams = Parameters<NonNullable<SearchAdapter['searchAll']>>[0];
type SearchAllResult = Awaited<ReturnType<NonNullable<SearchAdapter['searchAll']>>>[number];
type RemoveParams = Parameters<SearchAdapter['remove']>[0];
type InitializeParams = Parameters<NonNullable<SearchAdapter['initialize']>>[0];
type DocumentMetadata = NonNullable<IndexParams['documents'][number]['metadata']>;
type MetadataFilters = Pick<SearchParams, 'namespaceFilter' | 'regionFilter'>;

const UNBOUNDED = Number.MAX_SAFE_INTEGER;
const DEFAULT_LIMIT = 10;

/**
 * Test-only in-memory search adapter that enforces DataFn namespace/region filters.
 *
 * `@searchfn/datafn-provider@0.4.0` refuses to search through adapters that do not
 * declare `capabilities.metadataFilters`, and the published `@searchfn/adapter-memory@0.1.0`
 * neither declares nor enforces them. This wrapper records the `__ns` / `__region`
 * metadata of each indexed document and applies the filters before limits, matching the
 * upstream adapter contract, so the memory E2E exercises real tenant isolation.
 */
export class MetadataFilteringMemoryAdapter implements SearchAdapter {
  readonly name = 'memory';
  readonly capabilities = {
    persistent: false,
    searchAll: true,
    fuzzy: true,
    fieldBoosts: true,
    prefix: true,
    metadataFilters: true
  };

  private readonly inner = new MemoryAdapter();
  private readonly metadata = new Map<string, Map<string, DocumentMetadata>>();

  async initialize(params: InitializeParams): Promise<void> {
    await this.inner.initialize?.(params);
  }

  async index(params: IndexParams): Promise<void> {
    await this.inner.index(params);
    const entries = this.resourceMetadata(params.resource);
    for (const document of params.documents) {
      entries.set(String(document.id), { ...(document.metadata ?? {}) });
    }
  }

  async search(params: SearchParams): Promise<Array<string | number>> {
    const ids = await this.inner.search({ ...params, limit: UNBOUNDED });
    return ids
      .filter((id) => this.matches(params.resource, id, params))
      .slice(0, Math.max(1, params.limit ?? DEFAULT_LIMIT));
  }

  async searchAll(params: SearchAllParams): Promise<SearchAllResult[]> {
    const limit = params.limit ?? DEFAULT_LIMIT;
    const limitPerResource = params.limitPerResource ?? limit;
    const results = await this.inner.searchAll({
      ...params,
      limit: UNBOUNDED,
      limitPerResource: UNBOUNDED
    });
    const perResource = new Map<string, number>();
    const filtered: SearchAllResult[] = [];
    for (const result of results) {
      if (!this.matches(result.resource, result.id, params)) continue;
      const count = perResource.get(result.resource) ?? 0;
      if (count >= limitPerResource) continue;
      perResource.set(result.resource, count + 1);
      filtered.push(result);
    }
    return filtered.slice(0, limit);
  }

  async remove(params: RemoveParams): Promise<void> {
    await this.inner.remove(params);
    const entries = this.metadata.get(params.resource);
    for (const id of params.ids) entries?.delete(String(id));
  }

  async clear(resource: string, signal?: AbortSignal): Promise<void> {
    await this.inner.clear(resource, signal);
    this.metadata.delete(resource);
  }

  async dispose(): Promise<void> {
    await this.inner.dispose?.();
    this.metadata.clear();
  }

  private resourceMetadata(resource: string): Map<string, DocumentMetadata> {
    let entries = this.metadata.get(resource);
    if (!entries) {
      entries = new Map();
      this.metadata.set(resource, entries);
    }
    return entries;
  }

  private matches(resource: string, id: string | number, filters: MetadataFilters): boolean {
    const metadata = this.metadata.get(resource)?.get(String(id));
    if (filters.namespaceFilter?.length) {
      if (!metadata || !filters.namespaceFilter.includes(String(metadata.__ns))) return false;
    }
    if (filters.regionFilter?.length) {
      if (!metadata || !filters.regionFilter.includes(String(metadata.__region))) return false;
    }
    return true;
  }
}
