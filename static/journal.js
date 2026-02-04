const newEntryBtn = document.getElementById("newJournalEntry")
const form = document.getElementById("form")
const submitBtn = document.getElementById("addEntry")
const cancelBtn = document.getElementById("cancelEntry")
const textarea = document.getElementById("entry")
const entriesList = document.getElementById("entries-list")

// Auto-expand textarea as user types, up to 60vh
textarea.addEventListener("input", () => {
    textarea.style.height = "auto"
    const maxHeight = window.innerHeight * 0.6
    textarea.style.height = Math.min(textarea.scrollHeight, maxHeight) + "px"
})

// Show form
newEntryBtn.addEventListener("click", () => {
    form.style.display = "block"
    newEntryBtn.style.display = "none"
    document.getElementById("name").focus()
})

// Hide form and reset
function hideForm() {
    form.style.display = "none"
    newEntryBtn.style.display = ""
    document.getElementById("name").value = ""
    textarea.value = ""
    textarea.style.height = "auto"
}

cancelBtn.addEventListener("click", hideForm)

// Submit entry
submitBtn.addEventListener("click", async () => {
    const title = document.getElementById("name").value.trim()
    const body = textarea.value.trim()

    if (!title || !body) return

    const entry = {
        title: title,
        entry: body,
        date: new Date().toLocaleDateString()
    }

    await fetch("/newJournalEntry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry)
    })

    hideForm()
    loadEntries()
})

// Load and display previous entries
async function loadEntries() {
    const res = await fetch("/loadJournal")
    const entries = await res.json()

    entriesList.innerHTML = ""

    if (entries.length === 0) {
        entriesList.innerHTML = '<p class="no-entries">No journal entries yet.</p>'
        return
    }

    // Show newest first
    entries.reverse().forEach(entry => {
        const card = document.createElement("div")
        card.className = "journal-card"

        const header = document.createElement("div")
        header.className = "journal-card-header"
        header.innerHTML = `<h3>${entry.title}</h3><span class="journal-date">${entry.date}</span>`

        const body = document.createElement("p")
        body.className = "journal-card-body"
        body.textContent = entry.entry
        body.style.display = "none"

        header.addEventListener("click", () => {
            body.style.display = body.style.display === "none" ? "block" : "none"
            card.classList.toggle("expanded")
        })

        card.appendChild(header)
        card.appendChild(body)
        entriesList.appendChild(card)
    })
}

loadEntries()
