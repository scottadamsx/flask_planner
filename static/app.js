let newReminderBtn = document.getElementById("newReminder")

class Reminder {
    constructor(name,date) {
        this.name = name
        this.date = date
    }
}

let addReminderBtn = document.getElementById("addReminder")
let form = document.querySelector("form")

async function loadInReminders() {
    let reminders = []
    let data = await fetch("/loadData").then(response => response.json())
    data.forEach(reminder => {
        let newReminder = new Reminder(reminder.name,reminder.date)
        reminders.push(newReminder)
    })
    return reminders
}

let reminders = await loadInReminders()


newReminderBtn.addEventListener("click", () => {
    form.style.display = "block"
    console.log(reminders)
})

addReminderBtn.addEventListener("click", () => {
    const name = document.getElementById("name").value
    const date = document.getElementById("date").value
    // fetch statement to post to storage file
    fetch('/newReminder', {
        method:'post',
        headers:{
            "Content-Type":"application/json"
        },
        body:JSON.stringify({name:name,date:date})
    })

    // reload page
    window.location.reload()

})