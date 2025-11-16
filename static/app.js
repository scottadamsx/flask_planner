let newReminderBtn = document.getElementById("newReminder")

let addReminderBtn = document.getElementById("addReminder")
let form = document.querySelector("form")

newReminderBtn.addEventListener("click", () => {
    form.style.display = "block"
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
        body:JSON.stringify({name,date})
    })

    // reload page
    window.location.reload()

    
})