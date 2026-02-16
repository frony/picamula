'use client';

import React, { useState, useEffect } from 'react';
import { User } from '@junta-tribo/shared';
import {
  ExpenseType,
  CreateTripExpenseDto,
  TripExpense,
} from '@/types/trip-expense.types';

type ExpenseFormCallback = (data: CreateTripExpenseDto) => Promise<void>;
type CancelCallback = () => void;

interface ExpenseFormProps {
  tripId: number;
  tripSlug: string;
  tripOwner: User;
  participants: string[]; // Array of participant emails
  availableUsers: User[]; // List of users who can be payers
  expense?: TripExpense;
  onSubmit: ExpenseFormCallback;
  onCancel: CancelCallback;
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({
  tripId,
  tripSlug,
  tripOwner,
  participants,
  availableUsers,
  expense,
  onSubmit,
  onCancel,
}) => {
  const [formData, setFormData] = useState<CreateTripExpenseDto>({
    date: new Date().toISOString().split('T')[0],
    type: ExpenseType.OTHER,
    memo: '',
    comment: null,
    amount: 0,
    tripId,
    tripSlug,
    paidById: expense?.paidById || tripOwner.id,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debug logging
  useEffect(() => {
    console.log('=== ExpenseForm Debug ===');
    console.log('tripOwner:', tripOwner);
    console.log('availableUsers:', availableUsers);
    console.log('participants:', participants);
  }, [tripOwner, availableUsers, participants]);

  useEffect(() => {
    if (expense) {
      setFormData({
        date: expense.date.split('T')[0],
        type: expense.type,
        memo: expense.memo,
        comment: expense.comment || null,
        amount: expense.amount,
        tripId: expense.tripId,
        tripSlug,
        paidById: expense.paidById,
      });
    }
  }, [expense]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await onSubmit(formData);
    } catch (err: any) {
      setError(err.message || 'Failed to save expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Date *</label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Type *</label>
          <select
            value={formData.type}
            onChange={(e) =>
              setFormData({ ...formData, type: e.target.value as ExpenseType })
            }
            className="w-full px-3 py-2 border rounded-md"
            required
          >
            {Object.values(ExpenseType).map((type) => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Description *</label>
        <input
          type="text"
          value={formData.memo}
          onChange={(e) =>
            setFormData({ ...formData, memo: e.target.value })
          }
          className="w-full px-3 py-2 border rounded-md"
          required
          maxLength={255}
          placeholder="What was this expense for?"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Comment (optional)</label>
        <textarea
          value={formData.comment || ''}
          onChange={(e) =>
            setFormData({ ...formData, comment: e.target.value || null })
          }
          className="w-full px-3 py-2 border rounded-md resize-none"
          maxLength={500}
          rows={2}
          placeholder="Any additional notes about this expense..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Amount *</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={formData.amount}
          onChange={(e) =>
            setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })
          }
          className="w-full px-3 py-2 border rounded-md"
          required
          placeholder="0.00"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Paid By *</label>
        <select
          value={formData.paidById}
          onChange={(e) =>
            setFormData({ ...formData, paidById: parseInt(e.target.value) })
          }
          className="w-full px-3 py-2 border rounded-md"
          required
        >
          {availableUsers.map((user) => {
            const displayName = user.firstName || user.lastName
              ? `${user.firstName} ${user.lastName}`.trim()
              : user.email || `User ${user.id}`;
            return (
              <option key={user.id} value={user.id}>
                {displayName}
              </option>
            );
          })}
        </select>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-2 justify-end pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border rounded-md hover:bg-gray-50 transition-colors"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          disabled={loading}
        >
          {loading ? 'Saving...' : expense ? 'Update' : 'Create'} Expense
        </button>
      </div>
    </form>
  );
};
