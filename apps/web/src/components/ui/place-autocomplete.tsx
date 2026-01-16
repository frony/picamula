'use client';

import { useCallback, useRef, useEffect, KeyboardEvent } from 'react';
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api';
import { Input } from '@/components/ui/input';

const libraries: ("places")[] = ['places'];

export interface PlaceResult {
  name: string;
  lat: number;
  lng: number;
  formattedAddress: string;
}

interface PlaceAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect: (place: PlaceResult) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function PlaceAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder = 'Search for a city...',
  className = '',
  disabled = false,
}: PlaceAutocompleteProps) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const isSelectingRef = useRef(false);

  const onAutocompleteLoad = useCallback(
    (autocomplete: google.maps.places.Autocomplete) => {
      autocompleteRef.current = autocomplete;
      // Request geometry field to ensure we get location data
      autocomplete.setFields(['formatted_address', 'geometry', 'name']);
    },
    []
  );

  const onPlaceChanged = useCallback(() => {
    // Prevent duplicate triggers
    if (isSelectingRef.current) {
      return;
    }

    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();

      // Check if place and geometry exist (user selected from dropdown)
      if (!place || !place.geometry || !place.geometry.location) {
        // User pressed enter without selecting - just update the text value
        return;
      }

      isSelectingRef.current = true;

      const result: PlaceResult = {
        name: place.name || '',
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
        formattedAddress: place.formatted_address || place.name || '',
      };
      onChange(result.formattedAddress); // Updates the text value
      onPlaceSelect(result); // Sends full place data (with lat/lng)

      // Reset the flag after a short delay
      setTimeout(() => {
        isSelectingRef.current = false;
      }, 100);
    }
  }, [onChange, onPlaceSelect]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab' || e.key === 'Enter') {
      // Find the highlighted suggestion in the dropdown
      const pacContainer = document.querySelector('.pac-container');
      if (pacContainer) {
        const highlighted = pacContainer.querySelector('.pac-item-selected') as HTMLElement;
        const firstItem = pacContainer.querySelector('.pac-item') as HTMLElement;
        const itemToSelect = highlighted || firstItem;

        if (itemToSelect) {
          // Simulate a click on the suggestion to trigger selection
          itemToSelect.click();
          e.preventDefault();
        }
      }
    }
  }, []);

  // Sync input value when value prop changes
  useEffect(() => {
    if (inputRef.current && inputRef.current.value !== value) {
      inputRef.current.value = value;
    }
  }, [value]);

  if (!isLoaded) {
    return (
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={className}
        disabled={disabled}
      />
    );
  }

  return (
    <Autocomplete
      onLoad={onAutocompleteLoad}
      onPlaceChanged={onPlaceChanged}
      options={{ types: ['(cities)'] }}
    >
      <Input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        defaultValue={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        className={className}
        disabled={disabled}
      />
    </Autocomplete>
  );
}
