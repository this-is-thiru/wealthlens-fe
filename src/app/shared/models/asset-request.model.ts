export type UploadQuarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';

export const ALLOWED_UPLOAD_QUARTERS: readonly UploadQuarter[] = [
  'Q1',
  'Q2',
  'Q3',
  'Q4',
];

export interface OrderTimeQuantity {
  orderExecutionTime?: string;
  quantity: number;
}

/**
 * Strict request payload matching backend `AssetRequest.java` (`fail-on-unknown-properties: true`).
 */
export interface AssetRequest {
  tempTransactionId?: string;
  idempotencyKey?: string;
  email?: string;
  stockCode: string;
  stockName?: string;
  exchangeName?: string;
  brokerName: string;
  assetType: string;
  price: number;
  quantity: number;
  transactionType: string;
  accountType?: string;
  accountHolder?: string;
  orderId?: string;
  segment?: 'DELIVERY' | 'INTRADAY' | 'F_AND_O';
  brokerCharges?: number;
  miscCharges?: number;
  comment?: string;
  maturityDate?: string;
  transactionDate: string;
  orderExecutionTimestamp?: number;
  orderTimeQuantities?: OrderTimeQuantity[];
  timezoneId?: string;
}
