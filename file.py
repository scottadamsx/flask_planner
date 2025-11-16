import csv

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