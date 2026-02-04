import json
from flask import Flask, render_template, request, jsonify
from file import saveReminder, readReminders, saveToJSON, loadFromJSON
app = Flask(__name__)

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
    print(reminder)
    #saves reminder to file 
    saveToJSON('reminders.json',reminder)
    return "ok"

@app.route("/loadData",methods=["GET"])
def getData():
    data = loadFromJSON("reminders.json")
    return jsonify(data)
if __name__ == "__main__":
    app.run(debug=True)
