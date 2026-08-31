import { Component, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { SportsService } from '../../core/services/sports.service';
import { resolveImageUrl } from '../../core/services/api.config';
import { Sport, SportDetails } from '../../models/sport.model';
import { NavbarComponent } from '../../shared/navbar/navbar.component';

interface SportCard extends Sport {
  openFacilities: number;
  totalFacilities: number;
  equipmentCount: number;
  fromPrice: number | null;
}

@Component({
  selector: 'app-sports',
  imports: [RouterLink, NavbarComponent],
  templateUrl: './sports.component.html',
  styleUrl: './sports.component.css'
})
export class SportsComponent implements OnInit {
  sports = signal<SportCard[]>([]);
  loading = signal(true);
  error = signal('');

  constructor(private sportsService: SportsService) { }

  ngOnInit() {
    this.loadSports();
  }

  loadSports() {
    this.loading.set(true);
    this.error.set('');

    this.sportsService.getSports().subscribe({
      next: sports => {
        if (sports.length === 0) {
          this.sports.set([]);
          this.loading.set(false);
          return;
        }

        // Detail requests enrich the cards with what is actually bookable.
        // A failed detail call degrades that one card, never the whole page.
        forkJoin(
          sports.map(sport =>
            this.sportsService.getSportDetails(sport.id).pipe(catchError(() => of(null)))
          )
        ).subscribe(details => {
          this.sports.set(sports.map((sport, index) => this.toCard(sport, details[index])));
          this.loading.set(false);
        });
      },
      error: error => {
        if (error.status === 0) {
          this.error.set('Cannot connect to the server.');
        } else {
          this.error.set(error.error || 'Failed to load sports.');
        }

        this.loading.set(false);
      }
    });
  }

  private toCard(sport: Sport, details: SportDetails | null): SportCard {
    if (!details) {
      return { ...sport, openFacilities: 0, totalFacilities: 0, equipmentCount: 0, fromPrice: null };
    }

    const open = details.facilities.filter(facility => !facility.isOutOfService);
    const prices = open.map(facility => facility.pricePerHour);

    return {
      ...sport,
      openFacilities: open.length,
      totalFacilities: details.facilities.length,
      equipmentCount: details.equipment.length,
      fromPrice: prices.length > 0 ? Math.min(...prices) : null
    };
  }

  getImageUrl(imageUrl?: string | null) {
    return resolveImageUrl(imageUrl);
  }
}
