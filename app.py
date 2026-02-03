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

@app.route("/reminders")
def reminder():
    return render_template("reminders.html")


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
