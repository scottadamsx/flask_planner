// State
let currentYear = new Date().getFullYear()
let currentMonth = new Date().getMonth()
let selectedDate = null
let allReminders = []
let allEvents = []

// DOM refs
const monthLabel = document.getElementById("monthLabel")
const calendarGrid = document.getElementById("calendar-grid")
const prevBtn = document.getElementById("prevMonth")
const nextBtn = document.getElementById("nextMonth")
const overlay = document.getElementById("event-form-overlay")
const selectedDateSpan = document.getElementById("selectedDate")
const saveEventBtn = document.getElementById("saveEvent")
const cancelEventBtn = document.getElementById("cancelEvent")
const completedTodayList = document.getElementById("completed-today-list")

// Load data from server
async function loadAllData() {
    const [remindersRes, eventsRes] = await Promise.all([
        fetch("/loadData").then(r => r.json()),
        fetch("/loadEvents").then(r => r.json())
    ])
    allReminders = remindersRes
    allEvents = eventsRes
}

// Render the month grid
function renderCalendar() {
    const monthNames = ["January","February","March","April","May","June",
                        "July","August","September","October","November","December"]
    monthLabel.textContent = `${monthNames[currentMonth]} ${currentYear}`

    const firstDay = new Date(currentYear, currentMonth, 1).getDay()
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()

    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`

    let html = '<div class="calendar-header-row">'
    const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]
    dayNames.forEach(d => { html += `<div class="calendar-day-name">${d}</div>` })
    html += '</div><div class="calendar-body">'

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
        html += '<div class="calendar-cell empty"></div>'
    }

    // Day cells
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${currentYear}-${String(currentMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
        const isToday = dateStr === todayStr ? ' today' : ''

        const dayReminders = allReminders.filter(r => r.date === dateStr && !r.completed)
        const dayEvents = allEvents.filter(e => e.date === dateStr)

        let itemsHtml = ''
        dayReminders.forEach(r => {
            itemsHtml += `<div class="calendar-item reminder-item">${r.name}</div>`
        })
        dayEvents.forEach(e => {
            itemsHtml += `<div class="calendar-item event-item">${e.title}</div>`
        })

        html += `<div class="calendar-cell${isToday}" data-date="${dateStr}">
            <span class="day-number">${day}</span>
            ${itemsHtml}
        </div>`
    }

    html += '</div>'
    calendarGrid.innerHTML = html

    // Click day to add event
    document.querySelectorAll(".calendar-cell:not(.empty)").forEach(cell => {
        cell.addEventListener("click", () => {
            selectedDate = cell.dataset.date
            selectedDateSpan.textContent = selectedDate
            overlay.style.display = "flex"
            document.getElementById("eventTitle").focus()
        })
    })
}

// Render Completed Today section
function renderCompletedToday() {
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
    const completedToday = allReminders.filter(r => r.completed && r.completedDate === todayStr)

    if (completedToday.length === 0) {
        completedTodayList.innerHTML = '<p class="no-entries">Nothing completed today yet.</p>'
        return
    }

    completedTodayList.innerHTML = ''
    completedToday.forEach(r => {
        const div = document.createElement("div")
        div.className = "completed-item"
        div.innerHTML = `<span class="completed-name">${r.name}</span>
                         <span class="completed-date">was due ${r.date}</span>`
        completedTodayList.appendChild(div)
    })
}

// Navigation
prevBtn.addEventListener("click", () => {
    currentMonth--
    if (currentMonth < 0) { currentMonth = 11; currentYear-- }
    renderCalendar()
})

nextBtn.addEventListener("click", () => {
    currentMonth++
    if (currentMonth > 11) { currentMonth = 0; currentYear++ }
    renderCalendar()
})

// Save event
saveEventBtn.addEventListener("click", async () => {
    const title = document.getElementById("eventTitle").value.trim()
    const description = document.getElementById("eventDescription").value.trim()
    if (!title) return

    await fetch("/newEvent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, date: selectedDate, description })
    })

    overlay.style.display = "none"
    document.getElementById("eventTitle").value = ""
    document.getElementById("eventDescription").value = ""
    await loadAllData()
    renderCalendar()
})

// Cancel event form
cancelEventBtn.addEventListener("click", () => {
    overlay.style.display = "none"
    document.getElementById("eventTitle").value = ""
    document.getElementById("eventDescription").value = ""
})

// Close overlay when clicking outside the card
overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
        overlay.style.display = "none"
        document.getElementById("eventTitle").value = ""
        document.getElementById("eventDescription").value = ""
    }
})

// Init
await loadAllData()
renderCalendar()
renderCompletedToday()
