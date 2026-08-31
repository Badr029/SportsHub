import { Component, HostListener, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { QuantityStepperComponent } from '../../shared/quantity-stepper/quantity-stepper.component';
import { SportsService } from '../../core/services/sports.service';
import { BookingService } from '../../core/services/booking.service';
import { resolveImageUrl, toLocalDateTime } from '../../core/services/api.config';
import { Equipment, Sport, SportDetails } from '../../models/sport.model';
import { BookingEquipmentItem, CreateBooking, EquipmentAvailability, PaymentMethod } from '../../models/booking.model';

interface EquipmentCard extends Equipment {
  sportId: number;
  sportName: string;
}

@Component({
  selector: 'app-equipment-booking',
  imports: [FormsModule, NavbarComponent, QuantityStepperComponent],
  templateUrl: './equipment-booking.component.html',
  styleUrl: './equipment-booking.component.css'
})
export class EquipmentBookingComponent implements OnInit, OnDestroy {
  sports = signal<Sport[]>([]);
  equipment = signal<EquipmentCard[]>([]);
  availability = signal<EquipmentAvailability[]>([]);
  loading = signal(true);
  error = signal('');
  success = signal('');

  selectedSportId = 0;
  pickupDate = '';
  pickupTime = '08:00';
  todayDate = this.formatDateInput(new Date());
  paymentMethod: PaymentMethod = 'PayOnSite';
  selectedEquipmentItems: BookingEquipmentItem[] = [];
  confirmationOpen = false;
  pendingBookingRequest: CreateBooking | null = null;

  filteredEquipment() {
    const items = this.equipment();

    if (!this.selectedSportId) {
      return items;
    }

    return items.filter(item => item.sportId === Number(this.selectedSportId));
  }

  constructor(
    private sportsService: SportsService,
    private bookingService: BookingService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
    this.restoreFlowFromUrl();
    this.loadEquipment();

    // Narrow screens run the rental as its own full-page flow; wide screens
    // keep the summary panel beside the catalogue.
    this.narrow = window.matchMedia('(max-width: 940px)');
    this.compact.set(this.narrow.matches);
    this.onWidthChange = event => this.compact.set(event.matches);
    this.narrow.addEventListener('change', this.onWidthChange);

    this.routeSub = this.route.url.subscribe(segments => {
      const inFlow = segments.some(segment => segment.path === 'review');
      this.flowStep.set(inFlow ? 'configure' : 'choose');
    });
  }

  ngOnDestroy() {
    document.body.style.overflow = '';
    document.body.classList.remove('modal-open');

    if (this.narrow && this.onWidthChange) {
      this.narrow.removeEventListener('change', this.onWidthChange);
    }

    this.routeSub?.unsubscribe();
  }

  /** Which part of the rental flow a narrow screen is showing. */
  flowStep = signal<'choose' | 'configure' | 'review'>('choose');
  compact = signal(false);

  private narrow?: MediaQueryList;
  private onWidthChange?: (event: MediaQueryListEvent) => void;
  private routeSub?: { unsubscribe(): void };

  layoutStep() {
    return this.compact() ? this.flowStep() : 'wide';
  }

  /** The summary panel is not on screen until the customer asks for it. */
  openReview() {
    if (this.selectedEquipmentItems.length === 0) {
      this.error.set('Select at least one equipment item.');
      return;
    }

    this.flowStep.set('configure');
    this.router.navigate(['/equipment', 'review'], { queryParams: this.flowQueryParams() });
  }

  /**
   * `/equipment` and `/equipment/review` are different routes, so Angular
   * rebuilds the component on the way in. The basket therefore travels in the
   * URL, which also makes the step refresh-safe.
   */
  private flowQueryParams() {
    const items = this.selectedEquipmentItems
      .map(item => `${item.equipmentId}x${item.quantity}`)
      .join(',');

    return {
      items,
      day: this.pickupDate || null,
      time: this.pickupTime || null
    };
  }

  private restoreFlowFromUrl() {
    const params = this.route.snapshot.queryParamMap;
    const items = params.get('items');

    if (!items) {
      return;
    }

    this.selectedEquipmentItems = items
      .split(',')
      .map(part => part.split('x').map(Number))
      .filter(([id, quantity]) => id > 0 && quantity > 0)
      .map(([equipmentId, quantity]) => ({ equipmentId, quantity }));

    this.pickupDate = params.get('day') ?? this.pickupDate;
    this.pickupTime = params.get('time') ?? this.pickupTime;
  }

  leaveFlow() {
    this.flowStep.set('choose');
    this.router.navigate(['/equipment']);
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.confirmationOpen) {
      this.closeBookingConfirmation();
    }
  }

  // The rental period is fixed at one day, so the panel can state the return
  // up front instead of leaving it to the confirmation step.
  returnDayLabel() {
    if (!this.pickupDate) {
      return '';
    }

    const returnDate = new Date(`${this.pickupDate}T${this.pickupTime || '08:00'}`);
    returnDate.setDate(returnDate.getDate() + 1);

    return returnDate.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
  }

  pickupTimeLabel() {
    return this.timeSlots.find(slot => slot.value === this.pickupTime)?.label ?? this.pickupTime;
  }

  loadEquipment() {
    this.loading.set(true);
    this.error.set('');

    this.sportsService.getSports().subscribe({
      next: sports => {
        this.sports.set(sports);

        if (sports.length === 0) {
          this.loading.set(false);
          return;
        }

        forkJoin(sports.map(sport => this.sportsService.getSportDetails(sport.id))).subscribe({
          next: details => {
            this.equipment.set(this.flattenEquipment(details));
            this.loading.set(false);
            this.loadAvailability();
          },
          error: error => {
            this.loading.set(false);
            this.error.set(this.getErrorMessage(error, 'Failed to load equipment.'));
          }
        });
      },
      error: error => {
        this.loading.set(false);
        this.error.set(this.getErrorMessage(error, 'Failed to load sports.'));
      }
    });
  }

  flattenEquipment(details: SportDetails[]) {
    return details.flatMap(sport =>
      sport.equipment.map(item => ({
        ...item,
        sportId: sport.id,
        sportName: sport.name
      }))
    );
  }

  addEquipment(equipmentId: number) {
    this.clearMessages();

    const existing = this.selectedEquipmentItems.find(item => item.equipmentId === equipmentId);

    if (existing) {
      this.updateQuantity(equipmentId, existing.quantity + 1);
      return;
    }

    this.selectedEquipmentItems = [...this.selectedEquipmentItems, { equipmentId, quantity: 1 }];
  }

  removeEquipment(equipmentId: number) {
    this.selectedEquipmentItems = this.selectedEquipmentItems.filter(item => item.equipmentId !== equipmentId);
  }

  updateQuantity(equipmentId: number, quantity: number) {
    const nextQuantity = Math.max(1, Number(quantity) || 1);

    this.selectedEquipmentItems = this.selectedEquipmentItems.map(item =>
      item.equipmentId === equipmentId ? { ...item, quantity: nextQuantity } : item
    );
  }

  loadAvailability() {
    this.availability.set([]);

    if (!this.pickupDate) {
      return;
    }

    const startDate = new Date(this.pickupDate);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);

    const equipmentIds = this.equipment().map(item => item.id);

    if (equipmentIds.length === 0) {
      return;
    }

    forkJoin(equipmentIds.map(id =>
      this.bookingService.getEquipmentAvailability(id, toLocalDateTime(startDate), toLocalDateTime(endDate))
    )).subscribe({
      next: availability => {
        this.availability.set(availability);
      },
      error: error => {
        this.error.set(this.getErrorMessage(error, 'Failed to load equipment availability.'));
      }
    });
  }

  createBooking() {
    this.clearMessages();

    if (this.selectedEquipmentItems.length === 0) {
      this.error.set('Select at least one equipment item.');
      return;
    }

    if (!this.pickupDate || !this.pickupTime) {
      this.error.set('Pickup date and time are required.');
      return;
    }

    if (this.pickupDate < this.todayDate) {
      this.error.set('Pickup date cannot be in the past.');
      return;
    }

    const equipmentErrors: string[] = [];
    for (const item of this.selectedEquipmentItems) {
      const availability = this.getAvailability(item.equipmentId);

      if (!availability) {
        equipmentErrors.push(`Availability is still loading for ${this.getEquipmentName(item.equipmentId)}.`);
      } else if (item.quantity > availability.availableQuantity) {
        equipmentErrors.push(`${this.getEquipmentName(item.equipmentId)} has only ${availability.availableQuantity} available.`);
      }
    }

    if (equipmentErrors.length > 0) {
      this.error.set(equipmentErrors.join(' '));
      return;
    }

    const pickupDate = new Date(`${this.pickupDate}T${this.pickupTime}`);
    const returnDate = new Date(pickupDate);
    returnDate.setDate(returnDate.getDate() + 1);

    const request: CreateBooking = {
      bookingType: 2,
      facilityId: null,
      startDate: toLocalDateTime(pickupDate),
      endDate: toLocalDateTime(returnDate),
      pickupDate: toLocalDateTime(pickupDate),
      returnDate: toLocalDateTime(returnDate),
      equipmentItems: this.selectedEquipmentItems,
      paymentMethod: this.paymentMethod
    };

    this.pendingBookingRequest = request;
    this.confirmationOpen = true;

    if (this.compact()) {
      this.flowStep.set('review');
      window.scrollTo({ top: 0 });
      return;
    }

    document.body.style.overflow = 'hidden';
    document.body.classList.add('modal-open');
  }

  confirmCreateBooking() {
    if (!this.pendingBookingRequest) return;

    this.pendingBookingRequest = {
      ...this.pendingBookingRequest,
      paymentMethod: this.paymentMethod
    };

    this.bookingService.createBooking(this.pendingBookingRequest).subscribe({
      next: booking => {
        this.confirmationOpen = false;
        this.pendingBookingRequest = null;
        document.body.style.overflow = '';
        document.body.classList.remove('modal-open');
        this.selectedEquipmentItems = [];
        this.loadAvailability();

        if (booking.paymentMethod === 'Online' && booking.paymentId) {
          this.router.navigate(['/payment', booking.paymentId]);
          return;
        }

        this.success.set('Equipment booking created. Payment will be collected onsite.');
      },
      error: error => {
        this.error.set(this.getErrorMessage(error, 'Failed to create equipment booking.'));
      }
    });
  }

  closeBookingConfirmation() {
    this.confirmationOpen = false;
    this.pendingBookingRequest = null;
    document.body.style.overflow = '';
    document.body.classList.remove('modal-open');
  }

  selectedRentalTotal() {
    return this.selectedEquipmentItems.reduce((total, item) => {
      const equipment = this.getEquipment(item.equipmentId);
      return total + (equipment?.dailyRentalPrice ?? 0) * item.quantity;
    }, 0);
  }

  getAvailability(equipmentId: number) {
    return this.availability().find(item => item.equipmentId === equipmentId);
  }

  getEquipment(equipmentId: number) {
    return this.equipment().find(item => item.id === equipmentId);
  }

  getEquipmentName(equipmentId: number) {
    return this.getEquipment(equipmentId)?.name || 'Equipment';
  }

  /** Availability for the chosen day, or null while no day is picked. */
  availableFor(equipmentId: number): number | null {
    return this.getAvailability(equipmentId)?.availableQuantity ?? null;
  }

  reservedFor(equipmentId: number): number | null {
    return this.getAvailability(equipmentId)?.reservedQuantity ?? null;
  }

  /** 0-100, for the stock meter. Falls back to full when nothing is known. */
  stockPercent(equipmentId: number) {
    const availability = this.getAvailability(equipmentId);

    if (!availability || availability.totalQuantity === 0) {
      return 100;
    }

    return Math.round((availability.availableQuantity / availability.totalQuantity) * 100);
  }

  isSoldOut(equipmentId: number) {
    return this.availableFor(equipmentId) === 0;
  }

  /** True once the picked quantity has reached everything that is left. */
  isAtLimit(equipmentId: number) {
    const available = this.availableFor(equipmentId);
    return available !== null && this.getSelectedQuantity(equipmentId) >= available;
  }

  getSelectedQuantity(equipmentId: number) {
    return this.selectedEquipmentItems.find(item => item.equipmentId === equipmentId)?.quantity ?? 0;
  }

  isSelected(equipmentId: number) {
    return this.selectedEquipmentItems.some(item => item.equipmentId === equipmentId);
  }

  clearMessages() {
    this.error.set('');
    this.success.set('');
  }

  getImageUrl(imageUrl?: string | null) {
    return resolveImageUrl(imageUrl);
  }

  formatDateInput(date: Date) {
    const pad = (value: number) => value.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  formatDateTime(value: string | null | undefined) {
    if (!value) return '';
    return new Date(value).toLocaleString([], {
      weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    });
  }

  getErrorMessage(error: any, fallback: string) {
    if (error.status === 0) {
      return 'Cannot connect to the server.';
    }

    if (typeof error.error === 'string') {
      return error.error;
    }

    if (error.error?.message) {
      return error.error.message;
    }

    return fallback;
  }

  timeSlots = [
    { value: '08:00', label: '8:00 AM' },
    { value: '09:00', label: '9:00 AM' },
    { value: '10:00', label: '10:00 AM' },
    { value: '11:00', label: '11:00 AM' },
    { value: '12:00', label: '12:00 PM' },
    { value: '13:00', label: '1:00 PM' },
    { value: '14:00', label: '2:00 PM' },
    { value: '15:00', label: '3:00 PM' },
    { value: '16:00', label: '4:00 PM' },
    { value: '17:00', label: '5:00 PM' },
    { value: '18:00', label: '6:00 PM' },
    { value: '19:00', label: '7:00 PM' },
    { value: '20:00', label: '8:00 PM' },
    { value: '21:00', label: '9:00 PM' },
    { value: '22:00', label: '10:00 PM' }
  ];
}
