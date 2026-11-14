export type ShopifyRangeKey = "today" | "week" | "month" | "year" | "custom";

export type ShopifyMoney = {
  amount: number;
  currencyCode: string;
  display: string;
};

export type ShopifyChange = {
  amount: number;
  percent: number | null;
};

export type ShopifyProductNode = {
  id: string;
  title: string;
  status: string;
  totalInventory: number | null;
  unitsSold?: number;
  grossSales?: number;
};

export type ShopifyOrderNode = {
  id: string;
  name: string;
  createdAt: string;
  displayFinancialStatus: string | null;
  displayFulfillmentStatus: string | null;
  totalPriceSet: {
    shopMoney: {
      amount: string;
      currencyCode: string;
    };
  };
  totalDiscountsSet?: {
    shopMoney: {
      amount: string;
      currencyCode: string;
    };
  };
  totalRefundedSet?: {
    shopMoney: {
      amount: string;
      currencyCode: string;
    };
  };
  customer?: {
    id: string;
    numberOfOrders: number;
  } | null;
  lineItems?: {
    edges: Array<{
      node: {
        title: string;
        quantity: number;
        originalTotalSet?: {
          shopMoney: { amount: string; currencyCode: string };
        };
      };
    }>;
  };
};

export type ShopifyPeriodMetrics = {
  range: ShopifyRangeKey;
  from: string;
  to: string;
  label: string;
  grossSales: ShopifyMoney;
  netSales: ShopifyMoney;
  discounts: ShopifyMoney;
  refunds: ShopifyMoney;
  revenue: ShopifyMoney;
  orderCount: number;
  aov: ShopifyMoney;
  changes: {
    grossSales: ShopifyChange;
    netSales: ShopifyChange;
    refunds: ShopifyChange;
    orderCount: ShopifyChange;
    aov: ShopifyChange;
  };
  fulfillment: {
    fulfilled: number;
    unfulfilled: number;
    processing: number;
  };
  customers: {
    newCount: number;
    returningCount: number;
    newShare: number;
    returningShare: number;
  };
  traffic: {
    sessions: number | null;
    conversionRate: number | null;
    topReferrers: Array<{ source: string; sessions: number }>;
  };
};

export type ShopifyStorePayload = {
  shop: {
    name: string;
    currencyCode: string;
    email: string;
    domain: string;
  };
  products: {
    edges: Array<{ node: ShopifyProductNode }>;
  };
  orders: {
    edges: Array<{ node: ShopifyOrderNode }>;
  };
  topProducts: Array<ShopifyProductNode>;
  lowStockCount: number;
  activeProductCount: number;
  period: ShopifyPeriodMetrics;
  connectedAt: string;
};
