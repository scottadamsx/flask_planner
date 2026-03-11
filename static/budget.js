// ================================================================
// Budget Module — All tab logic
// ================================================================

// ── State ──
let config = {}
let transactions = []
let simulations = []
let currentPeriodOffset = 0   // 0 = current, -1 = previous, +1 = next
let editingTransactionId = null
let editingIncomeId = null
let editingBillId = null
let sortColumn = "date"
let sortAsc = false
let simRows = []
let moneyChart = null

// ── Utility ──
function formatMoney(amount) {
    return '$' + Math.abs(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function toDateStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function parseDate(s) {
    const [y, m, d] = s.split('-').map(Number)
    return new Date(y, m - 1, d)
}

function escapeHtml(str) {
    const div = document.createElement('div')
    div.textContent = str
    return div.innerHTML
}

async function post(url, body) {
    return fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    })
}

// ── Data Loading ──
async function loadAll() {
    const [cfgRes, txRes, simRes] = await Promise.all([
        fetch("/loadBudgetConfig").then(r => r.json()),
        fetch("/loadTransactions").then(r => r.json()),
        fetch("/loadSimulations").then(r => r.json())
    ])
    config = cfgRes
    transactions = txRes
    simulations = simRes
}

// ================================================================
// TAB SWITCHING
// ================================================================
const tabs = document.querySelectorAll(".budget-tab")
const panels = document.querySelectorAll(".tab-panel")

function switchTab(tabName) {
    tabs.forEach(t => t.classList.toggle("active", t.dataset.tab === tabName))
    panels.forEach(p => p.classList.toggle("active", p.id === `panel-${tabName}`))
    sessionStorage.setItem("budgetActiveTab", tabName)
    if (tabName === "dashboard") renderDashboard()
    if (tabName === "transactions") renderTransactions()
    if (tabName === "reconcile") renderReconcile()
    if (tabName === "bills-income") renderBillsIncome()
    if (tabName === "simulator") renderSimulator()
}

tabs.forEach(t => t.addEventListener("click", () => switchTab(t.dataset.tab)))

// ================================================================
// PAY PERIOD CALCULATION (client-side mirror)
// ================================================================
function getPayPeriod(dateStr, offset = 0) {
    const d = parseDate(dateStr)
    const sched = config.paySchedule || {}
    const type = sched.type || "biweekly"
    const anchor = parseDate(sched.anchorDate || toDateStr(new Date()))
    let start, end

    if (type === "semimonthly") {
        if (d.getDate() < 15) {
            start = new Date(d.getFullYear(), d.getMonth(), 1)
            end = new Date(d.getFullYear(), d.getMonth(), 14)
        } else {
            start = new Date(d.getFullYear(), d.getMonth(), 15)
            end = new Date(d.getFullYear(), d.getMonth() + 1, 0)
        }
        // apply offset
        for (let i = 0; i < Math.abs(offset); i++) {
            if (offset > 0) {
                const next = new Date(end)
                next.setDate(next.getDate() + 1)
                if (next.getDate() < 15) {
                    start = new Date(next.getFullYear(), next.getMonth(), 1)
                    end = new Date(next.getFullYear(), next.getMonth(), 14)
                } else {
                    start = new Date(next.getFullYear(), next.getMonth(), 15)
                    end = new Date(next.getFullYear(), next.getMonth() + 1, 0)
                }
            } else {
                const prev = new Date(start)
                prev.setDate(prev.getDate() - 1)
                if (prev.getDate() < 15) {
                    start = new Date(prev.getFullYear(), prev.getMonth(), 1)
                    end = new Date(prev.getFullYear(), prev.getMonth(), 14)
                } else {
                    start = new Date(prev.getFullYear(), prev.getMonth(), 15)
                    end = new Date(prev.getFullYear(), prev.getMonth() + 1, 0)
                }
            }
        }
    } else if (type === "monthly") {
        start = new Date(d.getFullYear(), d.getMonth(), 1)
        end = new Date(d.getFullYear(), d.getMonth() + 1, 0)
        if (offset !== 0) {
            start = new Date(start.getFullYear(), start.getMonth() + offset, 1)
            end = new Date(start.getFullYear(), start.getMonth() + 1, 0)
        }
    } else {
        // biweekly, weekly, custom
        const interval = type === "weekly" ? 7 : type === "custom" ? (sched.customDays || 14) : 14
        const daysSince = Math.floor((d - anchor) / 86400000)
        let periodNum = Math.floor(daysSince / interval)
        periodNum += offset
        start = new Date(anchor)
        start.setDate(start.getDate() + periodNum * interval)
        end = new Date(start)
        end.setDate(end.getDate() + interval - 1)
    }

    return { start: toDateStr(start), end: toDateStr(end) }
}

function getCurrentPeriod() {
    return getPayPeriod(toDateStr(new Date()), currentPeriodOffset)
}

function formatPeriodLabel(start, end) {
    const s = parseDate(start)
    const e = parseDate(end)
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    return `${months[s.getMonth()]} ${s.getDate()} – ${months[e.getMonth()]} ${e.getDate()}, ${e.getFullYear()}`
}

// ================================================================
// RECURRING BILL DATE COMPUTATION
// ================================================================
function getBillDatesInRange(bill, startStr, endStr) {
    const startRange = parseDate(startStr)
    const endRange = parseDate(endStr)
    const dates = []
    const freq = bill.frequency || "monthly"
    const startDt = parseDate(bill.startDate || toDateStr(new Date()))

    let cur = new Date(startDt)

    if (freq === "monthly") {
        // Move to first possible occurrence after or equal to startRange
        // but keeping the day from startDt
        let scan = new Date(startDt)
        // Optimization: loop through 24 months Max
        for (let i = 0; i < 24; i++) {
            if (scan > endRange) break
            if (scan >= startRange) {
                dates.push(toDateStr(scan))
            }
            scan.setMonth(scan.getMonth() + 1)
            // Handle month end differences (e.g. 31st)
            const expectedMonth = (startDt.getMonth() + i + 1) % 12
            if (scan.getMonth() !== expectedMonth) {
                scan.setDate(0) // pull back to last day of previous month
            }
        }
    } else if (freq === "weekly") {
        while (cur <= endRange) {
            if (cur >= startRange) dates.push(toDateStr(cur))
            cur.setDate(cur.getDate() + 7)
        }
    } else if (freq === "biweekly") {
        while (cur <= endRange) {
            if (cur >= startRange) dates.push(toDateStr(cur))
            cur.setDate(cur.getDate() + 14)
        }
    } else if (freq === "yearly") {
        while (cur <= endRange) {
            if (cur >= startRange) dates.push(toDateStr(cur))
            const expectedMonth = cur.getMonth()
            cur.setFullYear(cur.getFullYear() + 1)
            if (cur.getMonth() !== expectedMonth) {
                cur.setDate(0)
            }
        }
    }
    return dates
}

// ================================================================
// INCOME DATE COMPUTATION
// ================================================================
function getIncomeDatesInRange(inc, startStr, endStr) {
    const start = parseDate(startStr)
    const end = parseDate(endStr)
    const dates = []
    const freq = inc.frequency || "biweekly"
    const nextDate = parseDate(inc.nextDate)
    const interval = freq === "weekly" ? 7 : freq === "monthly" ? 30 : freq === "semimonthly" ? 15 : 14

    if (freq === "semimonthly") {
        let cur = new Date(start.getFullYear(), start.getMonth(), 1)
        for (let i = 0; i < 14; i++) {
            const d1 = new Date(cur.getFullYear(), cur.getMonth(), 1)
            const d15 = new Date(cur.getFullYear(), cur.getMonth(), 15)
            if (d1 >= start && d1 <= end) dates.push(toDateStr(d1))
            if (d15 >= start && d15 <= end) dates.push(toDateStr(d15))
            cur.setMonth(cur.getMonth() + 1)
        }
    } else if (freq === "monthly") {
        let day = nextDate.getDate()
        let cur = new Date(start.getFullYear(), start.getMonth(), 1)
        for (let i = 0; i < 14; i++) {
            const lastDay = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate()
            const d = new Date(cur.getFullYear(), cur.getMonth(), Math.min(day, lastDay))
            if (d >= start && d <= end) dates.push(toDateStr(d))
            cur.setMonth(cur.getMonth() + 1)
        }
    } else {
        // weekly or biweekly — walk from nextDate
        let cur = new Date(nextDate)
        // walk back to before start
        while (cur > start) cur.setDate(cur.getDate() - interval)
        // walk forward
        while (cur <= end) {
            if (cur >= start) dates.push(toDateStr(cur))
            cur.setDate(cur.getDate() + interval)
        }
    }
    return dates
}

// ================================================================
// DASHBOARD TAB
// ================================================================
function renderDashboard() {
    const period = getCurrentPeriod()
    const periodLabel = document.getElementById("periodLabel")
    periodLabel.textContent = formatPeriodLabel(period.start, period.end)

    if (currentPeriodOffset === 0) periodLabel.textContent += " (Current)"
    else if (currentPeriodOffset === 1) periodLabel.textContent += " (Next)"
    else if (currentPeriodOffset === -1) periodLabel.textContent += " (Previous)"

    const periodTx = transactions.filter(t => t.date >= period.start && t.date <= period.end)

    // Income from income sources
    let incomeTotal = 0
        ; (config.income || []).forEach(inc => {
            const dates = getIncomeDatesInRange(inc, period.start, period.end)
            incomeTotal += dates.length * inc.amount
        })
    // Plus income-type transactions
    incomeTotal += periodTx.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0)

    const spent = periodTx.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0)

    // Bills — exclude those already logged as expenses
    let billsTotal = 0
        ; (config.recurringBills || []).forEach(bill => {
            const dates = getBillDatesInRange(bill, period.start, period.end)
            dates.forEach(bd => {
                const alreadyLogged = periodTx.some(t =>
                    t.type === "expense" &&
                    t.description.toLowerCase().includes(bill.name.toLowerCase()) &&
                    Math.abs(t.amount - bill.amount) < 1 &&
                    Math.abs((parseDate(t.date) - parseDate(bd)) / 86400000) <= 3
                )
                if (!alreadyLogged) billsTotal += bill.amount
            })
        })

    const planned = periodTx.filter(t => t.type === "future").reduce((s, t) => s + t.amount, 0)
    const remaining = incomeTotal - spent - billsTotal - planned

    const cards = document.getElementById("summaryCards")
    cards.innerHTML = `
        <div class="summary-card income-card"><span class="card-label">Income</span><span class="card-value">${formatMoney(incomeTotal)}</span></div>
        <div class="summary-card expense-card"><span class="card-label">Spent</span><span class="card-value">${formatMoney(spent)}</span></div>
        <div class="summary-card bills-card"><span class="card-label">Bills</span><span class="card-value">${formatMoney(billsTotal)}</span></div>
        <div class="summary-card future-card"><span class="card-label">Planned</span><span class="card-value">${formatMoney(planned)}</span></div>
        <div class="summary-card remaining-card ${remaining < 0 ? 'remaining-negative' : remaining < 100 ? 'remaining-low' : 'remaining-positive'}">
            <span class="card-label">Remaining</span><span class="card-value">${formatMoney(remaining)}</span>
        </div>
    `

    // Unpaid/Manual Bills
    const unpaidDiv = document.getElementById("unpaidBills")
    const unpaidList = []
        ; (config.recurringBills || []).forEach(bill => {
            const dates = getBillDatesInRange(bill, period.start, period.end)
            dates.forEach(bd => {
                const alreadyLogged = periodTx.some(t =>
                    t.type === "expense" &&
                    t.description.toLowerCase().includes(bill.name.toLowerCase()) &&
                    Math.abs(t.amount - bill.amount) < 1 &&
                    Math.abs((parseDate(t.date) - parseDate(bd)) / 86400000) <= 3
                )
                if (!alreadyLogged) {
                    unpaidList.push({ ...bill, date: bd })
                }
            })
        })

    if (unpaidList.length === 0) {
        unpaidDiv.innerHTML = '<p class="no-entries">All bills for this period are paid!</p>'
    } else {
        unpaidDiv.innerHTML = unpaidList.map(b => `
            <div class="recent-row" style="cursor: default;">
                <div style="display:flex; flex-direction:column;">
                    <span class="recent-desc" style="font-weight:600;">${escapeHtml(b.name)}</span>
                    <span style="font-size:0.75rem; color:var(--text-tertiary)">Due: ${b.date}</span>
                </div>
                <div style="text-align:right;">
                    <div class="recent-amount amount-expense" style="margin-bottom:0.25rem;">${formatMoney(b.amount)}</div>
                    ${b.autoPay ? '<span class="category-badge" style="background:rgba(34,197,94,0.1); color:var(--primary);">Auto</span>'
                : `<button class="btn btn-sm" onclick="payBill('${escapeHtml(b.name)}', ${b.amount}, '${b.date}', '${escapeHtml(b.category)}')">Pay Now</button>`}
                </div>
            </div>
        `).join('')
    }

    // Category breakdown
    const catTotals = {}
    periodTx.filter(t => t.type === "expense").forEach(t => {
        catTotals[t.category] = (catTotals[t.category] || 0) + t.amount
    })
    const catBreakdown = document.getElementById("categoryBreakdown")
    const cats = Object.entries(catTotals).sort((a, b) => b[1] - a[1])
    const maxCat = cats.length > 0 ? cats[0][1] : 1
    const totalSpent = spent || 1

    if (cats.length === 0) {
        catBreakdown.innerHTML = '<p class="no-entries">No spending in this period.</p>'
    } else {
        catBreakdown.innerHTML = cats.map(([cat, amt]) => `
            <div class="cat-row">
                <div class="cat-info"><span class="cat-name">${escapeHtml(cat)}</span><span class="cat-amount">${formatMoney(amt)} (${Math.round(amt / totalSpent * 100)}%)</span></div>
                <div class="cat-bar-bg"><div class="cat-bar" style="width:${(amt / maxCat * 100).toFixed(1)}%"></div></div>
            </div>
        `).join('')
    }

    // Recent transactions
    const recent = [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10)
    const recentDiv = document.getElementById("recentTransactions")
    if (recent.length === 0) {
        recentDiv.innerHTML = '<p class="no-entries">No transactions yet.</p>'
    } else {
        recentDiv.innerHTML = recent.map(t => `
            <div class="recent-row" data-id="${t.id}">
                <span class="recent-date">${t.date}</span>
                <span class="recent-desc">${escapeHtml(t.description)}</span>
                <span class="recent-amount amount-${t.type}">${t.type === 'income' ? '+' : '-'}${formatMoney(t.amount)}</span>
                <span class="category-badge">${escapeHtml(t.category)}</span>
            </div>
        `).join('')

        recentDiv.querySelectorAll(".recent-row").forEach(row => {
            row.addEventListener("click", () => {
                switchTab("transactions")
            })
        })
    }

    // Money In vs Money Out Line Chart
    const chartEl = document.getElementById('moneyChart')
    if (chartEl) {
        const ctx = chartEl.getContext('2d');
        if (moneyChart) moneyChart.destroy();

        const slider = document.getElementById('chartRangeSlider');
        const sliderLabel = document.getElementById('chartRangeValue');
        const timeline = document.getElementById('chartTimeline').value;
        const maxVal = slider ? parseInt(slider.value) : 15000;

        if (sliderLabel) sliderLabel.textContent = formatMoney(maxVal).split('.')[0];

        // Determine chart range
        let chartStart, chartEnd;
        if (timeline === 'period') {
            chartStart = period.start;
            chartEnd = period.end;
        } else {
            const months = parseInt(timeline);
            const start = new Date();
            const end = new Date();
            end.setMonth(end.getMonth() + months);
            chartStart = toDateStr(start);
            chartEnd = toDateStr(end);
        }

        // Generate datasets for the chart range
        const labels = [];
        const inData = [];
        const outData = [];

        // We need transactions within the chart range for trend line
        const rangeTx = transactions.filter(t => t.date >= chartStart && t.date <= chartEnd);

        let cur = parseDate(chartStart);
        const endDt = parseDate(chartEnd);

        let cumulativeIn = 0;
        let cumulativeOut = 0;

        while (cur <= endDt) {
            const dStr = toDateStr(cur);
            labels.push(dStr.split('-').slice(1).join('/')); // simplified date MM/DD

            // Day Income
            let dayIn = 0;
            (config.income || []).forEach(inc => {
                if (getIncomeDatesInRange(inc, dStr, dStr).length > 0) dayIn += inc.amount;
            });
            dayIn += rangeTx.filter(t => t.date === dStr && t.type === 'income').reduce((s, t) => s + t.amount, 0);
            cumulativeIn += dayIn;
            inData.push(cumulativeIn);

            // Day Out
            let dayOut = 0;
            (config.recurringBills || []).forEach(bill => {
                if (getBillDatesInRange(bill, dStr, dStr).length > 0) dayOut += bill.amount;
            });
            dayOut += rangeTx.filter(t => t.date === dStr && (t.type === 'expense' || t.type === 'future')).reduce((s, t) => s + t.amount, 0);
            cumulativeOut += dayOut;
            outData.push(cumulativeOut);

            cur.setDate(cur.getDate() + 1);
        }

        moneyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Money In',
                        data: inData,
                        borderColor: 'rgba(34, 197, 94, 1)',
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        fill: true,
                        tension: 0.3
                    },
                    {
                        label: 'Money Out',
                        data: outData,
                        borderColor: 'rgba(239, 68, 68, 1)',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        fill: true,
                        tension: 0.3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: maxVal,
                        ticks: {
                            callback: (val) => '$' + val.toLocaleString()
                        }
                    }
                },
                plugins: {
                    legend: { position: 'top' },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: (context) => ` ${context.dataset.label}: ${formatMoney(context.raw)}`
                        }
                    }
                }
            }
        });
    }
}

// Chart Range/Timeline Listeners
document.addEventListener('input', (e) => {
    if (e.target.id === 'chartRangeSlider') {
        renderDashboard();
    }
});
document.addEventListener('change', (e) => {
    if (e.target.id === 'chartTimeline') {
        renderDashboard();
    }
});

window.payBill = async function (name, amount, date, category) {
    if (!confirm(`Mark "${name}" as paid on ${date}?`)) return
    await post("/newTransaction", {
        description: `Bill: ${name}`,
        amount: amount,
        type: "expense",
        category: category,
        date: date,
        notes: "Automatically logged from dashboard"
    })
    await loadAll()
    renderDashboard()
}

document.getElementById("prevPeriod").addEventListener("click", () => { currentPeriodOffset--; renderDashboard() })
document.getElementById("nextPeriod").addEventListener("click", () => { currentPeriodOffset++; renderDashboard() })

// ================================================================
// TRANSACTIONS TAB
// ================================================================
function populateCategoryDropdowns() {
    const cats = config.categories || []
    const selectors = [
        document.getElementById("txCategory"),
        document.getElementById("billCategory"),
        document.getElementById("filterCategory"),
        document.getElementById("oneTimeIncomeCategory")
    ]
    selectors.forEach(sel => {
        if (!sel || sel.tagName !== 'SELECT') return
        const current = sel.value
        const isFilter = sel.id === "filterCategory"
        sel.innerHTML = isFilter ? '<option value="all">All Categories</option>' : ''
        cats.forEach(c => {
            sel.innerHTML += `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`
        })
        if (current && [...sel.options].some(o => o.value === current)) sel.value = current
    })
}

function getFilteredTransactions() {
    let filtered = [...transactions]
    const typeFilter = document.getElementById("filterType").value
    const catFilter = document.getElementById("filterCategory").value
    const fromDate = document.getElementById("filterFrom").value
    const toDate = document.getElementById("filterTo").value

    if (typeFilter !== "all") filtered = filtered.filter(t => t.type === typeFilter)
    if (catFilter !== "all") filtered = filtered.filter(t => t.category === catFilter)
    if (fromDate) filtered = filtered.filter(t => t.date >= fromDate)
    if (toDate) filtered = filtered.filter(t => t.date <= toDate)

    filtered.sort((a, b) => {
        let va = a[sortColumn], vb = b[sortColumn]
        if (sortColumn === "amount") { va = Number(va); vb = Number(vb) }
        if (va < vb) return sortAsc ? -1 : 1
        if (va > vb) return sortAsc ? 1 : -1
        return 0
    })
    return filtered
}

function renderTransactions() {
    populateCategoryDropdowns()
    const filtered = getFilteredTransactions()
    const tbody = document.getElementById("transactionsBody")
    const noMsg = document.getElementById("noTransactions")

    if (filtered.length === 0) {
        tbody.innerHTML = ''
        noMsg.style.display = ''
        document.getElementById("transactionsTable").style.display = 'none'
        return
    }
    noMsg.style.display = 'none'
    document.getElementById("transactionsTable").style.display = ''

    tbody.innerHTML = filtered.map(t => `
        <tr>
            <td>${t.date}</td>
            <td>${escapeHtml(t.description)}</td>
            <td><span class="category-badge">${escapeHtml(t.category)}</span></td>
            <td class="amount-${t.type}">${t.type === 'income' ? '+' : '-'}${formatMoney(t.amount)}</td>
            <td>${t.type === 'future' ? 'Planned' : t.type === 'income' ? 'Income' : 'Expense'}</td>
            <td>${t.reconciled ? '<span class="reconciled-badge">&#10003;</span>' : '<span class="unreconciled-badge">&#9675;</span>'}</td>
            <td class="action-cell">
                <button type="button" class="btn-sm btn-secondary" onclick="editTransaction('${t.id}')">Edit</button>
                ${t.type === 'future' ? `<button type="button" class="btn-sm btn-complete" onclick="convertFuture('${t.id}')">Purchased</button>` : ''}
                <button type="button" class="btn-sm btn-delete" onclick="deleteTx('${t.id}')">Delete</button>
            </td>
        </tr>
    `).join('')

    // sortable headers
    document.querySelectorAll(".sortable").forEach(th => {
        th.onclick = () => {
            const col = th.dataset.sort
            if (sortColumn === col) sortAsc = !sortAsc
            else { sortColumn = col; sortAsc = true }
            renderTransactions()
        }
    })
}

// Expose to onclick handlers
window.editTransaction = function (id) {
    const tx = transactions.find(t => t.id === id)
    if (!tx) return
    editingTransactionId = id
    document.getElementById("txDesc").value = tx.description
    document.getElementById("txAmount").value = tx.amount
    document.querySelector(`input[name="txType"][value="${tx.type}"]`).checked = true
    document.getElementById("txCategory").value = tx.category
    document.getElementById("txDate").value = tx.date
    document.getElementById("txNotes").value = tx.notes || ''
    document.getElementById("transFormTitle").textContent = "Edit Transaction"
    document.getElementById("submitTransaction").textContent = "Save Changes"
    document.getElementById("transactionFormWrapper").style.display = ''
}

window.convertFuture = async function (id) {
    await post("/convertFuturePurchase", { id, date: toDateStr(new Date()) })
    await loadAll()
    renderTransactions()
}

window.deleteTx = async function (id) {
    if (!confirm("Delete this transaction?")) return
    await post("/deleteTransaction", { id })
    await loadAll()
    renderTransactions()
}

// Transaction form
document.getElementById("logTransactionBtn").addEventListener("click", () => {
    editingTransactionId = null
    document.getElementById("transFormTitle").textContent = "Log Transaction"
    document.getElementById("submitTransaction").textContent = "Save"
    document.getElementById("txDate").value = toDateStr(new Date())
    document.getElementById("transactionFormWrapper").style.display = ''
})

document.getElementById("cancelTransaction").addEventListener("click", () => {
    document.getElementById("transactionFormWrapper").style.display = 'none'
    resetTransactionForm()
})

function resetTransactionForm() {
    editingTransactionId = null
    document.getElementById("txDesc").value = ''
    document.getElementById("txAmount").value = ''
    document.querySelector('input[name="txType"][value="expense"]').checked = true
    document.getElementById("txDate").value = toDateStr(new Date())
    document.getElementById("txNotes").value = ''
    document.getElementById("transFormTitle").textContent = "Log Transaction"
    document.getElementById("submitTransaction").textContent = "Save"
}

document.getElementById("submitTransaction").addEventListener("click", async () => {
    const desc = document.getElementById("txDesc").value.trim()
    const amount = parseFloat(document.getElementById("txAmount").value)
    const type = document.querySelector('input[name="txType"]:checked').value
    const category = document.getElementById("txCategory").value
    const txDate = document.getElementById("txDate").value
    const notes = document.getElementById("txNotes").value.trim()

    if (!desc || isNaN(amount) || amount <= 0 || !txDate) return

    if (editingTransactionId) {
        await post("/updateTransaction", { id: editingTransactionId, description: desc, amount, type, category, date: txDate, notes })
    } else {
        await post("/newTransaction", { description: desc, amount, type, category, date: txDate, notes })
    }

    document.getElementById("transactionFormWrapper").style.display = 'none'
    resetTransactionForm()
    await loadAll()
    renderTransactions()
})

// Filter listeners
document.getElementById("filterType").addEventListener("change", renderTransactions)
document.getElementById("filterCategory").addEventListener("change", renderTransactions)
document.getElementById("filterFrom").addEventListener("change", renderTransactions)
document.getElementById("filterTo").addEventListener("change", renderTransactions)

// ================================================================
// RECONCILE TAB
// ================================================================
function buildPeriodOptions() {
    const sel = document.getElementById("reconcilePeriod")
    sel.innerHTML = ''
    // Show current + 5 previous periods
    for (let i = 0; i >= -5; i--) {
        const p = getPayPeriod(toDateStr(new Date()), i)
        const label = formatPeriodLabel(p.start, p.end) + (i === 0 ? ' (Current)' : '')
        sel.innerHTML += `<option value="${p.start}|${p.end}" ${i === 0 ? 'selected' : ''}>${label}</option>`
    }
}

function getSelectedReconcilePeriod() {
    const val = document.getElementById("reconcilePeriod").value
    const [start, end] = val.split('|')
    return { start, end }
}

function renderReconcile() {
    buildPeriodOptions()
    renderReconcileContent()
}

function renderReconcileContent() {
    const period = getSelectedReconcilePeriod()
    const periodTx = transactions.filter(t => t.date >= period.start && t.date <= period.end)
    const unreconciled = periodTx.filter(t => !t.reconciled)
    const reconciled = periodTx.filter(t => t.reconciled)

    // Summary
    const income = periodTx.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0)
    let incFromSources = 0
        ; (config.income || []).forEach(inc => {
            incFromSources += getIncomeDatesInRange(inc, period.start, period.end).length * inc.amount
        })
    const totalIncome = income + incFromSources
    const totalExpenses = periodTx.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0)
    const reconciledTotal = reconciled.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0)
    const unreconciledTotal = unreconciled.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0)
    const expected = totalIncome - totalExpenses
    const diff = expected - (totalIncome - reconciledTotal)

    const summary = document.getElementById("reconcileSummary")
    summary.innerHTML = `
        <div class="recon-stat"><span class="recon-label">Expected Balance</span><span class="recon-value">${formatMoney(expected)}</span></div>
        <div class="recon-stat"><span class="recon-label">Reconciled Expenses</span><span class="recon-value">${formatMoney(reconciledTotal)}</span></div>
        <div class="recon-stat"><span class="recon-label">Unreconciled Expenses</span><span class="recon-value">${formatMoney(unreconciledTotal)}</span></div>
        <div class="recon-stat ${Math.abs(diff) > 0.01 ? 'recon-diff' : ''}"><span class="recon-label">Difference</span><span class="recon-value">${formatMoney(diff)}</span></div>
    `

    // Unreconciled table
    const uBody = document.getElementById("unreconciledBody")
    const noU = document.getElementById("noUnreconciled")
    const uTable = document.getElementById("unreconciledTable")
    if (unreconciled.length === 0) {
        uBody.innerHTML = ''; noU.style.display = ''; uTable.style.display = 'none'
    } else {
        noU.style.display = 'none'; uTable.style.display = ''
        uBody.innerHTML = unreconciled.map(t => `
            <tr>
                <td><input type="checkbox" class="recon-check" value="${t.id}"></td>
                <td>${t.date}</td>
                <td>${escapeHtml(t.description)}</td>
                <td><span class="category-badge">${escapeHtml(t.category)}</span></td>
                <td class="amount-${t.type}">${t.type === 'income' ? '+' : '-'}${formatMoney(t.amount)}</td>
                <td><button type="button" class="btn-sm btn-complete" onclick="reconcileOne('${t.id}')">Reconcile</button></td>
            </tr>
        `).join('')
    }

    // Reconciled table
    const rBody = document.getElementById("reconciledBody")
    const noR = document.getElementById("noReconciled")
    const rTable = document.getElementById("reconciledTable")
    if (reconciled.length === 0) {
        rBody.innerHTML = ''; noR.style.display = ''; rTable.style.display = 'none'
    } else {
        noR.style.display = 'none'; rTable.style.display = ''
        rBody.innerHTML = reconciled.map(t => `
            <tr class="reconciled-row-bg">
                <td>${t.date}</td>
                <td>${escapeHtml(t.description)}</td>
                <td><span class="category-badge">${escapeHtml(t.category)}</span></td>
                <td class="amount-${t.type}">${t.type === 'income' ? '+' : '-'}${formatMoney(t.amount)}</td>
                <td><button type="button" class="btn-sm btn-secondary" onclick="unreconcileOne('${t.id}')">Un-reconcile</button></td>
            </tr>
        `).join('')
    }
}

window.reconcileOne = async function (id) {
    await post("/reconcileTransaction", { id })
    await loadAll()
    renderReconcileContent()
}

window.unreconcileOne = async function (id) {
    await post("/unreconcileTransaction", { id })
    await loadAll()
    renderReconcileContent()
}

document.getElementById("selectAllUnreconciled").addEventListener("change", function () {
    document.querySelectorAll(".recon-check").forEach(cb => cb.checked = this.checked)
})

document.getElementById("reconcileSelectedBtn").addEventListener("click", async () => {
    const ids = [...document.querySelectorAll(".recon-check:checked")].map(cb => cb.value)
    if (ids.length === 0) return
    await post("/bulkReconcile", { ids })
    await loadAll()
    renderReconcileContent()
})

document.getElementById("reconcilePeriod").addEventListener("change", renderReconcileContent)

// ================================================================
// BILLS & INCOME TAB
// ================================================================
function renderBillsIncome() {
    populateCategoryDropdowns()
    renderPaySchedule()
    renderIncomeTable()
    renderOneTimeIncomeList()
    renderBillsTable()
    renderCategories()
}

function renderPaySchedule() {
    const sched = config.paySchedule || {}
    document.getElementById("payFrequency").value = sched.type || "biweekly"
    document.getElementById("anchorDate").value = sched.anchorDate || toDateStr(new Date())
    document.getElementById("customDays").value = sched.customDays || 14
    document.getElementById("customDaysWrapper").style.display = sched.type === "custom" ? '' : 'none'

    // Show upcoming paydays
    const upcoming = document.getElementById("upcomingPaydays")
    const dates = []
    const today = new Date()
    for (let i = 0; i < 3; i++) {
        const p = getPayPeriod(toDateStr(today), i)
        dates.push(p.start)
    }
    upcoming.innerHTML = '<p style="margin-top:1rem;color:var(--text-muted);font-size:0.9rem">Upcoming paydays: <strong>' + dates.join(', ') + '</strong></p>'
}

document.getElementById("payFrequency").addEventListener("change", function () {
    document.getElementById("customDaysWrapper").style.display = this.value === "custom" ? '' : 'none'
})

document.getElementById("saveScheduleBtn").addEventListener("click", async () => {
    config.paySchedule = {
        type: document.getElementById("payFrequency").value,
        anchorDate: document.getElementById("anchorDate").value,
        customDays: document.getElementById("payFrequency").value === "custom" ? parseInt(document.getElementById("customDays").value) || 14 : null
    }
    await post("/saveBudgetConfig", config)
    renderPaySchedule()
})

// ── Income ──
function renderIncomeTable() {
    const tbody = document.getElementById("incomeBody")
    const sources = config.income || []
    const noMsg = document.getElementById("noIncome")
    const table = document.getElementById("incomeTable")
    if (sources.length === 0) {
        tbody.innerHTML = ''; noMsg.style.display = ''; table.style.display = 'none'
        return
    }
    noMsg.style.display = 'none'; table.style.display = ''
    tbody.innerHTML = sources.map(inc => `
        <tr>
            <td>${escapeHtml(inc.name)}</td>
            <td>${formatMoney(inc.amount)}</td>
            <td>${inc.frequency}</td>
            <td>${inc.nextDate}</td>
            <td class="action-cell">
                <button type="button" class="btn-sm btn-secondary" onclick="editIncome('${inc.id}')">Edit</button>
                <button type="button" class="btn-sm btn-delete" onclick="deleteIncome('${inc.id}')">Delete</button>
            </td>
        </tr>
    `).join('')
}

document.getElementById("addIncomeBtn").addEventListener("click", () => {
    editingIncomeId = null
    document.getElementById("incomeFormTitle").textContent = "Add Income Source"
    document.getElementById("incomeFormWrapper").style.display = ''
})

document.getElementById("cancelIncome").addEventListener("click", () => {
    document.getElementById("incomeFormWrapper").style.display = 'none'
    resetIncomeForm()
})

function resetIncomeForm() {
    editingIncomeId = null
    document.getElementById("incomeName").value = ''
    document.getElementById("incomeAmount").value = ''
    document.getElementById("incomeNextDate").value = ''
}

document.getElementById("submitIncome").addEventListener("click", async () => {
    const name = document.getElementById("incomeName").value.trim()
    const amount = parseFloat(document.getElementById("incomeAmount").value)
    const frequency = document.getElementById("incomeFrequency").value
    const nextDate = document.getElementById("incomeNextDate").value
    if (!name || isNaN(amount) || amount <= 0 || !nextDate) return

    if (editingIncomeId) {
        await post("/updateIncome", { id: editingIncomeId, name, amount, frequency, nextDate })
    } else {
        await post("/addIncome", { name, amount, frequency, nextDate })
    }
    document.getElementById("incomeFormWrapper").style.display = 'none'
    resetIncomeForm()
    await loadAll()
    renderIncomeTable()
})

window.editIncome = function (id) {
    const inc = (config.income || []).find(i => i.id === id)
    if (!inc) return
    editingIncomeId = id
    document.getElementById("incomeFormTitle").textContent = "Edit Income Source"
    document.getElementById("incomeName").value = inc.name
    document.getElementById("incomeAmount").value = inc.amount
    document.getElementById("incomeFrequency").value = inc.frequency
    document.getElementById("incomeNextDate").value = inc.nextDate
    document.getElementById("incomeFormWrapper").style.display = ''
}

window.deleteIncome = async function (id) {
    if (!confirm("Delete this income source?")) return
    await post("/deleteIncome", { id })
    await loadAll()
    renderIncomeTable()
}

// ── One-Time Income ──
document.getElementById("addOneTimeIncomeBtn").addEventListener("click", () => {
    document.getElementById("oneTimeIncomeDate").value = toDateStr(new Date())
    document.getElementById("oneTimeIncomeFormWrapper").style.display = ''
})

document.getElementById("cancelOneTimeIncome").addEventListener("click", () => {
    document.getElementById("oneTimeIncomeFormWrapper").style.display = 'none'
    resetOneTimeIncomeForm()
})

function resetOneTimeIncomeForm() {
    document.getElementById("oneTimeIncomeName").value = ''
    document.getElementById("oneTimeIncomeAmount").value = ''
    document.getElementById("oneTimeIncomeCategory").value = ''
    document.getElementById("oneTimeIncomeDate").value = toDateStr(new Date())
    const notesEl = document.getElementById("oneTimeIncomeNotes")
    if (notesEl) notesEl.value = ''
}

document.getElementById("submitOneTimeIncome").addEventListener("click", async () => {
    const description = document.getElementById("oneTimeIncomeName").value.trim()
    const amount = parseFloat(document.getElementById("oneTimeIncomeAmount").value)
    const category = document.getElementById("oneTimeIncomeCategory").value
    const date = document.getElementById("oneTimeIncomeDate").value
    const notes = document.getElementById("oneTimeIncomeNotes").value.trim()
    if (!description || isNaN(amount) || amount <= 0 || !date) return

    await post("/newTransaction", { description, amount, type: "income", category, date, notes })
    document.getElementById("oneTimeIncomeFormWrapper").style.display = 'none'
    resetOneTimeIncomeForm()
    await loadAll()
    renderOneTimeIncomeList()
})

function renderOneTimeIncomeList() {
    const list = document.getElementById("oneTimeIncomeList")
    const noMsg = document.getElementById("noOneTimeIncome")
    const items = transactions.filter(t => t.type === "income").sort((a, b) => b.date.localeCompare(a.date))

    if (items.length === 0) {
        list.innerHTML = ''
        noMsg.style.display = ''
        return
    }
    noMsg.style.display = 'none'
    list.innerHTML = items.map(t => `
        <div class="completed-item">
            <span><strong>${escapeHtml(t.description)}</strong> <span class="category-badge">${escapeHtml(t.category)}</span></span>
            <span>
                <span class="amount-income" style="margin-right:0.75rem">+${formatMoney(t.amount)}</span>
                <span style="color:var(--text-tertiary);font-size:0.8rem">${t.date}</span>
                <button type="button" class="btn-sm btn-delete" style="margin-left:0.5rem" onclick="deleteOneTimeIncome('${t.id}')">X</button>
            </span>
        </div>
    `).join('')
}

window.deleteOneTimeIncome = async function (id) {
    if (!confirm("Delete this income entry?")) return
    await post("/deleteTransaction", { id })
    await loadAll()
    renderOneTimeIncomeList()
}

// ── Bills ──
function renderBillsTable() {
    const tbody = document.getElementById("billsBody")
    const bills = config.recurringBills || []
    const noMsg = document.getElementById("noBills")
    const table = document.getElementById("billsTable")
    if (bills.length === 0) {
        tbody.innerHTML = ''; noMsg.style.display = ''; table.style.display = 'none'
        return
    }
    noMsg.style.display = 'none'; table.style.display = ''
    tbody.innerHTML = bills.map(b => `
        <tr>
            <td>${escapeHtml(b.name)}</td>
            <td>${formatMoney(b.amount)}</td>
            <td><span class="category-badge">${escapeHtml(b.category)}</span></td>
            <td>${b.frequency}</td>
            <td>${b.startDate}</td>
            <td>${b.autoPay ? 'Yes' : 'No'}</td>
            <td class="action-cell">
                <button type="button" class="btn-sm btn-secondary" onclick="editBill('${b.id}')">Edit</button>
                <button type="button" class="btn-sm btn-delete" onclick="deleteBill('${b.id}')">Delete</button>
            </td>
        </tr>
    `).join('')
}

document.getElementById("addBillBtn").addEventListener("click", () => {
    editingBillId = null
    document.getElementById("billFormTitle").textContent = "Add Recurring Bill"
    document.getElementById("billFormWrapper").style.display = ''
})

document.getElementById("cancelBill").addEventListener("click", () => {
    document.getElementById("billFormWrapper").style.display = 'none'
    resetBillForm()
})

function resetBillForm() {
    editingBillId = null
    document.getElementById("billName").value = ''
    document.getElementById("billAmount").value = ''
    document.getElementById("billStartDate").value = toDateStr(new Date())
    document.querySelector('input[name="billAutoPay"][value="true"]').checked = true
    document.getElementById("billNotes").value = ''
}

document.getElementById("submitBill").addEventListener("click", async () => {
    const name = document.getElementById("billName").value.trim()
    const amount = parseFloat(document.getElementById("billAmount").value)
    const category = document.getElementById("billCategory").value
    const frequency = document.getElementById("billFrequency").value
    const startDate = document.getElementById("billStartDate").value
    const autoPay = document.querySelector('input[name="billAutoPay"]:checked').value === "true"
    const notes = document.getElementById("billNotes").value.trim()
    if (!name || isNaN(amount) || amount <= 0 || !startDate) return

    if (editingBillId) {
        await post("/updateRecurringBill", { id: editingBillId, name, amount, category, frequency, startDate, autoPay, notes })
    } else {
        await post("/addRecurringBill", { name, amount, category, frequency, startDate, autoPay, notes })
    }
    document.getElementById("billFormWrapper").style.display = 'none'
    resetBillForm()
    await loadAll()
    renderBillsTable()
})

window.editBill = function (id) {
    const bill = (config.recurringBills || []).find(b => b.id === id)
    if (!bill) return
    editingBillId = id
    document.getElementById("billFormTitle").textContent = "Edit Recurring Bill"
    document.getElementById("billName").value = bill.name
    document.getElementById("billAmount").value = bill.amount
    document.getElementById("billCategory").value = bill.category
    document.getElementById("billFrequency").value = bill.frequency
    document.getElementById("billStartDate").value = bill.startDate || toDateStr(new Date())
    document.querySelector(`input[name="billAutoPay"][value="${bill.autoPay}"]`).checked = true
    document.getElementById("billNotes").value = bill.notes || ''
    document.getElementById("billFormWrapper").style.display = ''
}

window.deleteBill = async function (id) {
    if (!confirm("Delete this recurring bill?")) return
    await post("/deleteRecurringBill", { id })
    await loadAll()
    renderBillsTable()
}

// ── Categories ──
function renderCategories() {
    const container = document.getElementById("categoriesContainer")
    const cats = config.categories || []
    container.innerHTML = cats.map(c => `
        <span class="category-chip">${escapeHtml(c)} <button type="button" class="chip-x" onclick="removeCategory('${escapeHtml(c)}')">&times;</button></span>
    `).join('')
}

window.removeCategory = async function (cat) {
    const used = transactions.some(t => t.category === cat)
    if (used && !confirm(`"${cat}" is used by existing transactions. Delete anyway?`)) return
    config.categories = config.categories.filter(c => c !== cat)
    await post("/saveBudgetConfig", config)
    renderCategories()
    populateCategoryDropdowns()
}

document.getElementById("addCategoryBtn").addEventListener("click", async () => {
    const input = document.getElementById("newCategoryInput")
    const name = input.value.trim()
    if (!name || config.categories.includes(name)) return
    config.categories.push(name)
    await post("/saveBudgetConfig", config)
    input.value = ''
    renderCategories()
    populateCategoryDropdowns()
})

// ================================================================
// SIMULATOR TAB
// ================================================================
function renderSimulator() {
    // Set defaults
    if (!document.getElementById("simStartDate").value) {
        document.getElementById("simStartDate").value = toDateStr(new Date())
        const sixMonths = new Date()
        sixMonths.setMonth(sixMonths.getMonth() + 6)
        document.getElementById("simEndDate").value = toDateStr(sixMonths)
    }
    renderSimSavedList()
    if (simRows.length > 0) renderSimGrid()
}

document.getElementById("generateProjection").addEventListener("click", () => {
    const startBalance = parseFloat(document.getElementById("simStartBalance").value) || 0
    const startDate = document.getElementById("simStartDate").value
    const endDate = document.getElementById("simEndDate").value
    if (!startDate || !endDate) return

    simRows = [{ date: startDate, description: "Starting Balance", income: 0, expense: 0, isManual: false }]

        // Add income rows
        ; (config.income || []).forEach(inc => {
            const dates = getIncomeDatesInRange(inc, startDate, endDate)
            dates.forEach(d => {
                simRows.push({ date: d, description: `Payday - ${inc.name}`, income: inc.amount, expense: 0, isManual: false })
            })
        })

        // Add bill rows
        ; (config.recurringBills || []).forEach(bill => {
            const dates = getBillDatesInRange(bill, startDate, endDate)
            dates.forEach(d => {
                simRows.push({ date: d, description: `Bill - ${bill.name}`, income: 0, expense: bill.amount, isManual: false })
            })
        })

    // Sort by date
    simRows.sort((a, b) => a.date.localeCompare(b.date))

    // Calculate balances
    recalcSimBalances(startBalance)
    renderSimGrid()
})

function recalcSimBalances(startBalance) {
    if (startBalance === undefined) {
        startBalance = simRows.length > 0 ? (simRows[0].balance - simRows[0].income + simRows[0].expense) : 0
        // Actually find the initial starting balance from row 0
        if (simRows.length > 0 && simRows[0].description === "Starting Balance") {
            startBalance = simRows[0].balance !== undefined ? simRows[0].balance : 0
        }
    }
    let bal = startBalance
    for (let i = 0; i < simRows.length; i++) {
        if (i === 0 && simRows[i].description === "Starting Balance") {
            simRows[i].balance = startBalance
        } else {
            bal = bal + (simRows[i].income || 0) - (simRows[i].expense || 0)
            simRows[i].balance = Math.round(bal * 100) / 100
        }
    }
}

function renderSimGrid() {
    const tbody = document.getElementById("simBody")
    const noMsg = document.getElementById("noSimData")
    const actions = document.getElementById("simActions")
    const warning = document.getElementById("simWarning")

    noMsg.style.display = 'none'
    actions.style.display = ''
    document.getElementById("simGrid").style.display = ''

    let negativeDate = null
    tbody.innerHTML = simRows.map((r, i) => {
        if (r.balance < 0 && !negativeDate) negativeDate = r.date
        const negClass = r.balance < 0 ? ' sim-negative' : r.balance < 200 ? ' sim-low' : ''
        return `
        <tr class="${negClass}">
            <td><input type="date" class="sim-input" value="${r.date}" onchange="simCellChange(${i},'date',this.value)"></td>
            <td><input type="text" class="sim-input" value="${escapeHtml(r.description)}" onchange="simCellChange(${i},'description',this.value)"></td>
            <td><input type="number" class="sim-input" step="0.01" value="${r.income || ''}" onchange="simCellChange(${i},'income',this.value)" placeholder="0.00"></td>
            <td><input type="number" class="sim-input" step="0.01" value="${r.expense || ''}" onchange="simCellChange(${i},'expense',this.value)" placeholder="0.00"></td>
            <td class="sim-balance${negClass}">${formatMoney(r.balance)}</td>
            <td><button type="button" class="btn-sm btn-delete" onclick="deleteSimRow(${i})">X</button></td>
        </tr>`
    }).join('')

    if (negativeDate) {
        warning.style.display = ''
        warning.textContent = `Warning: Your balance goes negative on ${negativeDate}. Consider adjusting your plan.`
    } else {
        warning.style.display = 'none'
    }
}

window.simCellChange = function (idx, field, value) {
    if (field === 'income' || field === 'expense') value = parseFloat(value) || 0
    simRows[idx][field] = value
    if (field === 'date') simRows.sort((a, b) => a.date.localeCompare(b.date))
    // Recalc from starting balance
    const startBal = simRows.length > 0 && simRows[0].description === "Starting Balance" ? simRows[0].balance : 0
    recalcSimBalances(startBal)
    renderSimGrid()
}

window.deleteSimRow = function (idx) {
    simRows.splice(idx, 1)
    const startBal = simRows.length > 0 && simRows[0].description === "Starting Balance" ? simRows[0].balance : 0
    recalcSimBalances(startBal)
    renderSimGrid()
}

document.getElementById("addSimRow").addEventListener("click", () => {
    simRows.push({ date: toDateStr(new Date()), description: "", income: 0, expense: 0, isManual: true })
    simRows.sort((a, b) => a.date.localeCompare(b.date))
    const startBal = simRows.length > 0 && simRows[0].description === "Starting Balance" ? simRows[0].balance : 0
    recalcSimBalances(startBal)
    renderSimGrid()
})

// CSV Export
document.getElementById("exportCsv").addEventListener("click", () => {
    let csv = "Date,Description,Income,Expense,Balance\n"
    simRows.forEach(r => {
        csv += `${r.date},"${r.description}",${r.income || 0},${r.expense || 0},${r.balance.toFixed(2)}\n`
    })
    const blob = new Blob([csv], { type: "text/csv" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = "budget_projection.csv"
    a.click()
})

// Save Simulation
document.getElementById("saveSimBtn").addEventListener("click", async () => {
    const name = prompt("Name this simulation:")
    if (!name) return
    await post("/saveSimulation", {
        name,
        startDate: document.getElementById("simStartDate").value,
        endDate: document.getElementById("simEndDate").value,
        startingBalance: parseFloat(document.getElementById("simStartBalance").value) || 0,
        rows: simRows
    })
    await loadAll()
    renderSimSavedList()
})

function renderSimSavedList() {
    const sel = document.getElementById("loadSimSelect")
    sel.innerHTML = '<option value="">Load Saved...</option>'
    simulations.forEach(s => {
        sel.innerHTML += `<option value="${s.id}">${escapeHtml(s.name)} (${s.savedAt})</option>`
    })
}

document.getElementById("loadSimSelect").addEventListener("change", function () {
    const sim = simulations.find(s => s.id === this.value)
    if (!sim) return
    document.getElementById("simStartBalance").value = sim.startingBalance
    document.getElementById("simStartDate").value = sim.startDate
    document.getElementById("simEndDate").value = sim.endDate
    simRows = sim.rows
    renderSimGrid()
})

document.getElementById("deleteSimBtn").addEventListener("click", async () => {
    const id = document.getElementById("loadSimSelect").value
    if (!id) return
    if (!confirm("Delete this simulation?")) return
    await post("/deleteSimulation", { id })
    await loadAll()
    renderSimSavedList()
})

// ================================================================
// INIT
// ================================================================
await loadAll()
const savedTab = sessionStorage.getItem("budgetActiveTab") || "dashboard"
switchTab(savedTab)
