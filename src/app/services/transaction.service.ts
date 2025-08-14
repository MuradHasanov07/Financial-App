import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Transaction, TransactionCategory } from '../models/transaction.model';
import { Balance, MonthlyBalance } from '../models/balance.model';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root',
})
export class TransactionService {
  private transactionsSubject = new BehaviorSubject<Transaction[]>([]);
  private categoriesSubject = new BehaviorSubject<TransactionCategory[]>([]);

  public transactions$ = this.transactionsSubject.asObservable();
  public categories$ = this.categoriesSubject.asObservable();

  constructor(private storageService: StorageService) {
    this.loadTransactions();
    this.loadCategories();
  }

  private loadTransactions(): void {
    const transactions: any[] = this.storageService.getTransactions();
    // Convert date strings back to Date objects
    const parsedTransactions = transactions.map((t: any) => ({
      ...t,
      date: new Date(t.date),
    }));
    this.transactionsSubject.next(parsedTransactions);
  }

  private loadCategories(): void {
    const categories: any[] = this.storageService.getCategories();
    this.categoriesSubject.next(categories);
  }

  private saveTransactions(): void {
    this.storageService.setTransactions(this.transactionsSubject.value);
  }

  // Transaction CRUD operations
  addTransaction(transaction: Omit<Transaction, 'id'>): void {
    const newTransaction: Transaction = {
      ...transaction,
      id: this.generateId(),
    };

    const currentTransactions = this.transactionsSubject.value;
    const updatedTransactions = [...currentTransactions, newTransaction];

    this.transactionsSubject.next(updatedTransactions);
    this.saveTransactions();
  }

  updateTransaction(
    id: string,
    updatedTransaction: Partial<Transaction>
  ): void {
    const currentTransactions = this.transactionsSubject.value;
    const index = currentTransactions.findIndex((t) => t.id === id);

    if (index !== -1) {
      currentTransactions[index] = {
        ...currentTransactions[index],
        ...updatedTransaction,
      };
      this.transactionsSubject.next([...currentTransactions]);
      this.saveTransactions();
    }
  }

  deleteTransaction(id: string): void {
    const currentTransactions = this.transactionsSubject.value;
    const updatedTransactions = currentTransactions.filter((t) => t.id !== id);

    this.transactionsSubject.next(updatedTransactions);
    this.saveTransactions();
  }

  getTransactionById(id: string): Transaction | undefined {
    return this.transactionsSubject.value.find((t) => t.id === id);
  }

  // Filter methods
  getTransactionsByType(type: 'income' | 'expense'): Transaction[] {
    return this.transactionsSubject.value.filter((t) => t.type === type);
  }

  getTransactionsByCategory(category: string): Transaction[] {
    return this.transactionsSubject.value.filter(
      (t) => t.category === category
    );
  }

  getTransactionsByDateRange(startDate: Date, endDate: Date): Transaction[] {
    return this.transactionsSubject.value.filter(
      (t) => t.date >= startDate && t.date <= endDate
    );
  }

  getTransactionsByMonth(year: number, month: number): Transaction[] {
    return this.transactionsSubject.value.filter(
      (t) => t.date.getFullYear() === year && t.date.getMonth() === month
    );
  }

  // Balance calculations
  getBalance(): Balance {
    const transactions = this.transactionsSubject.value;

    const totalIncome = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const netBalance = totalIncome - totalExpense;

    return {
      totalIncome,
      totalExpense,
      netBalance,
      totalAssetValue: 0, // Will be calculated by AssetService
      totalWealth: netBalance, // Will be updated with asset value
    };
  }

  getMonthlyBalances(months: number = 12): MonthlyBalance[] {
    const now = new Date();
    const monthlyBalances: MonthlyBalance[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthTransactions = this.getTransactionsByMonth(
        date.getFullYear(),
        date.getMonth()
      );

      const income = monthTransactions
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

      const expense = monthTransactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      monthlyBalances.push({
        month: date.toLocaleDateString('tr-TR', {
          year: 'numeric',
          month: 'long',
        }),
        income,
        expense,
        balance: income - expense,
      });
    }

    return monthlyBalances;
  }

  // Category methods
  getCategoriesByType(type: 'income' | 'expense'): TransactionCategory[] {
    return this.categoriesSubject.value.filter((c) => c.type === type);
  }

  addCategory(category: Omit<TransactionCategory, 'id'>): void {
    const newCategory: TransactionCategory = {
      ...category,
      id: this.generateId(),
    };

    const currentCategories = this.categoriesSubject.value;
    const updatedCategories = [...currentCategories, newCategory];

    this.categoriesSubject.next(updatedCategories);
    this.storageService.setCategories(updatedCategories);
  }

  // Utility methods
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Statistics
  getCategoryStats(
    type: 'income' | 'expense'
  ): Array<{ category: string; amount: number; count: number }> {
    const transactions = this.getTransactionsByType(type);
    const categoryMap = new Map<string, { amount: number; count: number }>();

    transactions.forEach((t) => {
      if (categoryMap.has(t.category)) {
        const current = categoryMap.get(t.category)!;
        categoryMap.set(t.category, {
          amount: current.amount + t.amount,
          count: current.count + 1,
        });
      } else {
        categoryMap.set(t.category, { amount: t.amount, count: 1 });
      }
    });

    return Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      ...data,
    }));
  }
}
