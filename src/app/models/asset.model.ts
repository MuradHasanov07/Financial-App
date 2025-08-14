export interface Asset {
  id: string;
  name: string;
  symbol: string;
  type: 'crypto' | 'stock' | 'forex';
  quantity: number;
  unitPrice: number;
  purchasePrice: number;
  purchaseDate: Date;
  currentValue?: number;
}

export interface AssetType {
  id: string;
  name: string;
  icon: string;
  color: string;
}
