import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../../../shared/navbar/navbar.component';
import { AdminService } from '../../../core/services/admin.service';
import { SportsService } from '../../../core/services/sports.service';
import { resolveImageUrl } from '../../../core/services/api.config';
import { AdminEquipment, EquipmentRequest, Sport } from '../../../models/sport.model';

@Component({
  selector: 'app-admin-equipment',
  imports: [FormsModule, NavbarComponent],
  templateUrl: './admin-equipment.component.html',
  styleUrl: './admin-equipment.component.css'
})
export class AdminEquipmentComponent implements OnInit {
  equipment = signal<AdminEquipment[]>([]);
  sports = signal<Sport[]>([]);
  loading = signal(true);
  error = signal('');
  success = signal('');
  editorOpen = signal(false);
  editingId: number | null = null;

  form: EquipmentRequest = this.createEmptyForm();

  constructor(
    private adminService: AdminService,
    private sportsService: SportsService
  ) { }

  ngOnInit() {
    this.loadPageData();
  }

  loadPageData() {
    this.loading.set(true);
    this.error.set('');
    this.success.set('');

    this.loadSports();
    this.loadEquipment();
  }

  loadSports() {
    this.sportsService.getSports().subscribe({
      next: sports => {
        this.sports.set(sports);
      },
      error: error => {
        this.error.set(this.getErrorMessage(error, 'Failed to load sports.'));
      }
    });
  }

  loadEquipment() {
    this.adminService.getEquipment().subscribe({
      next: equipment => {
        this.equipment.set(equipment);
        this.loading.set(false);
      },
      error: error => {
        if (error.status === 0) {
          this.error.set('Cannot connect to the server.');
        } else {
          this.error.set(this.getErrorMessage(error, 'Failed to load equipment.'));
        }

        this.loading.set(false);
      }
    });
  }

  saveEquipment() {
    this.error.set('');
    this.success.set('');

    if (!this.form.sportId) {
      this.error.set('Sport is required.');
      return;
    }

    if (!this.form.name.trim()) {
      this.error.set('Equipment name is required.');
      return;
    }

    if (this.form.quantity < 0) {
      this.error.set('Quantity cannot be negative.');
      return;
    }

    if (this.form.dailyRentalPrice <= 0 || this.form.packageHourlyPrice <= 0) {
      this.error.set('Prices must be greater than 0.');
      return;
    }

    const request: EquipmentRequest = {
      sportId: Number(this.form.sportId),
      name: this.form.name.trim(),
      quantity: Number(this.form.quantity),
      imageUrl: this.form.imageUrl?.trim() || null,
      dailyRentalPrice: Number(this.form.dailyRentalPrice),
      packageHourlyPrice: Number(this.form.packageHourlyPrice)
    };

    const action = this.editingId
      ? this.adminService.updateEquipment(this.editingId, request)
      : this.adminService.createEquipment(request);

    action.subscribe({
      next: () => {
        this.success.set(this.editingId ? 'Equipment updated.' : 'Equipment created.');
        this.resetForm();
        this.loadEquipment();
      },
      error: error => {
        if (error.status === 0) {
          this.error.set('Cannot connect to the server.');
        } else {
          this.error.set(this.getErrorMessage(error, 'Failed to save equipment.'));
        }
      }
    });
  }

  editEquipment(equipment: AdminEquipment) {
    this.editingId = equipment.id;
    this.form = {
      sportId: equipment.sport.id,
      name: equipment.name,
      quantity: equipment.quantity,
      imageUrl: equipment.imageUrl,
      dailyRentalPrice: equipment.dailyRentalPrice,
      packageHourlyPrice: equipment.packageHourlyPrice
    };
    this.error.set('');
    this.success.set('');
    this.editorOpen.set(true);
  }

  openAddEquipment() {
    this.resetForm();
    this.error.set('');
    this.success.set('');
    this.editorOpen.set(true);
  }

  deleteEquipment(id: number) {
    this.error.set('');
    this.success.set('');

    this.adminService.deleteEquipment(id).subscribe({
      next: () => {
        this.success.set('Equipment deleted.');
        this.loadEquipment();
      },
      error: error => {
        if (error.status === 0) {
          this.error.set('Cannot connect to the server.');
        } else {
          this.error.set(this.getErrorMessage(error, 'Failed to delete equipment.'));
        }
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
        this.form.imageUrl = result.imageUrl;
        this.success.set('Image uploaded.');
      },
      error: error => {
        this.error.set(this.getErrorMessage(error, 'Failed to upload image.'));
      }
    });
  }

  resetForm() {
    this.editingId = null;
    this.form = this.createEmptyForm();
    this.editorOpen.set(false);
  }

  createEmptyForm(): EquipmentRequest {
    return {
      sportId: null,
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
