import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { TransactionService } from './transaction.service';

// The demo account is read-only: every write is refused locally with a 403, and reads come from sample data.
// None of these may reach the backend, which HttpTestingController.verify() proves after each test.
const DEMO_EMAIL = 'demo@wealthlens.com';

describe('TransactionService (demo account)', () => {
  let service: TransactionService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
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
    // Given / When
    const error = await refusal(
      firstValueFrom(service.addTransaction(DEMO_EMAIL, {})),
    );

    // Then
    expect(error.status).toBe(403);
    expect(error.error.message).toBe(
      'Adding transactions is disabled in read-only guest session.',
    );
  });

  it('refuses a file import with 403 when the user is the demo account', async () => {
    // Given
    const file = new File(['x'], 'transactions.xlsx');

    // When
    const error = await refusal(
      firstValueFrom(service.uploadTransactions(DEMO_EMAIL, file)),
    );

    // Then
    expect(error.status).toBe(403);
    expect(error.error.message).toBe(
      'File import is disabled in read-only guest session.',
    );
  });

  it('refuses clearing records with 403 when the user is the demo account', async () => {
    // Given / When
    const error = await refusal(
      firstValueFrom(service.clearAllRecords(DEMO_EMAIL)),
    );

    // Then
    expect(error.status).toBe(403);
    expect(error.error.message).toBe(
      'Clearing records is disabled in read-only guest session.',
    );
  });

  it('returns only the asked stock from sample data when the user is the demo account', async () => {
    // Given: the sample portfolio has 19 rows, even indexes QUANT_SMALL (0, 2, …, 18: 10 rows) and odd
    // indexes SBI_BLUE (1, 3, …, 17: 9 rows).

    // When
    const quant = await firstValueFrom(
      service.getTransactionsByStock(DEMO_EMAIL, 'QUANT_SMALL'),
    );
    const sbi = await firstValueFrom(
      service.getTransactionsByStock(DEMO_EMAIL, 'SBI_BLUE'),
    );

    // Then
    expect(quant).toHaveLength(10);
    expect(quant.every((row) => row.stockCode === 'QUANT_SMALL')).toBe(true);
    expect(quant[0].stockName).toBe('QUANT SMALL CAP FUND - DIRECT');
    expect(sbi).toHaveLength(9);
    expect(sbi.every((row) => row.stockCode === 'SBI_BLUE')).toBe(true);
    expect(sbi[0].stockName).toBe('SBI BLUECHIP FUND - DIRECT');
  });
});
