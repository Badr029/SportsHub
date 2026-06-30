import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from './api.config';
import { CreateBooking, BookingResponse, FacilityAvailabilitySlot, EquipmentAvailability } from '../../models/booking.model';

@Injectable({
  providedIn: 'root'
})
export class BookingService {

  constructor(private http: HttpClient) { }

  getMyBookings() {
    return this.http.get<BookingResponse[]>(`${API_BASE_URL}/Bookings/my-bookings`);
  }

  createBooking(request: CreateBooking) {
    return this.http.post<BookingResponse>(`${API_BASE_URL}/Bookings`, request);
  }

  getFacilityAvailability(facilityId: number, date: string, durationHours: number) {
    return this.http.get<FacilityAvailabilitySlot[]>(`${API_BASE_URL}/Bookings/facility-availability`, {
      params: {
        facilityId,
        date,
        durationHours
      }
    });
  }
  getEquipmentAvailability(equipmentId: number, startDate: string, endDate: string) {
    return this.http.get<EquipmentAvailability>(`${API_BASE_URL}/Bookings/equipment-availability`, {
      params: {
        equipmentId,
        startDate,
        endDate
      }
    });
  }
  cancelBooking(id: number) {
    return this.http.post(`${API_BASE_URL}/Bookings/${id}/cancel`, {}, { responseType: 'text' });
  }

  clearBooking(id: number) {
    return this.http.post(`${API_BASE_URL}/Bookings/${id}/clear`, {}, { responseType: 'text' });
  }
}
