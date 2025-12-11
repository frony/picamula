'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTripExpenses } from '@/hooks/useTripExpenses';
import { ExpenseForm } from './ExpenseForm';
import { ExpenseList } from './ExpenseList';
import { ExpensesSummary } from './ExpensesSummary';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, Plus } from 'lucide-react';
import { usersApi } from '@/lib/api';
import type { User } from '@junta-tribo/shared';
import type { TripExpense } from '@/types/trip-expense.types';

interface TripExpensesSectionProps {
  tripId: number;
  tripOwner: User;
  participants: string[];
  isOwner: boolean;
}

export const TripExpensesSection: React.FC<TripExpensesSectionProps> = ({
  tripId,
  tripOwner,
  participants,
  isOwner,
}) => {
  const {
    expenses,
    summary,
    loading,
    error,
    createExpense,
    updateExpense,
    deleteExpense,
  } = useTripExpenses(tripId);

  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<TripExpense | undefined>(
    undefined
  );
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Create stable dependency values to prevent infinite re-renders
  const tripOwnerId = tripOwner?.id;
  // Memoize participants key - only changes when actual content changes
  const participantsKey = useMemo(() => {
    if (!participants || participants.length === 0) return '';
    return [...participants].sort().join(',');
  }, [participants]);

  // Use ref to track if we've already fetched for current data
  const fetchedForRef = useRef<string>('');
  // Keep refs to latest values so we can use them in the async function
  const tripOwnerRef = useRef(tripOwner);
  const participantsRef = useRef(participants);

  // Update refs on every render
  tripOwnerRef.current = tripOwner;
  participantsRef.current = participants;

  // Fetch all travelers (trip owner + participants)
  useEffect(() => {
    const fetchKey = `${tripOwnerId}-${participantsKey}`;

    console.log('=== TripExpensesSection useEffect ===');
    console.log('fetchKey:', fetchKey);
    console.log('fetchedForRef.current:', fetchedForRef.current);

    // Skip if we've already fetched for this exact combination
    if (fetchedForRef.current === fetchKey) {
      console.log('⏭️ Skipping fetch - already fetched for this key');
      return;
    }

    // Set ref IMMEDIATELY to prevent concurrent fetches
    fetchedForRef.current = fetchKey;
    console.log('✅ Set fetchedForRef to:', fetchKey);

    const fetchTravelers = async () => {
      console.log('=== Fetching travelers ===');
      const currentTripOwner = tripOwnerRef.current;
      const currentParticipants = participantsRef.current;
      console.log('Trip owner:', currentTripOwner);
      console.log('Participants:', currentParticipants);

      setLoadingUsers(true);
      try {
        const users: User[] = [];

        // Add trip owner
        if (currentTripOwner && currentTripOwner.id) {
          users.push(currentTripOwner);
          console.log('Added trip owner:', currentTripOwner);
        } else {
          console.error('Trip owner is missing or invalid:', currentTripOwner);
        }

        // Fetch participant user objects if there are participants
        console.log('Raw participants array:', currentParticipants);

        if (currentParticipants && currentParticipants.length > 0) {
          // Filter to only valid email addresses
          const emails = currentParticipants.filter(p => {
            const isEmail = typeof p === 'string' && p.includes('@');
            console.log(`Checking participant "${p}": isEmail=${isEmail}`);
            return isEmail;
          });
          console.log('Filtered emails:', emails);

          if (emails.length > 0) {
            console.log('Fetching participants by emails:', emails);
            try {
              const response = await usersApi.getByEmails(emails);
              const participantUsers = response.data;
              console.log('Received participant users:', participantUsers);

              // Add participants (avoid duplicates with trip owner)
              participantUsers.forEach(user => {
                console.log(`Processing user ${user.id} (${user.firstName} ${user.lastName})`);
                if (user.id !== currentTripOwner.id) {
                  users.push(user);
                  console.log('✅ Added participant:', user);
                } else {
                  console.log('⏭️ Skipped duplicate (trip owner):', user);
                }
              });
            } catch (err) {
              console.error('Failed to fetch participants:', err);
            }
          } else {
            console.log('⚠️ No valid email addresses in participants');
          }
        } else {
          console.log('⚠️ No participants or empty array');
        }

        console.log('Final available users:', users);
        setAvailableUsers(users);
      } catch (error) {
        console.error('Failed to fetch travelers:', error);
        // Fallback to just the trip owner if it exists
        const currentTripOwner = tripOwnerRef.current;
        if (currentTripOwner && currentTripOwner.id) {
          setAvailableUsers([currentTripOwner]);
        } else {
          setAvailableUsers([]);
        }
      } finally {
        setLoadingUsers(false);
      }
    };

    if (tripOwnerId) {
      fetchTravelers();
    } else {
      console.error('Cannot fetch travelers - tripOwnerId is missing');
      setLoadingUsers(false);
    }
  }, [tripOwnerId, participantsKey]); // Only primitive dependencies!

  const handleCreateOrUpdate = async (data: any) => {
    if (editingExpense) {
      await updateExpense(editingExpense.id, data);
    } else {
      await createExpense(data);
    }
    setShowForm(false);
    setEditingExpense(undefined);
  };

  const handleEdit = (expense: TripExpense) => {
    setEditingExpense(expense);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingExpense(undefined);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-lg flex items-center">
              <DollarSign className="w-5 h-5 mr-2 text-green-600" />
              Trip Expenses
            </CardTitle>
            <CardDescription>
              Track and manage expenses for this trip
            </CardDescription>
          </div>
          {!showForm && (
            <Button onClick={() => setShowForm(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Expense
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Expense Form */}
        {showForm && (
          <div className="mb-6 p-4 border rounded-lg bg-gray-50">
            <h3 className="text-base font-semibold mb-4">
              {editingExpense ? 'Edit Expense' : 'Add New Expense'}
            </h3>
            <ExpenseForm
              tripId={tripId}
              tripOwner={tripOwner}
              participants={participants}
              availableUsers={availableUsers}
              expense={editingExpense}
              onSubmit={handleCreateOrUpdate}
              onCancel={handleCancel}
            />
          </div>
        )}

        {/* Tabs for List and Summary */}
        <Tabs defaultValue="list" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="list">Expenses List</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-4">
            {loading && !showForm ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="mt-2 text-sm text-gray-600">Loading expenses...</p>
              </div>
            ) : (
              <ExpenseList
                expenses={expenses}
                onEdit={handleEdit}
                onDelete={deleteExpense}
              />
            )}
          </TabsContent>

          <TabsContent value="summary" className="mt-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="mt-2 text-sm text-gray-600">Loading summary...</p>
              </div>
            ) : summary ? (
              <ExpensesSummary summary={summary} />
            ) : (
              <div className="text-center py-8 text-gray-500">
                <DollarSign className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No expense data available</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
