export const MAX_PAGE_SIZE = 200;
export const DEFAULT_PAGE_SIZE = MAX_PAGE_SIZE;
export const DEFAULT_MAX_PAGES = 100;

export interface PageMetadata {
  size: number;
  number: number;
  totalElements: number;
  totalPages: number;
}

export interface PagedResponse<T> {
  content: T[];
  page: PageMetadata;
}

export interface PageRequest {
  page?: number;
  size?: number;
  sort?: string;
}
