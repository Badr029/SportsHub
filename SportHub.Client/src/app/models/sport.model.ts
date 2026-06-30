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
}

export interface Equipment {
  id: number;
  sportId?: number ;
  name: string;
  quantity: number;
  dailyRentalPrice: number;
  packageHourlyPrice: number;
}

export interface SportDetails extends Sport {
  facilities: Facility[];
  equipment: Equipment[];
}


