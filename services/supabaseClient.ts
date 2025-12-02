import { createClient } from '@supabase/supabase-js';

// Use environment variables for configuration with safety checks
// In Vite, env vars are exposed via import.meta.env
// We use optional chaining (?.) and a fallback object to prevent crashes if import.meta.env is undefined
const env = (import.meta.env || {}) as any;
const supabaseUrl = env.VITE_SUPABASE_URL || 'https://dwjwwaioqcsvchtimebr.supabase.co';
const supabaseKey = env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3and3YWlvcWNzdmNodGltZWJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2ODI4MzAsImV4cCI6MjA4MDI1ODgzMH0.7E_XZTRt80pPm-HT9rzwU1QmjnLzvFOcYuPtkbTagS0';

export const supabase = createClient(supabaseUrl, supabaseKey);

/* 
  !!! IMPORTANT !!!
  You must run this SQL in your Supabase SQL Editor to create the required tables.
  
  1. Go to https://supabase.com/dashboard/project/dwjwwaioqcsvchtimebr/sql
  2. Paste and Run the following script:

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
*/