// Enum for expense types
export enum ExpenseType {
  FLIGHT = 'flight',
  LODGING = 'lodging',
  TRANSPORTATION = 'transportation',
  MEAL = 'meal',
  SNACK = 'snack',
  GROCERIES = 'groceries',
  ENTERTAINMENT = 'entertainment',
  OTHER = 'other',
}

// Trip expense interface
export interface TripExpense {
  id: number;
  date: string;
  type: ExpenseType;
  memo?: string;
  comment?: string;
  amount: number;
  tripId: number;
  paidById: number;
  paidBy?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  trip?: any;
  createdAt: Date;
  updatedAt: Date;
}

// DTO for creating a trip expense
export interface CreateTripExpenseDto {
  date: string;
  type: ExpenseType;
  memo?: string;
  comment?: string | null;
  amount: number;
  tripId: number;
  paidById: number;
}

// DTO for updating a trip expense
export interface UpdateTripExpenseDto {
  date?: string;
  type?: ExpenseType;
  memo?: string;
  comment?: string | null;
  amount?: number;
  paidById?: number;
}

// Summary of trip expenses
export interface TripExpensesSummary {
  totalExpenses: number;
  expensesByType: Record<string, number>;
  expensesByPayer: Array<{ userId: number; userName: string; total: number }>;
}
