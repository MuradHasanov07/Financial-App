import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  constructor() {}

  // Generic localStorage methods
  setItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }

  getItem<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return null;
    }
  }

  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing from localStorage:', error);
    }
  }

  clear(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }

  // App-specific storage keys
  private readonly STORAGE_KEYS = {
    TRANSACTIONS: 'finance_transactions',
    ASSETS: 'finance_assets',
    CATEGORIES: 'finance_categories',
    BUDGET_LIMITS: 'finance_budget_limits',
    SETTINGS: 'finance_settings',
  };

  // Transactions
  getTransactions(): any[] {
    return this.getItem(this.STORAGE_KEYS.TRANSACTIONS) || [];
  }

  setTransactions(transactions: any[]): void {
    this.setItem(this.STORAGE_KEYS.TRANSACTIONS, transactions);
  }

  // Assets
  getAssets(): any[] {
    return this.getItem(this.STORAGE_KEYS.ASSETS) || [];
  }

  setAssets(assets: any[]): void {
    this.setItem(this.STORAGE_KEYS.ASSETS, assets);
  }

  // Categories
  getCategories(): any[] {
    return (
      this.getItem(this.STORAGE_KEYS.CATEGORIES) || this.getDefaultCategories()
    );
  }

  setCategories(categories: any[]): void {
    this.setItem(this.STORAGE_KEYS.CATEGORIES, categories);
  }

  // Budget Limits
  getBudgetLimits(): any[] {
    return this.getItem(this.STORAGE_KEYS.BUDGET_LIMITS) || [];
  }

  setBudgetLimits(limits: any[]): void {
    this.setItem(this.STORAGE_KEYS.BUDGET_LIMITS, limits);
  }

  // Settings
  getSettings(): any {
    return (
      this.getItem(this.STORAGE_KEYS.SETTINGS) || this.getDefaultSettings()
    );
  }

  setSettings(settings: any): void {
    this.setItem(this.STORAGE_KEYS.SETTINGS, settings);
  }

  private getDefaultCategories() {
    return [
      // Income categories
      { id: '1', name: 'Maaş', type: 'income', icon: 'work', color: '#4CAF50' },
      {
        id: '2',
        name: 'Bonus',
        type: 'income',
        icon: 'card_giftcard',
        color: '#8BC34A',
      },
      {
        id: '3',
        name: 'Freelance',
        type: 'income',
        icon: 'laptop',
        color: '#CDDC39',
      },
      {
        id: '4',
        name: 'Yatırım Geliri',
        type: 'income',
        icon: 'trending_up',
        color: '#FFC107',
      },

      // Expense categories
      {
        id: '5',
        name: 'Gıda',
        type: 'expense',
        icon: 'restaurant',
        color: '#FF5722',
      },
      {
        id: '6',
        name: 'Ulaşım',
        type: 'expense',
        icon: 'directions_car',
        color: '#E91E63',
      },
      {
        id: '7',
        name: 'Fatura',
        type: 'expense',
        icon: 'receipt',
        color: '#9C27B0',
      },
      {
        id: '8',
        name: 'Alışveriş',
        type: 'expense',
        icon: 'shopping_cart',
        color: '#673AB7',
      },
      {
        id: '9',
        name: 'Eğlence',
        type: 'expense',
        icon: 'movie',
        color: '#3F51B5',
      },
      {
        id: '10',
        name: 'Sağlık',
        type: 'expense',
        icon: 'local_hospital',
        color: '#2196F3',
      },
      {
        id: '11',
        name: 'Eğitim',
        type: 'expense',
        icon: 'school',
        color: '#00BCD4',
      },
      {
        id: '12',
        name: 'Diğer',
        type: 'expense',
        icon: 'more_horiz',
        color: '#607D8B',
      },
    ];
  }

  private getDefaultSettings() {
    return {
      currency: 'TRY',
      language: 'tr',
      theme: 'light',
      monthlyBudget: 5000,
      notifications: true,
    };
  }
}
