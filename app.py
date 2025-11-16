from flask import Flask, render_template, request
from file import saveReminder, readReminders
app = Flask(__name__)

@app.route("/")
def home():
    reminders = readReminders('reminders.csv')
    return render_template("index.html",reminders=reminders)

@app.route("/newReminder", methods=["POST"])
def newReminder():
    reminder = request.get_json()
    print(reminder)
    #saves reminder to file 
    saveReminder('reminders.csv',reminder)
    return "ok"

if __name__ == "__main__":
    app.run(debug=True)
