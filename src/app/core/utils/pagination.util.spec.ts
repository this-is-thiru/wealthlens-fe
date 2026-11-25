import { describe, expect, it, vi } from 'vitest';
import { firstValueFrom, of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { fetchAllPages } from './pagination.util';
import { MAX_PAGE_SIZE, PagedResponse } from '../models/paged-response.model';

describe('fetchAllPages', () => {
  it('unwraps a single page of results', async () => {
    const fetchPage = vi.fn((page: number, size: number) =>
      of<PagedResponse<number>>({
        content: [1, 2, 3],
        page: { number: page, size, totalElements: 3, totalPages: 1 },
      }),
    );

    const items = await firstValueFrom(fetchAllPages(fetchPage));

    expect(items).toEqual([1, 2, 3]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(fetchPage).toHaveBeenCalledWith(0, MAX_PAGE_SIZE);
  });

  it('fetches and concatenates multiple pages in order', async () => {
    const pages: PagedResponse<string>[] = [
      {
        content: ['a', 'b'],
        page: { number: 0, size: 2, totalElements: 5, totalPages: 3 },
      },
      {
        content: ['c', 'd'],
        page: { number: 1, size: 2, totalElements: 5, totalPages: 3 },
      },
      {
        content: ['e'],
        page: { number: 2, size: 2, totalElements: 5, totalPages: 3 },
      },
    ];
    const fetchPage = vi.fn((page: number) => of(pages[page]));

    const items = await firstValueFrom(
      fetchAllPages(fetchPage, { pageSize: 2 }),
    );

    expect(items).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(fetchPage).toHaveBeenCalledTimes(3);
    expect(fetchPage).toHaveBeenNthCalledWith(1, 0, 2);
    expect(fetchPage).toHaveBeenNthCalledWith(2, 1, 2);
    expect(fetchPage).toHaveBeenNthCalledWith(3, 2, 2);
  });

  it('clamps pageSize to backend MAX_PAGE_SIZE (200)', async () => {
    const fetchPage = vi.fn((page: number, size: number) =>
      of<PagedResponse<number>>({
        content: [],
        page: { number: page, size, totalElements: 0, totalPages: 0 },
      }),
    );

    const items = await firstValueFrom(
      fetchAllPages(fetchPage, { pageSize: 5000 }),
    );

    expect(items).toEqual([]);
    expect(fetchPage).toHaveBeenCalledWith(0, MAX_PAGE_SIZE);
  });

  it('respects maxPages safety cap', async () => {
    const fetchPage = vi.fn((page: number, size: number) =>
      of<PagedResponse<number>>({
        content: [page],
        page: { number: page, size, totalElements: 1000, totalPages: 1000 },
      }),
    );

    const items = await firstValueFrom(
      fetchAllPages(fetchPage, { pageSize: 1, maxPages: 3 }),
    );

    expect(items).toEqual([0, 1, 2]);
    expect(fetchPage).toHaveBeenCalledTimes(3);
  });

  it('propagates HTTP errors without swallowing them', async () => {
    const fetchPage = vi.fn((page: number) => {
      if (page === 0) {
        return of<PagedResponse<number>>({
          content: [1],
          page: { number: 0, size: 1, totalElements: 2, totalPages: 2 },
        });
      }
      return throwError(
        () =>
          new HttpErrorResponse({ status: 500, statusText: 'Server Error' }),
      );
    });

    await expect(
      firstValueFrom(fetchAllPages(fetchPage, { pageSize: 1 })),
    ).rejects.toMatchObject({
      status: 500,
    });
  });
});
