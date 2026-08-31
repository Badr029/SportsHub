import { Component, HostListener, OnDestroy, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription, filter } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent implements OnDestroy {
  /** Drawer state. Only consulted below the navigation breakpoint. */
  menuOpen = signal(false);

  private routerSub: Subscription;

  constructor(public authService: AuthService, private router: Router) {
    // Following a link should not leave the drawer covering the page it opened.
    this.routerSub = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => this.closeMenu());
  }

  ngOnDestroy() {
    this.routerSub.unsubscribe();
    this.setScrollLock(false);
  }

  toggleMenu() {
    this.menuOpen.update(open => !open);
    this.setScrollLock(this.menuOpen());
  }

  closeMenu() {
    if (!this.menuOpen()) {
      return;
    }

    this.menuOpen.set(false);
    this.setScrollLock(false);
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.closeMenu();
  }

  logout() {
    this.closeMenu();
    this.authService.logout();
    this.router.navigateByUrl('/login');
  }

  /** The page behind an open drawer must not scroll under the user's thumb. */
  private setScrollLock(locked: boolean) {
    document.body.classList.toggle('nav-drawer-open', locked);
  }
}
