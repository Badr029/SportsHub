import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from './api.config';
import { AdminBookingsPage } from '../../models/booking.model';
import {
  AdminEquipment,
  AdminFacility,
  EquipmentRequest,
  FacilityRequest,
  Sport,
  SportRequest
} from '../../models/sport.model';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  constructor(private http: HttpClient) { }


  // Admin Bookings Service API
  getAdminBookings(page: number, pageSize: number, status: string) {
    return this.http.get<AdminBookingsPage>(`${API_BASE_URL}/admin/bookings`, {
      params: {
        page,
        pageSize,
        status
      }
    });
  }

  confirmBooking(id: number) {
    return this.http.post(`${API_BASE_URL}/admin/bookings/${id}/confirm`, {}, { responseType: 'text' });
  }

  markPickedUp(id: number) {
    return this.http.post(`${API_BASE_URL}/admin/bookings/${id}/pickup`, {}, { responseType: 'text' });
  }

  markReturned(id: number) {
    return this.http.post(`${API_BASE_URL}/admin/bookings/${id}/return`, {}, { responseType: 'text' });
  }

  completeBooking(id: number) {
    return this.http.post(`${API_BASE_URL}/admin/bookings/${id}/complete`, {}, { responseType: 'text' });
  }

  cancelBooking(id: number) {
    return this.http.post(`${API_BASE_URL}/admin/bookings/${id}/cancel`, {}, { responseType: 'text' });
  }


  // Admin Equipments Service API
  getEquipment() {
    return this.http.get<AdminEquipment[]>(`${API_BASE_URL}/admin/equipment`);
  }

  createEquipment(request: EquipmentRequest) {
    return this.http.post<AdminEquipment>(`${API_BASE_URL}/admin/equipment`, request);
  }

  updateEquipment(id: number, request: EquipmentRequest) {
    return this.http.put<AdminEquipment>(`${API_BASE_URL}/admin/equipment/${id}`, request);
  }

  deleteEquipment(id: number) {
    return this.http.delete(`${API_BASE_URL}/admin/equipment/${id}`, { responseType: 'text' });
  }

  // Admin Sports Service API
  getSports() {
    return this.http.get<Sport[]>(`${API_BASE_URL}/admin/sports`);
  }

  createSport(request: SportRequest) {
    return this.http.post<Sport>(`${API_BASE_URL}/admin/sports`, request);
  }

  updateSport(id: number, request: SportRequest) {
    return this.http.put<Sport>(`${API_BASE_URL}/admin/sports/${id}`, request);
  }

  deleteSport(id: number) {
    return this.http.delete(`${API_BASE_URL}/admin/sports/${id}`, { responseType: 'text' });
  }

  uploadImage(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<{ imageUrl: string }>(`${API_BASE_URL}/admin/uploads/image`, formData);
  }

  // Admin Facilities Service API
  getFacilities() {
    return this.http.get<AdminFacility[]>(`${API_BASE_URL}/admin/facilities`);
  }

  createFacility(request: FacilityRequest) {
    return this.http.post<AdminFacility>(`${API_BASE_URL}/admin/facilities`, request);
  }

  updateFacility(id: number, request: FacilityRequest) {
    return this.http.put<AdminFacility>(`${API_BASE_URL}/admin/facilities/${id}`, request);
  }

  deleteFacility(id: number) {
    return this.http.delete(`${API_BASE_URL}/admin/facilities/${id}`, { responseType: 'text' });
  }
}
