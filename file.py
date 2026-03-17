import uuid
import os
from supabase import create_client

# Initialize Supabase client
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Map old JSON filenames to Supabase table names
TABLE_MAP = {
    "reminders.json": "reminders",
    "events.json": "events",
    "journal.json": "journal_entries",
    "transactions.json": "transactions",
    "simulations.json": "simulations",
}


def _table(filename):
    return TABLE_MAP.get(filename, filename)


def generateId():
    return uuid.uuid4().hex[:8]


def saveToJSON(filename, new_data):
    table = _table(filename)
    supabase.table(table).insert(new_data).execute()


def loadFromJSON(filename):
    table = _table(filename)
    result = supabase.table(table).select("*").execute()
    return result.data


def updateItemInJSON(filename, item_id, updates):
    table = _table(filename)
    supabase.table(table).update(updates).eq("id", item_id).execute()


def deleteFromJSON(filename, item_id):
    table = _table(filename)
    supabase.table(table).delete().eq("id", item_id).execute()


def loadBudgetConfig():
    result = supabase.table("budget_config").select("data").eq("id", 1).execute()
    if result.data:
        return result.data[0]["data"]
    return None


def saveBudgetConfig(config):
    supabase.table("budget_config").upsert({"id": 1, "data": config}).execute()


def bulkUpdateTransactions(ids, updates):
    for tx_id in ids:
        supabase.table("transactions").update(updates).eq("id", tx_id).execute()


def migrateReminders(filename):
    # No longer needed with Supabase — data is already structured
    pass
