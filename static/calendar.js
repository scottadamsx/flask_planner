// State
let currentYear = new Date().getFullYear()
let currentMonth = new Date().getMonth()
let selectedDate = null
let allReminders = []
let allEvents = []
let budgetConfig = null
let allTransactions = []

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

    // Load budget data (graceful if budget not set up yet)
    try {
        const [cfgRes, txRes] = await Promise.all([
            fetch("/loadBudgetConfig").then(r => r.json()),
            fetch("/loadTransactions").then(r => r.json())
        ])
        budgetConfig = cfgRes
        allTransactions = txRes
    } catch {
        budgetConfig = null
        allTransactions = []
    }
}

// Compute recurring bill dates for a given month
function getBillDatesForMonth(year, month) {
    if (!budgetConfig || !budgetConfig.recurringBills) return []
    const results = []
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startStr = toDateStr(firstDay)
    const endStr = toDateStr(lastDay)

    budgetConfig.recurringBills.forEach(bill => {
        const freq = bill.frequency || "monthly"
        const dom = bill.dayOfMonth || 1

        if (freq === "monthly") {
            const day = Math.min(dom, lastDay.getDate())
            const d = new Date(year, month, day)
            results.push({ date: toDateStr(d), name: bill.name, amount: bill.amount })
        } else if (freq === "weekly") {
            let cur = new Date(firstDay)
            while (cur <= lastDay) {
                results.push({ date: toDateStr(cur), name: bill.name, amount: bill.amount })
                cur.setDate(cur.getDate() + 7)
            }
        } else if (freq === "biweekly") {
            let cur = new Date(firstDay)
            while (cur <= lastDay) {
                results.push({ date: toDateStr(cur), name: bill.name, amount: bill.amount })
                cur.setDate(cur.getDate() + 14)
            }
        } else if (freq === "quarterly") {
            if (month % 3 === 0) {
                const day = Math.min(dom, lastDay.getDate())
                results.push({ date: toDateStr(new Date(year, month, day)), name: bill.name, amount: bill.amount })
            }
        } else if (freq === "yearly") {
            const day = Math.min(dom, lastDay.getDate())
            const candidate = new Date(year, month, day)
            results.push({ date: toDateStr(candidate), name: bill.name, amount: bill.amount })
        }
    })
    return results
}

function toDateStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Compute recurring reminder dates for a given month
function getReminderDatesForMonth(year, month) {
    const results = []
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    allReminders.forEach(reminder => {
        if (reminder.completed) return

        const recur = reminder.recurrence || "none"
        const rDate = new Date(reminder.date)

        if (recur === "none") {
            if (rDate.getFullYear() === year && rDate.getMonth() === month) {
                results.push({ date: toDateStr(rDate), name: reminder.name || reminder.text })
            }
        } else if (recur === "daily") {
            let cur = new Date(year, month, 1)
            if (rDate > cur) cur = new Date(rDate)
            while (cur <= lastDay) {
                results.push({ date: toDateStr(cur), name: reminder.name || reminder.text })
                cur.setDate(cur.getDate() + 1)
            }
        } else if (recur === "weekly") {
            let cur = new Date(rDate)
            while (cur <= lastDay) {
                if (cur >= firstDay) {
                    results.push({ date: toDateStr(cur), name: reminder.name || reminder.text })
                }
                cur.setDate(cur.getDate() + 7)
            }
        } else if (recur === "monthly") {
            const day = rDate.getDate()
            const candidate = new Date(year, month, Math.min(day, lastDay.getDate()))
            if (candidate >= rDate) {
                results.push({ date: toDateStr(candidate), name: reminder.name || reminder.text })
            }
        }
    })
    return results
}

// Render the month grid
function renderCalendar() {
    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"]
    monthLabel.textContent = `${monthNames[currentMonth]} ${currentYear}`

    const firstDay = new Date(currentYear, currentMonth, 1).getDay()
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()

    const today = new Date()
    const todayStr = toDateStr(today)

    // Get budget items for the month
    const billDates = getBillDatesForMonth(currentYear, currentMonth)
    const futurePurchases = allTransactions.filter(t => t.type === "future")
    const reminderDates = getReminderDatesForMonth(currentYear, currentMonth)

    let html = '<div class="calendar-header-row">'
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    dayNames.forEach(d => { html += `<div class="calendar-day-name">${d}</div>` })
    html += '</div><div class="calendar-body">'

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
        html += '<div class="calendar-cell empty"></div>'
    }

    // Day cells
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        const isToday = dateStr === todayStr ? ' today' : ''

        const dayReminders = reminderDates.filter(r => r.date === dateStr)
        const dayEvents = allEvents.filter(e => e.date === dateStr)
        const dayBills = billDates.filter(b => b.date === dateStr)
        const dayFuture = futurePurchases.filter(t => t.date === dateStr)

        let itemsHtml = ''
        dayReminders.forEach(r => {
            itemsHtml += `<div class="calendar-item reminder-item">${r.name}</div>`
        })
        dayEvents.forEach(e => {
            itemsHtml += `<div class="calendar-item event-item">${e.title}</div>`
        })
        dayBills.forEach(b => {
            itemsHtml += `<div class="calendar-item bill-item">${b.name} $${b.amount}</div>`
        })
        dayFuture.forEach(f => {
            itemsHtml += `<div class="calendar-item future-item">${f.description}</div>`
        })

        html += `<div class="calendar-cell${isToday}" data-date="${dateStr}">
            <span class="day-number">${day}</span>
            ${itemsHtml}
        </div>`
    }

    html += '</div>'

    // Legend
    html += `<div class="calendar-legend">
        <span><span class="legend-dot legend-blue"></span> Reminder</span>
        <span><span class="legend-dot legend-pink"></span> Event</span>
        <span><span class="legend-dot legend-red"></span> Bill</span>
        <span><span class="legend-dot legend-orange"></span> Planned Purchase</span>
    </div>`

    calendarGrid.innerHTML = html

    // Click day to add event
    document.querySelectorAll(".calendar-cell:not(.empty)").forEach(cell => {
        cell.addEventListener("click", () => {
            selectedDate = cell.dataset.date
            selectedDateSpan.textContent = selectedDate
            overlay.className = ""
overlay.style.display = "flex"
            document.getElementById("eventTitle").focus()
        })
    })
}

// Render Completed Today section
function renderCompletedToday() {
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const completedToday = allReminders.filter(r => r.completed && r.completedDate === todayStr)

    if (completedToday.length === 0) {
        completedTodayList.innerHTML = '<p class="no-entries">Nothing completed today yet.</p>'
        return
    }

    completedTodayList.innerHTML = ''
    completedToday.forEach(r => {
        const div = document.createElement("div")
        div.className = "completed-item"
        const formattedDate = new Date(r.date).toLocaleDateString(undefined, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).toLowerCase()
        div.innerHTML = `<span class="completed-name">${r.name || r.text}</span>
                         <span class="completed-date">was due ${formattedDate}</span>`
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

    overlay.className = "event-overlay-hidden"
overlay.style.display = ""
    document.getElementById("eventTitle").value = ""
    document.getElementById("eventDescription").value = ""
    await loadAllData()
    renderCalendar()
})

// Cancel event form
cancelEventBtn.addEventListener("click", () => {
    overlay.className = "event-overlay-hidden"
overlay.style.display = ""
    document.getElementById("eventTitle").value = ""
    document.getElementById("eventDescription").value = ""
})

// Close overlay when clicking outside the card
overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
        overlay.className = "event-overlay-hidden"
overlay.style.display = ""
        document.getElementById("eventTitle").value = ""
        document.getElementById("eventDescription").value = ""
    }
})

// Init
await loadAllData()
renderCalendar()
renderCompletedToday()
