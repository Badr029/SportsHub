import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RevealDirective } from '../../shared/reveal.directive';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { SportsService } from '../../core/services/sports.service';
import { BookingService } from '../../core/services/booking.service';
import { resolveImageUrl } from '../../core/services/api.config';
import { Facility, Sport, SportDetails } from '../../models/sport.model';
import { FacilityAvailabilitySlot } from '../../models/booking.model';

interface ShowcaseCard {
  name: string;
  description: string;
  imageUrl: string;
  metric: string;
  detailMetric: string;
}

@Component({
  selector: 'app-home',
  imports: [RouterLink, RevealDirective],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  showcase = signal<ShowcaseCard[]>([]);
  loading = signal(true);
  error = signal('');
  openFacilities = signal(0);
  equipmentStock = signal(0);
  sportCount = signal(0);

  // The signature of the product is the 30-minute grid. Showing a real one on
  // the landing page says what SportHub does better than any stat tile can.
  liveFacilityName = signal('');
  liveSportName = signal('');
  heroImage = signal('');
  liveSlots = signal<FacilityAvailabilitySlot[]>([]);
  liveLoading = signal(true);

  /** Bookable facilities the visitor can flip between in the hero panel. */
  liveFacilities = signal<Facility[]>([]);
  selectedFacilityId = signal<number | null>(null);

  // A visitor can try the real 30-minute picker before signing up. Nothing is
  // reserved here — it is a preview of the interaction, and the selection is
  // carried into the sign-up CTA so the intent is not lost.
  previewStart = signal('');
  previewCount = signal(0);

  constructor(
    private sportsService: SportsService,
    private bookingService: BookingService
  ) { }

  ngOnInit() {
    this.sportsService.getSports().subscribe({
      next: sports => {
        this.loadSportDetails(sports);
      },
      error: () => {
        this.error.set('Live data is not available right now.');
        this.loading.set(false);
        this.liveLoading.set(false);
      }
    });
  }

  /** "8:00 AM" reads fine in the picker, but the strip only has room for "8 AM". */
  shortSlotLabel(slot: FacilityAvailabilitySlot) {
    return slot.label.replace(':00', '').replace(' ', '');
  }

  freeSlotCount() {
    return this.liveSlots().filter(slot => slot.available).length;
  }

  // --- Interactive preview --------------------------------------------------

  selectFacility(facility: Facility) {
    if (this.selectedFacilityId() === facility.id) {
      return;
    }

    this.selectedFacilityId.set(facility.id);
    this.liveFacilityName.set(facility.name);
    this.clearPreview();
    this.fetchSlots(facility.id);
  }

  clearPreview() {
    this.previewStart.set('');
    this.previewCount.set(0);
  }

  /** Same rule as the booking page: click the first block, then the last. */
  pickSlot(slot: FacilityAvailabilitySlot) {
    if (!slot.available) {
      return;
    }

    const slots = this.liveSlots();
    const startIndex = slots.findIndex(item => item.time === this.previewStart());
    const clickedIndex = slots.findIndex(item => item.time === slot.time);

    if (!this.previewStart() || clickedIndex < startIndex) {
      this.previewStart.set(slot.time);
      this.previewCount.set(1);
      return;
    }

    if (slot.time === this.previewStart()) {
      this.clearPreview();
      return;
    }

    const range = slots.slice(startIndex, clickedIndex + 1);

    // Six hours max, and a range may not cross a taken block.
    if (range.length > 12 || range.some(item => !item.available)) {
      this.previewStart.set(slot.time);
      this.previewCount.set(1);
      return;
    }

    this.previewCount.set(range.length);
  }

  isPreviewSelected(slot: FacilityAvailabilitySlot) {
    const slots = this.liveSlots();
    const startIndex = slots.findIndex(item => item.time === this.previewStart());
    const index = slots.findIndex(item => item.time === slot.time);

    return startIndex >= 0 && index >= startIndex && index < startIndex + this.previewCount();
  }

  previewHours() {
    return this.previewCount() / 2;
  }

  /** "5:00 PM – 6:30 PM" for the selected range. */
  previewRangeLabel() {
    if (!this.previewStart() || this.previewCount() === 0) {
      return '';
    }

    const slots = this.liveSlots();
    const startIndex = slots.findIndex(item => item.time === this.previewStart());
    const start = slots[startIndex];
    const endSlot = slots[startIndex + this.previewCount()];

    const endLabel = endSlot
      ? endSlot.label
      : this.addMinutes(start.time, this.previewCount() * 30);

    return `${start.label} – ${endLabel}`;
  }

  previewPrice() {
    const facility = this.liveFacilities().find(item => item.id === this.selectedFacilityId());
    return Math.round((facility?.pricePerHour ?? 0) * this.previewHours());
  }

  private addMinutes(time: string, minutes: number) {
    const [h, m] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(h, m + minutes, 0, 0);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  private loadSportDetails(sports: Sport[]) {
    const selectedSports = sports.slice(0, 3);

    if (!sports.length) {
      this.showcase.set([]);
      this.loading.set(false);
      this.liveLoading.set(false);
      return;
    }

    forkJoin(sports.map(sport => this.sportsService.getSportDetails(sport.id))).subscribe({
      next: details => {
        this.setLiveMetrics(details, sports.length);
        this.showcase.set(details.slice(0, selectedSports.length).map(sport => this.toShowcaseCard(sport)));
        this.loading.set(false);
        this.loadLiveSlots(details);
      },
      error: () => {
        this.error.set('Live asset details could not be loaded.');
        this.loading.set(false);
        this.liveLoading.set(false);
      }
    });
  }

  /** Today's real grid for the first bookable facility we can find. */
  private loadLiveSlots(details: SportDetails[]) {
    const sport = details.find(item => item.facilities.some(facility => !facility.isOutOfService));
    const open = (sport?.facilities ?? []).filter(item => !item.isOutOfService);
    const facility = open[0];

    if (!facility) {
      this.liveLoading.set(false);
      return;
    }

    this.liveFacilities.set(open.slice(0, 3));
    this.selectedFacilityId.set(facility.id);
    this.liveFacilityName.set(facility.name);
    this.liveSportName.set(sport?.name ?? '');
    this.heroImage.set(resolveImageUrl(sport?.imageUrl));

    this.fetchSlots(facility.id);
  }

  private fetchSlots(facilityId: number) {
    this.liveLoading.set(true);

    const today = new Date();
    const pad = (value: number) => value.toString().padStart(2, '0');
    const date = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

    this.bookingService
      .getFacilityAvailability(facilityId, date, 30)
      .pipe(catchError(() => of([] as FacilityAvailabilitySlot[])))
      .subscribe(slots => {
        this.liveSlots.set(slots);
        this.liveLoading.set(false);
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
