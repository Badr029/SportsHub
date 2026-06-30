import { Injectable , signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {tap} from 'rxjs';
import {API_BASE_URL} from './api.config';
import { AuthResponse, LoginRequest, RegisterRequest } from '../../models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly tokenKey = "sporthub_token";
  private readonly userKey = "sporthub_user";

  currentUser = signal<AuthResponse | null>(this.getStoredUser());

  constructor(private http: HttpClient) { }

  register(request: RegisterRequest){
    return this.http.post<AuthResponse>(`${API_BASE_URL}/Auth/register`, request).pipe(
      tap(response =>
        this.saveSession(response)
      )
    );
  }

  login(request: LoginRequest){
    return this.http.post<AuthResponse>(`${API_BASE_URL}/Auth/login`, request).pipe(
      tap(response =>
        this.saveSession(response)
      )
    );
  }

  logout(){
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.currentUser.set(null);
  }

  getToken(){
    return localStorage.getItem(this.tokenKey);
  }

  isLoggedIn(){
    return !!this.getToken();
  }
  isAdmin(){
    return this.currentUser()?.role === 'Admin';
  }

  private saveSession(response: AuthResponse){
    localStorage.setItem(this.tokenKey, response.token);
    localStorage.setItem(this.userKey, JSON.stringify(response));
    this.currentUser.set(response);
  }

  private getStoredUser(): AuthResponse | null{
    const rawUser = localStorage.getItem(this.userKey);
    if(!rawUser){
      return null;
    }
    return JSON.parse(rawUser) as AuthResponse;
  }

}
