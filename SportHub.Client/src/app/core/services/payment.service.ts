import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_BASE_URL } from './api.config';
import { PaymentDetails } from '../../models/booking.model';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  constructor(private http: HttpClient) { }

  getPayment(paymentId: number) {
    return this.http.get<PaymentDetails>(`${API_BASE_URL}/Payments/${paymentId}`);
  }

  mockPay(paymentId: number, idempotencyKey: string) {
    return this.http.post<PaymentDetails>(
      `${API_BASE_URL}/Payments/${paymentId}/mock-pay`,
      {},
      { headers: this.idempotencyHeaders(idempotencyKey) }
    );
  }

  mockFail(paymentId: number, idempotencyKey: string) {
    return this.http.post<PaymentDetails>(
      `${API_BASE_URL}/Payments/${paymentId}/mock-fail`,
      {},
      { headers: this.idempotencyHeaders(idempotencyKey) }
    );
  }

  cancelPayment(paymentId: number) {
    return this.http.post<PaymentDetails>(`${API_BASE_URL}/Payments/${paymentId}/cancel`, {});
  }

  private idempotencyHeaders(idempotencyKey: string) {
    return new HttpHeaders({ 'Idempotency-Key': idempotencyKey });
  }
}
