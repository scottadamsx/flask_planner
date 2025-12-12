import csv
import json


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
