export interface Sport {
  id: number;
  name: string;
  description: string;
  imageUrl?: string | null;
}

export interface Facility {
  id: number;
  sportId: number;
  name: string;
  pricePerHour: number;
  imageUrl?: string | null;
  isOutOfService: boolean;
}

export interface Equipment {
  id: number;
  sportId?: number ;
  name: string;
  quantity: number;
  imageUrl?: string | null;
  dailyRentalPrice: number;
  packageHourlyPrice: number;
}

export interface SportDetails extends Sport {
  facilities: Facility[];
  equipment: Equipment[];
}


// Admin models

export interface SportRequest {
  name: string;
  description: string;
  imageUrl?: string | null;
}

export interface AdminEquipmentSport {
  id: number;
  name: string;
}

export interface AdminFacility {
  id: number;
  name: string;
  pricePerHour: number;
  imageUrl?: string | null;
  isOutOfService: boolean;
  sport: AdminEquipmentSport;
}

export interface FacilityRequest {
  sportId: number | null;
  name: string;
  pricePerHour: number;
  imageUrl?: string | null;
  isOutOfService: boolean;
}

export interface AdminEquipment {
  id: number;
  name: string;
  quantity: number;
  imageUrl?: string | null;
  dailyRentalPrice: number;
  packageHourlyPrice: number;
  sport: AdminEquipmentSport;
}

export interface EquipmentRequest {
  sportId: number | null;
  name: string;
  quantity: number;
  imageUrl?: string | null;
  dailyRentalPrice: number;
  packageHourlyPrice: number;
}

