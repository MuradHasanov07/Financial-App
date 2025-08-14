import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TransactionService } from '../../services/transaction.service';
import {
  Transaction,
  TransactionCategory,
} from '../../models/transaction.model';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-transactions',
  templateUrl: './transactions.component.html',
  styleUrls: ['./transactions.component.scss'],
})
export class TransactionsComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private destroy$ = new Subject<void>();

  // Form
  transactionForm: FormGroup;
  categories: TransactionCategory[] = [];

  // Table
  displayedColumns: string[] = [
    'date',
    'type',
    'category',
    'description',
    'amount',
    'actions',
  ];
  dataSource = new MatTableDataSource<Transaction>();

  // Filters
  filterType: string = 'all';
  filterCategory: string = 'all';
  filterDateFrom: Date | null = null;
  filterDateTo: Date | null = null;

  // Loading and editing
  loading = false;
  editingId: string | null = null;
  showAddForm = false;

  // Statistics
  totalIncome = 0;
  totalExpense = 0;
  filteredIncome = 0;
  filteredExpense = 0;

  constructor(
    private fb: FormBuilder,
    private transactionService: TransactionService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    this.transactionForm = this.createForm();
  }

  ngOnInit(): void {
    this.loadData();
    this.setupFilters();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      type: ['', Validators.required],
      category: ['', Validators.required],
      amount: ['', [Validators.required, Validators.min(0.01)]],
      date: [new Date(), Validators.required],
      description: ['', Validators.required],
    });
  }

  private loadData(): void {
    // Load transactions
    this.transactionService.transactions$
      .pipe(takeUntil(this.destroy$))
      .subscribe((transactions) => {
        this.dataSource.data = transactions;
        this.calculateStatistics();
        this.applyFilters();
      });

    // Load categories
    this.transactionService.categories$
      .pipe(takeUntil(this.destroy$))
      .subscribe((categories) => {
        this.categories = categories;
      });
  }

  private setupFilters(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

    // Custom filter predicate
    this.dataSource.filterPredicate = (data: Transaction, filter: string) => {
      const filters = JSON.parse(filter);

      // Type filter
      if (filters.type !== 'all' && data.type !== filters.type) {
        return false;
      }

      // Category filter
      if (filters.category !== 'all' && data.category !== filters.category) {
        return false;
      }

      // Date range filter
      if (
        filters.dateFrom &&
        new Date(data.date) < new Date(filters.dateFrom)
      ) {
        return false;
      }

      if (filters.dateTo && new Date(data.date) > new Date(filters.dateTo)) {
        return false;
      }

      return true;
    };

    // Apply initial filter
    this.applyFilters();
  }

  // Form methods
  onSubmit(): void {
    if (this.transactionForm.valid) {
      const formData = this.transactionForm.value;

      // Check budget limit before adding expense
      if (formData.type === 'expense') {
        const budgetCheck = this.checkBudgetLimit(parseFloat(formData.amount));
        if (!budgetCheck.allowed) {
          this.showErrorMessage(budgetCheck.message);
          return;
        }
      }

      if (this.editingId) {
        this.updateTransaction();
      } else {
        this.addTransaction(formData);
      }
    }
  }

  private checkBudgetLimit(expenseAmount: number): {
    allowed: boolean;
    message: string;
  } {
    // Get budget settings
    const budgetSettings = localStorage.getItem('budget_settings');
    if (!budgetSettings) {
      return { allowed: true, message: '' };
    }

    const settings = JSON.parse(budgetSettings);
    if (!settings.isEnabled) {
      return { allowed: true, message: '' };
    }

    // Calculate current month expenses
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const monthTransactions = this.transactionService.getTransactionsByMonth(
      currentYear,
      currentMonth
    );
    const currentMonthExpense = monthTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    // Check if adding this expense would exceed the limit
    const totalAfterExpense = currentMonthExpense + expenseAmount;

    if (totalAfterExpense > settings.monthlyLimit) {
      const remaining = settings.monthlyLimit - currentMonthExpense;
      return {
        allowed: false,
        message: `Aylık bütçe limiti aşılacak! Kalan limit: ${this.formatCurrency(
          remaining
        )}. Bu işlem ${this.formatCurrency(expenseAmount)} tutarında.`,
      };
    }

    // Warning if close to limit (80% or more)
    const usagePercentage = (totalAfterExpense / settings.monthlyLimit) * 100;
    if (usagePercentage >= 80 && usagePercentage < 100) {
      this.showWarningMessage(
        `Uyarı: Aylık bütçenizin %${usagePercentage.toFixed(
          1
        )}'ini kullandınız!`
      );
    }

    return { allowed: true, message: '' };
  }

  private addTransaction(data: any): void {
    this.loading = true;

    try {
      this.transactionService.addTransaction({
        type: data.type,
        category: data.category,
        amount: parseFloat(data.amount),
        date: new Date(data.date),
        description: data.description,
      });

      this.showSuccessMessage('İşlem başarıyla eklendi');
      this.resetForm();
    } catch (error) {
      this.showErrorMessage('İşlem eklenirken hata oluştu');
    } finally {
      this.loading = false;
    }
  }

  private updateTransaction(): void {
    if (!this.editingId) return;

    this.loading = true;
    const formData = this.transactionForm.value;

    try {
      this.transactionService.updateTransaction(this.editingId, {
        type: formData.type,
        category: formData.category,
        amount: parseFloat(formData.amount),
        date: new Date(formData.date),
        description: formData.description,
      });

      this.showSuccessMessage('İşlem başarıyla güncellendi');
      this.resetForm();
    } catch (error) {
      this.showErrorMessage('İşlem güncellenirken hata oluştu');
    } finally {
      this.loading = false;
    }
  }

  editTransaction(transaction: Transaction): void {
    this.editingId = transaction.id;
    this.showAddForm = true;

    this.transactionForm.patchValue({
      type: transaction.type,
      category: transaction.category,
      amount: transaction.amount,
      date: transaction.date,
      description: transaction.description,
    });
  }

  deleteTransaction(id: string): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'İşlemi Sil',
        message:
          'Bu işlemi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
        confirmText: 'Sil',
        cancelText: 'İptal',
        confirmColor: 'warn',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        try {
          this.transactionService.deleteTransaction(id);
          this.showSuccessMessage('İşlem başarıyla silindi');
        } catch (error) {
          this.showErrorMessage('İşlem silinirken hata oluştu');
        }
      }
    });
  }

  resetForm(): void {
    this.transactionForm.reset({
      type: '',
      date: new Date(),
    });
    this.editingId = null;
    this.showAddForm = false;
  }

  toggleAddForm(): void {
    this.showAddForm = !this.showAddForm;
    if (!this.showAddForm) {
      this.resetForm();
    }
  }

  // Filter methods
  applyFilters(): void {
    const filterValue = JSON.stringify({
      type: this.filterType,
      category: this.filterCategory,
      dateFrom: this.filterDateFrom,
      dateTo: this.filterDateTo,
    });

    this.dataSource.filter = filterValue;
    this.calculateFilteredStatistics();
  }

  clearFilters(): void {
    this.filterType = 'all';
    this.filterCategory = 'all';
    this.filterDateFrom = null;
    this.filterDateTo = null;
    this.applyFilters();
  }

  onTypeFilterChange(): void {
    this.filterCategory = 'all'; // Reset category when type changes
    this.applyFilters();
  }

  // Statistics
  private calculateStatistics(): void {
    const transactions = this.dataSource.data;

    this.totalIncome = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    this.totalExpense = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  }

  private calculateFilteredStatistics(): void {
    const filteredData = this.dataSource.filteredData;

    this.filteredIncome = filteredData
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    this.filteredExpense = filteredData
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  }

  // Helper methods
  getCategoriesByType(type: string): TransactionCategory[] {
    if (type === 'all') return this.categories;
    return this.categories.filter((c) => c.type === type);
  }

  getTransactionTypeText(type: string): string {
    return type === 'income' ? 'Gelir' : 'Gider';
  }

  getTransactionIcon(type: string): string {
    return type === 'income' ? 'trending_up' : 'trending_down';
  }

  getTransactionColor(type: string): string {
    return type === 'income' ? 'primary' : 'warn';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(amount);
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('tr-TR');
  }

  private showSuccessMessage(message: string): void {
    this.snackBar.open(message, 'Kapat', {
      duration: 3000,
      panelClass: ['success-snackbar'],
    });
  }

  private showErrorMessage(message: string): void {
    this.snackBar.open(message, 'Kapat', {
      duration: 5000,
      panelClass: ['error-snackbar'],
    });
  }

  private showWarningMessage(message: string): void {
    this.snackBar.open(message, 'Kapat', {
      duration: 4000,
      panelClass: ['warning-snackbar'],
    });
  }
}
