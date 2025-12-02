export enum ExpenseCategory {
  FOOD = 'Food & Dining',
  TRANSPORT = 'Transportation',
  ACCOMMODATION = 'Accommodation',
  ACTIVITIES = 'Activities',
  SHOPPING = 'Shopping',
  MISC = 'Miscellaneous'
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Expense {
  id: string;
  tripId: string;
  amount: number;
  category: ExpenseCategory;
  description: string;
  date: string;
}

export interface Activity {
  id: string;
  tripId: string;
  date: string; // ISO Date string YYYY-MM-DD
  description: string;
  time?: string;
  isCompleted: boolean;
}

export interface Trip {
  id: string;
  userId: string; // New field for security/isolation
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  imageUrl?: string;
  notes?: string;
}

export interface ItineraryDay {
  day: number;
  title: string;
  activities: string[];
}

export interface AIItineraryResponse {
  destination: string;
  days: ItineraryDay[];
  estimatedCost: string;
}

export type ViewState = 'DASHBOARD' | 'TRIP_DETAILS' | 'AI_PLANNER';
