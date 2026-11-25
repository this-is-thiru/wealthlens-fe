import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { BaseurlService } from '@core/services/baseurl.service';
import { AuthService } from '@core/services/auth.service';
import { PagedResponse } from '@core/models/paged-response.model';
import { fetchAllPages } from '@core/utils/pagination.util';
import {
  ChargeSimulationRequest,
  ChargeBreakdownResponse,
  ChargeCatalogueEntry,
  UserCharge,
  ChargeReconciliationResponse,
  ChargeAccount,
  ChargeAccountRequest,
  ChargeSchedule,
  ChargeScheduleRequest,
  ChargeScheduleDrift,
  ChargeSeedReport,
  AmcChargeFrequency,
} from '../models/broker-charges.model';

@Injectable({
  providedIn: 'root',
})
export class BrokerChargesService {
  private http = inject(HttpClient);
  private baseUrlService = inject(BaseurlService);
  private authService = inject(AuthService);

  private get apiUrl(): string {
    return this.baseUrlService.getBaseUrl();
  }

  private isDemoSession(): boolean {
    return this.authService.isDemo();
  }

  // --- 1. Simulation ---
  simulateCharges(
    request: ChargeSimulationRequest,
  ): Observable<ChargeBreakdownResponse> {
    if (this.isDemoSession()) {
      return of(this.getMockSimulationResponse(request));
    }
    return this.http.post<ChargeBreakdownResponse>(
      `${this.apiUrl}/api/v1/me/charges/simulate`,
      request,
    );
  }

  // --- 2. Catalogue ---
  getChargeCatalogue(): Observable<ChargeCatalogueEntry[]> {
    if (this.isDemoSession()) {
      return of(this.getMockCatalogue());
    }
    return this.http.get<ChargeCatalogueEntry[]>(
      `${this.apiUrl}/api/v1/me/charges/charge-catalogue`,
    );
  }

  // --- 3. User Charges History ---
  getUserChargeHistoryPage(
    page: number,
    size: number,
    from?: string,
    to?: string,
    assetType?: string,
  ): Observable<PagedResponse<UserCharge>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    if (assetType) params = params.set('assetType', assetType);

    return this.http.get<PagedResponse<UserCharge>>(
      `${this.apiUrl}/api/v1/me/charges/user-charges`,
      { params },
    );
  }

  getUserChargeHistory(
    email: string,
    from?: string,
    to?: string,
    assetType?: string,
  ): Observable<UserCharge[]> {
    if (this.isDemoSession()) {
      return of(this.getMockUserCharges(email));
    }
    return fetchAllPages((page, size) =>
      this.getUserChargeHistoryPage(page, size, from, to, assetType),
    );
  }

  getContractNote(
    email: string,
    transactionId: string,
  ): Observable<ChargeBreakdownResponse> {
    if (this.isDemoSession() || email === 'demo@wealthlens.com') {
      return of(this.getMockContractNote());
    }
    return this.http.get<ChargeBreakdownResponse>(
      `${this.apiUrl}/api/v1/me/charges/user-charges/transaction/${encodeURIComponent(transactionId)}`,
    );
  }

  getUserChargeGaps(email: string): Observable<UserCharge[]> {
    if (this.isDemoSession()) {
      return of(this.getMockGaps(email));
    }
    return this.http.get<UserCharge[]>(
      `${this.apiUrl}/api/v1/me/charges/user-charges/gaps`,
    );
  }

  getUserChargeReconciliation(
    email: string,
  ): Observable<ChargeReconciliationResponse> {
    if (this.isDemoSession() || email === 'demo@wealthlens.com') {
      return of(this.getMockReconciliation());
    }
    return this.http.get<ChargeReconciliationResponse>(
      `${this.apiUrl}/api/v1/me/charges/user-charges/reconciliation`,
    );
  }

  // --- 4. Demat Accounts ---
  getUserDematAccounts(email: string): Observable<ChargeAccount[]> {
    if (this.isDemoSession()) {
      return of(this.getMockDematAccounts(email));
    }
    return this.http.get<ChargeAccount[]>(
      `${this.apiUrl}/api/v1/me/charges/accounts`,
    );
  }

  registerDematAccount(
    email: string,
    account: Partial<ChargeAccount>,
  ): Observable<ChargeAccount> {
    const payload: ChargeAccountRequest = {
      dematAccountId: account.dematAccountId || '',
      brokerName: account.brokerName || 'ZERODHA',
      accountHolder: account.accountHolder || 'Primary Account',
      openedOn: account.openedOn || new Date().toISOString().split('T')[0],
      amcFrequency: account.amcFrequency || 'QUARTERLY',
      ...(account.planCode ? { planCode: account.planCode } : {}),
    };

    if (this.isDemoSession()) {
      return of({
        id: 'acc-' + Math.random().toString(36).substring(2, 7),
        email,
        ...payload,
        lastBilledThrough: undefined,
        billingEvents: [],
      });
    }

    return this.http.post<ChargeAccount>(
      `${this.apiUrl}/api/v1/me/charges/accounts`,
      payload,
    );
  }

  // --- 5. Admin: Rate Cards & Schedules ---
  getChargeSchedulesByBroker(broker: string): Observable<ChargeSchedule[]> {
    if (this.isDemoSession()) {
      return of(this.getMockSchedules(broker));
    }
    const params = new HttpParams().set('broker', broker);
    return this.http.get<ChargeSchedule[]>(
      `${this.apiUrl}/api/v1/admin/charges/schedules`,
      { params },
    );
  }

  getChargeScheduleByCode(code: string): Observable<ChargeSchedule> {
    if (this.isDemoSession()) {
      return of(this.getMockSchedules('ZERODHA')[0]);
    }
    return this.http.get<ChargeSchedule>(
      `${this.apiUrl}/api/v1/admin/charges/schedules/${encodeURIComponent(code)}`,
    );
  }

  getUnverifiedSchedules(): Observable<ChargeSchedule[]> {
    if (this.isDemoSession()) {
      return of(this.getMockUnverifiedSchedules());
    }
    return this.http.get<ChargeSchedule[]>(
      `${this.apiUrl}/api/v1/admin/charges/schedules/unverified`,
    );
  }

  closeSchedule(code: string, endDate: string): Observable<ChargeSchedule> {
    if (this.isDemoSession()) {
      const s = this.getMockSchedules('ZERODHA')[0];
      s.endDate = endDate;
      return of(s);
    }
    const params = new HttpParams().set('endDate', endDate);
    return this.http.patch<ChargeSchedule>(
      `${this.apiUrl}/api/v1/admin/charges/schedules/${encodeURIComponent(code)}/close`,
      {},
      { params },
    );
  }

  seedCharges(): Observable<ChargeSeedReport> {
    if (this.isDemoSession()) {
      return of({
        catalogueEntriesWritten: 12,
        schedulesWritten: 6,
        instrumentProfilesWritten: 2,
        message:
          'Standard charges catalogue, rate cards, and scheme profiles successfully seeded with author audit trail.',
      });
    }
    return this.http.post<ChargeSeedReport>(
      `${this.apiUrl}/api/v1/admin/charges/seed`,
      {},
    );
  }

  getScheduleDrift(): Observable<ChargeScheduleDrift[]> {
    if (this.isDemoSession()) {
      return of(this.getMockDrift());
    }
    return this.http.get<ChargeScheduleDrift[]>(
      `${this.apiUrl}/api/v1/admin/charges/schedules/drift`,
    );
  }

  publishSchedule(schedule: ChargeSchedule): Observable<ChargeSchedule> {
    const payload: ChargeScheduleRequest = {
      scheduleCode: schedule.scheduleCode,
      brokerName: schedule.brokerName,
      startDate: schedule.startDate,
      rules: schedule.rules,
      ...(schedule.assetType ? { assetType: schedule.assetType } : {}),
      ...(schedule.segment ? { segment: schedule.segment } : {}),
      ...(schedule.exchange ? { exchange: schedule.exchange } : {}),
      ...(schedule.planCode ? { planCode: schedule.planCode } : {}),
      ...(schedule.endDate ? { endDate: schedule.endDate } : {}),
      ...(schedule.verifiedOn ? { verifiedOn: schedule.verifiedOn } : {}),
      ...(schedule.sourceUrl ? { sourceUrl: schedule.sourceUrl } : {}),
    };

    if (this.isDemoSession()) {
      return of(schedule);
    }

    return this.http.post<ChargeSchedule>(
      `${this.apiUrl}/api/v1/admin/charges/schedules`,
      payload,
    );
  }

  // --- 6. Admin: Demat AMC Billing ---
  getAmcDue(
    frequency: AmcChargeFrequency | string,
    billedThrough: string,
  ): Observable<ChargeAccount[]> {
    if (this.isDemoSession()) {
      return of(this.getMockAmcDueAccounts(frequency, billedThrough));
    }
    const params = new HttpParams()
      .set('frequency', frequency)
      .set('billedThrough', billedThrough);

    return this.http.get<ChargeAccount[]>(
      `${this.apiUrl}/api/v1/admin/charges/accounts/due`,
      { params },
    );
  }

  imposeAmc(
    frequency: AmcChargeFrequency | string,
    billedThrough: string,
  ): Observable<ChargeAccount[]> {
    if (this.isDemoSession()) {
      return of(this.getMockAmcDueAccounts(frequency, billedThrough));
    }
    const params = new HttpParams()
      .set('frequency', frequency)
      .set('billedThrough', billedThrough);

    return this.http.post<ChargeAccount[]>(
      `${this.apiUrl}/api/v1/admin/charges/amc/impose`,
      {},
      { params },
    );
  }

  // --- Mock Data Generators (for offline / demo reliability) ---
  private getMockSimulationResponse(
    req: ChargeSimulationRequest,
  ): ChargeBreakdownResponse {
    const turnover = (req.quantity || 100) * (req.price || 1500);
    const isBuy = req.event === 'BUY';
    const isDelivery = req.segment !== 'INTRADAY';

    const brokerage =
      isDelivery && req.brokerName === 'ZERODHA'
        ? 0
        : Math.min(20, turnover * 0.0003);
    const stt = isBuy
      ? isDelivery
        ? turnover * 0.001
        : 0
      : turnover * (isDelivery ? 0.001 : 0.00025);
    const exchTxn = turnover * 0.0000345;
    const sebi = turnover * 0.000001;
    const ipft = turnover * 0.0000005;
    const stampDuty = isBuy ? turnover * 0.00015 : 0;
    const dp = !isBuy && isDelivery ? 13.5 : 0;
    const taxableBase = brokerage + exchTxn + sebi + ipft + dp;
    const gst = taxableBase * 0.18;

    const total =
      brokerage + stt + exchTxn + sebi + ipft + stampDuty + dp + gst;

    const lines = [
      {
        code: 'BROKERAGE',
        displayName: 'Brokerage',
        category: 'BROKERAGE',
        amount: +brokerage.toFixed(2),
        taxable: true,
        notes: 'Discount broker rate',
      },
      {
        code: 'STT',
        displayName: 'Securities Transaction Tax',
        category: 'STATUTORY',
        amount: +stt.toFixed(2),
        taxable: false,
        notes: 'Finance Act levy',
      },
      {
        code: 'EXCHANGE_TXN',
        displayName: 'Exchange Txn Charges',
        category: 'EXCHANGE',
        amount: +exchTxn.toFixed(2),
        taxable: true,
        notes: 'NSE turnover charge',
      },
      {
        code: 'SEBI_FEE',
        displayName: 'SEBI Turnover Fee',
        category: 'REGULATORY',
        amount: +sebi.toFixed(2),
        taxable: true,
        notes: 'Regulatory charge',
      },
      {
        code: 'IPFT',
        displayName: 'Investor Protection Fund',
        category: 'EXCHANGE',
        amount: +ipft.toFixed(2),
        taxable: true,
        notes: 'Investor protection levy',
      },
      ...(stampDuty > 0
        ? [
            {
              code: 'STAMP_DUTY',
              displayName: 'Stamp Duty',
              category: 'STATUTORY',
              amount: +stampDuty.toFixed(2),
              taxable: false,
              notes: 'Indian Stamp Act',
            },
          ]
        : []),
      ...(dp > 0
        ? [
            {
              code: 'DP',
              displayName: 'Depository Charges (DP)',
              category: 'DEPOSITORY',
              amount: +dp.toFixed(2),
              taxable: true,
              notes: 'Per scrip sell charge',
            },
          ]
        : []),
      {
        code: 'GST',
        displayName: 'Goods and Services Tax (18%)',
        category: 'TAX',
        amount: +gst.toFixed(2),
        taxable: false,
        notes: '18% on taxable services',
      },
    ];

    return {
      scheduleCode: `${req.brokerName}-${req.assetType}-${req.segment || 'DELIVERY'}-2025-04-01`,
      resolution: 'RESOLVED',
      totalCharges: +total.toFixed(2),
      lines,
    };
  }

  private catalogueEntry(
    code: string,
    displayName: string,
    category: string,
    deductibleForCapitalGains: boolean,
    description: string,
    statutoryReference = '',
  ): ChargeCatalogueEntry {
    return {
      code,
      displayName,
      category,
      deductibleForCapitalGains,
      status: 'ACTIVE',
      description,
      statutoryReference,
    };
  }

  private getMockCatalogue(): ChargeCatalogueEntry[] {
    return [
      this.catalogueEntry(
        'BROKERAGE',
        'Brokerage',
        'BROKERAGE',
        true,
        'Broker fee for executing the order.',
      ),
      this.catalogueEntry(
        'STT',
        'Securities Transaction Tax',
        'STATUTORY',
        false,
        'Levied on trade value. Strictly non-deductible for Capital Gains.',
        'Finance (No. 2) Act, 2004',
      ),
      this.catalogueEntry(
        'EXCHANGE_TXN',
        'Exchange Transaction Charges',
        'EXCHANGE',
        true,
        'Charged by NSE/BSE on trade turnover.',
      ),
      this.catalogueEntry(
        'SEBI_FEE',
        'SEBI Turnover Fees',
        'REGULATORY',
        true,
        'Regulator fee on exchange turnover.',
        'SEBI Reg. 2006',
      ),
      this.catalogueEntry(
        'IPFT',
        'Investor Protection Fund',
        'EXCHANGE',
        true,
        'Exchange levy funding investor protection.',
      ),
      this.catalogueEntry(
        'STAMP_DUTY',
        'Stamp Duty',
        'STATUTORY',
        true,
        'Levied on buy trades only.',
        'Indian Stamp Act, 1899',
      ),
      this.catalogueEntry(
        'DP',
        'Depository Participant Charges',
        'DEPOSITORY',
        true,
        'Levied once per scrip per day on delivery sell.',
      ),
      this.catalogueEntry(
        'GST',
        'Goods and Services Tax',
        'TAX',
        true,
        '18% on taxable services only (excludes STT and Stamp Duty).',
        'CGST Act, 2017',
      ),
      this.catalogueEntry(
        'AMC',
        'Annual Maintenance Charge',
        'SUBSCRIPTION',
        false,
        'Billed per Demat account periodically.',
      ),
      this.catalogueEntry(
        'EXIT_LOAD',
        'Exit Load',
        'FUND',
        true,
        'Mutual fund holding period fee.',
        'SEBI MF Reg.',
      ),
    ];
  }

  private getMockUserCharges(email: string): UserCharge[] {
    return [
      {
        id: 'uc-1',
        email,
        transactionId: 'TXN-REL-001',
        stockCode: 'RELIANCE',
        accountHolder: 'Self',
        brokerName: 'ZERODHA',
        assetType: 'EQUITY',
        event: 'BUY',
        transactionDate: '2026-03-24',
        totalCharges: 182.45,
        scheduleCode: 'ZERODHA-EQUITY-DELIVERY-2025-04-01',
        resolution: 'RESOLVED',
        amountByCode: {
          BROKERAGE: 0,
          STT: 150.0,
          EXCHANGE_TXN: 5.18,
          SEBI_FEE: 0.15,
          STAMP_DUTY: 22.5,
          GST: 4.62,
        },
        lines: [
          {
            code: 'STT',
            displayName: 'Securities Transaction Tax',
            category: 'STATUTORY',
            amount: 150.0,
            taxable: false,
          },
          {
            code: 'STAMP_DUTY',
            displayName: 'Stamp Duty',
            category: 'STATUTORY',
            amount: 22.5,
            taxable: false,
          },
          {
            code: 'EXCHANGE_TXN',
            displayName: 'Exchange Txn',
            category: 'EXCHANGE',
            amount: 5.18,
            taxable: true,
          },
          {
            code: 'GST',
            displayName: 'GST (18%)',
            category: 'TAX',
            amount: 4.62,
            taxable: false,
          },
        ],
      },
      {
        id: 'uc-2',
        email,
        transactionId: 'TXN-TCS-002',
        stockCode: 'TCS',
        accountHolder: 'Self',
        brokerName: 'ZERODHA',
        assetType: 'EQUITY',
        event: 'SELL',
        transactionDate: '2026-03-20',
        totalCharges: 145.8,
        scheduleCode: 'ZERODHA-EQUITY-DELIVERY-2025-04-01',
        resolution: 'RESOLVED',
        amountByCode: {
          BROKERAGE: 0,
          STT: 120.0,
          DP: 13.5,
          EXCHANGE_TXN: 4.14,
          GST: 3.16,
        },
        lines: [
          {
            code: 'STT',
            displayName: 'STT',
            category: 'STATUTORY',
            amount: 120.0,
            taxable: false,
          },
          {
            code: 'DP',
            displayName: 'DP Charge',
            category: 'DEPOSITORY',
            amount: 13.5,
            taxable: true,
          },
          {
            code: 'GST',
            displayName: 'GST',
            category: 'TAX',
            amount: 3.16,
            taxable: false,
          },
        ],
      },
      {
        id: 'uc-3',
        email,
        transactionId: 'TXN-HDFC-003',
        stockCode: 'HDFCBANK',
        accountHolder: 'Self',
        brokerName: 'UPSTOX',
        assetType: 'EQUITY',
        event: 'BUY',
        transactionDate: '2026-02-15',
        totalCharges: 68.2,
        scheduleCode: 'UPSTOX-EQUITY-DELIVERY-2025-04-01',
        resolution: 'RESOLVED',
        amountByCode: {
          BROKERAGE: 20.0,
          STT: 35.0,
          STAMP_DUTY: 5.25,
          GST: 4.55,
        },
        lines: [
          {
            code: 'BROKERAGE',
            displayName: 'Brokerage',
            category: 'BROKERAGE',
            amount: 20.0,
            taxable: true,
          },
          {
            code: 'STT',
            displayName: 'STT',
            category: 'STATUTORY',
            amount: 35.0,
            taxable: false,
          },
          {
            code: 'GST',
            displayName: 'GST',
            category: 'TAX',
            amount: 4.55,
            taxable: false,
          },
        ],
      },
      {
        id: 'uc-4',
        email,
        transactionId: 'AMC-12081600-2026-03-31',
        stockCode: '',
        accountHolder: 'Self',
        brokerName: 'ZERODHA',
        assetType: 'EQUITY',
        event: 'AMC_CYCLE',
        transactionDate: '2026-03-31',
        totalCharges: 88.5,
        scheduleCode: 'ZERODHA-MAINTENANCE-2025-04-01',
        resolution: 'RESOLVED',
        amountByCode: { AMC: 75.0, GST: 13.5 },
        lines: [
          {
            code: 'AMC',
            displayName: 'Quarterly Maintenance Charge',
            category: 'SUBSCRIPTION',
            amount: 75.0,
            taxable: true,
          },
          {
            code: 'GST',
            displayName: 'GST (18%)',
            category: 'TAX',
            amount: 13.5,
            taxable: false,
          },
        ],
      },
    ];
  }

  private getMockContractNote(): ChargeBreakdownResponse {
    return {
      scheduleCode: 'ZERODHA-EQUITY-DELIVERY-2025-04-01',
      resolution: 'RESOLVED',
      totalCharges: 182.45,
      lines: [
        {
          code: 'BROKERAGE',
          displayName: 'Brokerage',
          category: 'BROKERAGE',
          amount: 0.0,
          taxable: true,
          notes: 'Free delivery trade',
        },
        {
          code: 'STT',
          displayName: 'Securities Transaction Tax',
          category: 'STATUTORY',
          amount: 150.0,
          taxable: false,
          notes: '0.1% on equity buy',
        },
        {
          code: 'EXCHANGE_TXN',
          displayName: 'Exchange Txn Charge',
          category: 'EXCHANGE',
          amount: 5.18,
          taxable: true,
          notes: 'NSE 0.00345%',
        },
        {
          code: 'SEBI_FEE',
          displayName: 'SEBI Turnover Fee',
          category: 'REGULATORY',
          amount: 0.15,
          taxable: true,
          notes: '₹10 per crore',
        },
        {
          code: 'STAMP_DUTY',
          displayName: 'Stamp Duty',
          category: 'STATUTORY',
          amount: 22.5,
          taxable: false,
          notes: '0.015% on buy',
        },
        {
          code: 'GST',
          displayName: 'GST (18%)',
          category: 'TAX',
          amount: 4.62,
          taxable: false,
          notes: '18% on taxable services',
        },
      ],
    };
  }

  private getMockGaps(email: string): UserCharge[] {
    return [
      {
        id: 'gap-1',
        email,
        transactionId: 'TXN-OLD-2022',
        stockCode: 'INFY',
        brokerName: 'ZERODHA',
        assetType: 'EQUITY',
        event: 'BUY',
        transactionDate: '2022-01-10',
        totalCharges: 0,
        scheduleCode: '',
        resolution: 'NO_SCHEDULE',
        amountByCode: {},
        lines: [],
      },
    ];
  }

  private getMockReconciliation(): ChargeReconciliationResponse {
    return {
      totalComputed: 1485.4,
      totalEntered: 1485.4,
      netDelta: 0.0,
      comparableCount: 28,
      unresolvedCount: 1,
      transactionsWithoutComputation: 0,
      rows: [
        {
          transactionId: 'TXN-REL-001',
          stockCode: 'RELIANCE',
          transactionDate: '2026-03-24',
          brokerName: 'ZERODHA',
          assetType: 'EQUITY',
          event: 'BUY',
          resolution: 'RESOLVED',
          scheduleCode: 'ZERODHA-EQUITY-DELIVERY-2025-04-01',
          computedTotal: 182.45,
          enteredTotal: 182.45,
          delta: 0.0,
          comparable: true,
        },
        {
          transactionId: 'TXN-TCS-002',
          stockCode: 'TCS',
          transactionDate: '2026-03-20',
          brokerName: 'ZERODHA',
          assetType: 'EQUITY',
          event: 'SELL',
          resolution: 'RESOLVED',
          scheduleCode: 'ZERODHA-EQUITY-DELIVERY-2025-04-01',
          computedTotal: 145.8,
          enteredTotal: 145.8,
          delta: 0.0,
          comparable: true,
        },
        {
          transactionId: 'TXN-HDFC-003',
          stockCode: 'HDFCBANK',
          transactionDate: '2026-02-15',
          brokerName: 'UPSTOX',
          assetType: 'EQUITY',
          event: 'BUY',
          resolution: 'RESOLVED',
          scheduleCode: 'UPSTOX-EQUITY-DELIVERY-2025-04-01',
          computedTotal: 68.2,
          enteredTotal: 68.0,
          delta: 0.2,
          comparable: true,
          note: 'Minor paise rounding difference in contract note',
        },
      ],
    };
  }

  private getMockDematAccounts(email: string): ChargeAccount[] {
    return [
      {
        id: 'acc-1',
        email,
        dematAccountId: '1208160012345678',
        brokerName: 'ZERODHA',
        accountHolder: 'Thiru (Primary)',
        openedOn: '2023-01-15',
        amcFrequency: 'QUARTERLY',
        planCode: 'STANDARD',
        lastBilledThrough: '2026-03-31',
        billingEvents: [
          {
            transactionId: 'AMC-12081600-2026-03-31',
            periodFrom: '2026-01-01',
            periodTo: '2026-03-31',
            billedOn: '2026-03-31',
            amount: 88.5,
          },
          {
            transactionId: 'AMC-12081600-2025-12-31',
            periodFrom: '2025-10-01',
            periodTo: '2025-12-31',
            billedOn: '2025-12-31',
            amount: 88.5,
          },
        ],
      },
      {
        id: 'acc-2',
        email,
        dematAccountId: '1208160087654321',
        brokerName: 'UPSTOX',
        accountHolder: 'Priya (Spouse)',
        openedOn: '2024-06-10',
        amcFrequency: 'ANNUALLY',
        planCode: 'LIFETIME_FREE',
        lastBilledThrough: '2025-06-10',
        billingEvents: [],
      },
    ];
  }

  private getMockSchedules(broker: string): ChargeSchedule[] {
    return [
      {
        id: 'sch-1',
        scheduleCode: `${broker}-EQUITY-DELIVERY-2025-04-01`,
        brokerName: broker,
        assetType: 'EQUITY',
        segment: 'DELIVERY',
        exchange: 'NSE',
        startDate: '2025-04-01',
        verifiedOn: '2026-02-15',
        sourceUrl: 'https://broker.com/charges',
        rules: [
          {
            code: 'BROKERAGE',
            displayName: 'Brokerage',
            category: 'BROKERAGE',
            basis: 'FLAT',
            events: ['BUY', 'SELL'],
            flatAmount: broker === 'ZERODHA' ? 0 : 20,
            taxable: true,
            active: true,
            order: 1,
          },
          {
            code: 'STT',
            displayName: 'Securities Transaction Tax',
            category: 'STATUTORY',
            basis: 'TURNOVER',
            events: ['BUY', 'SELL'],
            rate: 0.1,
            taxable: false,
            active: true,
            order: 2,
          },
          {
            code: 'EXCHANGE_TXN',
            displayName: 'Exchange Txn Charges',
            category: 'EXCHANGE',
            basis: 'TURNOVER',
            events: ['BUY', 'SELL'],
            rate: 0.00345,
            taxable: true,
            active: true,
            order: 3,
          },
          {
            code: 'SEBI_FEE',
            displayName: 'SEBI Turnover Fees',
            category: 'REGULATORY',
            basis: 'TURNOVER',
            events: ['BUY', 'SELL'],
            rate: 0.0001,
            taxable: true,
            active: true,
            order: 4,
          },
          {
            code: 'STAMP_DUTY',
            displayName: 'Stamp Duty',
            category: 'STATUTORY',
            basis: 'TURNOVER',
            events: ['BUY'],
            rate: 0.015,
            taxable: false,
            active: true,
            order: 5,
          },
          {
            code: 'DP',
            displayName: 'DP Charges',
            category: 'DEPOSITORY',
            basis: 'SCOPED_FLAT',
            events: ['SELL'],
            flatAmount: 13.5,
            taxable: true,
            active: true,
            order: 6,
          },
          {
            code: 'GST',
            displayName: 'Goods and Services Tax',
            category: 'TAX',
            basis: 'DERIVED',
            events: ['BUY', 'SELL'],
            rate: 18.0,
            taxable: false,
            active: true,
            order: 7,
          },
        ],
      },
      {
        id: 'sch-2',
        scheduleCode: `${broker}-EQUITY-INTRADAY-2025-04-01`,
        brokerName: broker,
        assetType: 'EQUITY',
        segment: 'INTRADAY',
        exchange: 'NSE',
        startDate: '2025-04-01',
        verifiedOn: '2026-01-20',
        sourceUrl: 'https://broker.com/charges',
        rules: [
          {
            code: 'BROKERAGE',
            displayName: 'Brokerage',
            category: 'BROKERAGE',
            basis: 'TURNOVER',
            events: ['BUY', 'SELL'],
            rate: 0.03,
            maxAmount: 20,
            taxable: true,
            active: true,
            order: 1,
          },
          {
            code: 'STT',
            displayName: 'STT (Sell Side)',
            category: 'STATUTORY',
            basis: 'TURNOVER',
            events: ['SELL'],
            rate: 0.025,
            taxable: false,
            active: true,
            order: 2,
          },
        ],
      },
    ];
  }

  private getMockUnverifiedSchedules(): ChargeSchedule[] {
    return [
      {
        id: 'sch-unv-1',
        scheduleCode: 'FYERS-EQUITY-DELIVERY-2026-03-01',
        brokerName: 'FYERS',
        assetType: 'EQUITY',
        segment: 'DELIVERY',
        startDate: '2026-03-01',
        verifiedOn: undefined,
        rules: [],
      },
    ];
  }

  private getMockDrift(): ChargeScheduleDrift[] {
    return [
      {
        scheduleCode: 'ZERODHA-EQUITY-DELIVERY-2025-04-01',
        field: 'rules[DP].flatAmount',
        fileValue: '₹13.50',
        databaseValue: '₹13.50 (Synced)',
      },
    ];
  }

  private getMockAmcDueAccounts(
    frequency: string,
    billedThrough: string,
  ): ChargeAccount[] {
    return [
      {
        id: 'acc-1',
        email: 'demo@wealthlens.com',
        dematAccountId: '1208160012345678',
        brokerName: 'ZERODHA',
        accountHolder: 'Thiru (Primary)',
        openedOn: '2023-01-15',
        amcFrequency: frequency === 'ANNUALLY' ? 'ANNUALLY' : 'QUARTERLY',
        planCode: 'STANDARD',
        lastBilledThrough: billedThrough || '2025-12-31',
      },
    ];
  }
}
