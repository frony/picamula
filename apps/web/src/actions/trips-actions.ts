'use server';

import { apiClient } from '@/lib/api-client';
import type { Trip, CreateTripDto, UpdateTripDto } from '@junta-tribo/shared';

interface ActionResult {
  success: boolean;
  error?: string;
  data?: any;
}

// Fetch all trips
export async function fetchTrips(status?: string): Promise<ActionResult> {
  try {
    const params = status ? `?status=${status}` : '';
    const trips = await apiClient.get<Trip[]>(`/trips${params}`);
    
    return {
      success: true,
      data: trips
    };
  } catch (error: any) {
    console.error('Error fetching trips:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch trips'
    };
  }
}

// Fetch trip by ID
export async function fetchTripById(id: string): Promise<ActionResult> {
  try {
    const trip = await apiClient.get<Trip>(`/trips/${id}`);
    
    return {
      success: true,
      data: trip
    };
  } catch (error: any) {
    console.error('Error fetching trip:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch trip'
    };
  }
}

// Fetch upcoming trips
export async function fetchUpcomingTrips(): Promise<ActionResult> {
  try {
    const trips = await apiClient.get<Trip[]>('/trips/upcoming');
    
    return {
      success: true,
      data: trips
    };
  } catch (error: any) {
    console.error('Error fetching upcoming trips:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch upcoming trips'
    };
  }
}

// Create new trip
export async function createTrip(data: CreateTripDto): Promise<ActionResult> {
  try {
    // Validate required fields
    if (!data.title || !data.startDate || !data.endDate) {
      return {
        success: false,
        error: 'Title, start date, and end date are required'
      };
    }

    const trip = await apiClient.post<Trip>('/trips', data);
    
    return {
      success: true,
      data: trip
    };
  } catch (error: any) {
    console.error('Error creating trip:', error);
    
    if (error.status === 403) {
      return {
        success: false,
        error: 'You do not have permission to create trips'
      };
    }
    
    if (error.status === 401) {
      return {
        success: false,
        error: 'Authentication required. Please log in again.'
      };
    }
    
    return {
      success: false,
      error: error.message || 'Failed to create trip'
    };
  }
}

// Update existing trip
export async function updateTrip(id: string, data: UpdateTripDto): Promise<ActionResult> {
  try {
    const trip = await apiClient.patch<Trip>(`/trips/${id}`, data);
    
    return {
      success: true,
      data: trip
    };
  } catch (error: any) {
    console.error('Error updating trip:', error);
    
    if (error.status === 403) {
      return {
        success: false,
        error: 'You do not have permission to update this trip'
      };
    }
    
    if (error.status === 401) {
      return {
        success: false,
        error: 'Authentication required. Please log in again.'
      };
    }
    
    if (error.status === 404) {
      return {
        success: false,
        error: 'Trip not found'
      };
    }
    
    return {
      success: false,
      error: error.message || 'Failed to update trip'
    };
  }
}

// Delete trip
export async function deleteTrip(id: string): Promise<ActionResult> {
  try {
    await apiClient.delete(`/trips/${id}`);
    
    return {
      success: true
    };
  } catch (error: any) {
    console.error('Error deleting trip:', error);
    
    if (error.status === 403) {
      return {
        success: false,
        error: 'You do not have permission to delete this trip'
      };
    }
    
    if (error.status === 401) {
      return {
        success: false,
        error: 'Authentication required. Please log in again.'
      };
    }
    
    if (error.status === 404) {
      return {
        success: false,
        error: 'Trip not found'
      };
    }
    
    return {
      success: false,
      error: error.message || 'Failed to delete trip'
    };
  }
}
