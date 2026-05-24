export type VenueType = 'bar' | 'nattklubb';

export interface VenueDoc {
  id: string;
  name: string;
  address: string;
  description: string;
  images: string[];
  isActive: boolean;
  city?: string;
  type?: VenueType;
  phone?: string;
  openingHours?: OpeningHours;
  queueStatus?: QueueStatus;
  queueEstimate?: number | null;
  eveningMessage?: string;
  lat?: number;
  lng?: number;
}

export interface DayHours {
  open: string;
  close: string;
  closed: boolean;
}

export interface OpeningHours {
  mon: DayHours;
  tue: DayHours;
  wed: DayHours;
  thu: DayHours;
  fri: DayHours;
  sat: DayHours;
  sun: DayHours;
}

export type QueueStatus = 'lite' | 'moderat' | 'lang' | 'fullt';

export interface UserPing {
  uid: string;
  lat: number;
  lng: number;
  geohash: string;
  cityId: string;
  expiresAt: Date;
}

export interface CityCounter {
  cityId: string;
  count: number;
  date: string;
}

export interface NightlyUser {
  uid: string;
  displayName: string | null;
  cityId: string;
  onboarded: boolean;
}
