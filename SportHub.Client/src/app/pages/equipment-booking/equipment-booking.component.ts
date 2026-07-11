import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { Router } from '@angular/router';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { SportsService } from '../../core/services/sports.service';
import { BookingService } from '../../core/services/booking.service';
import { resolveImageUrl } from '../../core/services/api.config';
import { Equipment, Sport, SportDetails } from '../../models/sport.model';
import { BookingEquipmentItem, CreateBooking, EquipmentAvailability, PaymentMethod } from '../../models/booking.model';

interface EquipmentCard extends Equipment {
  sportId: number;
  sportName: string;
}

@Component({
  selector: 'app-equipment-booking',
  imports: [FormsModule, NavbarComponent],
  templateUrl: './equipment-booking.component.html',
  styleUrl: './equipment-booking.component.css'
})
export class EquipmentBookingComponent implements OnInit {
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
    private router: Router
  ) { }

  ngOnInit() {
    this.loadEquipment();
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
    const availability = this.getAvailability(equipmentId);
    const maxQuantity = availability?.availableQuantity ?? this.getEquipment(equipmentId)?.quantity ?? 1;
    const nextQuantity = Math.max(1, Math.min(Number(quantity) || 1, maxQuantity));

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
      this.bookingService.getEquipmentAvailability(id, startDate.toISOString(), endDate.toISOString())
    )).subscribe({
      next: availability => {
        this.availability.set(availability);
        this.clampSelectedQuantities();
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

    for (const item of this.selectedEquipmentItems) {
      const availability = this.getAvailability(item.equipmentId);

      if (availability && item.quantity > availability.availableQuantity) {
        this.error.set(`${this.getEquipmentName(item.equipmentId)} has only ${availability.availableQuantity} available.`);
        return;
      }
    }

    const pickupDate = new Date(`${this.pickupDate}T${this.pickupTime}`);
    const returnDate = new Date(pickupDate);
    returnDate.setDate(returnDate.getDate() + 1);

    const request: CreateBooking = {
      bookingType: 2,
      facilityId: null,
      startDate: pickupDate.toISOString(),
      endDate: returnDate.toISOString(),
      pickupDate: pickupDate.toISOString(),
      returnDate: returnDate.toISOString(),
      equipmentItems: this.selectedEquipmentItems,
      paymentMethod: this.paymentMethod
    };

    this.bookingService.createBooking(request).subscribe({
      next: booking => {
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

  clampSelectedQuantities() {
    this.selectedEquipmentItems = this.selectedEquipmentItems.map(item => {
      const availability = this.getAvailability(item.equipmentId);

      if (!availability) {
        return item;
      }

      return {
        ...item,
        quantity: Math.max(1, Math.min(item.quantity, availability.availableQuantity))
      };
    });
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
