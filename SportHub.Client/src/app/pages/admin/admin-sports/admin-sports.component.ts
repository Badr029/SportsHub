import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NavbarComponent } from '../../../shared/navbar/navbar.component';
import { AdminService } from '../../../core/services/admin.service';
import { resolveImageUrl } from '../../../core/services/api.config';
import { Sport, SportRequest } from '../../../models/sport.model';

@Component({
  selector: 'app-admin-sports',
  imports: [FormsModule, RouterLink, NavbarComponent],
  templateUrl: './admin-sports.component.html',
  styleUrl: './admin-sports.component.css'
})
export class AdminSportsComponent implements OnInit {
  sports = signal<Sport[]>([]);
  loading = signal(true);
  error = signal('');
  success = signal('');
  editorOpen = signal(false);
  editingId: number | null = null;

  form: SportRequest = this.createEmptyForm();

  constructor(private adminService: AdminService) { }

  ngOnInit() {
    this.loadSports();
  }

  loadSports() {
    this.loading.set(true);
    this.error.set('');
    this.success.set('');

    this.adminService.getSports().subscribe({
      next: sports => {
        this.sports.set(sports);
        this.loading.set(false);
      },
      error: error => {
        if (error.status === 0) {
          this.error.set('Cannot connect to the server.');
        } else {
          this.error.set(this.getErrorMessage(error, 'Failed to load sports.'));
        }

        this.loading.set(false);
      }
    });
  }

  saveSport() {
    this.error.set('');
    this.success.set('');

    if (!this.form.name.trim()) {
      this.error.set('Sport name is required.');
      return;
    }

    const request: SportRequest = {
      name: this.form.name.trim(),
      description: this.form.description.trim(),
      imageUrl: this.form.imageUrl?.trim() || null
    };

    const action = this.editingId
      ? this.adminService.updateSport(this.editingId, request)
      : this.adminService.createSport(request);

    action.subscribe({
      next: () => {
        this.success.set(this.editingId ? 'Sport updated.' : 'Sport created.');
        this.resetForm();
        this.loadSports();
      },
      error: error => {
        if (error.status === 0) {
          this.error.set('Cannot connect to the server.');
        } else {
          this.error.set(this.getErrorMessage(error, 'Failed to save sport.'));
        }
      }
    });
  }

  editSport(sport: Sport) {
    this.editingId = sport.id;
    this.form = {
      name: sport.name,
      description: sport.description,
      imageUrl: sport.imageUrl
    };
    this.error.set('');
    this.success.set('');
    this.editorOpen.set(true);
  }

  openAddSport() {
    this.resetForm();
    this.error.set('');
    this.success.set('');
    this.editorOpen.set(true);
  }

  deleteSport(id: number) {
    this.error.set('');
    this.success.set('');

    this.adminService.deleteSport(id).subscribe({
      next: () => {
        this.success.set('Sport deleted.');
        this.loadSports();
      },
      error: error => {
        if (error.status === 0) {
          this.error.set('Cannot connect to the server.');
        } else {
          this.error.set(this.getErrorMessage(error, 'Failed to delete sport.'));
        }
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

  createEmptyForm(): SportRequest {
    return {
      name: '',
      description: '',
      imageUrl: ''
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
