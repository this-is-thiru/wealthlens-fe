import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  CorporateActionService,
  describeHttpError,
} from './corporate-action.service';
import { BaseurlService } from '@services/baseurl.service';
import {
  CorporateActionDto,
  CorporateActionPerformDto,
} from '@models/corporate-action.model';

describe('CorporateActionService (API v1)', () => {
  const BASE = 'http://api.test';
  let service: CorporateActionService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CorporateActionService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: BaseurlService, useValue: { getBaseUrl: () => BASE } },
      ],
    });
    service = TestBed.inject(CorporateActionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('paginates GET /api/v1/me/corporate-actions for getAllCorporateActions()', () => {
    let items: CorporateActionDto[] = [];
    service.getAllCorporateActions().subscribe((r) => (items = r));

    const p0 = httpMock.expectOne(
      `${BASE}/api/v1/me/corporate-actions?page=0&size=200`,
    );
    expect(p0.request.method).toBe('GET');
    p0.flush({
      content: [
        {
          id: 'ca-1',
          stockCode: 'INFY',
          type: 'BONUS',
          exDate: '2026-01-01',
          recordDate: '2026-01-02',
        },
      ],
      page: { number: 0, size: 200, totalElements: 2, totalPages: 2 },
    });

    const p1 = httpMock.expectOne(
      `${BASE}/api/v1/me/corporate-actions?page=1&size=200`,
    );
    p1.flush({
      content: [
        {
          id: 'ca-2',
          stockCode: 'TCS',
          type: 'DIVIDEND',
          exDate: '2026-02-01',
          recordDate: '2026-02-02',
        },
      ],
      page: { number: 1, size: 200, totalElements: 2, totalPages: 2 },
    });

    expect(items).toHaveLength(2);
    expect(items.map((a) => a.id)).toEqual(['ca-1', 'ca-2']);
  });

  it('uses PATCH /api/v1/admin/corporate-actions/{id} with { priority } body and text responseType', () => {
    let text = '';
    service
      .updateCorporateActionPriority('ca-1', 5)
      .subscribe((r) => (text = r));

    const req = httpMock.expectOne(
      `${BASE}/api/v1/admin/corporate-actions/ca-1`,
    );
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ priority: 5 });
    expect(req.request.responseType).toBe('text');
    req.flush('Priority updated');

    expect(text).toBe('Priority updated');
  });

  it('PUTs /api/v1/me/corporate-actions/perform?allBrokers=true and parses JSON response', () => {
    const payload: CorporateActionPerformDto = { month: 'JANUARY', year: 2026 };
    let res: CorporateActionPerformDto | undefined;

    service
      .performBatchCorporateActions('user@test.com', payload, true)
      .subscribe((r) => (res = r));

    const req = httpMock.expectOne(
      `${BASE}/api/v1/me/corporate-actions/perform?allBrokers=true`,
    );
    expect(req.request.method).toBe('PUT');
    expect(req.request.responseType).toBe('json');
    req.flush(payload);

    expect(res).toEqual(payload);
  });

  it('DELETEs /api/v1/admin/corporate-actions/{id} returning void', () => {
    let completed = false;
    service
      .deleteCorporateAction('ca-9')
      .subscribe({ complete: () => (completed = true) });

    const req = httpMock.expectOne(
      `${BASE}/api/v1/admin/corporate-actions/ca-9`,
    );
    expect(req.request.method).toBe('DELETE');
    req.flush(null);

    expect(completed).toBe(true);
  });

  it('describeHttpError extracts RFC 9457 ProblemDetail.detail', () => {
    const err = new HttpErrorResponse({
      status: 400,
      error: JSON.stringify({
        title: 'Bad Request',
        detail: 'Duplicate priority for type',
      }),
    });
    expect(describeHttpError(err, 'Fallback')).toBe(
      'Duplicate priority for type',
    );
  });
});
