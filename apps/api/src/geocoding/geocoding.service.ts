import { Injectable, Logger } from '@nestjs/common';

export interface GeocodingResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  private readonly apiKey: string;

  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY || '';
    if (!this.apiKey) {
      this.logger.warn('GOOGLE_MAPS_API_KEY is not set. Geocoding will not work.');
    }
  }

  /**
   * Geocode an address to get latitude and longitude
   * @param address The address to geocode (e.g., "Tokyo, Japan")
   * @returns GeocodingResult with lat/lng and formatted address, or null if geocoding fails
   */
  async geocode(address: string): Promise<GeocodingResult | null> {
    if (!this.apiKey) {
      this.logger.error('Cannot geocode: GOOGLE_MAPS_API_KEY is not set');
      return null;
    }

    if (!address || address.trim() === '') {
      this.logger.warn('Cannot geocode: empty address provided');
      return null;
    }

    try {
      const encodedAddress = encodeURIComponent(address);
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${this.apiKey}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const result = data.results[0];
        const location = result.geometry.location;

        this.logger.log(`Geocoded "${address}" to ${location.lat}, ${location.lng}`);

        return {
          latitude: location.lat,
          longitude: location.lng,
          formattedAddress: result.formatted_address,
        };
      } else {
        this.logger.warn(`Geocoding failed for "${address}": ${data.status}`);
        return null;
      }
    } catch (error) {
      this.logger.error(`Geocoding error for "${address}":`, error);
      return null;
    }
  }
}
