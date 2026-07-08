import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { SportsService } from '../../core/services/sports.service';
import { resolveImageUrl } from '../../core/services/api.config';
import { Sport, SportDetails } from '../../models/sport.model';

interface ShowcaseCard {
  name: string;
  description: string;
  imageUrl: string;
  metric: string;
  detailMetric: string;
}

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.component.html'
})
export class HomeComponent implements OnInit {
  showcase = signal<ShowcaseCard[]>([]);
  loading = signal(true);
  error = signal('');
  openFacilities = signal(0);
  equipmentStock = signal(0);
  sportCount = signal(0);

  constructor(private sportsService: SportsService) { }

  ngOnInit() {
    this.sportsService.getSports().subscribe({
      next: sports => {
        this.loadSportDetails(sports);
      },
      error: () => {
        this.error.set('Live data is not available right now.');
        this.loading.set(false);
      }
    });
  }

  private loadSportDetails(sports: Sport[]) {
    const selectedSports = sports.slice(0, 3);

    if (!sports.length) {
      this.showcase.set([]);
      this.loading.set(false);
      return;
    }

    forkJoin(sports.map(sport => this.sportsService.getSportDetails(sport.id))).subscribe({
      next: details => {
        this.setLiveMetrics(details, sports.length);
        this.showcase.set(details.slice(0, selectedSports.length).map(sport => this.toShowcaseCard(sport)));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Live asset details could not be loaded.');
        this.loading.set(false);
      }
    });
  }

  private setLiveMetrics(details: SportDetails[], totalSports: number) {
    const openFacilities = details.reduce((total, sport) =>
      total + sport.facilities.filter(facility => !facility.isOutOfService).length, 0);

    const equipmentStock = details.reduce((total, sport) =>
      total + sport.equipment.reduce((sum, equipment) => sum + equipment.quantity, 0), 0);

    this.openFacilities.set(openFacilities);
    this.equipmentStock.set(equipmentStock);
    this.sportCount.set(totalSports);
  }

  private toShowcaseCard(sport: SportDetails): ShowcaseCard {
    const openFacilities = sport.facilities.filter(facility => !facility.isOutOfService).length;
    const totalFacilities = sport.facilities.length;
    const equipmentStock = sport.equipment.reduce((sum, equipment) => sum + equipment.quantity, 0);

    return {
      name: sport.name,
      description: sport.description,
      imageUrl: resolveImageUrl(sport.imageUrl),
      metric: `${openFacilities}/${totalFacilities} places available`,
      detailMetric: `${equipmentStock} rental items ready`
    };
  }
}
