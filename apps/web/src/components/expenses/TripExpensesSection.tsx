'use client';

import React, { useState, useEffect } from 'react';
import { useTripExpenses } from '@/hooks/useTripExpenses';
import { ExpenseForm } from './ExpenseForm';
import { ExpenseList } from './ExpenseList';
import { ExpensesSummary } from './ExpensesSummary';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, Plus } from 'lucide-react';
import { usersApi } from '@/lib/api';
import type { TripExpense, User } from '@junta-tribo/shared';

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

  // Fetch all travelers (trip owner + participants)
  useEffect(() => {
    const fetchTravelers = async () => {
      console.log('=== Fetching travelers ===');
      console.log('Trip owner:', tripOwner);
      console.log('Participants:', participants);
      
      setLoadingUsers(true);
      try {
        const users: User[] = [];
        
        // Add trip owner
        if (tripOwner && tripOwner.id) {
          users.push(tripOwner);
          console.log('Added trip owner:', tripOwner);
        } else {
          console.error('Trip owner is missing or invalid:', tripOwner);
        }
        
        // Fetch participant user objects if there are participants
        console.log('Raw participants array:', participants);
        console.log('Participants type:', typeof participants);
        console.log('Is array?', Array.isArray(participants));
        
        if (participants && participants.length > 0) {
          // Filter to only valid email addresses
          const emails = participants.filter(p => {
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
              console.log('Number of participant users:', participantUsers?.length);
              
              // Add participants (avoid duplicates with trip owner)
              participantUsers.forEach(user => {
                console.log(`Processing user ${user.id} (${user.firstName} ${user.lastName})`);
                console.log(`Trip owner ID: ${tripOwner.id}, User ID: ${user.id}, Equal? ${user.id === tripOwner.id}`);
                if (user.id !== tripOwner.id) {
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
            console.log('⚠️ No valid email addresses in participants:', participants);
          }
        } else {
          console.log('⚠️ No participants or empty array');
        }
        
        console.log('Final available users:', users);
        setAvailableUsers(users);
      } catch (error) {
        console.error('Failed to fetch travelers:', error);
        // Fallback to just the trip owner if it exists
        if (tripOwner && tripOwner.id) {
          setAvailableUsers([tripOwner]);
        } else {
          setAvailableUsers([]);
        }
      } finally {
        setLoadingUsers(false);
      }
    };

    if (tripOwner && tripOwner.id) {
      fetchTravelers();
    } else {
      console.error('Cannot fetch travelers - trip owner is missing:', tripOwner);
      setLoadingUsers(false);
    }
  }, [tripOwner, participants]);

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
