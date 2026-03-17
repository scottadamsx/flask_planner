"""
Run this ONCE to import your existing JSON data into Supabase.
Usage: python migrate_data.py
"""
import json
import os
from dotenv import load_dotenv
load_dotenv()

from supabase import create_client

url = os.environ["SUPABASE_URL"]
key = os.environ["SUPABASE_KEY"]
sb = create_client(url, key)


def load_json(filename):
    try:
        with open(filename, "r") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []


def migrate():
    # Reminders
    reminders = load_json("reminders.json")
    if reminders:
        for r in reminders:
            if "recurrence" not in r:
                r["recurrence"] = "none"
        sb.table("reminders").upsert(reminders).execute()
        print(f"Migrated {len(reminders)} reminders")

    # Events
    events = load_json("events.json")
    if events:
        sb.table("events").upsert(events).execute()
        print(f"Migrated {len(events)} events")

    # Journal entries (no ID field — insert fresh)
    journal = load_json("journal.json")
    if journal:
        sb.table("journal_entries").insert(journal).execute()
        print(f"Migrated {len(journal)} journal entries")

    # Transactions
    transactions = load_json("transactions.json")
    if transactions:
        sb.table("transactions").upsert(transactions).execute()
        print(f"Migrated {len(transactions)} transactions")

    # Budget config (single object, not an array)
    try:
        with open("budget_config.json", "r") as f:
            config = json.load(f)
        sb.table("budget_config").upsert({"id": 1, "data": config}).execute()
        print("Migrated budget config")
    except (FileNotFoundError, json.JSONDecodeError):
        print("No budget config to migrate")

    # Simulations
    simulations = load_json("simulations.json")
    if simulations:
        sb.table("simulations").upsert(simulations).execute()
        print(f"Migrated {len(simulations)} simulations")

    print("\nDone! Your data is now in Supabase.")


if __name__ == "__main__":
    migrate()
