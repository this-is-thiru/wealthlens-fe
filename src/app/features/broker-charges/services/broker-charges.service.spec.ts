import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { BaseurlService } from '@core/services/baseurl.service';
import { BrokerChargesService } from './broker-charges.service';
import {
  ChargeAccount,
  ChargeBreakdownResponse,
  ChargeCatalogueEntry,
  ChargeReconciliationResponse,
  ChargeSchedule,
  ChargeScheduleDrift,
  ChargeSeedReport,
  ChargeSimulationRequest,
  UserCharge,
} from '../models/broker-charges.model';

describe('BrokerChargesService', () => {
  const BASE = 'http://api.test';
  let service: BrokerChargesService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: BaseurlService, useValue: { getBaseUrl: () => BASE } },
      ],
    });
    service = TestBed.inject(BrokerChargesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // ---------------------------------------------------------------------------
  // 1. Simulation
  // ---------------------------------------------------------------------------
  describe('simulateCharges', () => {
    const buyDeliveryReq: ChargeSimulationRequest = {
      brokerName: 'ZERODHA',
      assetType: 'EQUITY',
      segment: 'DELIVERY',
      event: 'BUY',
      quantity: 100,
      price: 1500,
      stockCode: 'RELIANCE',
    };

    it('POSTs to /charges/simulate and returns backend response on success', () => {
      const expected: ChargeBreakdownResponse = {
        scheduleCode: 'ZERODHA-EQUITY-DELIVERY-2025-04-01',
        resolution: 'RESOLVED',
        totalCharges: 182.45,
        deductibleCharges: 32.45,
        nonDeductibleCharges: 150,
        turnover: 150000,
        lines: [],
      };
      let actual: ChargeBreakdownResponse | undefined;
      service.simulateCharges(buyDeliveryReq).subscribe((r) => (actual = r));

      const req = httpMock.expectOne(`${BASE}/charges/simulate`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(buyDeliveryReq);
      req.flush(expected);

      expect(actual).toEqual(expected);
    });

    it('falls back to mock calculation on error for Zerodha BUY DELIVERY (includes stamp duty, zero brokerage)', () => {
      let actual: ChargeBreakdownResponse | undefined;
      service.simulateCharges(buyDeliveryReq).subscribe((r) => (actual = r));

      httpMock
        .expectOne(`${BASE}/charges/simulate`)
        .flush('err', { status: 500, statusText: 'Server Error' });

      expect(actual?.resolution).toBe('RESOLVED');
      expect(actual?.turnover).toBe(150000);
      expect(actual?.lines.some((l) => l.code === 'STAMP_DUTY')).toBe(true);
      expect(actual?.lines.some((l) => l.code === 'DP')).toBe(false);
      expect(actual?.lines.find((l) => l.code === 'BROKERAGE')?.amount).toBe(0);
    });

    it('falls back to mock calculation on error for SELL DELIVERY (includes DP, no stamp duty) and INTRADAY non-Zerodha', () => {
      const sellDelivery: ChargeSimulationRequest = {
        ...buyDeliveryReq,
        event: 'SELL',
      };
      let sellRes: ChargeBreakdownResponse | undefined;
      service.simulateCharges(sellDelivery).subscribe((r) => (sellRes = r));
      httpMock
        .expectOne(`${BASE}/charges/simulate`)
        .flush('err', { status: 500, statusText: 'Server Error' });

      expect(sellRes?.lines.some((l) => l.code === 'DP')).toBe(true);
      expect(sellRes?.lines.some((l) => l.code === 'STAMP_DUTY')).toBe(false);

      const intradayNonZerodha: ChargeSimulationRequest = {
        brokerName: 'UPSTOX',
        assetType: 'EQUITY',
        segment: 'INTRADAY',
        event: 'SELL',
        quantity: 0,
        price: 0,
      };
      let intraRes: ChargeBreakdownResponse | undefined;
      service
        .simulateCharges(intradayNonZerodha)
        .subscribe((r) => (intraRes = r));
      httpMock
        .expectOne(`${BASE}/charges/simulate`)
        .flush('err', { status: 500, statusText: 'Server Error' });

      expect(intraRes?.lines.find((l) => l.code === 'BROKERAGE')?.amount).toBe(
        20,
      );
      expect(intraRes?.lines.some((l) => l.code === 'DP')).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Catalogue
  // ---------------------------------------------------------------------------
  describe('getChargeCatalogue', () => {
    it('GETs /charge-catalogue and falls back to mock entries on error', () => {
      const apiEntries: ChargeCatalogueEntry[] = [
        {
          code: 'STT',
          displayName: 'STT',
          category: 'STATUTORY',
          deductibleForCapitalGains: false,
          status: 'ACTIVE',
          description: 'Tax',
          statutoryReference: 'Act',
        },
      ];
      let res: ChargeCatalogueEntry[] | undefined;
      service.getChargeCatalogue().subscribe((r) => (res = r));
      const req = httpMock.expectOne(`${BASE}/charge-catalogue`);
      expect(req.request.method).toBe('GET');
      req.flush(apiEntries);
      expect(res).toEqual(apiEntries);

      let fallback: ChargeCatalogueEntry[] | undefined;
      service.getChargeCatalogue().subscribe((r) => (fallback = r));
      httpMock
        .expectOne(`${BASE}/charge-catalogue`)
        .flush('err', { status: 500, statusText: 'Err' });
      expect(fallback?.length).toBe(10);
      expect(fallback?.map((e) => e.code)).toContain('BROKERAGE');
      expect(fallback?.map((e) => e.code)).toContain('EXIT_LOAD');
    });
  });

  // ---------------------------------------------------------------------------
  // 3. User Charges History, Contract Note, Gaps, Reconciliation
  // ---------------------------------------------------------------------------
  describe('user charges endpoints', () => {
    const email = 'user+1@test.com';
    const encodedEmail = encodeURIComponent(email);

    it('getUserChargeHistory sends optional query params and falls back on error', () => {
      let res: UserCharge[] | undefined;
      service
        .getUserChargeHistory(email, '2026-01-01', '2026-03-31', 'EQUITY')
        .subscribe((r) => (res = r));

      const req = httpMock.expectOne(
        `${BASE}/user-charges/user/${encodedEmail}?from=2026-01-01&to=2026-03-31&assetType=EQUITY`,
      );
      expect(req.request.method).toBe('GET');
      req.flush([]);
      expect(res).toEqual([]);

      let fallback: UserCharge[] | undefined;
      service.getUserChargeHistory(email).subscribe((r) => (fallback = r));
      httpMock
        .expectOne(`${BASE}/user-charges/user/${encodedEmail}`)
        .flush('err', { status: 500, statusText: 'Err' });
      expect(fallback?.length).toBe(4);
      expect(fallback?.[0].email).toBe(email);
    });

    it('getContractNote encodes path params and falls back on error', () => {
      const txnId = 'TXN/001';
      let res: ChargeBreakdownResponse | undefined;
      service.getContractNote(email, txnId).subscribe((r) => (res = r));

      const req = httpMock.expectOne(
        `${BASE}/user-charges/user/${encodedEmail}/transaction/${encodeURIComponent(txnId)}`,
      );
      expect(req.request.method).toBe('GET');
      req.flush('err', { status: 404, statusText: 'Not Found' });
      expect(res?.scheduleCode).toBe('ZERODHA-EQUITY-DELIVERY-2025-04-01');
      expect(res?.lines.length).toBe(6);
    });

    it('getUserChargeGaps GETs /gaps and falls back on error', () => {
      let res: UserCharge[] | undefined;
      service.getUserChargeGaps(email).subscribe((r) => (res = r));
      const req = httpMock.expectOne(
        `${BASE}/user-charges/user/${encodedEmail}/gaps`,
      );
      expect(req.request.method).toBe('GET');
      req.flush('err', { status: 500, statusText: 'Err' });
      expect(res?.length).toBe(1);
      expect(res?.[0].resolution).toBe('NO_SCHEDULE');
    });

    it('getUserChargeReconciliation GETs /reconciliation and falls back on error', () => {
      let res: ChargeReconciliationResponse | undefined;
      service.getUserChargeReconciliation(email).subscribe((r) => (res = r));
      const req = httpMock.expectOne(
        `${BASE}/user-charges/user/${encodedEmail}/reconciliation`,
      );
      expect(req.request.method).toBe('GET');
      req.flush('err', { status: 500, statusText: 'Err' });
      expect(res?.comparableCount).toBe(28);
      expect(res?.rows.length).toBe(3);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Demat Accounts
  // ---------------------------------------------------------------------------
  describe('demat account endpoints', () => {
    const email = 'user@test.com';
    const encodedEmail = encodeURIComponent(email);

    it('getUserDematAccounts returns accounts and falls back on error', () => {
      let res: ChargeAccount[] | undefined;
      service.getUserDematAccounts(email).subscribe((r) => (res = r));
      const req = httpMock.expectOne(
        `${BASE}/charge-accounts/user/${encodedEmail}`,
      );
      expect(req.request.method).toBe('GET');
      req.flush('err', { status: 500, statusText: 'Err' });
      expect(res?.length).toBe(2);
      expect(res?.[0].email).toBe(email);
    });

    it('registerDematAccount POSTs payload and applies fallback defaults on error', () => {
      let defaultRes: ChargeAccount | undefined;
      service
        .registerDematAccount(email, {})
        .subscribe((r) => (defaultRes = r));
      const req1 = httpMock.expectOne(
        `${BASE}/charge-accounts/user/${encodedEmail}`,
      );
      expect(req1.request.method).toBe('POST');
      req1.flush('err', { status: 500, statusText: 'Err' });
      expect(defaultRes?.brokerName).toBe('ZERODHA');
      expect(defaultRes?.amcFrequency).toBe('QUARTERLY');

      let customRes: ChargeAccount | undefined;
      service
        .registerDematAccount(email, {
          dematAccountId: '9999',
          brokerName: 'UPSTOX',
          accountHolder: 'Spouse',
          openedOn: '2025-01-01',
          amcFrequency: 'YEARLY',
          planCode: 'PRO',
        })
        .subscribe((r) => (customRes = r));
      httpMock
        .expectOne(`${BASE}/charge-accounts/user/${encodedEmail}`)
        .flush('err', { status: 500, statusText: 'Err' });
      expect(customRes?.brokerName).toBe('UPSTOX');
      expect(customRes?.planCode).toBe('PRO');
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Admin: Rate Cards & Schedules
  // ---------------------------------------------------------------------------
  describe('schedule management endpoints', () => {
    it('getChargeSchedulesByBroker handles ZERODHA and non-ZERODHA fallbacks', () => {
      let zRes: ChargeSchedule[] | undefined;
      service
        .getChargeSchedulesByBroker('ZERODHA')
        .subscribe((r) => (zRes = r));
      httpMock
        .expectOne(`${BASE}/charge-schedules?broker=ZERODHA`)
        .flush('err', { status: 500, statusText: 'Err' });
      expect(zRes?.[0].rules[0].flatAmount).toBe(0);

      let uRes: ChargeSchedule[] | undefined;
      service.getChargeSchedulesByBroker('UPSTOX').subscribe((r) => (uRes = r));
      httpMock
        .expectOne(`${BASE}/charge-schedules?broker=UPSTOX`)
        .flush('err', { status: 500, statusText: 'Err' });
      expect(uRes?.[0].rules[0].flatAmount).toBe(20);
    });

    it('getChargeScheduleByCode GETs by code and falls back on error', () => {
      let res: ChargeSchedule | undefined;
      service
        .getChargeScheduleByCode('ZERODHA-EQ-2025')
        .subscribe((r) => (res = r));
      const req = httpMock.expectOne(
        `${BASE}/charge-schedules/ZERODHA-EQ-2025`,
      );
      expect(req.request.method).toBe('GET');
      req.flush('err', { status: 500, statusText: 'Err' });
      expect(res?.brokerName).toBe('ZERODHA');
    });

    it('getUnverifiedSchedules GETs /unverified and falls back on error', () => {
      let res: ChargeSchedule[] | undefined;
      service.getUnverifiedSchedules().subscribe((r) => (res = r));
      const req = httpMock.expectOne(`${BASE}/charge-schedules/unverified`);
      expect(req.request.method).toBe('GET');
      req.flush('err', { status: 500, statusText: 'Err' });
      expect(res?.[0].verifiedOn).toBeUndefined();
    });

    it('closeSchedule PATCHes endDate and updates fallback schedule on error', () => {
      let res: ChargeSchedule | undefined;
      service.closeSchedule('CODE-1', '2026-06-30').subscribe((r) => (res = r));
      const req = httpMock.expectOne(
        `${BASE}/charge-schedules/CODE-1/close?endDate=2026-06-30`,
      );
      expect(req.request.method).toBe('PATCH');
      req.flush('err', { status: 500, statusText: 'Err' });
      expect(res?.endDate).toBe('2026-06-30');
    });

    it('seedCharges POSTs /charges/seed and falls back on error', () => {
      let res: ChargeSeedReport | undefined;
      service.seedCharges().subscribe((r) => (res = r));
      const req = httpMock.expectOne(`${BASE}/charges/seed`);
      expect(req.request.method).toBe('POST');
      req.flush('err', { status: 500, statusText: 'Err' });
      expect(res?.catalogueEntriesWritten).toBe(12);
    });

    it('getScheduleDrift GETs /drift and falls back on error', () => {
      let res: ChargeScheduleDrift[] | undefined;
      service.getScheduleDrift().subscribe((r) => (res = r));
      const req = httpMock.expectOne(`${BASE}/charge-schedules/drift`);
      expect(req.request.method).toBe('GET');
      req.flush('err', { status: 500, statusText: 'Err' });
      expect(res?.length).toBe(1);
    });

    it('publishSchedule POSTs schedule and echoes it on error', () => {
      const schedule: ChargeSchedule = {
        id: 'sch-new',
        scheduleCode: 'TEST-1',
        brokerName: 'ZERODHA',
        assetType: 'EQUITY',
        segment: 'DELIVERY',
        startDate: '2026-04-01',
        rules: [],
      };
      let res: ChargeSchedule | undefined;
      service.publishSchedule(schedule).subscribe((r) => (res = r));
      const req = httpMock.expectOne(`${BASE}/charge-schedules`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(schedule);
      req.flush('err', { status: 500, statusText: 'Err' });
      expect(res).toEqual(schedule);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Admin: Demat AMC Billing
  // ---------------------------------------------------------------------------
  describe('AMC billing endpoints', () => {
    it('getAmcDue GETs /charge-accounts/due with params and falls back on error', () => {
      let res: ChargeAccount[] | undefined;
      service.getAmcDue('QUARTERLY', '2026-03-31').subscribe((r) => (res = r));
      const req = httpMock.expectOne(
        `${BASE}/charge-accounts/due?frequency=QUARTERLY&billedThrough=2026-03-31`,
      );
      expect(req.request.method).toBe('GET');
      req.flush('err', { status: 500, statusText: 'Err' });
      expect(res?.length).toBe(1);
    });

    it('imposeAmc POSTs /charges/amc/impose with params and falls back on error', () => {
      let res: ChargeAccount[] | undefined;
      service.imposeAmc('YEARLY', '2026-03-31').subscribe((r) => (res = r));
      const req = httpMock.expectOne(
        `${BASE}/charges/amc/impose?frequency=YEARLY&billedThrough=2026-03-31`,
      );
      expect(req.request.method).toBe('POST');
      req.flush('err', { status: 500, statusText: 'Err' });
      expect(res?.length).toBe(1);
    });
  });
});
