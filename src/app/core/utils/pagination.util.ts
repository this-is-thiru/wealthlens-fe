import { EMPTY, Observable } from 'rxjs';
import { expand, reduce } from 'rxjs/operators';
import {
  DEFAULT_MAX_PAGES,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  PagedResponse,
} from '../models/paged-response.model';

export interface FetchAllPagesOptions {
  /** Requested page size (clamped to backend max-page-size: 1..200). */
  pageSize?: number;
  /** Safety upper bound on number of sequential page requests. */
  maxPages?: number;
}

/**
 * Reusable pagination-aware fetcher (Option A): unwraps Spring Data `PagedModel`
 * (`{ content, page }`) across all pages while respecting backend `max-page-size: 200`.
 * Propagates HTTP errors immediately without silent swallowing.
 */
export function fetchAllPages<T>(
  fetchPage: (page: number, size: number) => Observable<PagedResponse<T>>,
  options?: FetchAllPagesOptions,
): Observable<T[]> {
  const requestedSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Math.floor(requestedSize)),
  );
  const maxPages = Math.max(
    1,
    Math.floor(options?.maxPages ?? DEFAULT_MAX_PAGES),
  );

  let fetchedPages = 1;

  return fetchPage(0, pageSize).pipe(
    expand((res) => {
      const content = Array.isArray(res?.content) ? res.content : [];
      const currentNumber = res?.page?.number ?? 0;
      const totalPages = res?.page?.totalPages ?? 1;
      const nextPage = currentNumber + 1;

      if (
        content.length === 0 ||
        nextPage >= totalPages ||
        fetchedPages >= maxPages
      ) {
        return EMPTY;
      }

      fetchedPages += 1;
      return fetchPage(nextPage, pageSize);
    }),
    reduce((acc: T[], res: PagedResponse<T>) => {
      if (Array.isArray(res?.content) && res.content.length > 0) {
        acc.push(...res.content);
      }
      return acc;
    }, []),
  );
}
