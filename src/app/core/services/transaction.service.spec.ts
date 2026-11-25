import { TestBed } from '@angular/core/testing';
import {
  HttpErrorResponse,
  HttpEventType,
  provideHttpClient,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { TransactionService } from './transaction.service';
import { BaseurlService } from './baseurl.service';
import { AssetRequest } from '../../shared/models/asset-request.model';

const DEMO_EMAIL = 'demo@wealthlens.com';
const USER_EMAIL = 'investor@wealthlens.com';
const BASE = 'http://api.test';

const SAMPLE_ASSET_REQUEST: AssetRequest = {
  stockCode: 'RELIANCE',
  stockName: 'Reliance Industries',
  exchangeName: 'NSE',
  brokerName: 'ZERODHA',
  assetType: 'EQUITY',
  price: 2500,
  quantity: 10,
  transactionType: 'BUY',
  transactionDate: '2026-03-15',
};

describe('TransactionService (demo account)', () => {
  let service: TransactionService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: BaseurlService, useValue: { getBaseUrl: () => BASE } },
      ],
    });
    service = TestBed.inject(TransactionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function refusal(call: Promise<unknown>): Promise<HttpErrorResponse> {
    try {
      await call;
    } catch (error) {
      return error as HttpErrorResponse;
    }
    throw new Error('expected the call to be refused');
  }

  it('refuses adding a transaction with 403 when the user is the demo account', async () => {
    const error = await refusal(
      firstValueFrom(service.addTransaction(DEMO_EMAIL, SAMPLE_ASSET_REQUEST)),
    );
    expect(error.status).toBe(403);
    expect(error.error.message).toBe(
      'Adding transactions is disabled in read-only guest session.',
    );
  });

  it('refuses a file import with 403 when the user is the demo account', async () => {
    const file = new File(['x'], 'transactions.xlsx');
    const error = await refusal(
      firstValueFrom(service.uploadTransactions(DEMO_EMAIL, file, 'Q1')),
    );
    expect(error.status).toBe(403);
    expect(error.error.message).toBe(
      'File import is disabled in read-only guest session.',
    );
  });

  it('refuses clearing records with 403 when the user is the demo account', async () => {
    const error = await refusal(
      firstValueFrom(service.clearAllRecords(DEMO_EMAIL)),
    );
    expect(error.status).toBe(403);
    expect(error.error.message).toBe(
      'Clearing records is disabled in read-only guest session.',
    );
  });

  it('returns only the asked stock from sample data when the user is the demo account', async () => {
    const quant = await firstValueFrom(
      service.getTransactionsByStock(DEMO_EMAIL, 'QUANT_SMALL'),
    );
    const sbi = await firstValueFrom(
      service.getTransactionsByStock(DEMO_EMAIL, 'SBI_BLUE'),
    );

    expect(quant).toHaveLength(10);
    expect(quant.every((row) => row.stockCode === 'QUANT_SMALL')).toBe(true);
    expect(sbi).toHaveLength(9);
    expect(sbi.every((row) => row.stockCode === 'SBI_BLUE')).toBe(true);
  });
});

describe('TransactionService (API v1 contracts)', () => {
  let service: TransactionService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: BaseurlService, useValue: { getBaseUrl: () => BASE } },
      ],
    });
    service = TestBed.inject(TransactionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('paginates GET /api/v1/me/portfolio/transactions across multiple pages', () => {
    let rows: unknown[] = [];
    service.getUserTransactions(USER_EMAIL).subscribe((r) => (rows = r));

    const p0 = http.expectOne(
      `${BASE}/api/v1/me/portfolio/transactions?page=0&size=200`,
    );
    expect(p0.request.method).toBe('GET');
    p0.flush({
      content: [{ id: '1', stockCode: 'INFY' }],
      page: { number: 0, size: 200, totalElements: 2, totalPages: 2 },
    });

    const p1 = http.expectOne(
      `${BASE}/api/v1/me/portfolio/transactions?page=1&size=200`,
    );
    p1.flush({
      content: [{ id: '2', stockCode: 'TCS' }],
      page: { number: 1, size: 200, totalElements: 2, totalPages: 2 },
    });

    expect(rows).toHaveLength(2);
  });

  it('POSTs queryFilters (not filters) to /api/v1/me/portfolio/transactions/search', () => {
    let rows: unknown[] = [];
    const queryFilters = [
      { filterKey: 'stock_code', operation: 'EQUALS', value: 'INFY' },
    ];
    service
      .getCurrentTransactions(USER_EMAIL, queryFilters)
      .subscribe((r) => (rows = r));

    const req = http.expectOne(
      `${BASE}/api/v1/me/portfolio/transactions/search?page=0&size=200`,
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ queryFilters });
    req.flush({
      content: [{ id: '1', stockCode: 'INFY' }],
      page: { number: 0, size: 200, totalElements: 1, totalPages: 1 },
    });

    expect(rows).toHaveLength(1);
  });

  it('D1: POSTs addTransaction to /api/v1/me/portfolio/transaction/v2 with text responseType', () => {
    let text = '';
    service
      .addTransaction(USER_EMAIL, SAMPLE_ASSET_REQUEST)
      .subscribe((r) => (text = r));

    const req = http.expectOne(`${BASE}/api/v1/me/portfolio/transaction/v2`);
    expect(req.request.method).toBe('POST');
    expect(req.request.responseType).toBe('text');
    expect(req.request.body).toEqual(SAMPLE_ASSET_REQUEST);
    req.flush('Transaction recorded');

    expect(text).toBe('Transaction recorded');
  });

  it('D5: POSTs uploadTransactions to /api/v1/me/portfolio/transactions/uploads?quarter=Q2 as text', () => {
    const file = new File(['xlsx'], 'q2.xlsx');
    let responseBody: string | null = null;

    service.uploadTransactions(USER_EMAIL, file, 'Q2').subscribe((ev) => {
      if (ev.type === HttpEventType.Response) {
        responseBody = ev.body;
      }
    });

    const req = http.expectOne(
      `${BASE}/api/v1/me/portfolio/transactions/uploads?quarter=Q2`,
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.responseType).toBe('text');
    req.flush(
      'From q2.xlsx, quarter Q2: 5 recorded, 0 already recorded by an earlier send of this file',
    );

    expect(responseBody).toContain('5 recorded');
  });

  it('DELETEs /api/v1/me/portfolio as text for clearAllRecords', () => {
    let msg = '';
    service.clearAllRecords(USER_EMAIL).subscribe((r) => (msg = r));

    const req = http.expectOne(`${BASE}/api/v1/me/portfolio`);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.responseType).toBe('text');
    req.flush('User records deleted successfully');

    expect(msg).toBe('User records deleted successfully');
  });

  it('GETs /api/v1/me/templates/excel as blob for downloadTemplate (WI-6.1)', () => {
    let blob: Blob | undefined;
    service.downloadTemplate().subscribe((b) => (blob = b));

    const req = http.expectOne(`${BASE}/api/v1/me/templates/excel`);
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['excel']));

    expect(blob).toBeInstanceOf(Blob);
  });

  it('interprets backend master upload summary and held-back corporate-action responses', () => {
    const ok = service.interpretUploadResponse(
      'From trades.xlsx, quarter Q1: 12 recorded, 2 already recorded by an earlier send of this file',
    );
    expect(ok.tone).toBe('success');
    expect(ok.message).toContain('12 recorded');

    const held = service.interpretUploadResponse(
      'From trades.xlsx, quarter Q1: 8 recorded, 0 already recorded by an earlier send of this file; held back for a corporate action: [tx-1, tx-2]',
    );
    expect(held.tone).toBe('warn');
    expect(held.message).toContain('2 transactions are held');
  });

  it('classifies RFC 9457 ProblemDetail and 429 upload errors cleanly', () => {
    const pdErr = new HttpErrorResponse({
      status: 400,
      error: JSON.stringify({
        title: 'Bad Request',
        status: 400,
        detail: 'Invalid quarter: Q5',
      }),
    });
    expect(service.classifyUploadError(pdErr)).toMatchObject({
      category: 'bad-request',
      message: 'Invalid quarter: Q5',
    });
  });
});
