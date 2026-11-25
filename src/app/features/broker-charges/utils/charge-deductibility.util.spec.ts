import { describe, expect, it } from 'vitest';
import {
  summarizeChargeBreakdown,
  summarizeLedgerDeductibility,
} from './charge-deductibility.util';
import {
  ChargeCatalogueEntry,
  ChargeLine,
  UserCharge,
} from '../models/broker-charges.model';

const CATALOGUE: ChargeCatalogueEntry[] = [
  {
    code: 'BROKERAGE',
    displayName: 'Brokerage',
    category: 'BROKERAGE',
    deductibleForCapitalGains: true,
    status: 'ACTIVE',
    description: 'Brokerage fee',
  },
  {
    code: 'GST',
    displayName: 'GST',
    category: 'TAX',
    deductibleForCapitalGains: true,
    status: 'ACTIVE',
    description: 'GST on taxable charges',
  },
  {
    code: 'STT',
    displayName: 'STT',
    category: 'STATUTORY',
    deductibleForCapitalGains: false,
    status: 'ACTIVE',
    description: 'Securities Transaction Tax',
  },
];

describe('charge-deductibility.util (D3)', () => {
  it('computes turnover and exact deductible/non-deductible totals when all lines are in catalogue', () => {
    const lines: ChargeLine[] = [
      {
        code: 'BROKERAGE',
        displayName: 'Brokerage',
        category: 'BROKERAGE',
        amount: 20,
        taxable: true,
      },
      {
        code: 'GST',
        displayName: 'GST',
        category: 'TAX',
        amount: 3.6,
        taxable: false,
      },
      {
        code: 'STT',
        displayName: 'STT',
        category: 'STATUTORY',
        amount: 150,
        taxable: false,
      },
    ];

    const summary = summarizeChargeBreakdown(lines, CATALOGUE, {
      quantity: 100,
      price: 1500,
    });

    expect(summary).toEqual({
      turnover: 150000,
      deductibleCharges: 23.6,
      nonDeductibleCharges: 150,
      classified: true,
    });
  });

  it('returns null deductibility (never guesses) when any line code is missing from catalogue', () => {
    const lines: ChargeLine[] = [
      {
        code: 'BROKERAGE',
        displayName: 'Brokerage',
        category: 'BROKERAGE',
        amount: 20,
        taxable: true,
      },
      {
        code: 'UNKNOWN_LEVY',
        displayName: 'Unknown',
        category: 'OTHER',
        amount: 5,
        taxable: false,
      },
    ];

    const summary = summarizeChargeBreakdown(lines, CATALOGUE, {
      quantity: 10,
      price: 100,
    });

    expect(summary).toEqual({
      turnover: 1000,
      deductibleCharges: null,
      nonDeductibleCharges: null,
      classified: false,
    });
  });

  it('returns null deductibility when catalogue is empty', () => {
    const lines: ChargeLine[] = [
      {
        code: 'STT',
        displayName: 'STT',
        category: 'STATUTORY',
        amount: 150,
        taxable: false,
      },
    ];

    expect(summarizeChargeBreakdown(lines, [])).toEqual({
      turnover: null,
      deductibleCharges: null,
      nonDeductibleCharges: null,
      classified: false,
    });
  });

  it('aggregates ledger deductibility strictly from catalogue', () => {
    const ledger: UserCharge[] = [
      {
        id: '1',
        email: 'u@test.com',
        transactionId: 't1',
        brokerName: 'ZERODHA',
        assetType: 'EQUITY',
        event: 'BUY',
        transactionDate: '2026-03-01',
        totalCharges: 170,
        scheduleCode: 'ZER-EQ',
        resolution: 'RESOLVED',
        amountByCode: { BROKERAGE: 20, STT: 150 },
        lines: [],
      },
    ];

    expect(summarizeLedgerDeductibility(ledger, CATALOGUE)).toEqual({
      deductible: 20,
      nonDeductible: 150,
      classified: true,
    });
    expect(summarizeLedgerDeductibility(ledger, [])).toEqual({
      deductible: null,
      nonDeductible: null,
      classified: false,
    });
  });
});
