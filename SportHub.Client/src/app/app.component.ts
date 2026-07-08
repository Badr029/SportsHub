import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router, RouterOutlet } from '@angular/router';
import { filter, Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'SportHub.Client';
  routeChanging = false;
  routeEntering = true;
  private routeSubscription?: Subscription;

  constructor(private router: Router) { }

  ngOnInit() {
    this.setBackgroundMode(this.router.url);

    this.routeSubscription = this.router.events
      .pipe(filter(event =>
        event instanceof NavigationStart ||
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError))
      .subscribe(event => {
        if (event instanceof NavigationStart) {
          this.routeChanging = true;
          return;
        }

        if (event instanceof NavigationEnd) {
          this.setBackgroundMode(event.urlAfterRedirects);
          this.restartRouteEnterAnimation();
        }

        window.setTimeout(() => {
          this.routeChanging = false;
        }, 120);
      });
  }

  ngOnDestroy() {
    this.routeSubscription?.unsubscribe();
  }

  private setBackgroundMode(url: string) {
    document.body.classList.remove('sporthub-home-bg', 'sporthub-user-bg', 'sporthub-admin-bg');

    if (url.startsWith('/admin')) {
      document.body.classList.add('sporthub-admin-bg');
      return;
    }

    if (url === '/' || url.startsWith('/login') || url.startsWith('/register')) {
      document.body.classList.add('sporthub-home-bg');
      return;
    }

    document.body.classList.add('sporthub-user-bg');
  }

  private restartRouteEnterAnimation() {
    this.routeEntering = false;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.routeEntering = true;
      });
    });
  }
}
