export interface AuditMetadata {
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export type TransactionStatus = 'TEMPORARY' | 'PROCESSED';

export interface TransactionsResponse {
  id: string | number;
  transactionId?: string;
  rowId?: string;
  email: string;
  stockCode: string;
  stockName: string;
  assetType: string;
  exchangeName: string;
  brokerName: string;
  transactionType: string;
  quantity: number;
  price: number;
  totalValue: number;
  maturityDate?: string;
  brokerCharges?: number;
  miscCharges?: number;
  transactionDate: string;
  status?: TransactionStatus;
  segment?: string;
  charges?: unknown | null;
  auditMetadata?: AuditMetadata;
}
