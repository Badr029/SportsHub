import { Component, HostListener, OnDestroy, signal , OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {FormsModule} from '@angular/forms';

import { SportsService } from '../../core/services/sports.service';
import { BookingService } from '../../core/services/booking.service';
import { resolveImageUrl, toLocalDateTime } from '../../core/services/api.config';
import {SportDetails} from '../../models/sport.model';
import { BookingType, CreateBooking, FacilityAvailabilitySlot, EquipmentAvailability, PaymentMethod } from '../../models/booking.model';
import {NavbarComponent} from '../../shared/navbar/navbar.component';
import { QuantityStepperComponent } from '../../shared/quantity-stepper/quantity-stepper.component';

@Component({
  selector: 'app-sport-details',
  imports: [FormsModule, RouterLink, NavbarComponent, QuantityStepperComponent],
  templateUrl: './sport-details.component.html',
  styleUrl: './sport-details.component.css'
})
export class SportDetailsComponent implements OnInit, OnDestroy {
  sport = signal<SportDetails | null>(null);
  loading = signal(true);
  error = signal('');
  success = signal('');
  confirmBookingOpen = signal(false);

  bookingType: BookingType = 1;
  facilityId: number | null = null;
  selectedEquipmentItems: { equipmentId: number; quantity: number }[] = [];
  bookingDate = '';
  startTime = '';
  selectedSlotCount = 0;
  availabilitySlots: FacilityAvailabilitySlot[] = [];
  equipmentAvailability: EquipmentAvailability[] = [];
  pendingBookingRequest: CreateBooking | null = null;
  paymentMethod: PaymentMethod = 'PayOnSite';
  todayDate = this.formatDateInput(new Date());

  ngOnDestroy() {
    document.body.style.overflow = '';
    document.body.classList.remove('modal-open');

    if (this.narrow && this.onWidthChange) {
      this.narrow.removeEventListener('change', this.onWidthChange);
    }

    this.routeSub?.unsubscribe();
  }

  // Which step of the booking panel is expanded. Purely presentational:
  // every field keeps the same binding and the same validation.
  openStep = signal(1);

  hasFacility() {
    return this.facilityId !== null && this.facilityId !== undefined;
  }

  hasTime() {
    return !!this.bookingDate && !!this.startTime && this.selectedSlotCount > 0;
  }

  isStepOpen(step: number) {
    return this.openStep() === step;
  }

  /** A step is reachable once the step before it is satisfied. */
  canOpenStep(step: number) {
    if (step === 2) {
      return this.hasFacility();
    }

    if (step === 3) {
      return this.canChooseGear();
    }

    return true;
  }

  toggleStep(step: number) {
    if (!this.canOpenStep(step)) {
      return;
    }

    this.openStep.set(this.openStep() === step ? 0 : step);
  }

  // --- Package gear ---------------------------------------------------------
  // Presentation helpers only. Pricing (FR-PKG-05) and the stock checks in
  // createBooking() are untouched.

  selectedQtyFor(equipmentId: number) {
    return this.selectedEquipmentItems.find(item => item.equipmentId === equipmentId)?.quantity ?? 0;
  }

  isEquipmentSelected(equipmentId: number) {
    return this.selectedQtyFor(equipmentId) > 0;
  }

  availableFor(equipmentId: number): number | null {
    return this.getEquipmentAvailability(equipmentId)?.availableQuantity ?? null;
  }

  stockPercent(equipmentId: number) {
    const availability = this.getEquipmentAvailability(equipmentId);

    if (!availability || availability.totalQuantity === 0) {
      return 100;
    }

    return Math.round((availability.availableQuantity / availability.totalQuantity) * 100);
  }

  isEquipmentSoldOut(equipmentId: number) {
    return this.availableFor(equipmentId) === 0;
  }

  isAtLimit(equipmentId: number) {
    const available = this.availableFor(equipmentId);
    return available !== null && this.selectedQtyFor(equipmentId) >= available;
  }

  /** Gear can only be priced and stock-checked once the facility time is set. */
  canChooseGear() {
    return this.bookingType === 3 && this.hasFacility() && this.hasTime();
  }

  totalGearCount() {
    return this.selectedEquipmentItems.reduce((sum, item) => sum + item.quantity, 0);
  }

  /** Line cost for one gear row: package hourly price x qty x duration. */
  gearLineTotal(equipmentId: number) {
    const equipment = this.sport()?.equipment.find(item => item.id === equipmentId);
    return (equipment?.packageHourlyPrice ?? 0) * this.selectedQtyFor(equipmentId) * this.selectedDurationHours();
  }

  gearSummary() {
    if (this.selectedEquipmentItems.length === 0) {
      return this.canChooseGear() ? 'No gear added yet' : 'Choose a time first';
    }

    const count = this.totalGearCount();
    return `${count} item${count === 1 ? '' : 's'} across ${this.selectedEquipmentItems.length} type${this.selectedEquipmentItems.length === 1 ? '' : 's'}`;
  }

  facilitySummary() {
    if (!this.hasFacility()) {
      return 'Not chosen yet';
    }

    const facility = this.sport()?.facilities.find(item => item.id === this.facilityId);
    return facility ? `${facility.name} · ${facility.pricePerHour} EGP / hour` : 'Not chosen yet';
  }

  timeSummary() {
    if (!this.hasTime()) {
      return this.bookingDate ? 'No blocks selected' : 'Not chosen yet';
    }

    const day = new Date(`${this.bookingDate}T00:00`)
      .toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

    return `${day} · ${this.selectedStartTimeLabel()} – ${this.selectedEndTimeLabel()}`;
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.confirmBookingOpen()) {
      this.closeBookingConfirmation();
    }
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private sportsService: SportsService,
    private bookingService: BookingService
  ) { }

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.loadSport(id);

    // Narrow screens run the booking as its own full-page flow; wide screens
    // keep the side panel beside the catalogue.
    this.narrow = window.matchMedia('(max-width: 940px)');
    this.compact.set(this.narrow.matches);
    this.onWidthChange = event => this.compact.set(event.matches);
    this.narrow.addEventListener('change', this.onWidthChange);

    // The flow step follows the URL, so Back returns to the facility list.
    this.routeSub = this.route.url.subscribe(segments => {
      const inFlow = segments.some(segment => segment.path === 'book');

      if (!inFlow) {
        this.flowStep.set('choose');
        return;
      }

      if (this.flowStep() === 'choose') {
        this.flowStep.set('configure');
      }
    });
  }

  /** Which part of the booking flow a narrow screen is showing. */
  flowStep = signal<'choose' | 'configure' | 'gear' | 'review'>('choose');
  compact = signal(false);

  private narrow?: MediaQueryList;
  private onWidthChange?: (event: MediaQueryListEvent) => void;
  private routeSub?: { unsubscribe(): void };

  /** Drives the layout: which region the page shows on a narrow screen. */
  layoutStep() {
    return this.compact() ? this.flowStep() : 'wide';
  }

  /**
   * `/sports/:id` and `/sports/:id/book` are different routes, so Angular
   * rebuilds the component on the way in. The choice therefore travels in the
   * URL rather than in memory — which also makes the step refresh-safe and
   * shareable.
   */
  private enterFlow(facilityId: number) {
    if (!this.compact()) {
      return;
    }

    this.flowStep.set('configure');
    this.router.navigate(['/sports', this.sport()?.id, 'book'], {
      queryParams: { facility: facilityId, type: this.bookingType }
    });
  }

  private restoreFlowFromUrl() {
    const params = this.route.snapshot.queryParamMap;
    const facility = Number(params.get('facility'));
    const type = Number(params.get('type'));

    if (!facility) {
      return;
    }

    this.bookingType = (type === 3 ? 3 : 1) as BookingType;
    this.facilityId = facility;
    this.openStep.set(2);
    this.loadFacilityAvailability();
  }

  /** Back out of the flow, returning to the facility list. */
  leaveFlow() {
    this.flowStep.set('choose');
    this.router.navigate(['/sports', this.sport()?.id]);
  }

  /** Package only: gear is chosen after the time, so stock matches the slots. */
  goToGear() {
    if (!this.canChooseGear()) {
      return;
    }

    this.flowStep.set('gear');
  }

  backToConfigure() {
    this.flowStep.set('configure');
  }

  /** True once the flow has everything it needs to be reviewed. */
  canReview() {
    if (!this.hasFacility() || !this.hasTime()) {
      return false;
    }

    return this.bookingType !== 3 || this.selectedEquipmentItems.length > 0;
  }

  loadSport(id: number){
    this.loading.set(true);
    this.error.set('');

    this.sportsService.getSportDetails(id).subscribe({
      next: sport => {
        this.sport.set(sport);
        this.loading.set(false);
        this.restoreFlowFromUrl();
      },
      error: error => {
        if(error.status === 0){
          this.error.set('Cannot connect to the server.');
        }else{
          this.error.set(error.error || 'Failed to load sport.');
        }

        this.loading.set(false);
      }
    })

  }
  getEquipmentAvailability(equipmentId: number) {
    return this.equipmentAvailability.find(item => item.equipmentId === equipmentId);
  }
  addEquipmentItem(equipmentId: number) {
    const existingItem = this.selectedEquipmentItems.find(item => item.equipmentId === equipmentId);
    if (existingItem) {
      existingItem.quantity++;
    } else {
      this.selectedEquipmentItems.push({ equipmentId, quantity: 1 });
    }
    this.loadEquipmentAvailability();
    this.success.set('');
    this.error.set('');
  }

  removeEquipmentItem(equipmentId: number) {
    this.selectedEquipmentItems = this.selectedEquipmentItems.filter(item => item.equipmentId !== equipmentId);
    this.loadEquipmentAvailability();
    this.success.set('');
    this.error.set('');
  }

  updateEquipmentQuantity(equipmentId: number, quantity: number) {
    const item = this.selectedEquipmentItems.find(item => item.equipmentId === equipmentId);
    if (!item) {
      return;
    }

    item.quantity = Number.isFinite(quantity) ? quantity : 1;

    const availability = this.getEquipmentAvailability(equipmentId);

    if (availability && item.quantity > availability.availableQuantity) {
      this.error.set(`Only ${availability.availableQuantity} available for ${this.getEquipmentName(equipmentId)}.`);
      return;
    }

    if (item.quantity < 1) {
      this.error.set('Equipment quantity must be at least 1.');
      return;
    }

    this.error.set('');
  }

  getEquipmentName(equipmentId: number) {
    return this.sport()?.equipment.find(equipment => equipment.id === equipmentId)?.name || 'Equipment';
  }

  getFacilityName() {
    return this.sport()?.facilities.find(facility => facility.id === this.facilityId)?.name || 'Facility';
  }

  selectedEquipmentDetails() {
    return this.selectedEquipmentItems.map(item => ({
      ...item,
      name: this.getEquipmentName(item.equipmentId),
      equipment: this.sport()?.equipment.find(equipment => equipment.id === item.equipmentId)
    }));
  }

  bookingTypeLabel() {
    return this.bookingType === 3 ? 'Package' : this.bookingType === 2 ? 'Equipment' : 'Facility';
  }

  estimatedTotal() {
    const sport = this.sport();

    if (!sport) {
      return 0;
    }

    let total = 0;

    if (this.bookingType === 1 || this.bookingType === 3) {
      const facility = sport.facilities.find(facility => facility.id === this.facilityId);
      total += (facility?.pricePerHour ?? 0) * this.selectedDurationHours();
    }

    if (this.bookingType === 3) {
      for (const item of this.selectedEquipmentItems) {
        const equipment = sport.equipment.find(equipment => equipment.id === item.equipmentId);
        total += (equipment?.packageHourlyPrice ?? 0) * item.quantity * this.selectedDurationHours();
      }
    }

    return total;
  }

  buildFacilityStartDate(): Date {
    return new Date(`${this.bookingDate}T${this.startTime}`);
  }

  buildFacilityEndDate(startDate: Date): Date {
    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + this.selectedSlotCount * 30);
    return endDate;
  }

  loadFacilityAvailability() {
    if (!this.facilityId || !this.bookingDate) {
      this.availabilitySlots = [];
      this.startTime = '';
      this.selectedSlotCount = 0;
      return;
    }

    this.bookingService.getFacilityAvailability(this.facilityId, this.bookingDate, 30).subscribe({
      next: slots => {
        this.availabilitySlots = slots;

        const selectedSlot = slots.find(slot => slot.time === this.startTime);

        if (selectedSlot && !selectedSlot.available) {
          this.startTime = '';
          this.selectedSlotCount = 0;
        }

        this.trimSelectionAtFirstUnavailableSlot();
      },
      error: error => {
        this.availabilitySlots = [];
        this.startTime = '';
        this.selectedSlotCount = 0;

        if (error.status === 0) {
          this.error.set('Cannot connect to the server.');
        } else {
          this.error.set(error.error || 'Failed to load availability.');
        }
      }
    });
  }

  loadEquipmentAvailability() {
    this.equipmentAvailability = [];

    const equipmentIds = this.sport()?.equipment.map(equipment => equipment.id) ?? [];

    if (equipmentIds.length === 0) {
      return;
    }

    let startDate: Date;
    let endDate: Date;

    if (this.bookingType === 3) {
      if (!this.bookingDate || !this.startTime || this.selectedSlotCount === 0) {
        return;
      }

      startDate = this.buildFacilityStartDate();
      endDate = this.buildFacilityEndDate(startDate);
    } else {
      return;
    }

    for (const equipmentId of equipmentIds) {
      this.bookingService
        .getEquipmentAvailability(equipmentId, toLocalDateTime(startDate), toLocalDateTime(endDate))
        .subscribe({
          next: availability => {
            this.equipmentAvailability = [
              ...this.equipmentAvailability.filter(a => a.equipmentId !== availability.equipmentId),
              availability
            ];
          },
          error: error => {
            if (error.status === 0) {
              this.error.set('Cannot connect to the server.');
            } else {
              this.error.set(error.error || 'Failed to load equipment availability.');
            }
          }
        });
    }
  }

  createBooking() {
  this.error.set('');
  this.success.set('');

  if ((this.bookingType === 1 || this.bookingType === 3) &&
      (!this.bookingDate || !this.startTime || this.selectedSlotCount === 0)) {
    this.error.set('Facility date and time slot are required.');
    return;
  }

  if ((this.bookingType === 1 || this.bookingType === 3) && !this.facilityId) {
    this.error.set('Please select a facility.');
    return;
  }

  if (this.bookingType === 3 && this.selectedEquipmentItems.length === 0) {
    this.error.set('Please select at least one equipment item.');
    return;
  }

  if (this.bookingType === 3) {
    const equipmentErrors: string[] = [];

    for (const item of this.selectedEquipmentItems) {
      const availability = this.getEquipmentAvailability(item.equipmentId);

      if (!availability) {
        equipmentErrors.push(
          `Availability is still loading for ${this.getEquipmentName(item.equipmentId)}.`
        );
        continue;
      }

      if (item.quantity < 1) {
        equipmentErrors.push(
          `Quantity for ${this.getEquipmentName(item.equipmentId)} must be at least 1.`
        );
        continue;
      }

      if (item.quantity > availability.availableQuantity) {
        equipmentErrors.push(
          `Only ${availability.availableQuantity} available for ${this.getEquipmentName(item.equipmentId)}.`
        );
      }
    }

    if (equipmentErrors.length > 0) {
      this.error.set(equipmentErrors.join(' '));
      return;
    }
  }

  const selectedSlot = this.availabilitySlots.find(slot => slot.time === this.startTime);

  if ((this.bookingType === 1 || this.bookingType === 3) &&
      (!selectedSlot || !selectedSlot.available || !this.isSelectedRangeAvailable())) {
    this.error.set('Selected time range overlaps an occupied slot.');
    return;
  }

  let startDate!: Date;
  let endDate!: Date;
  let pickupDate: Date | null = null;
  let returnDate: Date | null = null;

  if (this.bookingType === 1 || this.bookingType === 3) {
    startDate = this.buildFacilityStartDate();
    endDate = this.buildFacilityEndDate(startDate);

    if (startDate <= new Date()) {
      this.error.set('You cannot book a time that has already passed.');
      return;
    }

    if (this.bookingType === 3) {
      pickupDate = startDate;
      returnDate = endDate;
    }
  }

  const request: CreateBooking = {
    bookingType: this.bookingType,
    facilityId: this.facilityId,
    startDate: this.formatLocalDateTime(startDate),
    endDate: this.formatLocalDateTime(endDate),
    pickupDate: pickupDate ? this.formatLocalDateTime(pickupDate) : null,
    returnDate: returnDate ? this.formatLocalDateTime(returnDate) : null,
    equipmentItems: this.bookingType === 1 ? [] : this.selectedEquipmentItems,
    paymentMethod: this.paymentMethod
  };

  this.pendingBookingRequest = request;
  this.confirmBookingOpen.set(true);

  // On a narrow screen the review is a page of its own, so the body must keep
  // scrolling; only the wide-screen dialog locks it.
  if (this.compact()) {
    this.flowStep.set('review');
    window.scrollTo({ top: 0 });
    return;
  }

  document.body.style.overflow = 'hidden';
  document.body.classList.add('modal-open');
  }

  confirmCreateBooking() {
    if (!this.pendingBookingRequest) {
      return;
    }

    this.pendingBookingRequest = {
      ...this.pendingBookingRequest,
      paymentMethod: this.paymentMethod
    };

    this.bookingService.createBooking(this.pendingBookingRequest).subscribe({
      next: booking => {
        this.closeBookingConfirmation();

        if (booking.paymentMethod === 'Online' && booking.paymentId) {
          this.router.navigate(['/payment', booking.paymentId]);
          return;
        }

        this.success.set('Booking created successfully. Payment will be collected onsite.');
      },
      error: error => {
        if (error.status === 0) {
          this.error.set('Cannot connect to the server.');
        } else {
          this.error.set(error.error || 'Failed to create booking.');
        }
      }
    });
  }

  closeBookingConfirmation() {
    this.confirmBookingOpen.set(false);
    this.pendingBookingRequest = null;
    document.body.style.overflow = '';
    document.body.classList.remove('modal-open');

    // Back from the review returns to the step that produced it, not to the
    // catalogue: the selection is still intact and usually needs a small edit.
    if (this.compact() && this.flowStep() === 'review') {
      this.flowStep.set(this.bookingType === 3 ? 'gear' : 'configure');
    }
  }

  selectFacilityBooking(facilityId: number){
    const facility = this.sport()?.facilities.find(facility => facility.id === facilityId);

    if (facility?.isOutOfService) {
      this.error.set('This facility is currently out of service.');
      return;
    }

    this.bookingType = 1;
    this.facilityId = facilityId;
    this.selectedEquipmentItems = [];
    this.startTime = '';
    this.selectedSlotCount = 0;
    this.openStep.set(2);
    this.loadFacilityAvailability();
    this.success.set('');
    this.error.set('');
    this.enterFlow(facilityId);
  }

  startPackageWithFacility(facilityId: number){
    const facility = this.sport()?.facilities.find(facility => facility.id === facilityId);

    if (facility?.isOutOfService) {
      this.error.set('This facility is currently out of service.');
      return;
    }

    this.bookingType = 3;
    this.facilityId = facilityId;
    this.startTime = '';
    this.selectedSlotCount = 0;
    this.openStep.set(2);
    this.loadFacilityAvailability();
    this.success.set('');
    this.error.set('');
    this.enterFlow(facilityId);
  }

  cancelPackage() {
    this.bookingType = 1;
    this.selectedEquipmentItems = [];
    this.equipmentAvailability = [];
    this.success.set('');
    this.error.set('');
  }

  addEquipmentToPackage(equipmentId: number) {
    this.bookingType = 3;
    this.addEquipmentItem(equipmentId);
  }

  selectTimeSlot(slot: FacilityAvailabilitySlot) {
    if (!slot.available) {
      return;
    }

    if (!this.startTime) {
      this.startTime = slot.time;
      this.selectedSlotCount = 1;
      this.loadEquipmentAvailability();
      return;
    }

    const startIndex = this.availabilitySlots.findIndex(item => item.time === this.startTime);
    const clickedIndex = this.availabilitySlots.findIndex(item => item.time === slot.time);

    if (slot.time === this.startTime) {
      this.startTime = '';
      this.selectedSlotCount = 0;
      this.loadEquipmentAvailability();
      return;
    }

    if (clickedIndex < startIndex) {
      this.startTime = slot.time;
      this.selectedSlotCount = 1;
      this.loadEquipmentAvailability();
      return;
    }

    const range = this.availabilitySlots.slice(startIndex, clickedIndex + 1);

    if (range.length > 12) {
      this.error.set('Facility bookings can be up to 6 hours.');
      return;
    }

    if (range.some(item => !item.available)) {
      this.error.set('This range crosses an occupied time slot.');
      return;
    }

    this.selectedSlotCount = range.length;
    this.error.set('');
    this.loadEquipmentAvailability();
  }

  // The API reports past and occupied slots identically (available: false),
  // so the two are separated here to keep the reason for a blocked slot visible.
  isSlotPast(slot: FacilityAvailabilitySlot) {
    if (!this.bookingDate) {
      return false;
    }

    return new Date(`${this.bookingDate}T${slot.time}`).getTime() <= Date.now();
  }

  slotStatusLabel(slot: FacilityAvailabilitySlot) {
    if (this.isSlotSelected(slot)) {
      return 'Selected';
    }

    if (this.isSlotPast(slot)) {
      return 'Past';
    }

    if (!slot.available) {
      return 'Booked';
    }

    if (this.isSlotBlockedBySelection(slot)) {
      return 'Blocked';
    }

    return 'Free';
  }

  isSlotRangeStart(slot: FacilityAvailabilitySlot) {
    return this.isSlotSelected(slot) && slot.time === this.startTime;
  }

  isSlotRangeEnd(slot: FacilityAvailabilitySlot) {
    if (!this.isSlotSelected(slot)) {
      return false;
    }

    const startIndex = this.availabilitySlots.findIndex(item => item.time === this.startTime);
    const slotIndex = this.availabilitySlots.findIndex(item => item.time === slot.time);

    return slotIndex === startIndex + this.selectedSlotCount - 1;
  }

  freeSlotCount() {
    return this.availabilitySlots.filter(slot => slot.available).length;
  }

  isSlotSelected(slot: FacilityAvailabilitySlot) {
    const startIndex = this.availabilitySlots.findIndex(item => item.time === this.startTime);
    const slotIndex = this.availabilitySlots.findIndex(item => item.time === slot.time);

    return startIndex >= 0 &&
      slotIndex >= startIndex &&
      slotIndex < startIndex + this.selectedSlotCount;
  }

  isSlotBlockedBySelection(slot: FacilityAvailabilitySlot) {
    if (!this.startTime || !slot.available) {
      return false;
    }

    const startIndex = this.availabilitySlots.findIndex(item => item.time === this.startTime);
    const slotIndex = this.availabilitySlots.findIndex(item => item.time === slot.time);

    return slotIndex > startIndex && this.availabilitySlots
      .slice(startIndex, slotIndex + 1)
      .some(item => !item.available);
  }

  isSelectedRangeAvailable() {
    const startIndex = this.availabilitySlots.findIndex(item => item.time === this.startTime);

    if (startIndex < 0 || this.selectedSlotCount <= 0) {
      return false;
    }

    const range = this.availabilitySlots.slice(startIndex, startIndex + this.selectedSlotCount);
    return range.length === this.selectedSlotCount && range.every(item => item.available);
  }

  trimSelectionAtFirstUnavailableSlot() {
    if (!this.startTime || this.selectedSlotCount === 0) {
      return;
    }

    const startIndex = this.availabilitySlots.findIndex(item => item.time === this.startTime);

    if (startIndex < 0) {
      this.startTime = '';
      this.selectedSlotCount = 0;
      return;
    }

    const range = this.availabilitySlots.slice(startIndex, startIndex + this.selectedSlotCount);
    const firstUnavailableIndex = range.findIndex(item => !item.available);

    if (firstUnavailableIndex >= 0) {
      this.selectedSlotCount = firstUnavailableIndex;
    }

    if (this.selectedSlotCount === 0) {
      this.startTime = '';
    }
  }

  selectedDurationHours() {
    return this.selectedSlotCount / 2;
  }

  selectedEndTimeLabel() {
    if (!this.bookingDate || !this.startTime || this.selectedSlotCount === 0) {
      return '';
    }

    return this.formatTimeLabel(this.buildFacilityEndDate(this.buildFacilityStartDate()));
  }

  selectedStartTimeLabel() {
    if (!this.bookingDate || !this.startTime) {
      return '';
    }

    return this.formatTimeLabel(this.buildFacilityStartDate());
  }

  formatTimeLabel(date: Date) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  formatLocalDateTime(date: Date) {
    const pad = (value: number) => value.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
  }

  formatDateInput(date: Date) {
    const pad = (value: number) => value.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  getImageUrl(imageUrl?: string | null) {
    return resolveImageUrl(imageUrl);
  }
}


