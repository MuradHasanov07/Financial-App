import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AssetService } from '../../services/asset.service';
import { Asset, AssetType } from '../../models/asset.model';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { InputDialogComponent } from '../../shared/input-dialog/input-dialog.component';

@Component({
  selector: 'app-portfolio',
  templateUrl: './portfolio.component.html',
  styleUrls: ['./portfolio.component.scss'],
})
export class PortfolioComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private destroy$ = new Subject<void>();

  // Form
  assetForm: FormGroup;
  priceUpdateForm: FormGroup;
  assetTypes: AssetType[] = [];

  // Table
  displayedColumns: string[] = [
    'name',
    'type',
    'quantity',
    'purchasePrice',
    'currentPrice',
    'currentValue',
    'profitLoss',
    'actions',
  ];
  dataSource = new MatTableDataSource<Asset>();

  // Filters
  filterType: string = 'all';

  // Loading and editing
  loading = false;
  editingId: string | null = null;
  showAddForm = false;
  showPriceUpdate = false;

  // Portfolio statistics
  totalPortfolioValue = 0;
  totalInvestment = 0;
  totalProfitLoss = 0;
  totalProfitLossPercentage = 0;

  // Asset distribution
  assetDistribution: Array<{
    type: string;
    value: number;
    percentage: number;
  }> = [];

  // Predefined assets for quick selection
  predefinedAssets = {
    crypto: [
      { symbol: 'BTC', name: 'Bitcoin' },
      { symbol: 'ETH', name: 'Ethereum' },
      { symbol: 'ADA', name: 'Cardano' },
      { symbol: 'DOT', name: 'Polkadot' },
      { symbol: 'AVAX', name: 'Avalanche' },
    ],
    stock: [
      { symbol: 'THYAO', name: 'Türk Hava Yolları' },
      { symbol: 'AKBNK', name: 'Akbank' },
      { symbol: 'BIMAS', name: 'BIM' },
      { symbol: 'EREGL', name: 'Ereğli Demir Çelik' },
      { symbol: 'GARAN', name: 'Garanti BBVA' },
    ],
    forex: [
      { symbol: 'USD', name: 'Amerikan Doları' },
      { symbol: 'EUR', name: 'Euro' },
      { symbol: 'GBP', name: 'İngiliz Sterlini' },
    ],
  };

  constructor(
    private fb: FormBuilder,
    public assetService: AssetService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    this.assetForm = this.createAssetForm();
    this.priceUpdateForm = this.createPriceUpdateForm();
  }

  ngOnInit(): void {
    this.loadData();
    this.setupFilters();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private createAssetForm(): FormGroup {
    return this.fb.group({
      name: ['', Validators.required],
      symbol: ['', Validators.required],
      type: ['crypto', Validators.required],
      quantity: ['', [Validators.required, Validators.min(0.000001)]],
      purchasePrice: ['', [Validators.required, Validators.min(0.01)]],
      unitPrice: ['', [Validators.required, Validators.min(0.01)]],
      purchaseDate: [new Date(), Validators.required],
    });
  }

  private createPriceUpdateForm(): FormGroup {
    return this.fb.group({
      symbol: ['', Validators.required],
      newPrice: ['', [Validators.required, Validators.min(0.01)]],
    });
  }

  private loadData(): void {
    // Load assets
    this.assetService.assets$
      .pipe(takeUntil(this.destroy$))
      .subscribe((assets) => {
        this.dataSource.data = assets;
        this.calculateStatistics();
        this.applyFilters();
      });

    // Load asset types
    this.assetTypes = this.assetService.getAssetTypes();
  }

  private setupFilters(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

    // Custom filter predicate
    this.dataSource.filterPredicate = (data: Asset, filter: string) => {
      if (filter === 'all') return true;
      return data.type === filter;
    };

    // Apply initial filter
    this.applyFilters();
  }

  // Form methods
  onSubmit(): void {
    if (this.assetForm.valid) {
      const formData = this.assetForm.value;

      if (this.editingId) {
        this.updateAsset();
      } else {
        this.addAsset(formData);
      }
    }
  }

  private addAsset(data: any): void {
    this.loading = true;

    try {
      // First update the price for this symbol
      this.assetService.updatePrice(
        data.symbol.toUpperCase(),
        parseFloat(data.unitPrice)
      );

      // Then add the asset
      this.assetService.addAsset({
        name: data.name,
        symbol: data.symbol.toUpperCase(),
        type: data.type,
        quantity: parseFloat(data.quantity),
        purchasePrice: parseFloat(data.purchasePrice),
        unitPrice: parseFloat(data.unitPrice),
        purchaseDate: new Date(data.purchaseDate),
      });

      this.showSuccessMessage('Varlık başarıyla eklendi');
      this.resetForm();
    } catch (error) {
      this.showErrorMessage('Varlık eklenirken hata oluştu');
    } finally {
      this.loading = false;
    }
  }

  private updateAsset(): void {
    if (!this.editingId) return;

    this.loading = true;
    const formData = this.assetForm.value;

    try {
      // First update the price for this symbol
      this.assetService.updatePrice(
        formData.symbol.toUpperCase(),
        parseFloat(formData.unitPrice)
      );

      // Then update the asset
      this.assetService.updateAsset(this.editingId, {
        name: formData.name,
        symbol: formData.symbol.toUpperCase(),
        type: formData.type,
        quantity: parseFloat(formData.quantity),
        purchasePrice: parseFloat(formData.purchasePrice),
        unitPrice: parseFloat(formData.unitPrice),
        purchaseDate: new Date(formData.purchaseDate),
      });

      this.showSuccessMessage('Varlık başarıyla güncellendi');
      this.resetForm();
    } catch (error) {
      this.showErrorMessage('Varlık güncellenirken hata oluştu');
    } finally {
      this.loading = false;
    }
  }

  editAsset(asset: Asset): void {
    this.editingId = asset.id;
    this.showAddForm = true;

    this.assetForm.patchValue({
      name: asset.name,
      symbol: asset.symbol,
      type: asset.type,
      quantity: asset.quantity,
      purchasePrice: asset.purchasePrice,
      unitPrice: asset.unitPrice,
      purchaseDate: asset.purchaseDate,
    });
  }

  deleteAsset(id: string): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Varlığı Sil',
        message:
          'Bu varlığı portföyünüzden çıkarmak istediğinize emin misiniz? Bu işlem geri alınamaz.',
        confirmText: 'Sil',
        cancelText: 'İptal',
        confirmColor: 'warn',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        try {
          this.assetService.deleteAsset(id);
          this.showSuccessMessage('Varlık başarıyla silindi');
        } catch (error) {
          this.showErrorMessage('Varlık silinirken hata oluştu');
        }
      }
    });
  }

  sellAsset(asset: Asset): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Varlık Sat',
        message: `${asset.name} (${asset.symbol}) varlığınızdan satış yapmak istediğinize emin misiniz?`,
        confirmText: 'Devam Et',
        cancelText: 'İptal',
        confirmColor: 'primary',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // Open input dialog for quantity
        const inputDialogRef = this.dialog.open(InputDialogComponent, {
          width: '400px',
          data: {
            title: 'Satış Miktarı',
            message: `${asset.name} (${asset.symbol}) - Satmak istediğiniz miktarı giriniz:`,
            inputLabel: 'Satış Miktarı',
            inputType: 'number',
            initialValue: asset.quantity,
            placeholder: '0.000000',
            confirmText: 'Sat',
            cancelText: 'İptal',
            confirmColor: 'warn',
            min: 0.000001,
            max: asset.quantity,
            step: 0.000001,
          },
        });

        inputDialogRef.afterClosed().subscribe((quantity) => {
          if (quantity && quantity > 0) {
            if (quantity <= asset.quantity) {
              this.assetService.sellAsset(asset.id, quantity);
              this.showSuccessMessage(
                `${quantity} ${asset.symbol} başarıyla satıldı`
              );
            } else {
              this.showErrorMessage('Portföyünüzde yeterli miktar bulunmuyor');
            }
          }
        });
      }
    });
  }

  resetForm(): void {
    this.assetForm.reset({
      type: 'crypto',
      purchaseDate: new Date(),
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

  // Predefined asset selection
  onPredefinedAssetSelect(selectedAsset: any): void {
    const currentPrice = this.assetService.getCurrentPrice(
      selectedAsset.symbol
    );

    this.assetForm.patchValue({
      name: selectedAsset.name,
      symbol: selectedAsset.symbol,
      unitPrice: currentPrice,
      purchasePrice: currentPrice,
    });
  }

  getPredefinedAssets(): any[] {
    const type = this.assetForm.get('type')?.value;
    return (
      this.predefinedAssets[type as keyof typeof this.predefinedAssets] || []
    );
  }

  // Price update methods
  onPriceUpdate(): void {
    if (this.priceUpdateForm.valid) {
      const { symbol, newPrice } = this.priceUpdateForm.value;

      this.assetService.updatePrice(symbol, parseFloat(newPrice));
      this.showSuccessMessage(`${symbol} fiyatı güncellendi`);
      this.priceUpdateForm.reset();
      this.showPriceUpdate = false;
    }
  }

  // Get all available assets (from predefined list + portfolio) for price update dropdown
  getAvailableAssetsForPriceUpdate(): Array<{
    symbol: string;
    name: string;
    currentPrice: number;
  }> {
    const allAssets = new Map<
      string,
      { symbol: string; name: string; currentPrice: number }
    >();

    // Add all predefined assets
    Object.values(this.predefinedAssets)
      .flat()
      .forEach((asset) => {
        allAssets.set(asset.symbol, {
          symbol: asset.symbol,
          name: asset.name,
          currentPrice: this.assetService.getCurrentPrice(asset.symbol),
        });
      });

    // Add portfolio assets (in case there are custom ones)
    this.dataSource.data.forEach((asset) => {
      if (!allAssets.has(asset.symbol)) {
        allAssets.set(asset.symbol, {
          symbol: asset.symbol,
          name: asset.name,
          currentPrice: this.assetService.getCurrentPrice(asset.symbol),
        });
      }
    });

    const result = Array.from(allAssets.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    console.log('Available assets for price update:', result); // Debug log

    return result;
  }

  // When asset is selected for price update, fill current price
  onAssetSelectedForPriceUpdate(): void {
    const selectedSymbol = this.priceUpdateForm.get('symbol')?.value;
    if (selectedSymbol) {
      const currentPrice = this.assetService.getCurrentPrice(selectedSymbol);
      this.priceUpdateForm.patchValue({
        newPrice: currentPrice,
      });
    }
  }

  // Filter methods
  applyFilters(): void {
    this.dataSource.filter = this.filterType;
    this.calculateFilteredStatistics();
  }

  clearFilters(): void {
    this.filterType = 'all';
    this.applyFilters();
  }

  // Statistics calculations
  private calculateStatistics(): void {
    this.totalPortfolioValue = this.assetService.getTotalPortfolioValue();
    this.totalInvestment = this.assetService.getTotalInvestment();
    this.totalProfitLoss = this.assetService.getTotalProfitLoss();
    this.totalProfitLossPercentage =
      this.assetService.getTotalProfitLossPercentage();
    this.assetDistribution = this.assetService.getAssetDistribution();
  }

  private calculateFilteredStatistics(): void {
    const filteredAssets = this.dataSource.filteredData;

    this.totalPortfolioValue = filteredAssets.reduce(
      (sum, asset) => sum + (asset.currentValue || 0),
      0
    );
    this.totalInvestment = filteredAssets.reduce(
      (sum, asset) => sum + asset.quantity * asset.purchasePrice,
      0
    );
    this.totalProfitLoss = this.totalPortfolioValue - this.totalInvestment;
    this.totalProfitLossPercentage =
      this.totalInvestment > 0
        ? (this.totalProfitLoss / this.totalInvestment) * 100
        : 0;
  }

  // Helper methods
  getAssetTypeText(type: string): string {
    const assetType = this.assetTypes.find((t) => t.id === type);
    return assetType ? assetType.name : type;
  }

  getAssetTypeIcon(type: string): string {
    const assetType = this.assetTypes.find((t) => t.id === type);
    return assetType ? assetType.icon : 'help';
  }

  getAssetTypeColor(type: string): string {
    const assetType = this.assetTypes.find((t) => t.id === type);
    return assetType ? assetType.color : '#666';
  }

  calculateProfitLoss(asset: Asset): number {
    return (asset.currentValue || 0) - asset.quantity * asset.purchasePrice;
  }

  calculateProfitLossPercentage(asset: Asset): number {
    const investment = asset.quantity * asset.purchasePrice;
    if (investment === 0) return 0;
    return (this.calculateProfitLoss(asset) / investment) * 100;
  }

  getCurrentPrice(asset: Asset): number {
    return this.assetService.getCurrentPrice(asset.symbol);
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

  private showSuccessMessage(message: string): void {
    this.snackBar.open(message, 'Kapat', {
      duration: 3000,
      panelClass: ['success-snackbar'],
    });
  }

  private showErrorMessage(message: string): void {
    this.snackBar.open(message, 'Kapat', {
      duration: 3000,
      panelClass: ['error-snackbar'],
    });
  }
}
