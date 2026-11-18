export type PlaidAccountClass = "operating" | "tax" | "personal";

export type PlaidAccountBalance = {
  accountId: string;
  name: string;
  officialName: string;
  type: string;
  subtype: string;
  mask: string;
  current: number | null;
  available: number | null;
  isoCurrencyCode: string;
  accountClass?: PlaidAccountClass;
};

export type PlaidTransactionItem = {
  transactionId: string;
  name: string;
  merchantName: string;
  amount: number;
  date: string;
  category: string;
  pending: boolean;
};

export type PlaidPayload = {
  itemId: string;
  institutionName: string;
  connectedAt: string;
  accounts: PlaidAccountBalance[];
  recentTransactions: PlaidTransactionItem[];
  metrics: {
    cashAvailable: number;
    cashAvailableDisplay: string;
    creditBalance: number;
    creditBalanceDisplay: string;
    netLiquidity: number;
    netLiquidityDisplay: string;
    accountCount: number;
    operatingCash?: number;
    operatingCashDisplay?: string;
    taxReserve?: number;
    taxReserveDisplay?: string;
    burnRateEstimate?: number;
    burnRateDisplay?: string;
  };
};
