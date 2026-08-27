import { api } from './client';

export type ReverseGeocodeResult = {
  city: string;
  area: string;
  address: string;
};

export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
  });
  return api<ReverseGeocodeResult>(`/api/geocode/reverse?${params.toString()}`);
}
