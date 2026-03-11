import json
from datetime import date, datetime, timedelta
from flask import Flask, render_template, request, jsonify
from file import saveToJSON, loadFromJSON, updateItemInJSON, deleteFromJSON, generateId, migrateReminders

app = Flask(__name__)
migrateReminders("reminders.json")

@app.template_filter('format_date')
def format_date_filter(date_str):
    if not date_str:
        return ""
    try:
        dt = date.fromisoformat(date_str)
        return dt.strftime("%A, %B %d, %Y").lower()
    except Exception:
        return date_str

# ──────────────────────────────────────────
# Helper: load JSON safely
# ──────────────────────────────────────────
def safe_load(filename):
    try:
        return loadFromJSON(filename)
    except (FileNotFoundError, json.JSONDecodeError):
        return []

def safe_load_config():
    try:
        return loadFromJSON("budget_config.json")
    except (FileNotFoundError, json.JSONDecodeError):
        default = {
            "paySchedule": {
                "type": "biweekly",
                "anchorDate": date.today().isoformat(),
                "customDays": None
            },
            "income": [],
            "recurringBills": [],
            "categories": [
                "Housing", "Groceries", "Transportation", "Utilities",
                "Entertainment", "Dining Out", "Personal", "Subscriptions",
                "Health", "Savings", "Debt", "Other"
            ]
        }
        with open("budget_config.json", "w") as f:
            json.dump(default, f, indent=4)
        return default

def save_config(config):
    with open("budget_config.json", "w") as f:
        json.dump(config, f, indent=4)

# ──────────────────────────────────────────
# Helper: calculate pay period for a date
# ──────────────────────────────────────────
def calculate_pay_period(transaction_date_str, pay_schedule):
    tx_date = date.fromisoformat(transaction_date_str)
    schedule_type = pay_schedule.get("type", "biweekly")
    anchor = date.fromisoformat(pay_schedule.get("anchorDate", date.today().isoformat()))

    if schedule_type == "semimonthly":
        if tx_date.day < 15:
            start = tx_date.replace(day=1)
            end = tx_date.replace(day=14)
        else:
            start = tx_date.replace(day=15)
            import calendar as cal
            last_day = cal.monthrange(tx_date.year, tx_date.month)[1]
            end = tx_date.replace(day=last_day)
    elif schedule_type == "monthly":
        start = tx_date.replace(day=1)
        import calendar as cal
        last_day = cal.monthrange(tx_date.year, tx_date.month)[1]
        end = tx_date.replace(day=last_day)
    elif schedule_type == "weekly":
        days_since = (tx_date - anchor).days
        period_num = days_since // 7
        start = anchor + timedelta(days=period_num * 7)
        end = start + timedelta(days=6)
    elif schedule_type == "custom":
        interval = pay_schedule.get("customDays") or 14
        days_since = (tx_date - anchor).days
        period_num = days_since // interval
        start = anchor + timedelta(days=period_num * interval)
        end = start + timedelta(days=interval - 1)
    else:  # biweekly
        days_since = (tx_date - anchor).days
        period_num = days_since // 14
        start = anchor + timedelta(days=period_num * 14)
        end = start + timedelta(days=13)

    return start.isoformat(), end.isoformat()


def expand_reminders(reminders, start_dt, end_dt):
    expanded = []
    for r in reminders:
        if r.get("completed"):
            continue
        
        recur = r.get("recurrence", "none")
        try:
            r_dt = date.fromisoformat(r["date"])
        except:
            continue
        
        if recur == "none":
            if start_dt <= r_dt <= end_dt:
                expanded.append(r)
        elif recur == "daily":
            cur = max(start_dt, r_dt)
            while cur <= end_dt:
                copy = r.copy()
                copy["date"] = cur.isoformat()
                expanded.append(copy)
                cur += timedelta(days=1)
        elif recur == "weekly":
            cur = r_dt
            while cur <= end_dt:
                if cur >= start_dt:
                    copy = r.copy()
                    copy["date"] = cur.isoformat()
                    expanded.append(copy)
                cur += timedelta(days=7)
        elif recur == "monthly":
            # Check next 12 months for occurrences in range
            for m_offset in range(13):
                y = r_dt.year + (r_dt.month + m_offset - 1) // 12
                m = (r_dt.month + m_offset - 1) % 12 + 1
                try:
                    if m == 12:
                        next_m_first = date(y + 1, 1, 1)
                    else:
                        next_m_first = date(y, m + 1, 1)
                    last_day_val = (next_m_first - timedelta(days=1)).day
                    d = min(r_dt.day, last_day_val)
                    candidate = date(y, m, d)
                    if candidate > end_dt: break
                    if candidate >= start_dt and candidate >= r_dt:
                        copy = r.copy()
                        copy["date"] = candidate.isoformat()
                        expanded.append(copy)
                except:
                    continue
    return expanded

# ──────────────────────────────────────────
# Existing pages
# ──────────────────────────────────────────
@app.route("/")
def home():
    reminders = safe_load("reminders.json")
    journal = safe_load("journal.json")
    config = safe_load_config()
    
    today = date.today()
    
    # Weekly chunks for the reminder scroll
    # We'll calculate 4 weeks: This Week, Next Week, and 2 more
    weeks = []
    # Start of current week (assuming Sunday start for display)
    start_of_week = today - timedelta(days=today.weekday() + 1) if today.weekday() != 6 else today
    
    for i in range(4):
        w_start = start_of_week + timedelta(weeks=i)
        w_end = w_start + timedelta(days=6)
        w_reminders = expand_reminders(reminders, w_start, w_end)
        w_reminders.sort(key=lambda x: x["date"])
        
        label = "This Week" if i == 0 else "Next Week" if i == 1 else f"Week of {w_start.strftime('%b %d')}"
        weeks.append({
            "label": label,
            "reminders": w_reminders
        })

    # Today's tasks specifically
    today_reminders = expand_reminders(reminders, today, today)
    
    # Get last journal entry
    last_entry = journal[-1] if journal else None
    
    return render_template("index.html", 
                           reminders=reminders, 
                           today_reminders=today_reminders,
                           weeks=weeks,
                           last_entry=last_entry,
                           budget_config=config)

@app.route("/journal")
def journal():
    return render_template("journal.html")

@app.route("/newJournalEntry", methods=["POST"])
def newJournalEntry():
    entry = request.get_json()
    saveToJSON('journal.json', entry)
    return "ok"

@app.route("/loadJournal", methods=["GET"])
def loadJournal():
    try:
        data = loadFromJSON("journal.json")
    except (FileNotFoundError, json.JSONDecodeError):
        data = []
    return jsonify(data)

@app.route("/reminders")
def reminder():
    reminders = loadFromJSON("reminders.json")
    return render_template("reminders.html",reminders=reminders)

@app.route("/newReminder", methods=["POST"])
def newReminder():
    reminder = request.get_json()
    reminder["id"] = generateId()
    reminder["completed"] = False
    reminder["completedDate"] = None
    if "recurrence" not in reminder:
        reminder["recurrence"] = "none"
    saveToJSON('reminders.json', reminder)
    return "ok"

@app.route("/completeReminder", methods=["POST"])
def completeReminder():
    data = request.get_json()
    updateItemInJSON("reminders.json", data["id"], {
        "completed": True,
        "completedDate": date.today().isoformat()
    })
    return "ok"

@app.route("/deleteReminder", methods=["POST"])
def deleteReminder():
    data = request.get_json()
    deleteFromJSON("reminders.json", data["id"])
    return "ok"

@app.route("/calendar")
def calendar():
    return render_template("calendar.html")

@app.route("/newEvent", methods=["POST"])
def newEvent():
    event = request.get_json()
    event["id"] = generateId()
    saveToJSON("events.json", event)
    return "ok"

@app.route("/loadEvents", methods=["GET"])
def loadEvents():
    try:
        data = loadFromJSON("events.json")
    except (FileNotFoundError, json.JSONDecodeError):
        data = []
    return jsonify(data)

@app.route("/deleteEvent", methods=["POST"])
def deleteEvent():
    data = request.get_json()
    deleteFromJSON("events.json", data["id"])
    return "ok"

@app.route("/loadData",methods=["GET"])
def getData():
    data = loadFromJSON("reminders.json")
    return jsonify(data)


# ──────────────────────────────────────────
# Budget page
# ──────────────────────────────────────────
@app.route("/budget")
def budget():
    return render_template("budget.html")

# --- Transaction routes ---
@app.route("/newTransaction", methods=["POST"])
def newTransaction():
    tx = request.get_json()
    tx["id"] = generateId()
    tx["reconciled"] = False
    config = safe_load_config()
    start, end = calculate_pay_period(tx["date"], config["paySchedule"])
    tx["payPeriodStart"] = start
    tx["payPeriodEnd"] = end
    saveToJSON("transactions.json", tx)
    return "ok"

@app.route("/loadTransactions", methods=["GET"])
def loadTransactions():
    return jsonify(safe_load("transactions.json"))

@app.route("/updateTransaction", methods=["POST"])
def updateTransaction():
    data = request.get_json()
    tx_id = data.pop("id")
    if "date" in data:
        config = safe_load_config()
        start, end = calculate_pay_period(data["date"], config["paySchedule"])
        data["payPeriodStart"] = start
        data["payPeriodEnd"] = end
    updateItemInJSON("transactions.json", tx_id, data)
    return "ok"

@app.route("/deleteTransaction", methods=["POST"])
def deleteTransaction():
    data = request.get_json()
    deleteFromJSON("transactions.json", data["id"])
    return "ok"

@app.route("/reconcileTransaction", methods=["POST"])
def reconcileTransaction():
    data = request.get_json()
    updateItemInJSON("transactions.json", data["id"], {"reconciled": True})
    return "ok"

@app.route("/unreconcileTransaction", methods=["POST"])
def unreconcileTransaction():
    data = request.get_json()
    updateItemInJSON("transactions.json", data["id"], {"reconciled": False})
    return "ok"

@app.route("/bulkReconcile", methods=["POST"])
def bulkReconcile():
    data = request.get_json()
    transactions = safe_load("transactions.json")
    ids_set = set(data["ids"])
    for tx in transactions:
        if tx.get("id") in ids_set:
            tx["reconciled"] = True
    with open("transactions.json", "w") as f:
        json.dump(transactions, f, indent=4)
    return "ok"

# --- Budget Config routes ---
@app.route("/loadBudgetConfig", methods=["GET"])
def loadBudgetConfig():
    return jsonify(safe_load_config())

@app.route("/saveBudgetConfig", methods=["POST"])
def saveBudgetConfig():
    config = request.get_json()
    save_config(config)
    return "ok"

@app.route("/addIncome", methods=["POST"])
def addIncome():
    data = request.get_json()
    data["id"] = generateId()
    config = safe_load_config()
    config["income"].append(data)
    save_config(config)
    return "ok"

@app.route("/deleteIncome", methods=["POST"])
def deleteIncome():
    data = request.get_json()
    config = safe_load_config()
    config["income"] = [i for i in config["income"] if i.get("id") != data["id"]]
    save_config(config)
    return "ok"

@app.route("/updateIncome", methods=["POST"])
def updateIncome():
    data = request.get_json()
    inc_id = data.pop("id")
    config = safe_load_config()
    for item in config["income"]:
        if item.get("id") == inc_id:
            item.update(data)
            break
    save_config(config)
    return "ok"

@app.route("/addRecurringBill", methods=["POST"])
def addRecurringBill():
    data = request.get_json()
    data["id"] = generateId()
    config = safe_load_config()
    config["recurringBills"].append(data)
    save_config(config)
    return "ok"

@app.route("/updateRecurringBill", methods=["POST"])
def updateRecurringBill():
    data = request.get_json()
    bill_id = data.pop("id")
    config = safe_load_config()
    for item in config["recurringBills"]:
        if item.get("id") == bill_id:
            item.update(data)
            break
    save_config(config)
    return "ok"

@app.route("/deleteRecurringBill", methods=["POST"])
def deleteRecurringBill():
    data = request.get_json()
    config = safe_load_config()
    config["recurringBills"] = [b for b in config["recurringBills"] if b.get("id") != data["id"]]
    save_config(config)
    return "ok"

# --- Future Purchase routes ---
@app.route("/addFuturePurchase", methods=["POST"])
def addFuturePurchase():
    tx = request.get_json()
    tx["id"] = generateId()
    tx["type"] = "future"
    tx["reconciled"] = False
    config = safe_load_config()
    start, end = calculate_pay_period(tx["date"], config["paySchedule"])
    tx["payPeriodStart"] = start
    tx["payPeriodEnd"] = end
    saveToJSON("transactions.json", tx)
    return "ok"

@app.route("/convertFuturePurchase", methods=["POST"])
def convertFuturePurchase():
    data = request.get_json()
    updates = {"type": "expense"}
    if "date" in data:
        updates["date"] = data["date"]
        config = safe_load_config()
        start, end = calculate_pay_period(data["date"], config["paySchedule"])
        updates["payPeriodStart"] = start
        updates["payPeriodEnd"] = end
    updateItemInJSON("transactions.json", data["id"], updates)
    return "ok"

# --- Simulation routes ---
@app.route("/saveSimulation", methods=["POST"])
def saveSimulation():
    sim = request.get_json()
    sim["id"] = generateId()
    sim["savedAt"] = datetime.now().isoformat(timespec="seconds")
    saveToJSON("simulations.json", sim)
    return "ok"

@app.route("/loadSimulations", methods=["GET"])
def loadSimulations():
    return jsonify(safe_load("simulations.json"))

@app.route("/deleteSimulation", methods=["POST"])
def deleteSimulation():
    data = request.get_json()
    deleteFromJSON("simulations.json", data["id"])
    return "ok"


if __name__ == "__main__":
    app.run(debug=True)
