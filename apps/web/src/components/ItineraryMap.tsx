// components/ItineraryMap.tsx
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  Polyline,
} from '@react-google-maps/api';
import { PlaceAutocomplete, PlaceResult } from '@/components/ui/place-autocomplete';
import type { Destination } from '@junta-tribo/shared';

const libraries: ("places")[] = ['places'];

const mapContainerStyle = {
  width: '100%',
  height: '500px',
};

const defaultCenter = {
  lat: 40.7128,
  lng: -74.006,
};

interface City {
  id: string;
  name: string;
  lat: number;
  lng: number;
  arrivalDate?: Date;
  departureDate?: Date;
}

interface ItineraryMapProps {
  startCityName?: string;
  destinations?: Destination[];
  readOnly?: boolean;
}

export default function ItineraryMap({ startCityName, destinations = [], readOnly = false }: ItineraryMapProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const [cities, setCities] = useState<City[]>([]);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const hasGeocodedRef = useRef(false);

  // Initialize cities from destinations prop
  useEffect(() => {
    if (destinations.length > 0 && cities.length === 0 && !hasGeocodedRef.current && isLoaded) {
      hasGeocodedRef.current = true;
      setIsGeocoding(true);

      const geocoder = new google.maps.Geocoder();

      // Process all destinations - use coordinates if available, otherwise geocode
      Promise.all(
        destinations.map((dest) =>
          new Promise<City | null>((resolve) => {
            // If destination has valid coordinates, use them
            if (dest.latitude && dest.longitude &&
              typeof dest.latitude === 'number' && typeof dest.longitude === 'number') {
              resolve({
                id: `dest-${dest.id}`,
                name: dest.name,
                lat: dest.latitude,
                lng: dest.longitude,
                arrivalDate: dest.arrivalDate,
                departureDate: dest.departureDate,
              });
            } else {
              // Geocode to get coordinates
              geocoder.geocode({ address: dest.name }, (results, status) => {
                if (status === 'OK' && results && results[0]?.geometry?.location) {
                  const location = results[0].geometry.location;
                  resolve({
                    id: `dest-${dest.id}`,
                    name: dest.name,
                    lat: location.lat(),
                    lng: location.lng(),
                    arrivalDate: dest.arrivalDate,
                    departureDate: dest.departureDate,
                  });
                } else {
                  resolve(null);
                }
              });
            }
          })
        )
      ).then((results) => {
        const validCities = results.filter((c): c is City => c !== null);
        setCities(validCities);
        if (validCities.length > 0) {
          setMapCenter({ lat: validCities[0].lat, lng: validCities[0].lng });
        }
        setIsGeocoding(false);
      });
    }
  }, [destinations, isLoaded, cities.length]);

  // Geocode the start city name to get coordinates (fallback if no destinations)
  const geocodeStartCity = useCallback(() => {
    if (!startCityName || hasGeocodedRef.current) return;

    hasGeocodedRef.current = true;
    setIsGeocoding(true);

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: startCityName }, (results, status) => {
      setIsGeocoding(false);
      if (status === 'OK' && results && results[0]?.geometry?.location) {
        const location = results[0].geometry.location;
        const startCity: City = {
          id: 'start',
          name: startCityName,
          lat: location.lat(),
          lng: location.lng(),
        };
        setCities([startCity]);
        setMapCenter({ lat: startCity.lat, lng: startCity.lng });
      } else {
        // If geocoding fails, still add the city with default coordinates
        const startCity: City = {
          id: 'start',
          name: startCityName,
          lat: defaultCenter.lat,
          lng: defaultCenter.lng,
        };
        setCities([startCity]);
      }
    });
  }, [startCityName]);

  // Trigger geocoding once the map API is loaded (only if no destinations)
  useEffect(() => {
    if (isLoaded && startCityName && !hasGeocodedRef.current && destinations.length === 0) {
      geocodeStartCity();
    }
  }, [isLoaded, startCityName, geocodeStartCity, destinations.length]);

  const mapRef = useRef<google.maps.Map | null>(null);
  const [searchValue, setSearchValue] = useState('');

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const handlePlaceSelect = useCallback((place: PlaceResult) => {
    const newCity: City = {
      id: `city-${Date.now()}`,
      name: place.formattedAddress,
      lat: place.lat,
      lng: place.lng,
    };
    setCities((prev) => [...prev, newCity]);
    setMapCenter({ lat: newCity.lat, lng: newCity.lng });
    setSearchValue('');
  }, []);

  const onMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();

      // Reverse geocode to get city name
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        let cityName = `Point ${lat.toFixed(4)}, ${lng.toFixed(4)}`;

        if (status === 'OK' && results && results[0]) {
          const addressComponents = results[0].address_components;
          const cityComponent = addressComponents.find(
            (component) =>
              component.types.includes('locality') ||
              component.types.includes('administrative_area_level_1')
          );
          if (cityComponent) {
            cityName = cityComponent.long_name;
          }
        }

        const newCity: City = {
          id: `city-${Date.now()}`,
          name: cityName,
          lat,
          lng,
        };
        setCities((prev) => [...prev, newCity]);
      });
    }
  }, []);

  const removeCity = useCallback((cityId: string) => {
    if (cityId === 'start') return; // Don't remove start city
    setCities((prev) => prev.filter((city) => city.id !== cityId));
  }, []);

  // Filter cities with valid coordinates for rendering
  const validCities = cities.filter(city =>
    typeof city.lat === 'number' &&
    typeof city.lng === 'number' &&
    !isNaN(city.lat) &&
    !isNaN(city.lng)
  );

  const polylinePath = validCities.map((city) => ({ lat: city.lat, lng: city.lng }));

  if (loadError) {
    return <div className="p-4 text-red-500">Error loading Google Maps</div>;
  }

  if (!isLoaded || isGeocoding) {
    return <div className="p-4">Loading map...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Search Input - only show if not readOnly */}
      {!readOnly && (
        <>
          <div className="flex gap-2">
            <PlaceAutocomplete
              value={searchValue}
              onChange={setSearchValue}
              onPlaceSelect={handlePlaceSelect}
              placeholder="Search for a city to add..."
              className="flex-1"
            />
          </div>

          <p className="text-sm text-gray-600">
            Search for a city above or click anywhere on the map to add a point to
            your itinerary.
          </p>
        </>
      )}

      {/* Map */}
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={mapCenter}
        zoom={cities.length > 1 ? 8 : 7}
        onLoad={onMapLoad}
        onClick={readOnly ? undefined : onMapClick}
        options={{
          streetViewControl: false,
          mapTypeControl: true,
          zoomControl: true,
        }}
      >
        {/* Markers for each city */}
        {validCities.map((city, index) => (
          <Marker
            key={city.id}
            position={{ lat: city.lat, lng: city.lng }}
            label={{
              text: String(index + 1),
              color: 'white',
              fontWeight: 'bold',
            }}
            title={city.name}
          />
        ))}

        {/* Line connecting cities */}
        {validCities.length > 1 && (
          <Polyline
            path={polylinePath}
            options={{
              strokeColor: '#3B82F6',
              strokeOpacity: 0.8,
              strokeWeight: 3,
            }}
          />
        )}
      </GoogleMap>

      {/* City List */}
      <div className="space-y-2">
        <h3 className="font-semibold text-lg">Your Itinerary</h3>
        {validCities.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No destinations added yet.</p>
        ) : (
          <ul className="space-y-2">
            {validCities.map((city, index) => (
              <li
                key={city.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 bg-blue-500 text-white rounded-full font-bold">
                    {index + 1}
                  </span>
                  <div>
                    <span className="font-medium">{city.name}</span>
                    {(city.arrivalDate || city.departureDate) && (
                      <div className="text-xs text-gray-500">
                        {city.arrivalDate && (
                          <span>Arrive: {new Date(city.arrivalDate).toLocaleDateString()}</span>
                        )}
                        {city.arrivalDate && city.departureDate && <span> • </span>}
                        {city.departureDate && (
                          <span>Depart: {new Date(city.departureDate).toLocaleDateString()}</span>
                        )}
                      </div>
                    )}
                  </div>
                  {index === 0 && (
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                      Start
                    </span>
                  )}
                </div>
                {!readOnly && !city.id.startsWith('dest-') && (
                  <button
                    onClick={() => removeCity(city.id)}
                    className="px-3 py-1 text-sm text-red-600 hover:bg-red-100 rounded transition-colors"
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}