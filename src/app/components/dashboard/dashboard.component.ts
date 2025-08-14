import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TransactionService } from '../../services/transaction.service';
import { AssetService } from '../../services/asset.service';
import { Transaction } from '../../models/transaction.model';
import { Asset } from '../../models/asset.model';
import { Balance, MonthlyBalance } from '../../models/balance.model';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  private destroy$ = new Subject<void>();

  // Chart instances
  private incomeExpenseChart: Chart | null = null;
  private portfolioChart: Chart | null = null;

  balance: Balance = {
    totalIncome: 0,
    totalExpense: 0,
    netBalance: 0,
    totalAssetValue: 0,
    totalWealth: 0,
  };

  monthlyBalances: MonthlyBalance[] = [];
  recentTransactions: Transaction[] = [];
  topAssets: Asset[] = [];

  // Chart data
  incomeExpenseData: any = null;
  portfolioDistributionData: any = null;

  // Loading states
  loading = true;

  // Quick stats
  thisMonthIncome = 0;
  thisMonthExpense = 0;
  portfolioChange = 0;
  portfolioChangePercent = 0;

  constructor(
    private transactionService: TransactionService,
    private assetService: AssetService
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngAfterViewInit(): void {
    // Charts will be created after data is loaded
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    // Destroy charts
    if (this.incomeExpenseChart) {
      this.incomeExpenseChart.destroy();
    }
    if (this.portfolioChart) {
      this.portfolioChart.destroy();
    }
  }

  private loadDashboardData(): void {
    combineLatest([
      this.transactionService.transactions$,
      this.assetService.assets$,
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([transactions, assets]) => {
        this.calculateBalance();
        this.calculateMonthlyStats();
        this.loadRecentTransactions();
        this.loadTopAssets();
        this.prepareChartData();
        this.loading = false;
      });
  }

  private calculateBalance(): void {
    const transactionBalance = this.transactionService.getBalance();
    const totalAssetValue = this.assetService.getTotalPortfolioValue();

    this.balance = {
      ...transactionBalance,
      totalAssetValue,
      totalWealth: transactionBalance.netBalance + totalAssetValue,
    };
  }

  private calculateMonthlyStats(): void {
    this.monthlyBalances = this.transactionService.getMonthlyBalances(6);

    // Bu ayın gelir/gider hesabı
    const now = new Date();
    const thisMonthTransactions =
      this.transactionService.getTransactionsByMonth(
        now.getFullYear(),
        now.getMonth()
      );

    this.thisMonthIncome = thisMonthTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    this.thisMonthExpense = thisMonthTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    // Portföy değişim hesabı (basit örnek)
    this.portfolioChange = this.assetService.getTotalProfitLoss();
    this.portfolioChangePercent =
      this.assetService.getTotalProfitLossPercentage();
  }

  private loadRecentTransactions(): void {
    this.transactionService.transactions$
      .pipe(takeUntil(this.destroy$))
      .subscribe((transactions) => {
        this.recentTransactions = transactions
          .sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          )
          .slice(0, 5);
      });
  }

  private loadTopAssets(): void {
    this.topAssets = this.assetService.getTopPerformers(5);
  }

  private prepareChartData(): void {
    // Gelir/Gider grafiği için veri hazırlama
    this.incomeExpenseData = {
      labels: this.monthlyBalances.map((mb) => mb.month),
      datasets: [
        {
          label: 'Gelir',
          data: this.monthlyBalances.map((mb) => mb.income),
          backgroundColor: 'rgba(76, 175, 80, 0.8)',
          borderColor: 'rgba(76, 175, 80, 1)',
          borderWidth: 2,
        },
        {
          label: 'Gider',
          data: this.monthlyBalances.map((mb) => mb.expense),
          backgroundColor: 'rgba(244, 67, 54, 0.8)',
          borderColor: 'rgba(244, 67, 54, 1)',
          borderWidth: 2,
        },
      ],
    };

    // Portföy dağılımı grafiği için veri hazırlama
    const assetDistribution = this.assetService.getAssetDistribution();
    this.portfolioDistributionData = {
      labels: assetDistribution.map((ad) => this.getAssetTypeName(ad.type)),
      datasets: [
        {
          data: assetDistribution.map((ad) => ad.value),
          backgroundColor: [
            'rgba(255, 152, 0, 0.8)',
            'rgba(33, 150, 243, 0.8)',
            'rgba(76, 175, 80, 0.8)',
            'rgba(156, 39, 176, 0.8)',
            'rgba(255, 193, 7, 0.8)',
          ],
          borderWidth: 2,
          borderColor: '#fff',
        },
      ],
    };

    // Create charts after data is prepared
    setTimeout(() => this.createCharts(), 100);
  }

  private createCharts(): void {
    // Destroy existing charts
    if (this.incomeExpenseChart) {
      this.incomeExpenseChart.destroy();
    }
    if (this.portfolioChart) {
      this.portfolioChart.destroy();
    }

    // Create Income/Expense Chart
    const incomeExpenseCanvas = document.getElementById(
      'incomeExpenseChart'
    ) as HTMLCanvasElement;
    if (incomeExpenseCanvas && this.incomeExpenseData) {
      this.incomeExpenseChart = new Chart(incomeExpenseCanvas, {
        type: 'bar',
        data: this.incomeExpenseData,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
            },
            title: {
              display: false,
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: function (value) {
                  return new Intl.NumberFormat('tr-TR', {
                    style: 'currency',
                    currency: 'TRY',
                  }).format(value as number);
                },
              },
            },
          },
        },
      });
    }

    // Create Portfolio Distribution Chart
    const portfolioCanvas = document.getElementById(
      'portfolioChart'
    ) as HTMLCanvasElement;
    if (
      portfolioCanvas &&
      this.portfolioDistributionData &&
      this.portfolioDistributionData.datasets[0].data.length > 0
    ) {
      this.portfolioChart = new Chart(portfolioCanvas, {
        type: 'doughnut',
        data: this.portfolioDistributionData,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
            },
            tooltip: {
              callbacks: {
                label: function (context) {
                  const value = context.parsed;
                  const total = context.dataset.data.reduce(
                    (a: number, b: number) => a + b,
                    0
                  );
                  const percentage = ((value / total) * 100).toFixed(1);
                  return `${context.label}: ${new Intl.NumberFormat('tr-TR', {
                    style: 'currency',
                    currency: 'TRY',
                  }).format(value)} (${percentage}%)`;
                },
              },
            },
          },
        },
      });
    }
  }

  private getAssetTypeName(type: string): string {
    const typeMap: { [key: string]: string } = {
      crypto: 'Kripto Para',
      stock: 'Hisse Senedi',
      forex: 'Döviz',
    };
    return typeMap[type] || type;
  }

  // Helper methods for template
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

  getChangeIcon(change: number): string {
    return change >= 0 ? 'trending_up' : 'trending_down';
  }

  getChangeColor(change: number): string {
    return change >= 0 ? 'primary' : 'warn';
  }

  // Asset calculation methods
  calculateProfitLoss(asset: any): number {
    const currentValue = asset.currentValue || 0;
    const purchaseValue = asset.quantity * asset.purchasePrice;
    return currentValue - purchaseValue;
  }

  calculateProfitLossPercentage(asset: any): number {
    const purchaseValue = asset.quantity * asset.purchasePrice;
    if (purchaseValue === 0) return 0;
    return (this.calculateProfitLoss(asset) / purchaseValue) * 100;
  }
}
