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
  };
};
