import { useEffect, useMemo, useState } from "react";
import { getJson, postJson } from "../api";
import { formatMoney, toDateStr } from "../utils";

const txDefaults = {
  description: "",
  amount: "",
  type: "expense",
  category: "Other",
  date: toDateStr(new Date()),
  notes: ""
};

export default function BudgetPage() {
  const [config, setConfig] = useState({ categories: [], income: [], recurringBills: [] });
  const [transactions, setTransactions] = useState([]);
  const [tx, setTx] = useState(txDefaults);
  const [incomeForm, setIncomeForm] = useState({ name: "", amount: "", frequency: "biweekly", nextDate: toDateStr(new Date()) });
  const [billForm, setBillForm] = useState({
    name: "",
    amount: "",
    category: "Other",
    frequency: "monthly",
    startDate: toDateStr(new Date()),
    autoPay: true,
    notes: ""
  });

  const load = async () => {
    const [cfg, txs] = await Promise.all([getJson("/loadBudgetConfig"), getJson("/loadTransactions")]);
    setConfig(cfg);
    setTransactions(txs);
    setTx((prev) => ({ ...prev, category: cfg.categories?.[0] || "Other" }));
    setBillForm((prev) => ({ ...prev, category: cfg.categories?.[0] || "Other" }));
  };

  useEffect(() => {
    load();
  }, []);

  const totals = useMemo(() => {
    const income = transactions.filter((t) => t.type === "income").reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const spent = transactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const planned = transactions.filter((t) => t.type === "future").reduce((sum, t) => sum + Number(t.amount || 0), 0);
    return { income, spent, planned, remaining: income - spent - planned };
  }, [transactions]);

  const addTransaction = async (e) => {
    e.preventDefault();
    if (!tx.description.trim() || !tx.date || Number(tx.amount) <= 0) return;
    await postJson("/newTransaction", { ...tx, amount: Number(tx.amount) });
    setTx({ ...txDefaults, category: config.categories?.[0] || "Other" });
    await load();
  };

  const addIncome = async (e) => {
    e.preventDefault();
    if (!incomeForm.name.trim() || Number(incomeForm.amount) <= 0 || !incomeForm.nextDate) return;
    await postJson("/addIncome", { ...incomeForm, amount: Number(incomeForm.amount) });
    setIncomeForm({ name: "", amount: "", frequency: "biweekly", nextDate: toDateStr(new Date()) });
    await load();
  };

  const addBill = async (e) => {
    e.preventDefault();
    if (!billForm.name.trim() || Number(billForm.amount) <= 0 || !billForm.startDate) return;
    await postJson("/addRecurringBill", { ...billForm, amount: Number(billForm.amount) });
    setBillForm({
      ...billForm,
      name: "",
      amount: "",
      startDate: toDateStr(new Date()),
      notes: ""
    });
    await load();
  };

  return (
    <div className="module-page">
      <div className="module-header">
        <h1>Budget</h1>
      </div>

      <div className="db-grid">
        <div className="db-card col-4">
          <h3>Income</h3>
          <p>{formatMoney(totals.income)}</p>
        </div>
        <div className="db-card col-4">
          <h3>Spent</h3>
          <p>{formatMoney(totals.spent)}</p>
        </div>
        <div className="db-card col-4">
          <h3>Remaining</h3>
          <p>{formatMoney(totals.remaining)}</p>
        </div>
      </div>

      <div className="db-grid">
        <form className="db-card col-6" onSubmit={addTransaction}>
          <h3>Log Transaction</h3>
          <input placeholder="Description" value={tx.description} onChange={(e) => setTx({ ...tx, description: e.target.value })} />
          <input type="number" step="0.01" placeholder="Amount" value={tx.amount} onChange={(e) => setTx({ ...tx, amount: e.target.value })} />
          <select value={tx.type} onChange={(e) => setTx({ ...tx, type: e.target.value })}>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
            <option value="future">Future Purchase</option>
          </select>
          <select value={tx.category} onChange={(e) => setTx({ ...tx, category: e.target.value })}>
            {(config.categories || ["Other"]).map((c) => (
              <option value={c} key={c}>
                {c}
              </option>
            ))}
          </select>
          <input type="date" value={tx.date} onChange={(e) => setTx({ ...tx, date: e.target.value })} />
          <textarea placeholder="Notes" value={tx.notes} onChange={(e) => setTx({ ...tx, notes: e.target.value })} />
          <button className="btn" type="submit">
            Save Transaction
          </button>
        </form>

        <div className="db-card col-6">
          <h3>Recent Transactions</h3>
          {transactions.length === 0 && <p className="no-entries">No transactions yet.</p>}
          {[...transactions]
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 15)
            .map((t) => (
              <div className="completed-item" key={t.id}>
                <span>
                  {t.date} - {t.description}
                </span>
                <span className={`amount-${t.type}`}>{`${t.type === "income" ? "+" : "-"}${formatMoney(t.amount)}`}</span>
              </div>
            ))}
        </div>

        <form className="db-card col-6" onSubmit={addIncome}>
          <h3>Add Income Source</h3>
          <input placeholder="Name" value={incomeForm.name} onChange={(e) => setIncomeForm({ ...incomeForm, name: e.target.value })} />
          <input type="number" step="0.01" placeholder="Amount" value={incomeForm.amount} onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })} />
          <select value={incomeForm.frequency} onChange={(e) => setIncomeForm({ ...incomeForm, frequency: e.target.value })}>
            <option value="weekly">Weekly</option>
            <option value="biweekly">Biweekly</option>
            <option value="semimonthly">Semimonthly</option>
            <option value="monthly">Monthly</option>
          </select>
          <input type="date" value={incomeForm.nextDate} onChange={(e) => setIncomeForm({ ...incomeForm, nextDate: e.target.value })} />
          <button className="btn" type="submit">
            Add Income
          </button>
          {(config.income || []).map((inc) => (
            <div className="completed-item" key={inc.id}>
              <span>
                {inc.name} ({inc.frequency})
              </span>
              <span>{formatMoney(inc.amount)}</span>
            </div>
          ))}
        </form>

        <form className="db-card col-6" onSubmit={addBill}>
          <h3>Add Recurring Bill</h3>
          <input placeholder="Name" value={billForm.name} onChange={(e) => setBillForm({ ...billForm, name: e.target.value })} />
          <input type="number" step="0.01" placeholder="Amount" value={billForm.amount} onChange={(e) => setBillForm({ ...billForm, amount: e.target.value })} />
          <select value={billForm.category} onChange={(e) => setBillForm({ ...billForm, category: e.target.value })}>
            {(config.categories || ["Other"]).map((c) => (
              <option value={c} key={c}>
                {c}
              </option>
            ))}
          </select>
          <select value={billForm.frequency} onChange={(e) => setBillForm({ ...billForm, frequency: e.target.value })}>
            <option value="weekly">Weekly</option>
            <option value="biweekly">Biweekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
          <input type="date" value={billForm.startDate} onChange={(e) => setBillForm({ ...billForm, startDate: e.target.value })} />
          <button className="btn" type="submit">
            Add Bill
          </button>
          {(config.recurringBills || []).map((bill) => (
            <div className="completed-item" key={bill.id}>
              <span>
                {bill.name} ({bill.frequency})
              </span>
              <span>{formatMoney(bill.amount)}</span>
            </div>
          ))}
        </form>
      </div>
    </div>
  );
}
