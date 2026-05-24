const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

export function encodeGeohash(lat: number, lng: number, precision = 6): string {
  let minLat = -90, maxLat = 90, minLng = -180, maxLng = 180;
  let geohash = '';
  let bits = 0, hashValue = 0;
  let isEven = true;

  while (geohash.length < precision) {
    if (isEven) {
      const mid = (minLng + maxLng) / 2;
      if (lng >= mid) { hashValue = (hashValue << 1) | 1; minLng = mid; }
      else { hashValue = (hashValue << 1); maxLng = mid; }
    } else {
      const mid = (minLat + maxLat) / 2;
      if (lat >= mid) { hashValue = (hashValue << 1) | 1; minLat = mid; }
      else { hashValue = (hashValue << 1); maxLat = mid; }
    }
    isEven = !isEven;
    if (++bits === 5) {
      geohash += BASE32[hashValue];
      bits = 0;
      hashValue = 0;
    }
  }
  return geohash;
}
