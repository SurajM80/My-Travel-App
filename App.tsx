import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Map as MapIcon, 
  Sparkles, 
  Plus, 
  Wallet,
  Calendar,
  ChevronLeft,
  Trash2,
  PieChart as PieChartIcon,
  LogOut,
  User as UserIcon,
  Loader2,
  AlertTriangle,
  Database,
  Copy,
  Check,
  Edit2,
  X,
  Download
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { Trip, Expense, ExpenseCategory, ViewState, User, Activity } from './types';
import { Button } from './components/Button';
import { TripCard } from './components/TripCard';
import { AIPlanner } from './components/AIPlanner';
import { AuthForm } from './components/AuthForm';
import { TripItinerary } from './components/TripItinerary';
import { supabase } from './services/supabaseClient';
import { generateTripPDF } from './services/pdfService';
import { addDays } from './utils/dateUtils';

// ---- Constants & Utils ----
const CHART_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];

// ---- Helper Component for DB Setup ----
const DBSetupHelp = ({ error }: { error: any }) => {
  const [copied, setCopied] = useState(false);
  const sqlScript = `
-- ⚠️ WARNING: This cleans up old tables to ensure the correct structure.
-- It will DELETE existing data in these tables.
drop table if exists activities;
drop table if exists expenses;
drop table if exists trips;

-- 1. Create Trips Table
create table trips (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  destination text not null,
  start_date date not null,
  end_date date not null,
  budget numeric default 0,
  image_url text,
  notes text,
  created_at timestamptz default now()
);

-- 2. Create Expenses Table
create table expenses (
  id uuid default gen_random_uuid() primary key,
  trip_id uuid references trips(id) on delete cascade not null,
  amount numeric not null,
  category text not null,
  description text,
  date date default CURRENT_DATE,
  created_at timestamptz default now()
);

-- 3. Create Activities Table
create table activities (
  id uuid default gen_random_uuid() primary key,
  trip_id uuid references trips(id) on delete cascade not null,
  date date not null,
  time text,
  description text not null,
  is_completed boolean default false,
  created_at timestamptz default now()
);

-- 4. Enable Row Level Security (RLS)
alter table trips enable row level security;
alter table expenses enable row level security;
alter table activities enable row level security;

-- 5. Create Policies (Users can only manage their own data)

-- Trips: Users can do anything to trips they own
create policy "Users can manage their own trips" on trips
  for all using (auth.uid() = user_id);

-- Expenses: Users can manage expenses if they own the trip
create policy "Users can manage expenses for their trips" on expenses
  for all using (
    exists (select 1 from trips where trips.id = expenses.trip_id and trips.user_id = auth.uid())
  );

-- Activities: Users can manage activities if they own the trip
create policy "Users can manage activities for their trips" on activities
  for all using (
    exists (select 1 from trips where trips.id = activities.trip_id and trips.user_id = auth.uid())
  );
`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sqlScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 bg-red-50 border-b border-red-100 flex items-start gap-4">
          <div className="bg-red-100 p-3 rounded-full">
            <Database className="text-red-600 h-6 w-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Database Setup Required</h3>
            <p className="text-red-700 mt-1 text-sm">
              The app needs the correct database structure to function. 
            </p>
            <p className="text-xs text-red-500 mt-2 font-mono bg-red-100/50 p-2 rounded">
              Error Code: {error.code} — {error.message}
            </p>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-bold text-gray-700">SQL Setup Script</h4>
            <button 
              onClick={copyToClipboard}
              className="flex items-center gap-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy SQL'}
            </button>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
            <pre className="text-xs text-green-400 font-mono leading-relaxed whitespace-pre-wrap">
              {sqlScript}
            </pre>
          </div>
          <div className="mt-6">
            <h4 className="font-bold text-gray-900 mb-2">How to fix:</h4>
            <ol className="list-decimal list-inside text-sm text-gray-600 space-y-2">
              <li>Copy the SQL script above.</li>
              <li>Go to your <a href="https://supabase.com/dashboard/project/dwjwwaioqcsvchtimebr/sql" target="_blank" rel="noreferrer" className="text-indigo-600 underline">Supabase SQL Editor</a>.</li>
              <li>Paste the script and click <strong>Run</strong>.</li>
              <li>Refresh this page.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---- Main Component ----
export default function App() {
  // ---- Auth State ----
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // ---- App State ----
  const [view, setView] = useState<ViewState>('DASHBOARD');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  
  // ---- Modal States ----
  const [isTripModalOpen, setIsTripModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [tripToDelete, setTripToDelete] = useState<string | null>(null);

  // ---- Form States ----
  const [newTrip, setNewTrip] = useState<Partial<Trip>>({});
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({ category: ExpenseCategory.MISC });
  
  // ---- Budget Edit State ----
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');

  // ---- Loading States for Data ----
  const [dataLoading, setDataLoading] = useState(false);
  const [dbError, setDbError] = useState<any | null>(null);

  // ---- Initialization & Auth ----
  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata.name || 'Traveler'
        });
      }
      setAuthLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata.name || 'Traveler'
        });
      } else {
        setUser(null);
        setTrips([]);
        setExpenses([]);
        setActivities([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ---- Data Fetching ----
  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setDataLoading(true);
    setDbError(null);
    try {
      // 1. Fetch Trips
      const { data: tripsData, error: tripsError } = await supabase
        .from('trips')
        .select('*')
        .order('start_date', { ascending: true });
      
      if (tripsError) throw tripsError;

      // Map snake_case DB to camelCase Interface
      const mappedTrips: Trip[] = (tripsData || []).map(t => ({
        id: t.id,
        userId: t.user_id,
        destination: t.destination,
        startDate: t.start_date,
        endDate: t.end_date,
        budget: t.budget,
        imageUrl: t.image_url,
        notes: t.notes
      }));

      setTrips(mappedTrips);

      // 2. Fetch Expenses (Fetch all for user's trips)
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*');
      
      if (expensesError) throw expensesError;

      const mappedExpenses: Expense[] = (expensesData || []).map(e => ({
        id: e.id,
        tripId: e.trip_id,
        amount: e.amount,
        category: e.category as ExpenseCategory,
        description: e.description,
        date: e.date
      }));

      setExpenses(mappedExpenses);

      // 3. Fetch Activities
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('activities')
        .select('*');
        
      if (activitiesError) throw activitiesError;

      const mappedActivities: Activity[] = (activitiesData || []).map(a => ({
        id: a.id,
        tripId: a.trip_id,
        date: a.date,
        description: a.description,
        isCompleted: a.is_completed,
        time: a.time
      }));

      setActivities(mappedActivities);

    } catch (error: any) {
      console.error('Error fetching data:', error);
      // Check for "Relation does not exist" error (code 42P01) or other schema issues
      if (error.code === '42P01' || error.message?.includes('column')) {
        setDbError(error);
      } else {
        console.warn(error.message); 
      }
    } finally {
      setDataLoading(false);
    }
  };

  // ---- Derived State ----
  const userTrips = trips; // Filtered by RLS implicitly
  const activeTrip = selectedTripId ? userTrips.find(t => t.id === selectedTripId) : null;
  const activeTripExpenses = activeTrip ? expenses.filter(e => e.tripId === activeTrip.id) : [];
  const activeTripActivities = activeTrip ? activities.filter(a => a.tripId === activeTrip.id) : [];
  
  const calculateTripTotal = (tripId: string): number => {
    return expenses
      .filter(e => e.tripId === tripId)
      .reduce((sum, e) => sum + e.amount, 0);
  };

  const totalSpent = activeTrip ? calculateTripTotal(activeTrip.id) : 0;

  // ---- Handlers ----

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // Create Trip
  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    // Use startDate for both start and end to create a 1-day trip default
    if (!user || !newTrip.destination || !newTrip.startDate) return;
    
    // Default End Date to Start Date if not provided (User requirement: default 1 day)
    const finalEndDate = newTrip.endDate || newTrip.startDate;

    try {
      const payload = {
        user_id: user.id,
        destination: newTrip.destination,
        start_date: newTrip.startDate,
        end_date: finalEndDate,
        budget: Number(newTrip.budget) || 0,
        notes: newTrip.notes || '',
        image_url: `https://picsum.photos/seed/${newTrip.destination}/800/600`
      };

      const { data, error } = await supabase.from('trips').insert([payload]).select().single();
      
      if (error) {
        console.error("Supabase Error:", error);
        throw error;
      }

      if (data) {
        const createdTrip: Trip = {
          id: data.id,
          userId: data.user_id,
          destination: data.destination,
          startDate: data.start_date,
          endDate: data.end_date,
          budget: data.budget,
          imageUrl: data.image_url,
          notes: data.notes
        };
        setTrips([...trips, createdTrip]);
        setIsTripModalOpen(false);
        setNewTrip({});
      }
    } catch (error: any) {
      console.error("Error creating trip:", error);
      alert(`Failed to create trip: ${error.message || 'Unknown error'}`);
      if (error.code === '42P01') setDbError(error);
    }
  };

  // Delete Trip
  const handleDeleteTrip = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setTripToDelete(id);
  };

  const confirmDeleteTrip = async () => {
    if (!tripToDelete) return;

    try {
      const { error } = await supabase.from('trips').delete().eq('id', tripToDelete);
      if (error) throw error;

      setTrips(trips.filter(t => t.id !== tripToDelete));
      setExpenses(expenses.filter(e => e.tripId !== tripToDelete));
      setActivities(activities.filter(a => a.tripId !== tripToDelete));
      
      if (selectedTripId === tripToDelete) setSelectedTripId(null);
      setTripToDelete(null);
    } catch (error: any) {
      console.error("Error deleting trip:", error);
      alert(`Failed to delete trip: ${error.message}`);
    }
  };

  // Update Trip Dates
  const handleUpdateTripDates = async (tripId: string, newStartDate: string, newEndDate: string) => {
    console.log(`Updating trip ${tripId} dates: ${newStartDate} to ${newEndDate}`);
    try {
      const { error } = await supabase
        .from('trips')
        .update({ start_date: newStartDate, end_date: newEndDate })
        .eq('id', tripId);
      
      if (error) throw error;

      // Optimistically update local state immediately
      const updatedTrips = trips.map(t => 
        t.id === tripId 
          ? { ...t, startDate: newStartDate, endDate: newEndDate }
          : t
      );
      setTrips(updatedTrips);
    } catch (error: any) {
      console.error("Error updating trip dates:", error);
      alert(`Failed to update dates: ${error.message}`);
    }
  };

  // Handle Remove Day (Advanced logic to shift dates)
  const handleRemoveDay = async (dateToRemove: string) => {
    if (!activeTrip) return;

    console.log(`Removing day ${dateToRemove} from trip ${activeTrip.destination}`);
    
    try {
      const isStart = dateToRemove === activeTrip.startDate;
      const isEnd = dateToRemove === activeTrip.endDate;

      // 1. Delete activities on the specific date
      const { error: delError } = await supabase
        .from('activities')
        .delete()
        .eq('trip_id', activeTrip.id)
        .eq('date', dateToRemove);
      
      if (delError) throw delError;

      // 2. Logic to shift days and update Trip dates
      if (isStart) {
        // Just move Start Date forward. Day 2 becomes Day 1 (content stays on Day 2 date, but logically becomes first day).
        const newStartDate = addDays(activeTrip.startDate, 1);
        await handleUpdateTripDates(activeTrip.id, newStartDate, activeTrip.endDate);
      } else if (isEnd) {
        // Just move End Date backward.
        const newEndDate = addDays(activeTrip.endDate, -1);
        await handleUpdateTripDates(activeTrip.id, activeTrip.startDate, newEndDate);
      } else {
        // Middle Day Deletion: Must shift all subsequent activities backwards to fill the gap.
        
        // A. Fetch activities that need shifting
        const { data: actsToShift, error: fetchError } = await supabase
          .from('activities')
          .select('*')
          .eq('trip_id', activeTrip.id)
          .gt('date', dateToRemove);

        if (fetchError) throw fetchError;

        // B. Update each activity (shift back by 1 day)
        // Note: Supabase doesn't support batch update with calculated fields easily in JS client, so we iterate.
        if (actsToShift && actsToShift.length > 0) {
           await Promise.all(actsToShift.map(act => {
             const newDate = addDays(act.date, -1);
             return supabase
               .from('activities')
               .update({ date: newDate })
               .eq('id', act.id);
           }));
        }

        // C. Reduce Trip Duration (bring End Date back by 1)
        const newEndDate = addDays(activeTrip.endDate, -1);
        await handleUpdateTripDates(activeTrip.id, activeTrip.startDate, newEndDate);
      }

      // 3. Refresh data to ensure UI sync
      await fetchData();

    } catch (error: any) {
      console.error("Error removing day:", error);
      alert(`Failed to remove day: ${error.message}`);
    }
  };

  // Update Trip Budget
  const handleUpdateBudget = async () => {
    if (!activeTrip) return;
    const newBudgetVal = Number(budgetInput);
    if (isNaN(newBudgetVal) || newBudgetVal < 0) {
      alert("Please enter a valid budget amount.");
      return;
    }

    try {
      const { error } = await supabase
        .from('trips')
        .update({ budget: newBudgetVal })
        .eq('id', activeTrip.id);
      
      if (error) throw error;

      setTrips(trips.map(t => 
        t.id === activeTrip.id ? { ...t, budget: newBudgetVal } : t
      ));
      setIsEditingBudget(false);
    } catch (error: any) {
      console.error("Error updating budget:", error);
      alert(`Failed to update budget: ${error.message}`);
    }
  };

  // Create Expense
  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTripId || !newExpense.amount || !newExpense.category) return;

    try {
      const payload = {
        trip_id: selectedTripId,
        amount: Number(newExpense.amount),
        category: newExpense.category,
        description: newExpense.description || 'Expense',
        date: newExpense.date || new Date().toISOString().split('T')[0]
      };

      const { data, error } = await supabase.from('expenses').insert([payload]).select().single();
      if (error) throw error;

      if (data) {
        const createdExpense: Expense = {
          id: data.id,
          tripId: data.trip_id,
          amount: data.amount,
          category: data.category as ExpenseCategory,
          description: data.description,
          date: data.date
        };
        setExpenses([...expenses, createdExpense]);
        setIsExpenseModalOpen(false);
        setNewExpense({ category: ExpenseCategory.MISC });
      }
    } catch (error: any) {
      console.error("Error creating expense:", error);
      alert(`Failed to add expense: ${error.message}`);
    }
  };

  // Delete Expense
  const handleDeleteExpense = async (id: string) => {
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
      setExpenses(expenses.filter(e => e.id !== id));
    } catch (error) {
      console.error("Error deleting expense:", error);
    }
  };

  // Add Activity
  const handleAddActivity = async (date: string, description: string) => {
    if (!activeTrip) return;
    
    try {
      const payload = {
        trip_id: activeTrip.id,
        date: date,
        description: description,
        is_completed: false
      };

      const { data, error } = await supabase.from('activities').insert([payload]).select().single();
      if (error) throw error;

      if (data) {
        const createdActivity: Activity = {
          id: data.id,
          tripId: data.trip_id,
          date: data.date,
          description: data.description,
          isCompleted: data.is_completed,
          time: data.time
        };
        setActivities([...activities, createdActivity]);
      }
    } catch (error) {
      console.error("Error adding activity:", error);
    }
  };

  // Delete Activity
  const handleDeleteActivity = async (id: string) => {
    try {
      const { error } = await supabase.from('activities').delete().eq('id', id);
      if (error) throw error;
      setActivities(activities.filter(a => a.id !== id));
    } catch (error) {
      console.error("Error deleting activity:", error);
    }
  };

  // Toggle Activity
  const handleToggleActivity = async (id: string) => {
    const activity = activities.find(a => a.id === id);
    if (!activity) return;

    try {
      const { error } = await supabase
        .from('activities')
        .update({ is_completed: !activity.isCompleted })
        .eq('id', id);
      
      if (error) throw error;

      setActivities(activities.map(a => 
        a.id === id ? { ...a, isCompleted: !a.isCompleted } : a
      ));
    } catch (error) {
      console.error("Error toggling activity:", error);
    }
  };

  const getExpensesByCategory = () => {
    const data: Record<string, number> = {};
    activeTripExpenses.forEach(e => {
      data[e.category] = (data[e.category] || 0) + e.amount;
    });
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  };

  // ---- View Rendering ----

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-indigo-600 h-10 w-10" />
      </div>
    );
  }

  // If DB Error exists (tables missing), show help screen immediately for authenticated users
  if (dbError && user) {
    return <DBSetupHelp error={dbError} />;
  }

  // If no user, show Auth Screen
  if (!user) {
    return <AuthForm />;
  }

  const renderDashboard = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Trips</h1>
          <p className="text-gray-500">Welcome back, {user.name}. Manage your adventures.</p>
        </div>
        <Button onClick={() => setIsTripModalOpen(true)}>
          <Plus size={18} /> New Trip
        </Button>
      </div>

      {dataLoading ? (
        <div className="text-center py-20">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-indigo-400" />
          <p className="mt-2 text-gray-500">Loading your trips...</p>
        </div>
      ) : userTrips.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
          <MapIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No trips yet</h3>
          <p className="text-gray-500 mb-6">Start by planning your next adventure.</p>
          <Button variant="secondary" onClick={() => setIsTripModalOpen(true)}>Create First Trip</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {userTrips.map(trip => {
             const tripTotal = calculateTripTotal(trip.id);
             return (
              <TripCard 
                key={trip.id} 
                trip={trip} 
                totalSpent={tripTotal}
                onClick={() => {
                  setSelectedTripId(trip.id);
                  setView('TRIP_DETAILS');
                  setIsEditingBudget(false);
                }}
                onDelete={(e) => handleDeleteTrip(e, trip.id)}
              />
            );
          })}
        </div>
      )}
    </div>
  );

  const renderTripDetails = () => {
    if (!activeTrip) return null;
    const pieData = getExpensesByCategory();

    return (
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4 mb-4">
          <button 
            onClick={() => {
               setView('DASHBOARD');
               setIsEditingBudget(false);
            }}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronLeft size={24} className="text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">{activeTrip.destination}</h1>
            <p className="text-gray-500 text-sm flex items-center gap-2 mt-1">
              <Calendar size={14} />
              {new Date(activeTrip.startDate).toLocaleDateString()} - {new Date(activeTrip.endDate).toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => generateTripPDF(activeTrip, activeTripExpenses, activeTripActivities)}
              className="flex items-center gap-2 bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
              title="Download PDF Summary"
            >
              <Download size={18} />
              <span className="hidden sm:inline">Export</span>
            </button>
            <Button variant="secondary" onClick={() => setIsExpenseModalOpen(true)}>
              <Plus size={18} /> Add Expense
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><Wallet size={20} /></div>
              <span className="text-gray-500 font-medium">Total Budget</span>
              {!isEditingBudget && (
                 <button 
                   onClick={() => {
                     setBudgetInput(activeTrip.budget.toString());
                     setIsEditingBudget(true);
                   }}
                   className="ml-auto text-gray-400 hover:text-indigo-600 transition-colors"
                   title="Edit Budget"
                 >
                   <Edit2 size={16} />
                 </button>
              )}
            </div>
            
            {isEditingBudget ? (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-gray-500 font-bold">₹</span>
                <input 
                  type="number"
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  className="w-full px-2 py-1 border border-indigo-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 text-lg font-bold"
                  autoFocus
                />
                <button 
                  onClick={handleUpdateBudget}
                  className="bg-green-100 text-green-700 p-1.5 rounded hover:bg-green-200 transition-colors"
                >
                  <Check size={18} />
                </button>
                <button 
                  onClick={() => setIsEditingBudget(false)}
                  className="bg-red-100 text-red-700 p-1.5 rounded hover:bg-red-200 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <p className="text-2xl font-bold text-gray-900">₹{activeTrip.budget}</p>
            )}
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-pink-50 rounded-lg text-pink-600"><DollarSignIcon /></div>
              <span className="text-gray-500 font-medium">Spent</span>
            </div>
            <p className={`text-2xl font-bold ${totalSpent > activeTrip.budget ? 'text-red-500' : 'text-gray-900'}`}>
              ₹{totalSpent.toFixed(2)}
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-50 rounded-lg text-green-600"><PieChartIcon size={20} /></div>
              <span className="text-gray-500 font-medium">Remaining</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">₹{(activeTrip.budget - totalSpent).toFixed(2)}</p>
          </div>
        </div>

        {/* Itinerary Section */}
        <TripItinerary 
          trip={activeTrip}
          activities={activeTripActivities}
          onAddActivity={handleAddActivity}
          onDeleteActivity={handleDeleteActivity}
          onToggleActivity={handleToggleActivity}
          onTripUpdate={handleUpdateTripDates}
          onRemoveDay={handleRemoveDay}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Expense List */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <Wallet className="text-indigo-500" size={18} /> 
                Recent Expenses
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Category</th>
                    <th className="px-6 py-3">Description</th>
                    <th className="px-6 py-3 text-right">Amount</th>
                    <th className="px-6 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {activeTripExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                        No expenses recorded yet.
                      </td>
                    </tr>
                  ) : (
                    activeTripExpenses.map(expense => (
                      <tr key={expense.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-600">{new Date(expense.date).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                            {expense.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{expense.description}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 font-medium text-right">₹{expense.amount.toFixed(2)}</td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => handleDeleteExpense(expense.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <PieChartIcon className="text-indigo-500" size={18} />
              Spending Breakdown
            </h3>
            <div className="flex-1 min-h-[300px]">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value: number) => `₹${value.toFixed(2)}`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm">
                  <div className="p-4 bg-gray-50 rounded-full mb-2">
                     <PieChartIcon size={24} className="text-gray-300" />
                  </div>
                  Add expenses to see analytics
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar / Navigation */}
      <aside className="w-20 lg:w-64 bg-white border-r border-gray-200 flex flex-col fixed h-full z-10 transition-all duration-300 shadow-sm">
        <div className="h-20 flex items-center justify-center lg:justify-start lg:px-6 border-b border-gray-100">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-200">
            W
          </div>
          <span className="ml-3 font-bold text-xl text-gray-900 hidden lg:block tracking-tight">WanderLust</span>
        </div>

        <div className="p-4 lg:px-6 mb-2 mt-4 hidden lg:block">
           <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
             <div className="bg-indigo-100 p-2 rounded-lg">
               <UserIcon size={16} className="text-indigo-600" />
             </div>
             <div className="overflow-hidden">
               <p className="text-sm font-bold text-gray-900 truncate">{user.name}</p>
               <p className="text-xs text-gray-500 truncate">{user.email}</p>
             </div>
           </div>
        </div>

        <nav className="p-4 space-y-2 flex-1">
          <NavButton 
            active={view === 'DASHBOARD' || view === 'TRIP_DETAILS'} 
            onClick={() => { setView('DASHBOARD'); setSelectedTripId(null); }} 
            icon={<LayoutDashboard size={20} />} 
            label="Dashboard" 
          />
          <NavButton 
            active={view === 'AI_PLANNER'} 
            onClick={() => { setView('AI_PLANNER'); setSelectedTripId(null); }} 
            icon={<Sparkles size={20} />} 
            label="AI Planner" 
          />
        </nav>
        
        <div className="p-4 border-t border-gray-100">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center lg:justify-start gap-3 px-3 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut size={20} />
            <span className="hidden lg:block font-medium">Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-20 lg:ml-64 p-6 lg:p-10 transition-all duration-300">
        {view === 'DASHBOARD' && renderDashboard()}
        {view === 'TRIP_DETAILS' && renderTripDetails()}
        {view === 'AI_PLANNER' && <AIPlanner />}
      </main>

      {/* Trip Modal */}
      {isTripModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900">Plan New Adventure</h3>
              <button onClick={() => setIsTripModalOpen(false)} className="text-gray-400 hover:text-gray-600 bg-white rounded-full p-1 hover:bg-gray-200 transition-colors">&times;</button>
            </div>
            <form onSubmit={handleCreateTrip} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Destination</label>
                <input 
                  required
                  className="w-full rounded-lg border-gray-300 border px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow" 
                  placeholder="Where to?"
                  value={newTrip.destination || ''}
                  onChange={e => setNewTrip({...newTrip, destination: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Start Date</label>
                <input 
                  required type="date"
                  className="w-full rounded-lg border-gray-300 border px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={newTrip.startDate || ''}
                  onChange={e => setNewTrip({...newTrip, startDate: e.target.value})}
                />
                <p className="text-xs text-gray-500 mt-1">Trip starts with 1 day. You can extend it later.</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Budget (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500">₹</span>
                  <input 
                    type="number" required min="0"
                    className="w-full pl-7 rounded-lg border-gray-300 border px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={newTrip.budget || ''}
                    onChange={e => setNewTrip({...newTrip, budget: Number(e.target.value)})}
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="secondary" onClick={() => setIsTripModalOpen(false)} className="flex-1">Cancel</Button>
                <Button type="submit" className="flex-1">Create Trip</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
             <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900">Log Expense</h3>
              <button onClick={() => setIsExpenseModalOpen(false)} className="text-gray-400 hover:text-gray-600 bg-white rounded-full p-1 hover:bg-gray-200 transition-colors">&times;</button>
            </div>
            <form onSubmit={handleCreateExpense} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category</label>
                <select 
                  className="w-full rounded-lg border-gray-300 border px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-gray-900 cursor-pointer"
                  value={newExpense.category}
                  onChange={e => setNewExpense({...newExpense, category: e.target.value as ExpenseCategory})}
                >
                  {Object.values(ExpenseCategory).map(cat => (
                    <option key={cat} value={cat} className="text-gray-900 bg-white">{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description</label>
                <input 
                  required
                  className="w-full rounded-lg border-gray-300 border px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="e.g. Lunch at Mario's"
                  value={newExpense.description || ''}
                  onChange={e => setNewExpense({...newExpense, description: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Amount (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500">₹</span>
                  <input 
                    required type="number" min="0" step="0.01"
                    className="w-full pl-7 rounded-lg border-gray-300 border px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={newExpense.amount || ''}
                    onChange={e => setNewExpense({...newExpense, amount: Number(e.target.value)})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date</label>
                <input 
                  required type="date"
                  className="w-full rounded-lg border-gray-300 border px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={newExpense.date || new Date().toISOString().split('T')[0]}
                  onChange={e => setNewExpense({...newExpense, date: e.target.value})}
                />
              </div>
               <div className="flex gap-3 pt-4">
                <Button type="button" variant="secondary" onClick={() => setIsExpenseModalOpen(false)} className="flex-1">Cancel</Button>
                <Button type="submit" className="flex-1">Add Expense</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {tripToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="text-red-600" size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Trip?</h3>
              <p className="text-gray-500 text-sm mb-6">
                Are you sure you want to delete <strong>{trips.find(t => t.id === tripToDelete)?.destination}</strong>? All expenses and itinerary items will be lost forever.
              </p>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setTripToDelete(null)} className="flex-1">Cancel</Button>
                <Button variant="danger" onClick={confirmDeleteTrip} className="flex-1">Delete Trip</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper Components for Icons
const DollarSignIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
);

interface NavButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

const NavButton: React.FC<NavButtonProps> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-center lg:justify-start gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${
      active 
        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
    }`}
  >
    <span className={`transition-transform duration-200 ${active ? '' : 'group-hover:scale-110'}`}>
      {icon}
    </span>
    <span className="hidden lg:block font-medium">{label}</span>
  </button>
);
