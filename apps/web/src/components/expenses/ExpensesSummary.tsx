'use client';

import React from 'react';
import { TripExpensesSummary } from '@/types/trip-expense.types';

interface ExpensesSummaryProps {
  summary: TripExpensesSummary;
}

export const ExpensesSummary: React.FC<ExpensesSummaryProps> = ({
  summary,
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      flight: 'bg-purple-100 text-purple-800',
      lodging: 'bg-blue-100 text-blue-800',
      transportation: 'bg-green-100 text-green-800',
      meal: 'bg-orange-100 text-orange-800',
      snack: 'bg-yellow-100 text-yellow-800',
      groceries: 'bg-teal-100 text-teal-800',
      entertainment: 'bg-pink-100 text-pink-800',
      other: 'bg-gray-100 text-gray-800',
    };
    return colors[type] || colors.other;
  };

  return (
    <div className="space-y-6">
      {/* Total Expenses */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white shadow-lg">
        <h2 className="text-lg font-medium mb-2">Total Expenses</h2>
        <p className="text-4xl font-bold">
          {formatCurrency(summary.totalExpenses)}
        </p>
      </div>

      {/* Expenses by Type */}
      <div className="border rounded-lg p-6 bg-white shadow">
        <h3 className="text-lg font-semibold mb-4">Expenses by Type</h3>
        {Object.keys(summary.expensesByType).length === 0 ? (
          <p className="text-gray-500 text-sm">No expenses yet</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(summary.expensesByType)
              .sort(([, a], [, b]) => b - a)
              .map(([type, amount]) => {
                const percentage =
                  (amount / summary.totalExpenses) * 100;
                return (
                  <div key={type}>
                    <div className="flex justify-between items-center mb-1">
                      <span
                        className={`px-2 py-1 text-xs rounded ${getTypeColor(
                          type
                        )}`}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </span>
                      <span className="font-medium">
                        {formatCurrency(amount)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1 text-right">
                      {percentage.toFixed(1)}%
                    </p>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Expenses by Payer */}
      <div className="border rounded-lg p-6 bg-white shadow">
        <h3 className="text-lg font-semibold mb-4">Expenses by Payer</h3>
        {summary.expensesByPayer.length === 0 ? (
          <p className="text-gray-500 text-sm">No expenses yet</p>
        ) : (
          <div className="space-y-3">
            {summary.expensesByPayer
              .sort((a, b) => b.total - a.total)
              .map((payer) => {
                const percentage = (payer.total / summary.totalExpenses) * 100;
                return (
                  <div key={payer.userId}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium">{payer.userName}</span>
                      <span className="font-medium">
                        {formatCurrency(payer.total)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1 text-right">
                      {percentage.toFixed(1)}%
                    </p>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
};
