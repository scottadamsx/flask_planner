let newReminderBtn = document.getElementById("newReminder")

let addReminderBtn = document.getElementById("addReminder")
let form = document.querySelector("form")

newReminderBtn.addEventListener("click", () => {
    form.style.display = "block"
})

addReminderBtn.addEventListener("click", () => {
    form.style.display = "none"
})