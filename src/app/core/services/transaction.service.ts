import { Injectable, inject } from '@angular/core';
import { Observable, throwError, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  HttpClient,
  HttpEvent,
  HttpErrorResponse,
  HttpParams,
} from '@angular/common/http';
import { BaseurlService } from './baseurl.service';
import { TransactionsResponse } from '../../shared/models/transactions-response.model';
import { RedriveResult } from '../../shared/models/redrive-result.model';
import {
  ALLOWED_UPLOAD_QUARTERS,
  AssetRequest,
  UploadQuarter,
} from '../../shared/models/asset-request.model';
import { PagedResponse } from '../models/paged-response.model';
import { fetchAllPages } from '../utils/pagination.util';
import {
  extractErrorMessage,
  formatRateLimitMessage,
} from '../utils/http-error.util';

@Injectable({
  providedIn: 'root',
})
export class TransactionService {
  private http = inject(HttpClient);
  private BASE_URL = inject(BaseurlService);

  private mockTempData(): TransactionsResponse[] {
    return Array.from({ length: 3 }, (_, i) => ({
      id: i + 100,
      rowId: `temp-${i}`,
      email: 'demo@wealthlens.com',
      stockName: `Mock Temp Stock ${i + 1}`,
      stockCode: `MOCKT${i + 1}`,
      assetType: 'MUTUAL_FUND',
      exchangeName: 'NSE',
      brokerName: 'Groww',
      quantity: 5 * (i + 1),
      transactionType: 'BUY',
      price: 150 * (i + 1),
      totalValue: 150 * 5 * (i + 1) * (i + 1),
      transactionDate: '2023-09-10',
    }));
  }

  private mockPortfolioData(): TransactionsResponse[] {
    return Array.from({ length: 19 }, (_, i) => ({
      id: i,
      rowId: `port-${i}`,
      email: 'demo@wealthlens.com',
      stockName:
        i % 2 === 0
          ? 'QUANT SMALL CAP FUND - DIRECT'
          : 'SBI BLUECHIP FUND - DIRECT',
      stockCode: i % 2 === 0 ? 'QUANT_SMALL' : 'SBI_BLUE',
      assetType: 'MUTUAL_FUND',
      exchangeName: i % 3 === 0 ? 'BSE' : 'NSE',
      brokerName: i % 2 === 0 ? 'Zerodha' : 'Groww',
      quantity: 5 + i * 0.1,
      transactionType: i % 4 === 0 ? 'SELL' : 'BUY',
      price: 195.76,
      totalValue: 1000 + i * 100,
      brokerCharges: 5,
      miscCharges: 2,
      transactionDate: `2023-${String((i % 12) + 1).padStart(2, '0')}-15`,
    }));
  }

  private mockApiHoldingsData(): Record<string, unknown>[] {
    return [
      {
        stockCode: 'QUANT_SMALL',
        stockName: 'QUANT SMALL CAP FUND - DIRECT',
        assetType: 'MUTUAL_FUND',
        totalQuantity: 100,
        quantity: 80,
        totalValue: 15000,
        price: 150,
        brokerCharges: 20,
        miscCharges: 10,
      },
      {
        stockCode: 'SBI_BLUE',
        stockName: 'SBI BLUECHIP FUND - DIRECT',
        assetType: 'MUTUAL_FUND',
        totalQuantity: 150,
        quantity: 120,
        totalValue: 24000,
        price: 160,
        brokerCharges: 25,
        miscCharges: 15,
      },
    ];
  }

  getUserTransactionsPage(
    page: number,
    size: number,
  ): Observable<PagedResponse<TransactionsResponse>> {
    const url = `${this.BASE_URL.getBaseUrl()}/api/v1/me/portfolio/transactions`;
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<PagedResponse<TransactionsResponse>>(url, { params });
  }

  getUserTransactions(email: string): Observable<TransactionsResponse[]> {
    if (email === 'demo@wealthlens.com') {
      return of(this.mockPortfolioData());
    }
    return fetchAllPages((page, size) =>
      this.getUserTransactionsPage(page, size),
    ).pipe(
      catchError((error) => {
        console.error('Error fetching transactions:', error);
        return throwError(() => error);
      }),
    );
  }

  /**
   * D1: Uses `POST /api/v1/me/portfolio/transaction/v2` for authoritative server-side
   * broker-charge calculation. Returns raw `text/plain`.
   */
  addTransaction(
    email: string,
    transactionData: AssetRequest,
  ): Observable<string> {
    if (email === 'demo@wealthlens.com') {
      return throwError(
        () =>
          new HttpErrorResponse({
            status: 403,
            error: {
              message:
                'Adding transactions is disabled in read-only guest session.',
            },
          }),
      );
    }
    const url = `${this.BASE_URL.getBaseUrl()}/api/v1/me/portfolio/transaction/v2`;
    return this.http.post(url, transactionData, { responseType: 'text' }).pipe(
      catchError((error) => {
        console.error('Error adding transaction:', error);
        return throwError(() => error);
      }),
    );
  }

  /**
   * D5: `quarter` is required by backend (`Q1` | `Q2` | `Q3` | `Q4`) and response is `text/plain`.
   */
  uploadTransactions(
    email: string,
    file: File,
    quarter: UploadQuarter | string = 'Q1',
  ): Observable<HttpEvent<string>> {
    if (email === 'demo@wealthlens.com') {
      return throwError(
        () =>
          new HttpErrorResponse({
            status: 403,
            error: {
              message: 'File import is disabled in read-only guest session.',
            },
          }),
      );
    }

    const normalizedQuarter = quarter?.trim().toUpperCase() as UploadQuarter;
    if (!ALLOWED_UPLOAD_QUARTERS.includes(normalizedQuarter)) {
      return throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: {
              detail: `Invalid quarter: ${quarter}. Allowed quarters: ${ALLOWED_UPLOAD_QUARTERS.join(', ')}.`,
            },
          }),
      );
    }

    const formData = new FormData();
    formData.append('file', file);

    const url = `${this.BASE_URL.getBaseUrl()}/api/v1/me/portfolio/transactions/uploads`;
    const params = new HttpParams().set('quarter', normalizedQuarter);

    return this.http.post(url, formData, {
      params,
      observe: 'events',
      reportProgress: true,
      responseType: 'text',
    });
  }

  /**
   * Interprets the plain-text response returned by `POST /api/v1/me/portfolio/transactions/uploads`.
   * Supports both backend `master` wording ("From <file>, quarter <Q>: <n> recorded...; held back
   * for a corporate action: [...]") and legacy wording ("No transaction uploaded...",
   * "Filtered out transactions: [...]").
   */
  interpretUploadResponse(body: unknown): {
    tone: 'success' | 'warn' | 'error';
    title: string;
    message: string;
    details: string[];
  } {
    const text = typeof body === 'string' ? body.trim() : '';
    const listItems = (s: string): string[] => {
      const inner = s.match(/\[(.*)\]\s*$/s)?.[1] ?? '';
      return inner
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean);
    };

    if (text.startsWith('No transaction uploaded')) {
      const details = listItems(text);
      return {
        tone: 'error',
        title: 'Nothing was uploaded',
        message: details.length
          ? `${details.length} row${details.length === 1 ? ' has' : 's have'} problems. Fix them and upload again.`
          : 'The file has problems. Fix them and upload again.',
        details,
      };
    }

    if (
      text.startsWith('Filtered out transactions') ||
      text.includes('held back for a corporate action:')
    ) {
      const held = listItems(text).length;
      return {
        tone: 'warn',
        title: 'Uploaded with rows on hold',
        message: `${held || 'Some'} transaction${held === 1 ? ' is' : 's are'} held in the Temporary tab until pending corporate actions are applied. Apply them, then redrive.`,
        details: [],
      };
    }

    if (text.startsWith('From ') && text.includes('recorded')) {
      return {
        tone: 'success',
        title: 'Transactions uploaded',
        message: text,
        details: [],
      };
    }

    return {
      tone: 'success',
      title: 'Transactions uploaded',
      message: 'All transactions were added to your portfolio.',
      details: [],
    };
  }

  /**
   * Rewrites Java exception text the upload endpoint passes through. "No enum constant
   * com...BrokerName.Zerodha" comes from Enum.valueOf on a cell; an empty suffix means a blank cell.
   */
  private friendlyServerMessage(
    message: string | undefined,
  ): string | undefined {
    if (!message) return message;
    const enumMatch = message.match(/No enum constant [\w.]*\.(\w+)\.(.*)$/);
    if (enumMatch) {
      const column = enumMatch[1]
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .toUpperCase();
      const value = enumMatch[2].trim();
      return value
        ? `A row has ${column} "${value}", which isn't allowed. Check the spelling and use capitals.`
        : `A row has an empty ${column}. Fill it in, or delete empty rows left at the end of the sheet.`;
    }
    return message;
  }

  /**
   * Classify an upload error into a user-friendly { category, title, message } triple.
   * Reads RFC 9457 `ProblemDetail.detail` first, falling back to legacy shapes and
   * client-side validation categories.
   */
  classifyUploadError(err: unknown): {
    category: string;
    title: string;
    message: string;
  } {
    const errRec =
      err && typeof err === 'object' ? (err as Record<string, unknown>) : null;
    switch (errRec?.['category']) {
      case 'no-file':
        return {
          category: 'no-file',
          title: 'No file selected',
          message: 'Please choose an .xlsx file to upload.',
        };
      case 'bad-extension':
        return {
          category: 'bad-extension',
          title: 'Wrong file type',
          message: 'We accept .xlsx files only.',
        };
      case 'too-large':
        return {
          category: 'too-large',
          title: 'File too large',
          message: 'Maximum size is 10 MB. Try splitting the file by quarter.',
        };
      case 'no-email':
        return {
          category: 'no-email',
          title: 'Please sign in',
          message: 'You need to be signed in to upload transactions.',
        };
    }

    const status: number =
      typeof errRec?.['status'] === 'number' ? errRec['status'] : 0;
    const extracted = extractErrorMessage(err, '');
    const rawServerMessage: string | undefined =
      this.friendlyServerMessage(extracted || undefined) ||
      (typeof errRec?.['message'] === 'string' &&
      !(err instanceof HttpErrorResponse)
        ? errRec['message']
        : undefined);

    if (status === 0) {
      const msg =
        typeof errRec?.['message'] === 'string' ? errRec['message'] : '';
      const lower = msg.toLowerCase();
      const looksNetwork =
        msg.includes('HttpErrorResponse') ||
        lower.includes('network') ||
        lower.includes('failed to fetch') ||
        lower.includes('cors');
      if (looksNetwork) {
        return {
          category: 'network',
          title: 'Connection problem',
          message:
            "We couldn't reach the server. Check your internet and try again.",
        };
      }
      return {
        category: 'unknown',
        title: 'Upload failed',
        message: rawServerMessage || 'Please try again.',
      };
    }

    switch (status) {
      case 401:
        return {
          category: 'unauthorized',
          title: 'Session expired',
          message: 'Please sign in again to continue.',
        };
      case 403:
        return {
          category: 'forbidden',
          title: 'Not allowed',
          message:
            rawServerMessage || "Your account doesn't have upload permission.",
        };
      case 404:
        return {
          category: 'not-found',
          title: 'Portfolio not found',
          message:
            rawServerMessage ||
            "We couldn't find a portfolio for your account. Please contact support.",
        };
      case 413:
        return {
          category: 'payload-too-large',
          title: 'Server rejected file',
          message:
            'The file is too large for our server. Please try a smaller file.',
        };
      case 415:
        return {
          category: 'unsupported-media',
          title: 'Unsupported file',
          message:
            "The server couldn't read this file. Make sure it's a valid .xlsx.",
        };
      case 429:
        return {
          category: 'rate-limited',
          title: 'Too many requests',
          message: formatRateLimitMessage(err),
        };
      case 400:
        return {
          category: 'bad-request',
          title: "Couldn't process file",
          message:
            rawServerMessage ||
            'Please check the file format and quarter, then try again.',
        };
      default:
        if (status >= 500) {
          return {
            category: 'server',
            title: 'Server error',
            message:
              'Something went wrong on our side. Please try again in a moment.',
          };
        }
        return {
          category: 'unknown',
          title: 'Upload failed',
          message: rawServerMessage || 'Please try again.',
        };
    }
  }

  /** Priority 5 (WI-6.1): Excel upload template download. */
  downloadTemplate(): Observable<Blob> {
    const url = `${this.BASE_URL.getBaseUrl()}/api/v1/me/templates/excel`;
    return this.http.get(url, { responseType: 'blob' });
  }

  searchTransactionsPage(
    queryFilters: Record<string, unknown>[],
    page: number,
    size: number,
  ): Observable<PagedResponse<TransactionsResponse>> {
    const url = `${this.BASE_URL.getBaseUrl()}/api/v1/me/portfolio/transactions/search`;
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.post<PagedResponse<TransactionsResponse>>(
      url,
      { queryFilters },
      { params },
    );
  }

  /** Fetch current transactions (paginated search with `queryFilters`). */
  getCurrentTransactions(
    email: string,
    queryFilters: Record<string, unknown>[] = [],
  ): Observable<TransactionsResponse[]> {
    if (email === 'demo@wealthlens.com') {
      return of(this.mockPortfolioData());
    }
    return fetchAllPages((page, size) =>
      this.searchTransactionsPage(queryFilters, page, size),
    );
  }

  /** Fetch temporary transactions */
  getTemporaryTransactions(email: string): Observable<TransactionsResponse[]> {
    if (email === 'demo@wealthlens.com') {
      return of(this.mockTempData());
    }
    const url = `${this.BASE_URL.getBaseUrl()}/api/v1/me/portfolio/temporary-transactions`;
    return this.http.get<TransactionsResponse[]>(url);
  }

  /** Redrive temporary transactions */
  redriveTemporaryTransactions(email: string): Observable<RedriveResult> {
    if (email === 'demo@wealthlens.com') {
      return of({
        succeeded: ['demo-tx-1'],
        failed: {},
        stillFiltered: [],
        filteredOut: [],
        message: 'Demo mode: 1 temporary transaction redriven successfully.',
      });
    }
    const url = `${this.BASE_URL.getBaseUrl()}/api/v1/me/portfolio/temporary-transactions/redrive`;
    return this.http.post<RedriveResult>(url, {});
  }

  /** Fetch holdings */
  getAllHoldings(email: string): Observable<Record<string, unknown>[]> {
    if (email === 'demo@wealthlens.com') {
      return of(this.mockApiHoldingsData());
    }
    const url = `${this.BASE_URL.getBaseUrl()}/api/v1/me/portfolio/stocks`;
    return this.http.get<Record<string, unknown>[]>(url);
  }

  /** Fetch transactions for a single stock */
  getTransactionsByStock(
    email: string,
    stockCode: string,
  ): Observable<TransactionsResponse[]> {
    if (email === 'demo@wealthlens.com') {
      const all = this.mockPortfolioData();
      return of(all.filter((t) => t.stockCode === stockCode));
    }
    const queryFilters = [
      {
        filterKey: 'stock_code',
        operation: 'EQUALS',
        value: stockCode,
        logicalOperation: 'AND',
        expressionLogicalOperation: 'AND',
        allowEmptyOrNull: false,
        caseSensitive: false,
        isDateField: false,
      },
    ];
    return fetchAllPages((page, size) =>
      this.searchTransactionsPage(queryFilters, page, size),
    );
  }

  /** Clear all portfolio records for a user (`DELETE /api/v1/me/portfolio`, `text/plain`). */
  clearAllRecords(email: string): Observable<string> {
    if (email === 'demo@wealthlens.com') {
      return throwError(
        () =>
          new HttpErrorResponse({
            status: 403,
            error: {
              message:
                'Clearing records is disabled in read-only guest session.',
            },
          }),
      );
    }
    const url = `${this.BASE_URL.getBaseUrl()}/api/v1/me/portfolio`;
    return this.http.delete(url, { responseType: 'text' });
  }
}
