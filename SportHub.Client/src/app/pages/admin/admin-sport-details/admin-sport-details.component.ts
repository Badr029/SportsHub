import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NavbarComponent } from '../../../shared/navbar/navbar.component';
import { AdminService } from '../../../core/services/admin.service';
import { resolveImageUrl } from '../../../core/services/api.config';
import {
  AdminEquipment,
  AdminFacility,
  EquipmentRequest,
  FacilityRequest,
  Sport,
  SportRequest
} from '../../../models/sport.model';

@Component({
  selector: 'app-admin-sport-details',
  imports: [FormsModule, RouterLink, NavbarComponent],
  templateUrl: './admin-sport-details.component.html',
  styleUrl: './admin-sport-details.component.css'
})
export class AdminSportDetailsComponent implements OnInit {
  sport = signal<Sport | null>(null);
  facilities = signal<AdminFacility[]>([]);
  equipment = signal<AdminEquipment[]>([]);
  loading = signal(true);
  error = signal('');
  success = signal('');
  sportEditorOpen = signal(false);
  facilityEditorOpen = signal(false);
  equipmentEditorOpen = signal(false);
  sportId = 0;
  editingFacilityId: number | null = null;
  editingEquipmentId: number | null = null;

  sportForm: SportRequest = {
    name: '',
    description: '',
    imageUrl: ''
  };

  facilityForm: FacilityRequest = this.createEmptyFacilityForm();
  equipmentForm: EquipmentRequest = this.createEmptyEquipmentForm();

  constructor(
    private route: ActivatedRoute,
    private adminService: AdminService
  ) { }

  ngOnInit() {
    this.sportId = Number(this.route.snapshot.paramMap.get('id'));
    this.facilityForm.sportId = this.sportId;
    this.equipmentForm.sportId = this.sportId;
    this.loadPageData();
  }

  loadPageData() {
    this.loading.set(true);
    this.error.set('');
    this.success.set('');

    this.adminService.getSports().subscribe({
      next: sports => {
        const sport = sports.find(item => item.id === this.sportId) ?? null;
        this.sport.set(sport);

        if (sport) {
          this.sportForm = {
            name: sport.name,
            description: sport.description,
            imageUrl: sport.imageUrl
          };
        }

        this.loadFacilities();
        this.loadEquipment();
      },
      error: error => {
        this.loading.set(false);
        this.error.set(this.getErrorMessage(error, 'Failed to load sport.'));
      }
    });
  }

  loadFacilities() {
    this.adminService.getFacilities().subscribe({
      next: facilities => {
        this.facilities.set(facilities.filter(facility => facility.sport.id === this.sportId));
      },
      error: error => {
        this.error.set(this.getErrorMessage(error, 'Failed to load facilities.'));
      }
    });
  }

  loadEquipment() {
    this.adminService.getEquipment().subscribe({
      next: equipment => {
        this.equipment.set(equipment.filter(item => item.sport.id === this.sportId));
        this.loading.set(false);
      },
      error: error => {
        this.loading.set(false);
        this.error.set(this.getErrorMessage(error, 'Failed to load equipment.'));
      }
    });
  }

  saveSport() {
    this.error.set('');
    this.success.set('');

    if (!this.sportForm.name.trim()) {
      this.error.set('Sport name is required.');
      return;
    }

    this.adminService.updateSport(this.sportId, {
      name: this.sportForm.name.trim(),
      description: this.sportForm.description.trim(),
      imageUrl: this.sportForm.imageUrl?.trim() || null
    }).subscribe({
      next: sport => {
        this.sport.set(sport);
        this.success.set('Sport updated.');
        this.sportEditorOpen.set(false);
      },
      error: error => {
        this.error.set(this.getErrorMessage(error, 'Failed to update sport.'));
      }
    });
  }

  saveFacility() {
    this.error.set('');
    this.success.set('');

    if (!this.facilityForm.name.trim()) {
      this.error.set('Facility name is required.');
      return;
    }

    if (this.facilityForm.pricePerHour <= 0) {
      this.error.set('Price per hour must be greater than 0.');
      return;
    }

    const request: FacilityRequest = {
      sportId: this.sportId,
      name: this.facilityForm.name.trim(),
      pricePerHour: Number(this.facilityForm.pricePerHour),
      imageUrl: this.facilityForm.imageUrl?.trim() || null,
      isOutOfService: this.facilityForm.isOutOfService
    };

    const action = this.editingFacilityId
      ? this.adminService.updateFacility(this.editingFacilityId, request)
      : this.adminService.createFacility(request);

    action.subscribe({
      next: () => {
        this.success.set(this.editingFacilityId ? 'Facility updated.' : 'Facility created.');
        this.resetFacilityForm();
        this.loadFacilities();
      },
      error: error => {
        this.error.set(this.getErrorMessage(error, 'Failed to save facility.'));
      }
    });
  }

  editFacility(facility: AdminFacility) {
    this.clearMessages();
    this.editingFacilityId = facility.id;
    this.facilityForm = {
      sportId: this.sportId,
      name: facility.name,
      pricePerHour: facility.pricePerHour,
      imageUrl: facility.imageUrl,
      isOutOfService: facility.isOutOfService
    };
    this.facilityEditorOpen.set(true);
  }

  openSportEditor() {
    this.clearMessages();
    const sport = this.sport();

    if (sport) {
      this.sportForm = {
        name: sport.name,
        description: sport.description,
        imageUrl: sport.imageUrl
      };
    }

    this.sportEditorOpen.set(true);
  }

  openAddFacility() {
    this.clearMessages();
    this.resetFacilityForm();
    this.facilityEditorOpen.set(true);
  }

  deleteFacility(id: number) {
    this.clearMessages();
    this.adminService.deleteFacility(id).subscribe({
      next: () => {
        this.success.set('Facility deleted.');
        this.loadFacilities();
      },
      error: error => {
        this.error.set(this.getErrorMessage(error, 'Failed to delete facility.'));
      }
    });
  }

  uploadSportImage(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    this.adminService.uploadImage(file).subscribe({
      next: result => {
        this.sportForm.imageUrl = result.imageUrl;
        this.success.set('Sport image uploaded.');
      },
      error: error => {
        this.error.set(this.getErrorMessage(error, 'Failed to upload sport image.'));
      }
    });
  }

  uploadFacilityImage(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    this.adminService.uploadImage(file).subscribe({
      next: result => {
        this.facilityForm.imageUrl = result.imageUrl;
        this.success.set('Facility image uploaded.');
      },
      error: error => {
        this.error.set(this.getErrorMessage(error, 'Failed to upload facility image.'));
      }
    });
  }

  saveEquipment() {
    this.error.set('');
    this.success.set('');

    if (!this.equipmentForm.name.trim()) {
      this.error.set('Equipment name is required.');
      return;
    }

    if (this.equipmentForm.quantity < 0) {
      this.error.set('Quantity cannot be negative.');
      return;
    }

    if (this.equipmentForm.dailyRentalPrice <= 0 || this.equipmentForm.packageHourlyPrice <= 0) {
      this.error.set('Prices must be greater than 0.');
      return;
    }

    const request: EquipmentRequest = {
      sportId: this.sportId,
      name: this.equipmentForm.name.trim(),
      quantity: Number(this.equipmentForm.quantity),
      imageUrl: this.equipmentForm.imageUrl?.trim() || null,
      dailyRentalPrice: Number(this.equipmentForm.dailyRentalPrice),
      packageHourlyPrice: Number(this.equipmentForm.packageHourlyPrice)
    };

    const action = this.editingEquipmentId
      ? this.adminService.updateEquipment(this.editingEquipmentId, request)
      : this.adminService.createEquipment(request);

    action.subscribe({
      next: () => {
        this.success.set(this.editingEquipmentId ? 'Equipment updated.' : 'Equipment created.');
        this.resetEquipmentForm();
        this.loadEquipment();
      },
      error: error => {
        this.error.set(this.getErrorMessage(error, 'Failed to save equipment.'));
      }
    });
  }

  editEquipment(item: AdminEquipment) {
    this.clearMessages();
    this.editingEquipmentId = item.id;
    this.equipmentForm = {
      sportId: this.sportId,
      name: item.name,
      quantity: item.quantity,
      imageUrl: item.imageUrl,
      dailyRentalPrice: item.dailyRentalPrice,
      packageHourlyPrice: item.packageHourlyPrice
    };
    this.equipmentEditorOpen.set(true);
  }

  openAddEquipment() {
    this.clearMessages();
    this.resetEquipmentForm();
    this.equipmentEditorOpen.set(true);
  }

  deleteEquipment(id: number) {
    this.clearMessages();
    this.adminService.deleteEquipment(id).subscribe({
      next: () => {
        this.success.set('Equipment deleted.');
        this.loadEquipment();
      },
      error: error => {
        this.error.set(this.getErrorMessage(error, 'Failed to delete equipment.'));
      }
    });
  }

  uploadEquipmentImage(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    this.adminService.uploadImage(file).subscribe({
      next: result => {
        this.equipmentForm.imageUrl = result.imageUrl;
        this.success.set('Equipment image uploaded.');
      },
      error: error => {
        this.error.set(this.getErrorMessage(error, 'Failed to upload equipment image.'));
      }
    });
  }

  resetFacilityForm() {
    this.editingFacilityId = null;
    this.facilityForm = this.createEmptyFacilityForm();
    this.facilityEditorOpen.set(false);
  }

  resetEquipmentForm() {
    this.editingEquipmentId = null;
    this.equipmentForm = this.createEmptyEquipmentForm();
    this.equipmentEditorOpen.set(false);
  }

  closeSportEditor() {
    this.sportEditorOpen.set(false);
  }

  clearMessages() {
    this.error.set('');
    this.success.set('');
  }

  createEmptyFacilityForm(): FacilityRequest {
    return {
      sportId: this.sportId || null,
      name: '',
      pricePerHour: 0,
      imageUrl: '',
      isOutOfService: false
    };
  }

  createEmptyEquipmentForm(): EquipmentRequest {
    return {
      sportId: this.sportId || null,
      name: '',
      quantity: 0,
      imageUrl: '',
      dailyRentalPrice: 0,
      packageHourlyPrice: 0
    };
  }

  getErrorMessage(error: any, fallback: string) {
    if (typeof error.error === 'string') {
      return error.error;
    }

    if (error.error?.message) {
      return error.error.message;
    }

    if (error.message) {
      return error.message;
    }

    return fallback;
  }

  getImageUrl(imageUrl?: string | null) {
    return resolveImageUrl(imageUrl);
  }
}
