import { Component, signal , OnInit } from '@angular/core';
import {ActivatedRoute, RouterLink } from '@angular/router';
import {FormsModule} from '@angular/forms';

import { SportsService } from '../../core/services/sports.service';
import { BookingService } from '../../core/services/booking.service';
import { resolveImageUrl } from '../../core/services/api.config';
import {SportDetails} from '../../models/sport.model';
import {BookingType, CreateBooking, FacilityAvailabilitySlot, EquipmentAvailability} from '../../models/booking.model';
import {NavbarComponent} from '../../shared/navbar/navbar.component';

@Component({
  selector: 'app-sport-details',
  imports: [FormsModule, RouterLink, NavbarComponent],
  templateUrl: './sport-details.component.html',
  styleUrl: './sport-details.component.css'
})
export class SportDetailsComponent implements OnInit {
  sport = signal<SportDetails | null>(null);
  loading = signal(true);
  error = signal('');
  success = signal('');
  confirmBookingOpen = signal(false);

  bookingType: BookingType = 1;
  facilityId: number | null = null;
  equipmentToAddId: number | null = null;
  selectedEquipmentItems: { equipmentId: number; quantity: number }[] = [];
  bookingDate = '';
  startTime = '';
  selectedSlotCount = 0;
  pickupDate = '';
  pickupTime = '';
  availabilitySlots: FacilityAvailabilitySlot[] = [];
  equipmentAvailability: EquipmentAvailability[] = [];
  pendingBookingRequest: CreateBooking | null = null;

  constructor(
    private route: ActivatedRoute,
    private sportsService: SportsService,
    private bookingService: BookingService
  ) { }

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.loadSport(id);
  }

  loadSport(id: number){
    this.loading.set(true);
    this.error.set('');

    this.sportsService.getSportDetails(id).subscribe({
      next: sport => {
        this.sport.set(sport);
        this.loading.set(false);
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

    item.quantity = quantity < 1 ? 1 : quantity;

    const availability = this.getEquipmentAvailability(equipmentId);

    if (availability && item.quantity > availability.availableQuantity) {
      item.quantity = availability.availableQuantity;
    }
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

    if (this.bookingType === 2) {
      for (const item of this.selectedEquipmentItems) {
        const equipment = sport.equipment.find(equipment => equipment.id === item.equipmentId);
        total += (equipment?.dailyRentalPrice ?? 0) * item.quantity;
      }
    }

    return total;
  }

  addEquipmentFromPanel() {
  if (!this.equipmentToAddId) {
    this.error.set('Please select equipment to add.');
    return;
  }

  this.addEquipmentItem(this.equipmentToAddId);
  this.equipmentToAddId = null;
  }
  buildFacilityStartDate(): Date {
    return new Date(`${this.bookingDate}T${this.startTime}`);
  }

  buildFacilityEndDate(startDate: Date): Date {
    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + this.selectedSlotCount * 30);
    return endDate;
  }

  buildPickupDate(): Date {
    return new Date(`${this.pickupDate}T${this.pickupTime}`);
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

    if (this.bookingType === 2) {
      if (!this.pickupDate) {
        return;
      }

      startDate = new Date(this.pickupDate);
      startDate.setHours(0, 0, 0, 0);

      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
    } else if (this.bookingType === 3) {
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
        .getEquipmentAvailability(equipmentId, startDate.toISOString(), endDate.toISOString())
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

  if (this.bookingType === 2 && (!this.pickupDate || !this.pickupTime)) {
    this.error.set('Pickup date and time are required.');
    return;
  }

  if ((this.bookingType === 1 || this.bookingType === 3) && !this.facilityId) {
    this.error.set('Please select a facility.');
    return;
  }

  if ((this.bookingType === 2 || this.bookingType === 3) &&
      this.selectedEquipmentItems.length === 0) {
    this.error.set('Please select at least one equipment item.');
    return;
  }

  const selectedSlot = this.availabilitySlots.find(slot => slot.time === this.startTime);

  if ((this.bookingType === 1 || this.bookingType === 3) &&
      (!selectedSlot || !selectedSlot.available || !this.isSelectedRangeAvailable())) {
    this.error.set('Selected time range overlaps an occupied slot.');
    return;
  }

  let startDate: Date;
  let endDate: Date;
  let pickupDate: Date | null = null;
  let returnDate: Date | null = null;

  if (this.bookingType === 1 || this.bookingType === 3) {
    startDate = this.buildFacilityStartDate();
    endDate = this.buildFacilityEndDate(startDate);

    if (this.bookingType === 3) {
      pickupDate = startDate;
      returnDate = endDate;
    }
  } else {
    pickupDate = this.buildPickupDate();
    startDate = pickupDate;

    endDate = new Date(pickupDate);
    endDate.setDate(endDate.getDate() + 1);

    returnDate = endDate;
  }

  const request: CreateBooking = {
    bookingType: this.bookingType,
    facilityId: this.bookingType === 2 ? null : this.facilityId,
    startDate: this.bookingType === 2 ? startDate.toISOString() : this.formatLocalDateTime(startDate),
    endDate: this.bookingType === 2 ? endDate.toISOString() : this.formatLocalDateTime(endDate),
    pickupDate: pickupDate ? (this.bookingType === 2 ? pickupDate.toISOString() : this.formatLocalDateTime(pickupDate)) : null,
    returnDate: returnDate ? (this.bookingType === 2 ? returnDate.toISOString() : this.formatLocalDateTime(returnDate)) : null,
    equipmentItems: this.bookingType === 1 ? [] : this.selectedEquipmentItems
  };

  this.pendingBookingRequest = request;
  this.confirmBookingOpen.set(true);
  }

  confirmCreateBooking() {
    if (!this.pendingBookingRequest) {
      return;
    }

    this.bookingService.createBooking(this.pendingBookingRequest).subscribe({
      next: booking => {
        this.success.set('Booking created successfully. Status: ' + booking.status);
        this.closeBookingConfirmation();
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
    this.loadFacilityAvailability();
    this.success.set('');
    this.error.set('');
  }


  selectEquipmentBooking(equipmentId: number){
    this.bookingType = 2;
    this.facilityId = null;
    this.addEquipmentItem(equipmentId);
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
    this.loadFacilityAvailability();
    this.success.set('');
    this.error.set('');
  }

  cancelPackage() {
    this.bookingType = 1;
    this.selectedEquipmentItems = [];
    this.equipmentToAddId = null;
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

  getImageUrl(imageUrl?: string | null) {
    return resolveImageUrl(imageUrl);
  }

timeSlots = [
  { value: '08:00', label: '8:00 AM' },
  { value: '08:30', label: '8:30 AM' },
  { value: '09:00', label: '9:00 AM' },
  { value: '09:30', label: '9:30 AM' },
  { value: '10:00', label: '10:00 AM' },
  { value: '10:30', label: '10:30 AM' },
  { value: '11:00', label: '11:00 AM' },
  { value: '11:30', label: '11:30 AM' },
  { value: '12:00', label: '12:00 PM' },
  { value: '12:30', label: '12:30 PM' },
  { value: '13:00', label: '1:00 PM' },
  { value: '13:30', label: '1:30 PM' },
  { value: '14:00', label: '2:00 PM' },
  { value: '14:30', label: '2:30 PM' },
  { value: '15:00', label: '3:00 PM' },
  { value: '15:30', label: '3:30 PM' },
  { value: '16:00', label: '4:00 PM' },
  { value: '16:30', label: '4:30 PM' },
  { value: '17:00', label: '5:00 PM' },
  { value: '17:30', label: '5:30 PM' },
  { value: '18:00', label: '6:00 PM' },
  { value: '18:30', label: '6:30 PM' },
  { value: '19:00', label: '7:00 PM' },
  { value: '19:30', label: '7:30 PM' },
  { value: '20:00', label: '8:00 PM' },
  { value: '20:30', label: '8:30 PM' },
  { value: '21:00', label: '9:00 PM' },
  { value: '21:30', label: '9:30 PM' },
  { value: '22:00', label: '10:00 PM' }
  ];

}


