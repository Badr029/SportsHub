import { Component, OnInit, signal} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { PaymentService } from '../../core/services/payment.service';
import { PaymentDetails } from '../../models/booking.model';
import { NavbarComponent } from '../../shared/navbar/navbar.component';

@Component({
  selector: 'app-payment',
  imports: [RouterLink, FormsModule, NavbarComponent],
  templateUrl: './payment.component.html',
  styleUrl: './payment.component.css'
})
export class PaymentComponent implements OnInit {
  payment = signal<PaymentDetails | null>(null);
  loading = signal(true);
  paying = signal(false);
  failing = signal(false);
  cancelling = signal(false);
  error = signal('');
  success = signal('');
  cardName = '';
  cardNumber = '';
  expiry = '';
  cvv = '';

  private paymentId = 0;
  private payKey: string | null = null;
  private failKey: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private paymentService: PaymentService
  ) { }

  ngOnInit() {
    this.paymentId = Number(this.route.snapshot.paramMap.get('id'));

    if (!Number.isInteger(this.paymentId) || this.paymentId <= 0) {
      this.loading.set(false);
      this.error.set('Invalid payment reference.');
      return;
    }

    this.loadPayment();
  }

  loadPayment() {
    this.loading.set(true);
    this.error.set('');

    this.paymentService.getPayment(this.paymentId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: payment => this.payment.set(payment),
        error: error => this.error.set(this.getErrorMessage(error, 'Failed to load payment.'))
      });
  }

  pay() {
    const payment = this.payment();

    if (!payment || this.paying() || payment.status === 'Paid' || payment.status === 'Processing') {
      return;
    }

    this.clearMessages();

    const validationMessage = this.validateCard();

    if (validationMessage) {
      this.error.set(validationMessage);
      return;
    }

    this.paying.set(true);
    this.payKey ??= crypto.randomUUID();

    this.paymentService.mockPay(payment.paymentId, this.payKey)
      .pipe(finalize(() => this.paying.set(false)))
      .subscribe({
        next: result => {
          this.payment.set(result);
          this.success.set(result.message || 'Payment completed successfully.');
          this.clearCardForm();
          this.payKey = null;
        },
        error: error => this.error.set(this.getErrorMessage(error, 'Payment failed.'))
      });
  }

  formatCardNumber() {
    const digits = this.cardNumber.replace(/\D/g, '').slice(0, 16);
    this.cardNumber = digits.replace(/(.{4})/g, '$1 ').trim();
  }

  formatExpiry() {
    const digits = this.expiry.replace(/\D/g, '').slice(0, 4);
    this.expiry = digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
  }

  formatCvv() {
    this.cvv = this.cvv.replace(/\D/g, '').slice(0, 4);
  }

  // Demo affordance: fills the documented Visa test PAN so nobody is tempted
  // to type a real card into a mock checkout (SRS FR-PAY-09).
  fillTestCard() {
    this.cardName = 'SPORTHUB DEMO';
    this.cardNumber = '4242 4242 4242 4242';
    this.expiry = this.futureExpiry();
    this.cvv = '123';
    this.clearMessages();
  }

  private futureExpiry() {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 3);
    return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear().toString().slice(2)}`;
  }

  simulateFailure() {
    const payment = this.payment();

    if (!payment || this.failing() || payment.status === 'Paid' || payment.status === 'Processing') {
      return;
    }

    this.clearMessages();
    this.failing.set(true);
    this.failKey ??= crypto.randomUUID();

    this.paymentService.mockFail(payment.paymentId, this.failKey)
      .pipe(finalize(() => this.failing.set(false)))
      .subscribe({
        next: result => {
          this.payment.set(result);
          this.error.set(result.message || result.failureReason || 'Mock payment failed.');
          this.failKey = null;
        },
        error: error => this.error.set(this.getErrorMessage(error, 'Failed to simulate payment failure.'))
      });
  }

  cancelPayment() {
    const payment = this.payment();

    if (!payment || this.cancelling() || payment.status === 'Paid' || payment.status === 'Processing') {
      return;
    }

    this.clearMessages();
    this.cancelling.set(true);

    this.paymentService.cancelPayment(payment.paymentId)
      .pipe(finalize(() => this.cancelling.set(false)))
      .subscribe({
        next: result => {
          this.payment.set(result);
          this.success.set(result.message || 'Payment cancelled.');
          this.payKey = null;
          this.failKey = null;
        },
        error: error => this.error.set(this.getErrorMessage(error, 'Failed to cancel payment.'))
      });
  }

  canAttemptPayment() {
    const status = this.payment()?.status;
    return status === 'Pending' || status === 'Failed' || status === 'Cancelled';
  }

  getCardBrand() {
    const digits = this.cardNumber.replace(/\D/g, '');

    if (digits.startsWith('4')) {
      return 'Visa';
    }

    if (/^5[1-5]/.test(digits)) {
      return 'Mastercard';
    }

    if (/^3[47]/.test(digits)) {
      return 'Amex';
    }

    return 'Card';
  }

  private clearMessages() {
    this.error.set('');
    this.success.set('');
  }

  private validateCard() {
    const number = this.cardNumber.replace(/\D/g, '');
    const expiryMatch = /^(\d{2})\/(\d{2})$/.exec(this.expiry);

    if (this.cardName.trim().length < 3) {
      return 'Enter the cardholder name.';
    }

    if (number.length < 15 || number.length > 16 || !this.isValidCardNumber(number)) {
      return 'Enter a valid card number.';
    }

    if (!expiryMatch) {
      return 'Enter expiry date as MM/YY.';
    }

    const month = Number(expiryMatch[1]);
    const year = 2000 + Number(expiryMatch[2]);
    const expiryDate = new Date(year, month, 0, 23, 59, 59);

    if (month < 1 || month > 12 || expiryDate < new Date()) {
      return 'Enter a valid future expiry date.';
    }

    if (!/^\d{3,4}$/.test(this.cvv)) {
      return 'Enter a valid CVV.';
    }

    return '';
  }

  private isValidCardNumber(number: string) {
    let sum = 0;
    let shouldDouble = false;

    for (let index = number.length - 1; index >= 0; index--) {
      let digit = Number(number[index]);

      if (shouldDouble) {
        digit *= 2;

        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      shouldDouble = !shouldDouble;
    }

    return sum % 10 === 0;
  }

  private clearCardForm() {
    this.cardName = '';
    this.cardNumber = '';
    this.expiry = '';
    this.cvv = '';
  }

  private getErrorMessage(error: any, fallback: string) {
    if (error.status === 0) {
      return 'Cannot connect to the server.';
    }

    if (typeof error.error === 'string') {
      return error.error;
    }

    return error.error?.message || error.message || fallback;
  }
}
