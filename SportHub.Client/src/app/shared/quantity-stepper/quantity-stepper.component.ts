import { Component, EventEmitter, Input, Output } from '@angular/core';

/**
 * Presentational quantity control. It owns no business rules: the parent still
 * decides what a valid quantity is and still runs its own validation on submit.
 * This only makes the choice direct — a stepper instead of a number field —
 * and clamps to the availability the parent hands it.
 */
@Component({
  selector: 'app-quantity-stepper',
  standalone: true,
  templateUrl: './quantity-stepper.component.html',
  styleUrl: './quantity-stepper.component.css'
})
export class QuantityStepperComponent {
  @Input({ required: true }) quantity = 0;
  /** Availability for the requested period. 0 means nothing left to add. */
  @Input() max: number | null = null;
  @Input() label = 'item';

  @Output() quantityChange = new EventEmitter<number>();
  /** Emitted instead of quantityChange(0) so the parent can drop the line. */
  @Output() remove = new EventEmitter<void>();

  get atMax() {
    return this.max !== null && this.quantity >= this.max;
  }

  increment() {
    if (this.atMax) {
      return;
    }

    this.quantityChange.emit(this.quantity + 1);
  }

  decrement() {
    if (this.quantity <= 1) {
      this.remove.emit();
      return;
    }

    this.quantityChange.emit(this.quantity - 1);
  }
}
