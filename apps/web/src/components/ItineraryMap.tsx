// components/ItineraryMap.tsx
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  Polyline,
  Autocomplete,
} from '@react-google-maps/api';

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
}

interface ItineraryMapProps {
  startCityName?: string;
}

export default function ItineraryMap({ startCityName }: ItineraryMapProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const [cities, setCities] = useState<City[]>([]);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const hasGeocodedRef = useRef(false);

  // Geocode the start city name to get coordinates
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

  // Trigger geocoding once the map API is loaded
  useEffect(() => {
    if (isLoaded && startCityName && !hasGeocodedRef.current) {
      geocodeStartCity();
    }
  }, [isLoaded, startCityName, geocodeStartCity]);

  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const onAutocompleteLoad = useCallback(
    (autocomplete: google.maps.places.Autocomplete) => {
      autocompleteRef.current = autocomplete;
    },
    []
  );

  const onPlaceChanged = useCallback(() => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      if (place.geometry?.location) {
        const newCity: City = {
          id: `city-${Date.now()}`,
          name: place.formatted_address || place.name || 'Unknown',
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        };
        setCities((prev) => [...prev, newCity]);
        setMapCenter({ lat: newCity.lat, lng: newCity.lng });
      }
    }
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

  const polylinePath = cities.map((city) => ({ lat: city.lat, lng: city.lng }));

  if (loadError) {
    return <div className="p-4 text-red-500">Error loading Google Maps</div>;
  }

  if (!isLoaded || isGeocoding) {
    return <div className="p-4">Loading map...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="flex gap-2">
        <Autocomplete
          onLoad={onAutocompleteLoad}
          onPlaceChanged={onPlaceChanged}
          options={{ types: ['(cities)'] }}
        >
          <input
            type="text"
            placeholder="Search for a city to add..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </Autocomplete>
      </div>

      <p className="text-sm text-gray-600">
        Search for a city above or click anywhere on the map to add a point to
        your itinerary.
      </p>

      {/* Map */}
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={mapCenter}
        zoom={7}
        onLoad={onMapLoad}
        onClick={onMapClick}
        options={{
          streetViewControl: false,
          mapTypeControl: true,
        }}
      >
        {/* Markers for each city */}
        {cities.map((city, index) => (
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
        {cities.length > 1 && (
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
        <ul className="space-y-2">
          {cities.map((city, index) => (
            <li
              key={city.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 bg-blue-500 text-white rounded-full font-bold">
                  {index + 1}
                </span>
                <span>{city.name}</span>
                {city.id === 'start' && (
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                    Start
                  </span>
                )}
              </div>
              {city.id !== 'start' && (
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
      </div>
    </div>
  );
}