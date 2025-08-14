export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  date: Date;
  description: string;
}

export interface TransactionCategory {
  id: string;
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
}
