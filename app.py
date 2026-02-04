import json
from datetime import date
from flask import Flask, render_template, request, jsonify
from file import saveToJSON, loadFromJSON, updateItemInJSON, deleteFromJSON, generateId, migrateReminders

app = Flask(__name__)
migrateReminders("reminders.json")

# pages
@app.route("/")
def home():
    reminders = loadFromJSON("reminders.json")
    return render_template("index.html",reminders=reminders)

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

if __name__ == "__main__":
    app.run(debug=True)
