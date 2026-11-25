import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BaseurlService } from '@core/services/baseurl.service';
import { AuthService } from '@core/services/auth.service';
import { BrokerChargesService } from './broker-charges.service';
import {
  ChargeAccount,
  ChargeBreakdownResponse,
  ChargeSchedule,
  ChargeSimulationRequest,
  UserCharge,
} from '../models/broker-charges.model';

describe('BrokerChargesService (API v1)', () => {
  const BASE = 'http://api.test';
  let service: BrokerChargesService;
  let httpMock: HttpTestingController;
  const isDemoSignal = signal(false);

  beforeEach(() => {
    isDemoSignal.set(false);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: BaseurlService, useValue: { getBaseUrl: () => BASE } },
        { provide: AuthService, useValue: { isDemo: isDemoSignal } },
      ],
    });
    service = TestBed.inject(BrokerChargesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  const buyDeliveryReq: ChargeSimulationRequest = {
    brokerName: 'ZERODHA',
    assetType: 'EQUITY',
    segment: 'DELIVERY',
    event: 'BUY',
    quantity: 100,
    price: 1500,
    stockCode: 'RELIANCE',
    transactionDate: '2026-03-15',
  };

  it('POSTs to /api/v1/me/charges/simulate and propagates real HTTP errors (A1: no mock fallback for real users)', () => {
    const expected: ChargeBreakdownResponse = {
      scheduleCode: 'ZERODHA-EQUITY-DELIVERY-2025-04-01',
      resolution: 'RESOLVED',
      totalCharges: 182.45,
      lines: [],
    };
    let actual: ChargeBreakdownResponse | undefined;
    service.simulateCharges(buyDeliveryReq).subscribe((r) => (actual = r));

    const req = httpMock.expectOne(`${BASE}/api/v1/me/charges/simulate`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(buyDeliveryReq);
    req.flush(expected);
    expect(actual).toEqual(expected);

    let failedStatus = 0;
    service.simulateCharges(buyDeliveryReq).subscribe({
      error: (err) => (failedStatus = err.status),
    });
    httpMock
      .expectOne(`${BASE}/api/v1/me/charges/simulate`)
      .flush(
        { detail: 'Schedule missing' },
        { status: 400, statusText: 'Bad Request' },
      );
    expect(failedStatus).toBe(400);
  });

  it('returns mock simulation data ONLY in demo mode without hitting the network (A1)', () => {
    isDemoSignal.set(true);
    let actual: ChargeBreakdownResponse | undefined;
    service.simulateCharges(buyDeliveryReq).subscribe((r) => (actual = r));

    expect(actual?.resolution).toBe('RESOLVED');
    expect(actual?.lines.some((l) => l.code === 'STAMP_DUTY')).toBe(true);
  });

  it('paginates GET /api/v1/me/charges/user-charges across multiple pages with filter params', () => {
    let charges: UserCharge[] = [];
    service
      .getUserChargeHistory('u@test.com', '2026-01-01', '2026-03-31', 'EQUITY')
      .subscribe((r) => (charges = r));

    const p0 = httpMock.expectOne(
      `${BASE}/api/v1/me/charges/user-charges?page=0&size=200&from=2026-01-01&to=2026-03-31&assetType=EQUITY`,
    );
    p0.flush({
      content: [{ id: 'uc-1', transactionId: 't1', totalCharges: 10 }],
      page: { number: 0, size: 200, totalElements: 2, totalPages: 2 },
    });

    const p1 = httpMock.expectOne(
      `${BASE}/api/v1/me/charges/user-charges?page=1&size=200&from=2026-01-01&to=2026-03-31&assetType=EQUITY`,
    );
    p1.flush({
      content: [{ id: 'uc-2', transactionId: 't2', totalCharges: 20 }],
      page: { number: 1, size: 200, totalElements: 2, totalPages: 2 },
    });

    expect(charges).toHaveLength(2);
  });

  it('sanitizes ChargeAccountRequest to strip read-only fields before POST /api/v1/me/charges/accounts', () => {
    const dirtyAccount: ChargeAccount = {
      id: 'read-only-id',
      email: 'u@test.com',
      dematAccountId: '1208160012345678',
      brokerName: 'ZERODHA',
      accountHolder: 'Self',
      openedOn: '2025-01-01',
      amcFrequency: 'ANNUALLY',
      planCode: 'STANDARD',
      lastBilledThrough: '2025-12-31',
      billingEvents: [],
    };

    service.registerDematAccount('u@test.com', dirtyAccount).subscribe();

    const req = httpMock.expectOne(`${BASE}/api/v1/me/charges/accounts`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      dematAccountId: '1208160012345678',
      brokerName: 'ZERODHA',
      accountHolder: 'Self',
      openedOn: '2025-01-01',
      amcFrequency: 'ANNUALLY',
      planCode: 'STANDARD',
    });
    req.flush(dirtyAccount);
  });

  it('sanitizes ChargeScheduleRequest to strip id before POST /api/v1/admin/charges/schedules', () => {
    const schedule: ChargeSchedule = {
      id: 'db-id',
      scheduleCode: 'ZER-EQ',
      brokerName: 'ZERODHA',
      startDate: '2026-01-01',
      rules: [],
    };

    service.publishSchedule(schedule).subscribe();

    const req = httpMock.expectOne(`${BASE}/api/v1/admin/charges/schedules`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      scheduleCode: 'ZER-EQ',
      brokerName: 'ZERODHA',
      startDate: '2026-01-01',
      rules: [],
    });
    req.flush(schedule);
  });

  it('uses /api/v1/admin/charges/... routes for AMC due/impose with ANNUALLY frequency', () => {
    service.getAmcDue('ANNUALLY', '2026-03-31').subscribe();
    const dueReq = httpMock.expectOne(
      `${BASE}/api/v1/admin/charges/accounts/due?frequency=ANNUALLY&billedThrough=2026-03-31`,
    );
    expect(dueReq.request.method).toBe('GET');
    dueReq.flush([]);

    service.imposeAmc('ANNUALLY', '2026-03-31').subscribe();
    const imposeReq = httpMock.expectOne(
      `${BASE}/api/v1/admin/charges/amc/impose?frequency=ANNUALLY&billedThrough=2026-03-31`,
    );
    expect(imposeReq.request.method).toBe('POST');
    imposeReq.flush([]);
  });
});
