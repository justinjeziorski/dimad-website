export type ShopifyStorePayload = {
  shop: {
    name: string;
    currencyCode: string;
    email: string;
    domain: string;
  };
  products: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        status: string;
        totalInventory: number | null;
      };
    }>;
  };
  orders: {
    edges: Array<{
      node: {
        id: string;
        name: string;
        displayFinancialStatus: string | null;
        totalPriceSet: {
          shopMoney: {
            amount: string;
            currencyCode: string;
          };
        };
      };
    }>;
  };
  connectedAt: string;
};
