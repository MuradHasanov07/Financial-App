export interface Balance {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  totalAssetValue: number;
  totalWealth: number;
}

export interface MonthlyBalance {
  month: string;
  income: number;
  expense: number;
  balance: number;
}

export interface BudgetLimit {
  category: string;
  limit: number;
  spent: number;
  remaining: number;
}
