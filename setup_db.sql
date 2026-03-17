-- Run this in the Supabase SQL Editor (supabase.com > your project > SQL Editor)

-- Reminders table
CREATE TABLE IF NOT EXISTS reminders (
    id TEXT PRIMARY KEY,
    name TEXT,
    date TEXT,
    completed BOOLEAN DEFAULT FALSE,
    "completedDate" TEXT,
    recurrence TEXT DEFAULT 'none'
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    title TEXT,
    date TEXT,
    description TEXT
);

-- Journal entries table
CREATE TABLE IF NOT EXISTS journal_entries (
    id SERIAL PRIMARY KEY,
    title TEXT,
    entry TEXT,
    date TEXT
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    description TEXT,
    amount REAL,
    type TEXT,
    category TEXT,
    date TEXT,
    notes TEXT,
    reconciled BOOLEAN DEFAULT FALSE,
    "payPeriodStart" TEXT,
    "payPeriodEnd" TEXT
);

-- Budget config table (single row, stores full config as JSON)
CREATE TABLE IF NOT EXISTS budget_config (
    id INTEGER PRIMARY KEY DEFAULT 1,
    data JSONB NOT NULL
);

-- Simulations table
CREATE TABLE IF NOT EXISTS simulations (
    id TEXT PRIMARY KEY,
    "savedAt" TEXT,
    data JSONB
);
