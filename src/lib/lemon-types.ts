export type LemonOrder = {
  id: string;
  orderNumber: number | null;
  total: number;
  currency: string;
  status: string;
  customerName: string;
  createdAt: string;
};

export type LemonProduct = {
  id: string;
  name: string;
  status: string;
  price: number;
  currency: string;
};

export type LemonStorePayload = {
  storeId: string;
  storeName: string;
  currency: string;
  connectedAt: string;
  orders: LemonOrder[];
  products: LemonProduct[];
  metrics: {
    orderCount: number;
    productCount: number;
    grossVolume: number;
    grossDisplay: string;
  };
};
