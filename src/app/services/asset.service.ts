import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Asset, AssetType } from '../models/asset.model';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root',
})
export class AssetService {
  private assetsSubject = new BehaviorSubject<Asset[]>([]);
  public assets$ = this.assetsSubject.asObservable();

  private assetTypes: AssetType[] = [
    {
      id: 'crypto',
      name: 'Kripto Para',
      icon: 'currency_bitcoin',
      color: '#FF9800',
    },
    {
      id: 'stock',
      name: 'Hisse Senedi',
      icon: 'trending_up',
      color: '#2196F3',
    },
    { id: 'forex', name: 'Döviz', icon: 'attach_money', color: '#4CAF50' },
  ];

  // Sabit kurlar (gerçek uygulamada API'den gelecek)
  private staticPrices: { [key: string]: number } = {
    // Kripto
    BTC: 45000,
    ETH: 3200,
    ADA: 0.45,
    DOT: 6.2,
    AVAX: 35,

    // Döviz
    USD: 28.5,
    EUR: 31.2,
    GBP: 36.8,

    // Hisse (TL cinsinden)
    THYAO: 185.5,
    AKBNK: 45.2,
    BIMAS: 95.8,
    EREGL: 38.6,
    GARAN: 82.3,
  };

  constructor(private storageService: StorageService) {
    this.loadCustomPrices(); // Önce fiyatları yükle
    this.loadAssets(); // Sonra varlıkları yükle
  }

  private loadAssets(): void {
    const assets = this.storageService.getAssets();
    // Convert date strings back to Date objects and calculate current values
    const parsedAssets = assets.map((a: any) => {
      const asset = {
        ...a,
        purchaseDate: new Date(a.purchaseDate),
      };
      // Calculate current value after custom prices are loaded
      asset.currentValue = this.calculateCurrentValue(asset);
      return asset;
    });
    this.assetsSubject.next(parsedAssets);
  }

  private loadCustomPrices(): void {
    const customPrices = this.storageService.getItem('custom_prices') || {};
    this.staticPrices = { ...this.staticPrices, ...customPrices };
  }

  private saveCustomPrices(): void {
    // Save only the updated prices, not the default ones
    const customPrices: { [key: string]: number } = {};
    const defaultPrices: { [key: string]: number } = {
      BTC: 45000,
      ETH: 3200,
      ADA: 0.45,
      DOT: 6.2,
      AVAX: 35,
      USD: 28.5,
      EUR: 31.2,
      GBP: 36.8,
      THYAO: 185.5,
      AKBNK: 45.2,
      BIMAS: 95.8,
      EREGL: 38.6,
      GARAN: 82.3,
    };

    Object.keys(this.staticPrices).forEach((symbol) => {
      if (this.staticPrices[symbol] !== defaultPrices[symbol]) {
        customPrices[symbol] = this.staticPrices[symbol];
      }
    });

    this.storageService.setItem('custom_prices', customPrices);
  }

  private saveAssets(): void {
    this.storageService.setAssets(this.assetsSubject.value);
  }

  private calculateCurrentValue(asset: Asset): number {
    // Ensure we get the most up-to-date price
    const currentPrice = this.getCurrentPrice(asset.symbol);
    return asset.quantity * currentPrice;
  }

  // Asset CRUD operations
  addAsset(asset: Omit<Asset, 'id' | 'currentValue'>): void {
    const newAsset: Asset = {
      ...asset,
      id: this.generateId(),
      currentValue: this.calculateCurrentValue(asset as Asset),
    };

    const currentAssets = this.assetsSubject.value;
    const updatedAssets = [...currentAssets, newAsset];

    this.assetsSubject.next(updatedAssets);
    this.saveAssets();
  }

  updateAsset(id: string, updatedAsset: Partial<Asset>): void {
    const currentAssets = this.assetsSubject.value;
    const index = currentAssets.findIndex((a) => a.id === id);

    if (index !== -1) {
      const updated = { ...currentAssets[index], ...updatedAsset };
      updated.currentValue = this.calculateCurrentValue(updated);
      currentAssets[index] = updated;

      this.assetsSubject.next([...currentAssets]);
      this.saveAssets();
    }
  }

  deleteAsset(id: string): void {
    const currentAssets = this.assetsSubject.value;
    const updatedAssets = currentAssets.filter((a) => a.id !== id);

    this.assetsSubject.next(updatedAssets);
    this.saveAssets();
  }

  sellAsset(id: string, quantity: number): void {
    const asset = this.getAssetById(id);
    if (asset && asset.quantity >= quantity) {
      if (asset.quantity === quantity) {
        this.deleteAsset(id);
      } else {
        this.updateAsset(id, { quantity: asset.quantity - quantity });
      }
    }
  }

  getAssetById(id: string): Asset | undefined {
    return this.assetsSubject.value.find((a) => a.id === id);
  }

  // Filter methods
  getAssetsByType(type: 'crypto' | 'stock' | 'forex'): Asset[] {
    return this.assetsSubject.value.filter((a) => a.type === type);
  }

  // Portfolio calculations
  getTotalPortfolioValue(): number {
    return this.assetsSubject.value.reduce((total, asset) => {
      return total + (asset.currentValue || 0);
    }, 0);
  }

  getTotalInvestment(): number {
    return this.assetsSubject.value.reduce((total, asset) => {
      return total + asset.quantity * asset.purchasePrice;
    }, 0);
  }

  getTotalProfitLoss(): number {
    return this.getTotalPortfolioValue() - this.getTotalInvestment();
  }

  getTotalProfitLossPercentage(): number {
    const totalInvestment = this.getTotalInvestment();
    if (totalInvestment === 0) return 0;
    return (this.getTotalProfitLoss() / totalInvestment) * 100;
  }

  // Asset type methods
  getAssetTypes(): AssetType[] {
    return this.assetTypes;
  }

  getAssetTypeById(id: string): AssetType | undefined {
    return this.assetTypes.find((t) => t.id === id);
  }

  // Price methods
  getCurrentPrice(symbol: string): number {
    return this.staticPrices[symbol] || 0;
  }

  updatePrice(symbol: string, price: number): void {
    this.staticPrices[symbol] = price;
    this.saveCustomPrices(); // Save to localStorage
    // Recalculate current values for all assets with this symbol
    this.refreshAssetValues();
  }

  getAllPrices(): { [key: string]: number } {
    return { ...this.staticPrices };
  }

  updateAllPrices(prices: { [key: string]: number }): void {
    this.staticPrices = { ...this.staticPrices, ...prices };
    this.saveCustomPrices(); // Save to localStorage
    this.refreshAssetValues();
  }

  private refreshAssetValues(): void {
    const currentAssets = this.assetsSubject.value;
    const updatedAssets = currentAssets.map((asset) => {
      const updatedAsset = { ...asset };
      updatedAsset.currentValue = this.calculateCurrentValue(updatedAsset);
      return updatedAsset;
    });

    this.assetsSubject.next(updatedAssets);
    this.saveAssets();
  }

  // Statistics
  getAssetDistribution(): Array<{
    type: string;
    value: number;
    percentage: number;
  }> {
    const totalValue = this.getTotalPortfolioValue();
    const distribution = new Map<string, number>();

    this.assetsSubject.value.forEach((asset) => {
      const currentValue = distribution.get(asset.type) || 0;
      distribution.set(asset.type, currentValue + (asset.currentValue || 0));
    });

    return Array.from(distribution.entries()).map(([type, value]) => ({
      type,
      value,
      percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
    }));
  }

  getTopPerformers(limit: number = 5): Asset[] {
    return this.assetsSubject.value
      .map((asset) => ({
        ...asset,
        profitLoss:
          (asset.currentValue || 0) - asset.quantity * asset.purchasePrice,
        profitLossPercentage:
          (((asset.currentValue || 0) - asset.quantity * asset.purchasePrice) /
            (asset.quantity * asset.purchasePrice)) *
          100,
      }))
      .sort((a, b) => b.profitLossPercentage - a.profitLossPercentage)
      .slice(0, limit);
  }

  // Utility methods
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
