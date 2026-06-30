export type BookingType = 1 | 2 | 3 ;

export interface BookingEquipmentItem {
  equipmentId: number;
  quantity: number;
}

export interface BookingEquipmentResponse {
  equipmentId: number;
  name: string;
  quantity: number;
}

export interface CreateBooking {
  bookingType: BookingType;
  facilityId?: number | null;
  startDate: string;
  endDate: string;
  pickupDate?: string | null;
  returnDate?: string | null;
  equipmentItems: BookingEquipmentItem[];
}

export interface BookingResponse {
  id: number;
  bookingType: string;
  startDate: string;
  endDate: string;
  pickupDate?: string | null;
  returnDate?: string | null;
  status: string;
  rentalStatus?: string | null;
  totalPrice: number;
  equipment: BookingEquipmentResponse[];
}

export interface FacilityAvailabilitySlot {
  time: string;
  label: string;
  available: boolean;
}


export interface EquipmentAvailability {
  equipmentId: number;
  totalQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
}


// Admin booking model


export interface AdminBookingUser {
  id: number;
  name: string;
  email: string;
  phoneNumber: string;
}

export interface AdminBookingFacility {
  id: number;
  name: string;
}

export interface AdminBookingEquipment {
  equipmentId: number;
  name: string;
  quantity: number;
}

export interface AdminBookingResponse {
  id: number;
  user: AdminBookingUser;
  facility?: AdminBookingFacility | null;
  bookingType: string;
  status: string;
  rentalStatus?: string | null;
  startDate: string;
  endDate: string;
  totalPrice: number;
  equipment: AdminBookingEquipment[];
}

export interface AdminBookingsPage {
  items: AdminBookingResponse[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}
