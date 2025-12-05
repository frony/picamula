import { useState, useEffect, useCallback } from 'react';
import { tripExpensesApi } from '@/lib/api';
import type {
  TripExpense,
  CreateTripExpenseDto,
  UpdateTripExpenseDto,
  TripExpensesSummary,
} from '@/types/trip-expense.types';

export const useTripExpenses = (tripId: number) => {
  const [expenses, setExpenses] = useState<TripExpense[]>([]);
  const [summary, setSummary] = useState<TripExpensesSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExpenses = useCallback(async () => {
    if (!tripId) return;

    setLoading(true);
    setError(null);
    try {
      const response = await tripExpensesApi.getAll(tripId);
      const data = response.data;
      setExpenses(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch expenses');
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  const fetchSummary = useCallback(async () => {
    if (!tripId) return;

    try {
      const response = await tripExpensesApi.getSummary(tripId);
      const data = response.data;
      setSummary(data);
    } catch (err: any) {
      console.error('Failed to fetch summary:', err);
    }
  }, [tripId]);

  const createExpense = async (data: CreateTripExpenseDto) => {
    setLoading(true);
    setError(null);
    try {
      const response = await tripExpensesApi.create(data);
      const newExpense = response.data;
      setExpenses((prev) => [newExpense, ...prev]);
      await fetchSummary();
      return newExpense;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to create expense';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const updateExpense = async (id: number, data: UpdateTripExpenseDto) => {
    setLoading(true);
    setError(null);
    try {
      const response = await tripExpensesApi.update(id, data);
      const updatedExpense = response.data;
      setExpenses((prev) =>
        prev.map((exp) => (exp.id === id ? updatedExpense : exp))
      );
      await fetchSummary();
      return updatedExpense;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update expense';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const deleteExpense = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      await tripExpensesApi.delete(id);
      setExpenses((prev) => prev.filter((exp) => exp.id !== id));
      await fetchSummary();
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to delete expense';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
    fetchSummary();
  }, [fetchExpenses, fetchSummary]);

  return {
    expenses,
    summary,
    loading,
    error,
    createExpense,
    updateExpense,
    deleteExpense,
    refetch: fetchExpenses,
  };
};
