import { Directive, ElementRef, Input, OnDestroy, OnInit, inject } from '@angular/core';

/**
 * Reveals an element once, the first time it scrolls into view.
 *
 * Purpose: preventing a jarring change — long marketing sections otherwise
 * arrive fully formed above the fold and dead below it. It is decorative, so
 * it never gates interaction: the element is fully usable before it reveals,
 * and if IntersectionObserver or motion is unavailable it simply starts
 * revealed.
 *
 * Observes once and disconnects — no scroll listener, no per-frame work.
 */
@Directive({
  selector: '[reveal]',
  standalone: true,
  host: {
    '[class.reveal]': 'true',
    '[class.is-revealed]': 'revealed',
    '[style.--reveal-delay]': 'delayMs + "ms"'
  }
})
export class RevealDirective implements OnInit, OnDestroy {
  /** Stagger within a group, in milliseconds. */
  @Input('revealDelay') delayMs = 0;

  revealed = false;

  private readonly host = inject(ElementRef<HTMLElement>);
  private observer?: IntersectionObserver;

  ngOnInit() {
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced || typeof IntersectionObserver === 'undefined') {
      this.revealed = true;
      return;
    }

    this.observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            this.revealed = true;
            this.disconnect();
          }
        }
      },
      // Fire a little before the element reaches the fold so the motion has
      // finished by the time it is properly in view.
      { rootMargin: '0px 0px -12% 0px', threshold: 0.05 }
    );

    this.observer.observe(this.host.nativeElement);
  }

  ngOnDestroy() {
    this.disconnect();
  }

  private disconnect() {
    this.observer?.disconnect();
    this.observer = undefined;
  }
}
