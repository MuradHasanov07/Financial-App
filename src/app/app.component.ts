import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  title = 'Finans Takip';
  sidenavOpened = false;

  menuItems = [
    { path: '/dashboard', icon: 'dashboard', label: 'Ana Sayfa' },
    { path: '/transactions', icon: 'receipt_long', label: 'Gelir/Gider' },
    { path: '/portfolio', icon: 'account_balance_wallet', label: 'Portföy' },
    { path: '/settings', icon: 'settings', label: 'Ayarlar' },
  ];

  constructor(private router: Router) {}

  toggleSidenav() {
    this.sidenavOpened = !this.sidenavOpened;
  }

  navigateTo(path: string) {
    this.router.navigate([path]);
    if (window.innerWidth <= 768) {
      this.sidenavOpened = false;
    }
  }

  isActiveRoute(path: string): boolean {
    return this.router.url === path;
  }
}
