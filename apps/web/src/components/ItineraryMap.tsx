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
import { destinationsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Destination, CreateDestinationDto } from '@junta-tribo/shared';

const libraries: ("places")[] = ['places'];

const mapContainerStyle = {
  width: '100%',
  height: '500px',
};

const defaultCenter = {
  lat: 40.7128,
  lng: -74.006,
};

// Helper function to format date string (YYYY-MM-DD) for display
const formatDateDisplay = (date: string | null | undefined): string => {
  if (!date) return '';
  
  // Extract just the date part (YYYY-MM-DD) in case there's a time component
  const datePart = date.split('T')[0];
  const [year, month, day] = datePart.split('-').map(Number);
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[month - 1]} ${day}, ${year}`;
};

// Helper function to get date string for input fields
const getDateInputValue = (date: string | Date | null | undefined): string => {
  if (!date) return '';
  
  // If it's a Date object, convert to ISO string first
  const dateStr = date instanceof Date ? date.toISOString() : date;
  return dateStr.split('T')[0];
};

interface City {
  id: string;
  destinationId?: number;
  name: string;
  lat: number;
  lng: number;
  arrivalDate?: string | null;
  departureDate?: string | null;
}

interface ItineraryMapProps {
  startCityName?: string;
  destinations?: Destination[];
  readOnly?: boolean;
  tripId?: number;
  tripStartDate?: Date;
  tripEndDate?: Date;
  onDestinationAdded?: () => void;
}

export default function ItineraryMap({
  startCityName,
  destinations = [],
  readOnly = false,
  tripId,
  tripStartDate,
  tripEndDate,
  onDestinationAdded,
}: ItineraryMapProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const [cities, setCities] = useState<City[]>([]);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [editingCityId, setEditingCityId] = useState<string | null>(null);
  const [isUpdatingDates, setIsUpdatingDates] = useState(false);
  const [isDeletingDestination, setIsDeletingDestination] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [draggedCityId, setDraggedCityId] = useState<string | null>(null);
  const [dragOverCityId, setDragOverCityId] = useState<string | null>(null);
  const editingDatesRef = useRef<{ arrivalDate: string; departureDate: string } | null>(null);
  const prevDestinationsKeyRef = useRef('');

  // Create a key from destinations to detect changes (including reorder and date updates)
  const destinationsKey = destinations.map(d => `${d.id}-${d.order}-${d.arrivalDate}-${d.departureDate}`).join(',');

  // Reset when destinations change (add, delete, or reorder)
  useEffect(() => {
    if (destinationsKey !== prevDestinationsKeyRef.current) {
      prevDestinationsKeyRef.current = destinationsKey;
      setCities([]);
    }
  }, [destinationsKey]);

  // Initialize cities from destinations prop
  useEffect(() => {
    if (destinations.length > 0 && cities.length === 0 && isLoaded) {
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
                destinationId: dest.id,
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
                    destinationId: dest.id,
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
    if (!startCityName) return;

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
    if (isLoaded && startCityName && cities.length === 0 && destinations.length === 0) {
      geocodeStartCity();
    }
  }, [isLoaded, startCityName, geocodeStartCity, destinations.length, cities.length]);

  const mapRef = useRef<google.maps.Map | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const [isAddingDestination, setIsAddingDestination] = useState(false);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const handlePlaceSelect = useCallback(async (place: PlaceResult) => {
    // If we have a tripId, persist the destination to the backend
    if (tripId && !readOnly) {
      setIsAddingDestination(true);
      try {
        const newDestination: CreateDestinationDto = {
          name: place.formattedAddress,
          latitude: place.lat,
          longitude: place.lng,
        };
        await destinationsApi.create(tripId, newDestination);
        setSearchValue('');
        // Notify parent to refresh data
        onDestinationAdded?.();
      } catch (error) {
        console.error('Failed to add destination:', error);
      } finally {
        setIsAddingDestination(false);
      }
    } else {
      // Just update local state (for create trip form or non-persisted usage)
      const newCity: City = {
        id: `city-${Date.now()}`,
        name: place.formattedAddress,
        lat: place.lat,
        lng: place.lng,
      };
      setCities((prev) => [...prev, newCity]);
      setMapCenter({ lat: newCity.lat, lng: newCity.lng });
      setSearchValue('');
    }
  }, [tripId, readOnly, onDestinationAdded]);

  const onMapClick = useCallback(async (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();

      // Reverse geocode to get city name
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, async (results, status) => {
        let cityName = `Point ${lat.toFixed(4)}, ${lng.toFixed(4)}`;

        if (status === 'OK' && results && results[0]) {
          const addressComponents = results[0].address_components;
          
          // Priority order for finding location name:
          // 1. locality (city/town)
          // 2. administrative_area_level_2 (county/district)
          // 3. administrative_area_level_1 (state/province)
          // 4. sublocality (neighborhood/district)
          // 5. country
          // 6. formatted_address (full address string)
          const priorityTypes = [
            'locality',
            'administrative_area_level_2',
            'administrative_area_level_1',
            'sublocality',
            'sublocality_level_1',
            'country',
          ];
          
          let foundComponent = null;
          for (const type of priorityTypes) {
            foundComponent = addressComponents.find(
              (component) => component.types.includes(type)
            );
            if (foundComponent) break;
          }
          
          if (foundComponent) {
            cityName = foundComponent.long_name;
          } else if (results[0].formatted_address) {
            // Use formatted address as last resort (take first meaningful part)
            const formattedParts = results[0].formatted_address.split(',');
            cityName = formattedParts[0].trim() || results[0].formatted_address;
          }
        }

        // If we have a tripId, persist the destination to the backend
        if (tripId && !readOnly) {
          setIsAddingDestination(true);
          try {
            const newDestination: CreateDestinationDto = {
              name: cityName,
              latitude: lat,
              longitude: lng,
            };
            await destinationsApi.create(tripId, newDestination);
            // Notify parent to refresh data
            onDestinationAdded?.();
          } catch (error) {
            console.error('Failed to add destination:', error);
          } finally {
            setIsAddingDestination(false);
          }
        } else {
          const newCity: City = {
            id: `city-${Date.now()}`,
            name: cityName,
            lat,
            lng,
          };
          setCities((prev) => [...prev, newCity]);
        }
      });
    }
  }, [tripId, readOnly, onDestinationAdded]);

  const removeCity = useCallback((cityId: string) => {
    if (cityId === 'start') return; // Don't remove start city
    setCities((prev) => prev.filter((city) => city.id !== cityId));
  }, []);

  const handleDateChange = useCallback((
    field: 'arrivalDate' | 'departureDate',
    value: string
  ) => {
    if (editingDatesRef.current) {
      editingDatesRef.current[field] = value;
    }
  }, []);

  const handleSaveDates = useCallback(async (
    cityId: string,
    destinationId: number | undefined
  ): Promise<boolean> => {
    if (!tripId || !destinationId || !editingDatesRef.current) return true;

    setIsUpdatingDates(true);
    try {
      // Send dates as YYYY-MM-DD strings directly (no Date conversion needed)
      const arrivalDate = editingDatesRef.current.arrivalDate || undefined;
      const departureDate = editingDatesRef.current.departureDate || undefined;

      await destinationsApi.update(tripId, destinationId, { arrivalDate, departureDate });

      // Clear local cities so they re-initialize from the refreshed destinations prop.
      // This ensures cascaded date changes (e.g. previous destination's departureDate) are picked up.
      setCities([]);

      // Notify parent to refresh data
      onDestinationAdded?.();
      editingDatesRef.current = null;
      return true;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update dates';
      alert(message);
      return false;
    } finally {
      setIsUpdatingDates(false);
    }
  }, [tripId, onDestinationAdded]);

  const handleToggleDates = useCallback(async (
    city: City,
    index: number,
    defaultArrivalDate: string,
    defaultDepartureDate: string
  ) => {
    if (editingCityId === city.id) {
      // Closing - save the dates
      const success = await handleSaveDates(city.id, city.destinationId);
      if (success) {
        setEditingCityId(null);
      }
      // If save failed, keep the editor open so user can fix the dates
    } else {
      // Opening - initialize the ref with current/default values
      editingDatesRef.current = {
        arrivalDate: defaultArrivalDate,
        departureDate: defaultDepartureDate,
      };
      setEditingCityId(city.id);
    }
  }, [editingCityId, handleSaveDates]);

  const handleDeleteDestination = useCallback(async (destinationId: number, cityName: string) => {
    if (!tripId) return;
    
    if (!confirm(`Are you sure you want to remove "${cityName}" from the itinerary?`)) {
      return;
    }

    setIsDeletingDestination(true);
    try {
      await destinationsApi.delete(tripId, destinationId);
      // Notify parent to refresh data
      onDestinationAdded?.();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to delete destination';
      alert(message);
    } finally {
      setIsDeletingDestination(false);
    }
  }, [tripId, onDestinationAdded]);

  const hasDates = (city: City): boolean => {
    return !!(city.arrivalDate || city.departureDate);
  };

  // Filter cities with valid coordinates for rendering
  const validCities = cities.filter(city =>
    typeof city.lat === 'number' &&
    typeof city.lng === 'number' &&
    !isNaN(city.lat) &&
    !isNaN(city.lng)
  );

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent<HTMLLIElement>, city: City, index: number) => {
    // Don't allow dragging the start city (index 0)
    if (index === 0) {
      e.preventDefault();
      return;
    }
    setDraggedCityId(city.id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', city.id);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLLIElement>, city: City, index: number) => {
    e.preventDefault();
    // Don't allow dropping on start city (index 0) or on the same item
    if (index === 0 || city.id === draggedCityId) {
      e.dataTransfer.dropEffect = 'none';
      return;
    }
    e.dataTransfer.dropEffect = 'move';
    setDragOverCityId(city.id);
  }, [draggedCityId]);

  const handleDragLeave = useCallback(() => {
    setDragOverCityId(null);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedCityId(null);
    setDragOverCityId(null);
  }, []);

  const handleDrop = async (e: React.DragEvent<HTMLLIElement>, targetCity: City, targetIndex: number) => {
    e.preventDefault();
    setDragOverCityId(null);
    
    // Don't allow dropping on start city (index 0)
    if (targetIndex === 0 || !tripId) {
      setDraggedCityId(null);
      return;
    }

    const sourceCity = validCities.find(c => c.id === draggedCityId);
    if (!sourceCity || !sourceCity.destinationId || !targetCity.destinationId) {
      setDraggedCityId(null);
      return;
    }

    // Don't do anything if dropping on same item
    if (sourceCity.id === targetCity.id) {
      setDraggedCityId(null);
      return;
    }

    setIsReordering(true);
    try {
      await destinationsApi.reorder(tripId, sourceCity.destinationId, targetCity.destinationId);
      // Notify parent to refresh data
      onDestinationAdded?.();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to reorder destinations';
      alert(message);
    } finally {
      setIsReordering(false);
      setDraggedCityId(null);
    }
  };

  // Get default date for a city based on its position in the list
  const getDefaultDate = (cityIndex: number): string => {
    // For the first city (start city), use trip start date
    if (cityIndex === 0) {
      if (tripStartDate) {
        return getDateInputValue(tripStartDate);
      }
      return getDateInputValue(new Date());
    }

    // For other cities, use the previous city's departure date
    const previousCity = validCities[cityIndex - 1];
    if (previousCity?.departureDate) {
      return getDateInputValue(previousCity.departureDate);
    }

    // Fallback to trip start date or current date
    if (tripStartDate) {
      return getDateInputValue(tripStartDate);
    }
    return getDateInputValue(new Date());
  };

  const polylinePath = validCities.map((city) => ({ lat: city.lat, lng: city.lng }));

  if (loadError) {
    return <div className="p-4 text-red-500">Error loading Google Maps</div>;
  }

  if (!isLoaded || isGeocoding || isAddingDestination || isDeletingDestination || isReordering) {
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
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Your Itinerary</h3>
          {!readOnly && validCities.length > 1 && (
            <span className="text-xs text-gray-500">Drag destinations to reorder</span>
          )}
        </div>
        {validCities.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No destinations added yet.</p>
        ) : (
          <ul className="space-y-2">
            {validCities.map((city, index) => {
              const defaultArrivalDate = city.arrivalDate
                ? getDateInputValue(city.arrivalDate)
                : getDefaultDate(index);
              const defaultDepartureDate = city.departureDate
                ? getDateInputValue(city.departureDate)
                : defaultArrivalDate; // Default departure to arrival date

              // Calculate min/max dates for validation
              const minDate = tripStartDate ? getDateInputValue(tripStartDate) : undefined;
              const maxDate = tripEndDate ? getDateInputValue(tripEndDate) : undefined;

              const isDragging = draggedCityId === city.id;
              const isDragOver = dragOverCityId === city.id;
              const canDrag = !readOnly && !!city.destinationId && index > 0;

              return (
                <li
                  key={city.id}
                  draggable={canDrag}
                  onDragStart={(e) => handleDragStart(e, city, index)}
                  onDragOver={(e) => handleDragOver(e, city, index)}
                  onDragLeave={handleDragLeave}
                  onDragEnd={handleDragEnd}
                  onDrop={(e) => handleDrop(e, city, index)}
                  className={`p-3 rounded-lg transition-all ${
                    isDragging 
                      ? 'opacity-50 bg-blue-100 border-2 border-dashed border-blue-400' 
                      : isDragOver 
                        ? 'bg-blue-50 border-2 border-blue-400' 
                        : 'bg-gray-50'
                  } ${canDrag ? 'cursor-grab active:cursor-grabbing' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {canDrag && (
                        <span className="text-gray-400 cursor-grab select-none" title="Drag to reorder">
                          ⋮⋮
                        </span>
                      )}
                      <span className="flex items-center justify-center w-8 h-8 bg-blue-500 text-white rounded-full font-bold">
                        {index + 1}
                      </span>
                      <div>
                        <span className="font-medium">{city.name}</span>
                        {editingCityId !== city.id && (city.arrivalDate || city.departureDate) && (
                          <div className="text-xs text-gray-500">
                            {city.arrivalDate && (
                              <span>Arrive: {formatDateDisplay(city.arrivalDate)}</span>
                            )}
                            {city.arrivalDate && city.departureDate && <span> • </span>}
                            {city.departureDate && (
                              <span>Depart: {formatDateDisplay(city.departureDate)}</span>
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
                    <div className="flex items-center gap-2">
                      {/* Date toggle button - only for persisted destinations */}
                      {!readOnly && city.destinationId && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleDates(city, index, defaultArrivalDate, defaultDepartureDate)}
                          className="text-xs"
                          disabled={isUpdatingDates || isDeletingDestination || isReordering}
                        >
                          {editingCityId === city.id ? 'Save Dates' : hasDates(city) ? 'Edit Dates' : 'Add Dates'}
                        </Button>
                      )}
                      {/* Delete button - only for persisted destinations (not start city) */}
                      {!readOnly && city.destinationId && index > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteDestination(city.destinationId!, city.name)}
                          className="text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                          disabled={isUpdatingDates || isDeletingDestination || isReordering}
                        >
                          Delete
                        </Button>
                      )}
                      {/* Remove button - only for non-persisted cities */}
                      {!readOnly && !city.id.startsWith('dest-') && (
                        <button
                          onClick={() => removeCity(city.id)}
                          className="px-3 py-1 text-sm text-red-600 hover:bg-red-100 rounded transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Date pickers - show when editing */}
                  {editingCityId === city.id && city.destinationId && (
                    <div className="mt-3 grid grid-cols-2 gap-3 pt-3 border-t">
                      <div className="space-y-1">
                        <label className="text-xs text-gray-500">Arrival Date</label>
                        <Input
                          type="date"
                          className="bg-white"
                          defaultValue={defaultArrivalDate}
                          min={minDate}
                          max={maxDate}
                          onChange={(e) => handleDateChange('arrivalDate', e.target.value)}
                          disabled={isUpdatingDates}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-gray-500">Departure Date</label>
                        <Input
                          type="date"
                          className="bg-white"
                          defaultValue={defaultDepartureDate}
                          min={minDate}
                          max={maxDate}
                          onChange={(e) => handleDateChange('departureDate', e.target.value)}
                          disabled={isUpdatingDates}
                        />
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
