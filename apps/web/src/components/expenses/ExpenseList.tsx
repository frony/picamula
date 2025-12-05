'use client';

import React, { useState } from 'react';
import { TripExpense } from '@/types/trip-expense.types';

interface ExpenseListProps {
  expenses: TripExpense[];
  onEdit: (expense: TripExpense) => void;
  onDelete: (id: number) => void;
}

export const ExpenseList: React.FC<ExpenseListProps> = ({
  expenses,
  onEdit,
  onDelete,
}) => {
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this expense?')) {
      setDeletingId(id);
      try {
        await onDelete(id);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (expenses.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg">No expenses yet</p>
        <p className="text-sm mt-2">Add your first expense to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {expenses.map((expense) => (
        <div
          key={expense.id}
          className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-lg">{expense.memo}</h3>
                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                  {expense.type}
                </span>
              </div>
              
              <div className="space-y-1 text-sm text-gray-600">
                <p>
                  <span className="font-medium">Amount:</span>{' '}
                  <span className="text-lg font-semibold text-gray-900">
                    {formatCurrency(expense.amount)}
                  </span>
                </p>
                <p>
                  <span className="font-medium">Date:</span>{' '}
                  {formatDate(expense.date)}
                </p>
                <p>
                  <span className="font-medium">Paid by:</span>{' '}
                  {expense.paidBy?.firstName} {expense.paidBy?.lastName}
                </p>
              </div>
            </div>

            <div className="flex gap-2 ml-4">
              <button
                onClick={() => onEdit(expense)}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-50 transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(expense.id)}
                disabled={deletingId === expense.id}
                className="px-3 py-1 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                {deletingId === expense.id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
