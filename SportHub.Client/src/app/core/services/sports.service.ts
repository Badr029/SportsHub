import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from './api.config';
import { Sport, SportDetails } from '../../models/sport.model';

@Injectable({
  providedIn: 'root'
})
export class SportsService {

  constructor(private http: HttpClient) { }

  getSports() {
    return this.http.get<Sport[]>(`${API_BASE_URL}/Sports`);
  }

  getSportDetails(id: number) {
    return this.http.get<SportDetails>(`${API_BASE_URL}/Sports/${id}`);
  }

}
