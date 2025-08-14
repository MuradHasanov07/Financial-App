import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { StorageService } from '../../services/storage.service';
import { TransactionService } from '../../services/transaction.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';

interface BudgetSettings {
  monthlyLimit: number;
  isEnabled: boolean;
}

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
})
export class SettingsComponent implements OnInit {
  budgetForm: FormGroup;
  budgetSettings: BudgetSettings = {
    monthlyLimit: 0, // Değiştirildi: 10000 -> 0
    isEnabled: true,
  };

  // Current month statistics
  currentMonthExpense = 0;
  remainingBudget = 0;
  budgetUsagePercentage = 0;
  isOverBudget = false;

  loading = false;

  constructor(
    private fb: FormBuilder,
    private storageService: StorageService,
    private transactionService: TransactionService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog // Eklendi: MatDialog
  ) {
    this.budgetForm = this.createBudgetForm();
  }

  ngOnInit(): void {
    this.loadBudgetSettings();
    this.calculateCurrentMonthStats();
  }

  private createBudgetForm(): FormGroup {
    return this.fb.group({
      monthlyLimit: [0, [Validators.required, Validators.min(100)]], // Değiştirildi: 10000 -> 0
      isEnabled: [true],
    });
  }

  private loadBudgetSettings(): void {
    const settings = this.storageService.getItem('budget_settings');

    // Tip güvenliği için validasyon
    if (settings && this.isValidBudgetSettings(settings)) {
      this.budgetSettings = settings;
    }

    this.budgetForm.patchValue({
      monthlyLimit: this.budgetSettings.monthlyLimit,
      isEnabled: this.budgetSettings.isEnabled,
    });
  }

  // Tip kontrolü için yardımcı method
  private isValidBudgetSettings(obj: any): obj is BudgetSettings {
    return (
      obj &&
      typeof obj.monthlyLimit === 'number' &&
      typeof obj.isEnabled === 'boolean' &&
      obj.monthlyLimit > 0
    );
  }

  private saveBudgetSettings(): void {
    this.storageService.setItem('budget_settings', this.budgetSettings);
  }

  onBudgetSubmit(): void {
    if (this.budgetForm.valid) {
      this.loading = true;

      const formData = this.budgetForm.value;
      this.budgetSettings = {
        monthlyLimit: parseFloat(formData.monthlyLimit),
        isEnabled: formData.isEnabled,
      };

      this.saveBudgetSettings();
      this.calculateCurrentMonthStats();

      this.showSuccessMessage('Bütçe ayarları kaydedildi');
      this.loading = false;
    }
  }

  private calculateCurrentMonthStats(): void {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Get current month transactions
    const monthTransactions = this.transactionService.getTransactionsByMonth(
      currentYear,
      currentMonth
    );

    // Calculate current month expense
    this.currentMonthExpense = monthTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    // Calculate remaining budget
    this.remainingBudget =
      this.budgetSettings.monthlyLimit - this.currentMonthExpense;

    // Calculate usage percentage
    this.budgetUsagePercentage =
      (this.currentMonthExpense / this.budgetSettings.monthlyLimit) * 100;

    // Check if over budget
    this.isOverBudget =
      this.currentMonthExpense > this.budgetSettings.monthlyLimit;
  }

  getBudgetColor(): string {
    if (this.budgetUsagePercentage >= 100) return 'warn';
    if (this.budgetUsagePercentage >= 80) return 'accent';
    return 'primary';
  }

  getBudgetIcon(): string {
    if (this.isOverBudget) return 'warning';
    if (this.budgetUsagePercentage >= 80) return 'info';
    return 'check_circle';
  }

  // Template için progress değeri - Math hatası çözümü
  getProgressValue(): number {
    return Math.min(this.budgetUsagePercentage, 100);
  }

  resetBudgetSettings(): void {
    // Custom dialog kullanımı - JavaScript alert yerine
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Bütçe Ayarlarını Sıfırla',
        message:
          'Bütçe ayarlarını sıfırlamak istediğinize emin misiniz? Bu işlem geri alınamaz.',
        confirmText: 'Sıfırla',
        cancelText: 'İptal',
        confirmColor: 'warn',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.budgetSettings = {
          monthlyLimit: 0, // Değiştirildi: 10000 -> 0
          isEnabled: true,
        };

        this.budgetForm.patchValue({
          monthlyLimit: this.budgetSettings.monthlyLimit,
          isEnabled: this.budgetSettings.isEnabled,
        });

        this.saveBudgetSettings();
        this.calculateCurrentMonthStats();

        this.showSuccessMessage('Bütçe ayarları sıfırlandı');
      }
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(amount);
  }

  private showSuccessMessage(message: string): void {
    this.snackBar.open(message, 'Kapat', {
      duration: 3000,
      panelClass: ['success-snackbar'],
    });
  }
}
