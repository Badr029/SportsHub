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

  bookingType: BookingType = 1;
  facilityId: number | null = null;
  equipmentToAddId: number | null = null;
  selectedEquipmentItems: { equipmentId: number; quantity: number }[] = [];
  bookingDate = '';
  startTime = '';
  durationHours = 1;
  pickupDate = '';
  pickupTime = '';
  availabilitySlots: FacilityAvailabilitySlot[] = [];
  equipmentAvailability: EquipmentAvailability[] = [];

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
    endDate.setHours(endDate.getHours() + Number(this.durationHours));
    return endDate;
  }

  buildPickupDate(): Date {
    return new Date(`${this.pickupDate}T${this.pickupTime}`);
  }

  loadFacilityAvailability() {
    if (!this.facilityId || !this.bookingDate || !this.durationHours) {
      this.availabilitySlots = [];
      this.startTime = '';
      return;
    }

    this.bookingService.getFacilityAvailability(this.facilityId, this.bookingDate, this.durationHours).subscribe({
      next: slots => {
        this.availabilitySlots = slots;

        const selectedSlot = slots.find(slot => slot.time === this.startTime);

        if (selectedSlot && !selectedSlot.available) {
          this.startTime = '';
        }
      },
      error: error => {
        this.availabilitySlots = [];
        this.startTime = '';

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
      if (!this.bookingDate || !this.startTime) {
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
      (!this.bookingDate || !this.startTime)) {
    this.error.set('Facility date and start time are required.');
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
      selectedSlot &&
      !selectedSlot.available) {
    this.error.set('This time is already occupied.');
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
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    pickupDate: pickupDate ? pickupDate.toISOString() : null,
    returnDate: returnDate ? returnDate.toISOString() : null,
    equipmentItems: this.bookingType === 1 ? [] : this.selectedEquipmentItems
  };

  this.bookingService.createBooking(request).subscribe({
      next: booking => {
        this.success.set('Booking created successfully. Status: ' + booking.status);
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

  selectFacilityBooking(facilityId: number){
    const facility = this.sport()?.facilities.find(facility => facility.id === facilityId);

    if (facility?.isOutOfService) {
      this.error.set('This facility is currently out of service.');
      return;
    }

    this.bookingType = 1;
    this.facilityId = facilityId;
    this.selectedEquipmentItems = [];
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
    this.loadFacilityAvailability();
    this.success.set('');
    this.error.set('');
  }

  addEquipmentToPackage(equipmentId: number) {
    this.bookingType = 3;
    this.addEquipmentItem(equipmentId);
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


