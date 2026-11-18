export type GumroadSale = {
  id: string;
  productName: string;
  email: string;
  price: number;
  currency: string;
  createdAt: string;
};

export type GumroadProduct = {
  id: string;
  name: string;
  price: number;
  currency: string;
  salesCount: number;
  published: boolean;
};

export type GumroadStorePayload = {
  userId: string;
  name: string;
  email: string;
  profileUrl: string;
  connectedAt: string;
  sales: GumroadSale[];
  products: GumroadProduct[];
  metrics: {
    saleCount: number;
    productCount: number;
    grossVolume: number;
    grossDisplay: string;
  };
};
