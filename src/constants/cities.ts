export interface City {
  id: string;
  name: string;
  lat: number;
  lng: number;
  zoom: number;
  minZoom: number;
}

export const CITIES: City[] = [
  { id: 'oslo',         name: 'Oslo',         lat: 59.9139, lng: 10.7522, zoom: 13.5, minZoom: 11 },
  { id: 'bergen',       name: 'Bergen',       lat: 60.3913, lng: 5.3221,  zoom: 13.5, minZoom: 11 },
  { id: 'trondheim',    name: 'Trondheim',    lat: 63.4305, lng: 10.3951, zoom: 13.0, minZoom: 11 },
  { id: 'stavanger',    name: 'Stavanger',    lat: 58.9700, lng: 5.7331,  zoom: 13.0, minZoom: 11 },
  { id: 'kristiansand', name: 'Kristiansand', lat: 58.1467, lng: 7.9956,  zoom: 13.0, minZoom: 11 },
];

export const DEFAULT_CITY = CITIES[0]; // Oslo
