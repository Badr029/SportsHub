import { Component, signal, OnInit} from '@angular/core';
import { RouterLink } from '@angular/router';

import { SportsService } from '../../core/services/sports.service';
import { resolveImageUrl } from '../../core/services/api.config';
import { Sport } from '../../models/sport.model';
import { NavbarComponent } from '../../shared/navbar/navbar.component';

@Component({
  selector: 'app-sports',
  imports: [RouterLink, NavbarComponent],
  templateUrl: './sports.component.html',
  styleUrl: './sports.component.css'
})
export class SportsComponent implements OnInit {
  sports = signal<Sport[]>([]);
  loading = signal(true);
  error = signal('');

  constructor(private sportsService: SportsService) { }

  ngOnInit() {
    this.loadSports();
  }

  loadSports(){
      this.loading.set(true);
      this.error.set('');

      this.sportsService.getSports().subscribe({next: sports => {
        this.sports.set(sports);
        this.loading.set(false);
      },
      error: error => {
        if(error.status === 0){
          this.error.set('Cannot connect to the server.');
        }else{
          this.error.set(error.error || 'Failed to load sports.');
        }

        this.loading.set(false);
      }
    });
  }

  getImageUrl(imageUrl?: string | null) {
    return resolveImageUrl(imageUrl);
  }
}
