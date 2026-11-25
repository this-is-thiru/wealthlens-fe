import { Injectable, inject } from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse,
  HttpParams,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { BaseurlService } from '@services/baseurl.service';
import {
  CorporateActionDto,
  CorporateActionPerformDto,
} from '@models/corporate-action.model';
import { PagedResponse } from '@core/models/paged-response.model';
import { fetchAllPages } from '@core/utils/pagination.util';
import { extractErrorMessage } from '@core/utils/http-error.util';

/**
 * Readable message from a failed request. Supports RFC 9457 `ProblemDetail`
 * (both JSON objects and JSON strings returned when `responseType: 'text'`)
 * as well as legacy `{ message }` error payloads.
 */
export function describeHttpError(err: unknown, fallback: string): string {
  return extractErrorMessage(err, fallback);
}

@Injectable({
  providedIn: 'root',
})
export class CorporateActionService {
  private http = inject(HttpClient);
  private BASE_URL = inject(BaseurlService);

  addCorporateAction(payload: CorporateActionDto): Observable<string> {
    const url = `${this.BASE_URL.getBaseUrl()}/api/v1/admin/corporate-actions`;
    return this.http.post(url, payload, { responseType: 'text' });
  }

  getCorporateActionsPage(
    page: number,
    size: number,
    ids?: string[],
  ): Observable<PagedResponse<CorporateActionDto>> {
    const url = `${this.BASE_URL.getBaseUrl()}/api/v1/me/corporate-actions`;
    let params = new HttpParams().set('page', page).set('size', size);
    if (ids && ids.length > 0) {
      params = params.set('ids', ids.join(','));
    }
    return this.http.get<PagedResponse<CorporateActionDto>>(url, { params });
  }

  getAllCorporateActions(): Observable<CorporateActionDto[]> {
    return fetchAllPages((page, size) =>
      this.getCorporateActionsPage(page, size),
    );
  }

  getCorporateActionById(id: string): Observable<CorporateActionDto> {
    const url = `${this.BASE_URL.getBaseUrl()}/api/v1/me/corporate-actions/${encodeURIComponent(id)}`;
    return this.http.get<CorporateActionDto>(url);
  }

  getCorporateActions(ids: string[]): Observable<CorporateActionDto[]> {
    return fetchAllPages((page, size) =>
      this.getCorporateActionsPage(page, size, ids),
    );
  }

  updateCorporateActionPriority(
    id: string,
    priority: number,
  ): Observable<string> {
    const url = `${this.BASE_URL.getBaseUrl()}/api/v1/admin/corporate-actions/${encodeURIComponent(id)}`;
    return this.http.patch(url, { priority }, { responseType: 'text' });
  }

  performBatchCorporateActions(
    email: string,
    payload: CorporateActionPerformDto,
    allBrokers = false,
  ): Observable<CorporateActionPerformDto> {
    if (email === 'demo@wealthlens.com') {
      return throwError(
        () =>
          new HttpErrorResponse({
            status: 403,
            error: {
              message:
                'Performing batch corporate actions is disabled in read-only guest session.',
            },
          }),
      );
    }
    const url = `${this.BASE_URL.getBaseUrl()}/api/v1/me/corporate-actions/perform`;
    const params = new HttpParams().set('allBrokers', String(allBrokers));
    return this.http.put<CorporateActionPerformDto>(url, payload, { params });
  }

  performCorporateAction(
    email: string,
    payload: CorporateActionPerformDto,
    allBrokers = false,
  ): Observable<CorporateActionPerformDto> {
    return this.performBatchCorporateActions(email, payload, allBrokers);
  }

  performSingleCorporateAction(
    payload: CorporateActionDto,
  ): Observable<string> {
    const url = `${this.BASE_URL.getBaseUrl()}/api/v1/admin/corporate-actions/perform`;
    return this.http.put(url, payload, { responseType: 'text' });
  }

  deleteCorporateAction(id: string): Observable<void> {
    const url = `${this.BASE_URL.getBaseUrl()}/api/v1/admin/corporate-actions/${encodeURIComponent(id)}`;
    return this.http.delete<void>(url);
  }
}
