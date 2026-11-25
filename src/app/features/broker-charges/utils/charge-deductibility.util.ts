import {
  ChargeCatalogueEntry,
  ChargeLine,
  UserCharge,
} from '../models/broker-charges.model';

export interface ChargeDeductibilitySummary {
  turnover: number | null;
  deductibleCharges: number | null;
  nonDeductibleCharges: number | null;
  classified: boolean;
}

export interface LedgerDeductibilitySummary {
  deductible: number | null;
  nonDeductible: number | null;
  classified: boolean;
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function buildDeductibilityMap(
  catalogue: readonly ChargeCatalogueEntry[],
): Map<string, boolean> {
  const map = new Map<string, boolean>();
  for (const entry of catalogue) {
    if (entry?.code) {
      map.set(entry.code, Boolean(entry.deductibleForCapitalGains));
    }
  }
  return map;
}

/**
 * D3: Derives `turnover` from `price × quantity` when provided, and computes
 * `deductibleCharges` / `nonDeductibleCharges` ONLY when every line code in `lines`
 * is authoritatively classified in `ChargeCatalogueEntry[]`. Never guesses.
 */
export function summarizeChargeBreakdown(
  lines: readonly ChargeLine[] | null | undefined,
  catalogue: readonly ChargeCatalogueEntry[],
  turnoverInput?: { quantity: number; price: number },
): ChargeDeductibilitySummary {
  const turnover =
    turnoverInput &&
    Number.isFinite(turnoverInput.quantity) &&
    Number.isFinite(turnoverInput.price) &&
    turnoverInput.quantity >= 0 &&
    turnoverInput.price >= 0
      ? roundCurrency(turnoverInput.quantity * turnoverInput.price)
      : null;

  if (!lines || lines.length === 0) {
    return {
      turnover,
      deductibleCharges: 0,
      nonDeductibleCharges: 0,
      classified: true,
    };
  }

  const lookup = buildDeductibilityMap(catalogue);
  if (lookup.size === 0) {
    return {
      turnover,
      deductibleCharges: null,
      nonDeductibleCharges: null,
      classified: false,
    };
  }

  let deductible = 0;
  let nonDeductible = 0;

  for (const line of lines) {
    const isDeductible = lookup.get(line.code);
    if (isDeductible === undefined) {
      return {
        turnover,
        deductibleCharges: null,
        nonDeductibleCharges: null,
        classified: false,
      };
    }
    if (isDeductible) {
      deductible += line.amount || 0;
    } else {
      nonDeductible += line.amount || 0;
    }
  }

  return {
    turnover,
    deductibleCharges: roundCurrency(deductible),
    nonDeductibleCharges: roundCurrency(nonDeductible),
    classified: true,
  };
}

/**
 * Aggregates deductible vs non-deductible charges across a user's ledger
 * strictly from `ChargeCatalogueEntry[]`. Returns `null` totals if any code is unmapped.
 */
export function summarizeLedgerDeductibility(
  charges: readonly UserCharge[],
  catalogue: readonly ChargeCatalogueEntry[],
): LedgerDeductibilitySummary {
  if (!charges || charges.length === 0) {
    return { deductible: 0, nonDeductible: 0, classified: true };
  }

  const lookup = buildDeductibilityMap(catalogue);
  if (lookup.size === 0) {
    return { deductible: null, nonDeductible: null, classified: false };
  }

  let deductible = 0;
  let nonDeductible = 0;

  for (const item of charges) {
    const entries: [string, number][] =
      item.lines && item.lines.length > 0
        ? item.lines.map((l) => [l.code, l.amount || 0])
        : Object.entries(item.amountByCode || {});

    for (const [code, amount] of entries) {
      const isDeductible = lookup.get(code);
      if (isDeductible === undefined) {
        return { deductible: null, nonDeductible: null, classified: false };
      }
      if (isDeductible) {
        deductible += amount;
      } else {
        nonDeductible += amount;
      }
    }
  }

  return {
    deductible: roundCurrency(deductible),
    nonDeductible: roundCurrency(nonDeductible),
    classified: true,
  };
}
