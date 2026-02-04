import csv
import json
import uuid


def saveReminder(FILENAME,reminder):
    with open(FILENAME,"a",newline="") as file:
        writer = csv.writer(file)
        writer.writerow(reminder.values())

def readReminders(FILENAME):
    reminders = []
    with open(FILENAME,'r',newline="") as file:
        reader = csv.reader(file)
        for reminder in reader:
            reminders.append(reminder)
        return reminders

def saveToJSON(filename, new_data):
    try:
        with open(filename, "r") as f:
            existing = json.load(f)
    except FileNotFoundError:
        existing = []

    existing.append(new_data)

    with open(filename, "w") as f:
        json.dump(existing, f, indent=4)

def loadFromJSON(FILENAME):
    with open(FILENAME,"r") as file:
        data = json.load(file)
        return data

def generateId():
    return uuid.uuid4().hex[:8]

def updateItemInJSON(filename, item_id, updates):
    with open(filename, "r") as f:
        data = json.load(f)
    for item in data:
        if item.get("id") == item_id:
            item.update(updates)
            break
    with open(filename, "w") as f:
        json.dump(data, f, indent=4)

def deleteFromJSON(filename, item_id):
    with open(filename, "r") as f:
        data = json.load(f)
    data = [item for item in data if item.get("id") != item_id]
    with open(filename, "w") as f:
        json.dump(data, f, indent=4)

def migrateReminders(filename):
    try:
        with open(filename, "r") as f:
            data = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return
    modified = False
    for item in data:
        if "id" not in item:
            item["id"] = generateId()
            item["completed"] = False
            item["completedDate"] = None
            modified = True
    if modified:
        with open(filename, "w") as f:
            json.dump(data, f, indent=4)
