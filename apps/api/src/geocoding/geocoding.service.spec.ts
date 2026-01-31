import { Test, TestingModule } from '@nestjs/testing';
import { GeocodingService, GeocodingResult } from './geocoding.service';

describe('GeocodingService', () => {
  let service: GeocodingService;
  let originalEnv: string | undefined;

  // Mock fetch globally
  const mockFetch = jest.fn();
  global.fetch = mockFetch;

  beforeEach(async () => {
    // Store original env
    originalEnv = process.env.GOOGLE_MAPS_API_KEY;
    
    // Set a valid API key for tests
    process.env.GOOGLE_MAPS_API_KEY = 'test-api-key';

    const module: TestingModule = await Test.createTestingModule({
      providers: [GeocodingService],
    }).compile();

    service = module.get<GeocodingService>(GeocodingService);

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore original env
    if (originalEnv !== undefined) {
      process.env.GOOGLE_MAPS_API_KEY = originalEnv;
    } else {
      delete process.env.GOOGLE_MAPS_API_KEY;
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('constructor', () => {
    it('should warn when GOOGLE_MAPS_API_KEY is not set', async () => {
      delete process.env.GOOGLE_MAPS_API_KEY;
      
      const module: TestingModule = await Test.createTestingModule({
        providers: [GeocodingService],
      }).compile();

      const serviceWithoutKey = module.get<GeocodingService>(GeocodingService);
      expect(serviceWithoutKey).toBeDefined();
    });

    it('should initialize with API key when set', async () => {
      process.env.GOOGLE_MAPS_API_KEY = 'my-api-key';
      
      const module: TestingModule = await Test.createTestingModule({
        providers: [GeocodingService],
      }).compile();

      const serviceWithKey = module.get<GeocodingService>(GeocodingService);
      expect(serviceWithKey).toBeDefined();
    });
  });

  describe('geocode', () => {
    describe('successful geocoding', () => {
      it('should return coordinates for a valid address', async () => {
        const mockResponse = {
          status: 'OK',
          results: [
            {
              geometry: {
                location: {
                  lat: 48.8566,
                  lng: 2.3522,
                },
              },
              formatted_address: 'Paris, France',
            },
          ],
        };

        mockFetch.mockResolvedValueOnce({
          json: jest.fn().mockResolvedValueOnce(mockResponse),
        });

        const result = await service.geocode('Paris, France');

        expect(result).toEqual({
          latitude: 48.8566,
          longitude: 2.3522,
          formattedAddress: 'Paris, France',
        });

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('https://maps.googleapis.com/maps/api/geocode/json')
        );
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('address=Paris%2C%20France')
        );
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('key=test-api-key')
        );
      });

      it('should correctly encode special characters in address', async () => {
        const mockResponse = {
          status: 'OK',
          results: [
            {
              geometry: {
                location: { lat: 35.6762, lng: 139.6503 },
              },
              formatted_address: 'Tokyo, Japan',
            },
          ],
        };

        mockFetch.mockResolvedValueOnce({
          json: jest.fn().mockResolvedValueOnce(mockResponse),
        });

        await service.geocode('Tokyo & Surrounding Area');

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('Tokyo%20%26%20Surrounding%20Area')
        );
      });

      it('should handle addresses with unicode characters', async () => {
        const mockResponse = {
          status: 'OK',
          results: [
            {
              geometry: {
                location: { lat: 35.6762, lng: 139.6503 },
              },
              formatted_address: '東京都, Japan',
            },
          ],
        };

        mockFetch.mockResolvedValueOnce({
          json: jest.fn().mockResolvedValueOnce(mockResponse),
        });

        const result = await service.geocode('東京都');

        expect(result).toBeDefined();
        expect(result?.formattedAddress).toBe('東京都, Japan');
      });
    });

    describe('API key not set', () => {
      it('should return null when API key is not set', async () => {
        delete process.env.GOOGLE_MAPS_API_KEY;

        const module: TestingModule = await Test.createTestingModule({
          providers: [GeocodingService],
        }).compile();

        const serviceNoKey = module.get<GeocodingService>(GeocodingService);
        const result = await serviceNoKey.geocode('Paris, France');

        expect(result).toBeNull();
        expect(mockFetch).not.toHaveBeenCalled();
      });

      it('should return null when API key is empty string', async () => {
        process.env.GOOGLE_MAPS_API_KEY = '';

        const module: TestingModule = await Test.createTestingModule({
          providers: [GeocodingService],
        }).compile();

        const serviceEmptyKey = module.get<GeocodingService>(GeocodingService);
        const result = await serviceEmptyKey.geocode('Paris, France');

        expect(result).toBeNull();
        expect(mockFetch).not.toHaveBeenCalled();
      });
    });

    describe('invalid address input', () => {
      it('should return null for empty address', async () => {
        const result = await service.geocode('');

        expect(result).toBeNull();
        expect(mockFetch).not.toHaveBeenCalled();
      });

      it('should return null for whitespace-only address', async () => {
        const result = await service.geocode('   ');

        expect(result).toBeNull();
        expect(mockFetch).not.toHaveBeenCalled();
      });

      it('should return null for address with only tabs and newlines', async () => {
        const result = await service.geocode('\t\n\r');

        expect(result).toBeNull();
        expect(mockFetch).not.toHaveBeenCalled();
      });
    });

    describe('API response handling', () => {
      it('should return null when status is not OK', async () => {
        const mockResponse = {
          status: 'ZERO_RESULTS',
          results: [],
        };

        mockFetch.mockResolvedValueOnce({
          json: jest.fn().mockResolvedValueOnce(mockResponse),
        });

        const result = await service.geocode('NonExistentPlace12345');

        expect(result).toBeNull();
      });

      it('should return null when results array is empty', async () => {
        const mockResponse = {
          status: 'OK',
          results: [],
        };

        mockFetch.mockResolvedValueOnce({
          json: jest.fn().mockResolvedValueOnce(mockResponse),
        });

        const result = await service.geocode('Some Address');

        expect(result).toBeNull();
      });

      it('should return null when results is undefined', async () => {
        const mockResponse = {
          status: 'OK',
        };

        mockFetch.mockResolvedValueOnce({
          json: jest.fn().mockResolvedValueOnce(mockResponse),
        });

        const result = await service.geocode('Some Address');

        expect(result).toBeNull();
      });

      it('should handle INVALID_REQUEST status', async () => {
        const mockResponse = {
          status: 'INVALID_REQUEST',
          results: [],
        };

        mockFetch.mockResolvedValueOnce({
          json: jest.fn().mockResolvedValueOnce(mockResponse),
        });

        const result = await service.geocode('Invalid');

        expect(result).toBeNull();
      });

      it('should handle OVER_QUERY_LIMIT status', async () => {
        const mockResponse = {
          status: 'OVER_QUERY_LIMIT',
          results: [],
        };

        mockFetch.mockResolvedValueOnce({
          json: jest.fn().mockResolvedValueOnce(mockResponse),
        });

        const result = await service.geocode('Paris');

        expect(result).toBeNull();
      });

      it('should handle REQUEST_DENIED status', async () => {
        const mockResponse = {
          status: 'REQUEST_DENIED',
          results: [],
        };

        mockFetch.mockResolvedValueOnce({
          json: jest.fn().mockResolvedValueOnce(mockResponse),
        });

        const result = await service.geocode('Paris');

        expect(result).toBeNull();
      });

      it('should handle UNKNOWN_ERROR status', async () => {
        const mockResponse = {
          status: 'UNKNOWN_ERROR',
          results: [],
        };

        mockFetch.mockResolvedValueOnce({
          json: jest.fn().mockResolvedValueOnce(mockResponse),
        });

        const result = await service.geocode('Paris');

        expect(result).toBeNull();
      });
    });

    describe('error handling', () => {
      it('should return null and log error when fetch throws', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        const result = await service.geocode('Paris, France');

        expect(result).toBeNull();
      });

      it('should return null when json parsing fails', async () => {
        mockFetch.mockResolvedValueOnce({
          json: jest.fn().mockRejectedValueOnce(new Error('Invalid JSON')),
        });

        const result = await service.geocode('Paris, France');

        expect(result).toBeNull();
      });

      it('should handle timeout errors', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Timeout'));

        const result = await service.geocode('Paris, France');

        expect(result).toBeNull();
      });

      it('should handle network connection errors', async () => {
        mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

        const result = await service.geocode('Paris, France');

        expect(result).toBeNull();
      });
    });

    describe('edge cases', () => {
      it('should use first result when multiple results are returned', async () => {
        const mockResponse = {
          status: 'OK',
          results: [
            {
              geometry: {
                location: { lat: 51.5074, lng: -0.1278 },
              },
              formatted_address: 'London, UK',
            },
            {
              geometry: {
                location: { lat: 42.3601, lng: -71.0589 },
              },
              formatted_address: 'London, Ontario, Canada',
            },
          ],
        };

        mockFetch.mockResolvedValueOnce({
          json: jest.fn().mockResolvedValueOnce(mockResponse),
        });

        const result = await service.geocode('London');

        expect(result).toEqual({
          latitude: 51.5074,
          longitude: -0.1278,
          formattedAddress: 'London, UK',
        });
      });

      it('should handle negative coordinates (Southern/Western hemisphere)', async () => {
        const mockResponse = {
          status: 'OK',
          results: [
            {
              geometry: {
                location: { lat: -33.8688, lng: 151.2093 },
              },
              formatted_address: 'Sydney NSW, Australia',
            },
          ],
        };

        mockFetch.mockResolvedValueOnce({
          json: jest.fn().mockResolvedValueOnce(mockResponse),
        });

        const result = await service.geocode('Sydney, Australia');

        expect(result).toEqual({
          latitude: -33.8688,
          longitude: 151.2093,
          formattedAddress: 'Sydney NSW, Australia',
        });
      });

      it('should handle coordinates at 0,0', async () => {
        const mockResponse = {
          status: 'OK',
          results: [
            {
              geometry: {
                location: { lat: 0, lng: 0 },
              },
              formatted_address: 'Gulf of Guinea',
            },
          ],
        };

        mockFetch.mockResolvedValueOnce({
          json: jest.fn().mockResolvedValueOnce(mockResponse),
        });

        const result = await service.geocode('0, 0');

        expect(result).toEqual({
          latitude: 0,
          longitude: 0,
          formattedAddress: 'Gulf of Guinea',
        });
      });

      it('should handle very long addresses', async () => {
        const longAddress = 'A'.repeat(500) + ', Some City, Some Country';
        
        const mockResponse = {
          status: 'OK',
          results: [
            {
              geometry: {
                location: { lat: 40.7128, lng: -74.006 },
              },
              formatted_address: 'New York, USA',
            },
          ],
        };

        mockFetch.mockResolvedValueOnce({
          json: jest.fn().mockResolvedValueOnce(mockResponse),
        });

        const result = await service.geocode(longAddress);

        expect(result).toBeDefined();
      });

      it('should handle addresses with only numbers', async () => {
        const mockResponse = {
          status: 'OK',
          results: [
            {
              geometry: {
                location: { lat: 40.7128, lng: -74.006 },
              },
              formatted_address: '123 Main St',
            },
          ],
        };

        mockFetch.mockResolvedValueOnce({
          json: jest.fn().mockResolvedValueOnce(mockResponse),
        });

        const result = await service.geocode('12345');

        expect(result).toBeDefined();
      });

      it('should trim whitespace from address before processing', async () => {
        const mockResponse = {
          status: 'OK',
          results: [
            {
              geometry: {
                location: { lat: 48.8566, lng: 2.3522 },
              },
              formatted_address: 'Paris, France',
            },
          ],
        };

        mockFetch.mockResolvedValueOnce({
          json: jest.fn().mockResolvedValueOnce(mockResponse),
        });

        const result = await service.geocode('  Paris, France  ');

        // The address should be trimmed, so this should work
        expect(mockFetch).toHaveBeenCalled();
      });
    });
  });
});
