'use server';

import { apiClient } from '@/lib/api-client';
import type { Note, CreateNoteDto, UpdateNoteDto } from '@junta-tribo/shared';

interface ActionResult {
  success: boolean;
  error?: string;
  data?: any;
}

// Fetch all notes for a trip
export async function fetchNotes(tripId: string): Promise<ActionResult> {
  try {
    const notes = await apiClient.get<Note[]>(`/trips/${tripId}/notes`);
    
    return {
      success: true,
      data: notes
    };
  } catch (error: any) {
    console.error('Error fetching notes:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch notes'
    };
  }
}

// Fetch note by ID
export async function fetchNoteById(tripId: string, noteId: string): Promise<ActionResult> {
  try {
    const note = await apiClient.get<Note>(`/trips/${tripId}/notes/${noteId}`);
    
    return {
      success: true,
      data: note
    };
  } catch (error: any) {
    console.error('Error fetching note:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch note'
    };
  }
}

// Create new note
export async function createNote(tripId: string, data: CreateNoteDto): Promise<ActionResult> {
  try {
    // Validate required fields
    if (!data.content || !data.date) {
      return {
        success: false,
        error: 'Content and date are required'
      };
    }

    const note = await apiClient.post<Note>(`/trips/${tripId}/notes`, data);
    
    return {
      success: true,
      data: note
    };
  } catch (error: any) {
    console.error('Error creating note:', error);
    
    if (error.status === 403) {
      return {
        success: false,
        error: 'You do not have permission to create notes for this trip'
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
      error: error.message || 'Failed to create note'
    };
  }
}

// Update existing note
export async function updateNote(tripId: string, noteId: string, data: UpdateNoteDto): Promise<ActionResult> {
  try {
    const note = await apiClient.patch<Note>(`/trips/${tripId}/notes/${noteId}`, data);
    
    return {
      success: true,
      data: note
    };
  } catch (error: any) {
    console.error('Error updating note:', error);
    
    if (error.status === 403) {
      return {
        success: false,
        error: 'You do not have permission to update this note'
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
        error: 'Note not found'
      };
    }
    
    return {
      success: false,
      error: error.message || 'Failed to update note'
    };
  }
}

// Delete note
export async function deleteNote(tripId: string, noteId: string): Promise<ActionResult> {
  try {
    await apiClient.delete(`/trips/${tripId}/notes/${noteId}`);
    
    return {
      success: true
    };
  } catch (error: any) {
    console.error('Error deleting note:', error);
    
    if (error.status === 403) {
      return {
        success: false,
        error: 'You do not have permission to delete this note'
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
        error: 'Note not found'
      };
    }
    
    return {
      success: false,
      error: error.message || 'Failed to delete note'
    };
  }
}
