const STORAGE_KEY = "tripsplit-state-v1";

const categories = [
  { value: "Food", icon: "FD" },
  { value: "Petrol", icon: "PT" },
  { value: "Hotel", icon: "HT" },
  { value: "Tickets", icon: "TK" },
  { value: "Shopping", icon: "SH" },
  { value: "Other", icon: "OT" },
];

const avatarColors = ["#2563eb", "#079455", "#f97316", "#7c3aed", "#0891b2", "#dc2626", "#475467"];

const demoTrip = {
  id: "demo-trip",
  name: "Munnar Car Trip",
  destination: "Munnar, Kerala",
  startDate: "2026-05-08",
  endDate: "2026-05-11",
  currency: "INR",
  members: [
    { id: "m1", name: "Aju", contact: "aju@example.com" },
    { id: "m2", name: "Nithin", contact: "nithin@example.com" },
    { id: "m3", name: "Rahul", contact: "rahul@example.com" },
    { id: "m4", name: "Sam", contact: "sam@example.com" },
  ],
  expenses: [
    {
      id: "e1",
      title: "Roadside food",
      amount: 2000,
      paidBy: "m1",
      date: "2026-05-08",
      category: "Food",
      splitType: "equal",
      participants: ["m1", "m2", "m3", "m4"],
      splits: {},
      notes: "Aju paid for everyone",
    },
    {
      id: "e2",
      title: "Petrol refill",
      amount: 4000,
      paidBy: "m2",
      date: "2026-05-09",
      category: "Petrol",
      splitType: "equal",
      participants: ["m1", "m2", "m3", "m4"],
      splits: {},
      notes: "Highway fuel stop",
    },
    {
      id: "e3",
      title: "Hotel booking",
      amount: 8000,
      paidBy: "m3",
      date: "2026-05-10",
      category: "Hotel",
      splitType: "equal",
      participants: ["m1", "m2", "m3", "m4"],
      splits: {},
      notes: "Two rooms for one night",
    },
  ],
  paidSettlements: [],
};

const app = document.querySelector("#app");

let state = loadState();
let route = state.trips.length ? "dashboard" : "landing";
let activeTripId = state.activeTripId || (state.trips[0] && state.trips[0].id);
let editingExpenseId = null;
let editingMemberId = null;
let showExpenseForm = false;
let showMemberForm = false;
let toastTimer = null;

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed && Array.isArray(parsed.trips)) return parsed;
    } catch (error) {
      console.warn("Could not parse saved TripSplit state", error);
    }
  }
  return { trips: [demoTrip], activeTripId: demoTrip.id };
}

function saveState() {
  state.activeTripId = activeTripId;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function id(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function activeTrip() {
  return state.trips.find((trip) => trip.id === activeTripId) || state.trips[0];
}

function memberById(trip, memberId) {
  return trip.members.find((member) => member.id === memberId);
}

function money(amount, currency = activeTrip().currency) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(Number(amount || 0));
}

function dateLabel(value) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

function getExpenseShares(expense, trip) {
  const participants = expense.participants.filter((memberId) => trip.members.some((member) => member.id === memberId));
  const amount = Number(expense.amount) || 0;
  if (!participants.length || amount <= 0) return {};

  if (expense.splitType === "custom") {
    return participants.reduce((shares, memberId) => {
      shares[memberId] = Number(expense.splits[memberId]) || 0;
      return shares;
    }, {});
  }

  if (expense.splitType === "percentage") {
    return participants.reduce((shares, memberId) => {
      shares[memberId] = (amount * (Number(expense.splits[memberId]) || 0)) / 100;
      return shares;
    }, {});
  }

  const share = amount / participants.length;
  return participants.reduce((shares, memberId) => {
    shares[memberId] = share;
    return shares;
  }, {});
}

function calculateBalances(trip) {
  const totals = trip.members.reduce((acc, member) => {
    acc[member.id] = { member, paid: 0, share: 0, balance: 0 };
    return acc;
  }, {});

  trip.expenses.forEach((expense) => {
    if (totals[expense.paidBy]) totals[expense.paidBy].paid += Number(expense.amount) || 0;
    const shares = getExpenseShares(expense, trip);
    Object.entries(shares).forEach(([memberId, share]) => {
      if (totals[memberId]) totals[memberId].share += share;
    });
  });

  return Object.values(totals).map((item) => ({
    ...item,
    balance: roundMoney(item.paid - item.share),
  }));
}

function calculateSettlements(trip) {
  const balances = calculateBalances(trip);
  const debtors = balances
    .filter((item) => item.balance < -0.01)
    .map((item) => ({ ...item, amount: roundMoney(Math.abs(item.balance)) }))
    .sort((a, b) => b.amount - a.amount);
  const creditors = balances
    .filter((item) => item.balance > 0.01)
    .map((item) => ({ ...item, amount: roundMoney(item.balance) }))
    .sort((a, b) => b.amount - a.amount);

  const settlements = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = roundMoney(Math.min(debtors[i].amount, creditors[j].amount));
    if (amount > 0.01) {
      const key = `${debtors[i].member.id}-${creditors[j].member.id}-${amount}`;
      settlements.push({
        id: key,
        from: debtors[i].member,
        to: creditors[j].member,
        amount,
        status: trip.paidSettlements.includes(key) ? "Paid" : "Pending",
      });
    }
    debtors[i].amount = roundMoney(debtors[i].amount - amount);
    creditors[j].amount = roundMoney(creditors[j].amount - amount);
    if (debtors[i].amount <= 0.01) i += 1;
    if (creditors[j].amount <= 0.01) j += 1;
  }
  return settlements;
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function tripTotals(trip) {
  const balances = calculateBalances(trip);
  return {
    total: trip.expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
    paid: balances.reduce((sum, item) => sum + item.paid, 0),
    share: balances.reduce((sum, item) => sum + item.share, 0),
    balances,
    settlements: calculateSettlements(trip),
  };
}

function updateTrip(patch) {
  state.trips = state.trips.map((trip) => (trip.id === activeTripId ? { ...trip, ...patch } : trip));
  saveState();
  render();
}

function setRoute(nextRoute) {
  route = nextRoute;
  editingExpenseId = null;
  editingMemberId = null;
  showExpenseForm = false;
  showMemberForm = false;
  render();
}

function showToast(message) {
  clearTimeout(toastTimer);
  const old = document.querySelector(".toast");
  if (old) old.remove();
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  toastTimer = setTimeout(() => toast.remove(), 3200);
}

function render() {
  const trip = activeTrip();
  if (!trip || route === "landing") {
    app.innerHTML = landingPage();
  } else {
    app.innerHTML = appShell(trip);
  }
  bindEvents();
}

function appShell(trip) {
  const routes = [
    ["dashboard", "Dashboard", "H"],
    ["members", "Members", "M"],
    ["expenses", "Expenses", "+"],
    ["balances", "Balances", "Rs"],
    ["settlement", "Settle", "OK"],
  ];
  return `
    <div class="app-shell">
      <header class="topbar">
        <button class="brand" data-route="dashboard" aria-label="TripSplit dashboard">
          <span class="brand-mark">TS</span>
          <span class="brand-copy">
            <span class="brand-title">TripSplit</span>
            <span class="brand-subtitle"><span class="trip-dot"></span>${escapeHtml(trip.name)} · ${escapeHtml(trip.destination)}</span>
          </span>
        </button>
        <nav class="nav" aria-label="Main navigation">
          ${routes.map(([key, label, icon]) => `<button class="${route === key ? "active" : ""}" data-route="${key}"><span class="nav-icon">${icon}</span><span class="nav-label">${label}</span></button>`).join("")}
        </nav>
      </header>
      <main class="page">${screenForRoute(trip)}</main>
    </div>`;
}

function landingPage() {
  return `
    <div class="app-shell">
      <header class="topbar">
        <button class="brand" data-route="landing" aria-label="TripSplit home">
          <span class="brand-mark">TS</span>
          <span class="brand-copy"><span class="brand-title">TripSplit</span><span class="brand-subtitle"><span class="trip-dot"></span>Trip Money Manager</span></span>
        </button>
        <div class="inline-actions">
          <button class="secondary-button" data-action="demo">View Demo Trip</button>
          <button class="primary-button" data-route="create">Create New Trip</button>
        </div>
      </header>
      <main class="page">
        <section class="hero">
          <div>
            <span class="eyebrow">Built for group trips</span>
            <h1>Split trip expenses without confusion</h1>
            <p class="lead">Create a trip, add friends, track expenses, and know exactly who owes whom.</p>
            <div class="hero-actions">
              <button class="primary-button" data-route="create">Create New Trip</button>
              <button class="secondary-button" data-action="demo">View Demo Trip</button>
            </div>
          </div>
          <div class="showcase" aria-label="Trip summary preview">
            <div class="phone-frame">
              <div class="phone-header">
                <div>
                  <strong>Munnar Car Trip</strong>
                  <div class="muted">4 friends · INR</div>
                </div>
                <span class="route-chip">Live split</span>
              </div>
              <div class="mini-map"><span class="route-line"></span></div>
              <div class="summary-strip">
                <div class="mini-stat"><span class="label">Total</span><b>₹14,000</b></div>
                <div class="mini-stat"><span class="label">Rahul gets</span><b>₹4,500</b></div>
                <div class="mini-stat"><span class="label">Sam owes</span><b>₹3,500</b></div>
              </div>
            </div>
          </div>
        </section>
        <section class="feature-grid">
          ${feature("FR", "Add your friends", "Create a trip crew in seconds with names and optional contact details.")}
          ${feature("EX", "Track every expense", "Food, petrol, hotel, tickets, and all those small trip spends stay in one place.")}
          ${feature("SP", "Split equally or custom", "Choose equal split, custom amounts, or percentages for selected members.")}
          ${feature("ST", "Settle clearly", "See the simplest payment instructions with clear pay and receive indicators.")}
        </section>
      </main>
    </div>`;
}

function feature(icon, title, copy) {
  return `<article class="feature-card"><span class="feature-icon">${icon}</span><h3>${title}</h3><p>${copy}</p></article>`;
}

function screenForRoute(trip) {
  if (route === "create") return createTripScreen();
  if (route === "members") return membersScreen(trip);
  if (route === "expenses") return expensesScreen(trip);
  if (route === "balances") return balancesScreen(trip);
  if (route === "settlement") return settlementScreen(trip);
  return dashboardScreen(trip);
}

function createTripScreen() {
  const today = new Date().toISOString().slice(0, 10);
  return `
    <section>
      ${screenHeader("Create Trip", "Start a clean money space for your next group trip.", "Trip setup")}
      <form class="form-panel" id="trip-form">
        <div class="form-grid">
          ${field("Trip name", "name", "text", "Coorg Weekend", true)}
          ${field("Destination", "destination", "text", "Coorg, Karnataka", true)}
          ${field("Start date", "startDate", "date", today, true)}
          ${field("End date", "endDate", "date", today, true)}
          <div class="field full">
            <label for="currency">Currency</label>
            <select id="currency" name="currency">
              <option value="INR">INR - Indian Rupee</option>
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
              <option value="AED">AED - UAE Dirham</option>
            </select>
          </div>
        </div>
        <div class="actions-row" style="margin-top:1rem">
          <button class="primary-button" type="submit">Create trip</button>
          <button class="secondary-button" type="button" data-route="landing">Back</button>
        </div>
      </form>
    </section>`;
}

function dashboardScreen(trip) {
  const totals = tripTotals(trip);
  const topPayer = [...totals.balances].sort((a, b) => b.paid - a.paid)[0];
  return `
    <section>
      <div class="screen-header">
        <div>
          <div class="screen-kicker">${dateLabel(trip.startDate)} to ${dateLabel(trip.endDate)}</div>
          <h2>${escapeHtml(trip.name)}</h2>
          <p class="muted">${escapeHtml(trip.destination)} · Share link ready for your friends.</p>
        </div>
        <div class="actions-row">
          <button class="secondary-button" data-action="share">Share Trip</button>
          <button class="primary-button" data-route="expenses" data-action="new-expense">Add Expense</button>
        </div>
      </div>
      <div class="stats-grid">
        ${stat("Total trip expense", money(totals.total, trip.currency), "All saved shared costs")}
        ${stat("Members", trip.members.length, "Friends in this trip")}
        ${stat("Transactions", totals.settlements.length, totals.settlements.length ? "Needed to settle" : "You are all settled")}
        ${stat("Top payer", topPayer ? escapeHtml(topPayer.member.name) : "-", topPayer ? `${money(topPayer.paid, trip.currency)} paid` : "No expenses yet")}
      </div>
      <div class="dashboard-grid">
        <div class="panel-stack">
          <div class="chart-panel">
            <div class="screen-header" style="margin-bottom:1rem">
              <div><h3>Paid by each person</h3><p class="muted">Large numbers make trip spending easy to scan.</p></div>
              <span class="status-pill neutral">${money(totals.total, trip.currency)}</span>
            </div>
            ${paidBars(trip, totals.balances)}
          </div>
          <div class="chart-panel">
            <div class="screen-header" style="margin-bottom:1rem">
              <div><h3>Recent expenses</h3><p class="muted">${trip.expenses.length ? "The latest shared costs from your trip." : "No expenses yet. Add your first trip expense."}</p></div>
              <button class="ghost-button" data-route="expenses">View all</button>
            </div>
            ${expenseList(trip, trip.expenses.slice(-3).reverse(), false)}
          </div>
        </div>
        <aside class="panel-stack">
          <div class="chart-panel">
            <h3>Quick actions</h3>
            <div class="quick-actions">
              <button class="primary-button" data-route="expenses" data-action="new-expense">Add Expense</button>
              <button class="secondary-button" data-route="balances">View Balances</button>
              <button class="settlement-button" data-route="settlement">View Settlement</button>
            </div>
          </div>
          <div class="chart-panel">
            <h3>Current balance</h3>
            <div class="list-grid">${totals.balances.map((item) => balanceMini(trip, item)).join("")}</div>
          </div>
        </aside>
      </div>
    </section>`;
}

function stat(label, value, copy) {
  return `<article class="stat-card"><span class="label">${label}</span><b>${value}</b><p class="muted">${copy}</p></article>`;
}

function paidBars(trip, balances) {
  if (!trip.expenses.length) return empty("No expenses yet. Add your first trip expense.", "Add Expense", "expenses", "new-expense");
  const max = Math.max(...balances.map((item) => item.paid), 1);
  return `<div class="bars">${balances.map((item) => `
    <div class="bar-row">
      <div class="bar-meta"><span>${escapeHtml(item.member.name)}</span><span>${money(item.paid, trip.currency)}</span></div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.max(3, (item.paid / max) * 100)}%"></div></div>
    </div>`).join("")}</div>`;
}

function balanceMini(trip, item) {
  const status = item.balance > 0.01 ? "receive" : item.balance < -0.01 ? "owes" : "settled";
  const copy = item.balance > 0.01 ? "will receive" : item.balance < -0.01 ? "owes money" : "settled";
  return `<div class="member-head"><div class="member-main">${avatar(item.member)}<div><strong>${escapeHtml(item.member.name)}</strong><div class="muted">${copy}</div></div></div><span class="status-pill ${status}">${money(Math.abs(item.balance), trip.currency)}</span></div>`;
}

function membersScreen(trip) {
  return `
    <section>
      ${screenHeader("Members", "Add the friends who should share trip expenses.", "Trip crew", `<button class="primary-button" data-action="new-member">Add Member</button>`)}
      <form class="form-panel" id="member-form" style="display:${editingMemberId || showMemberForm ? "block" : "none"}; margin-bottom:1rem">
        <h3>${editingMemberId ? "Edit member" : "Add member"}</h3>
        <div class="form-grid">
          ${field("Name", "name", "text", "", true)}
          ${field("Phone or email", "contact", "text", "", false)}
        </div>
        <div class="actions-row" style="margin-top:1rem">
          <button class="primary-button" type="submit">${editingMemberId ? "Save changes" : "Add member"}</button>
          <button class="secondary-button" type="button" data-action="cancel-member">Cancel</button>
        </div>
      </form>
      ${trip.members.length ? `<div class="member-grid">${trip.members.map((member) => memberCard(trip, member)).join("")}</div>` : empty("No members yet. Add friends to start splitting expenses.", "Add Member", "members", "new-member")}
    </section>`;
}

function memberCard(trip, member) {
  const balances = calculateBalances(trip);
  const balance = balances.find((item) => item.member.id === member.id) || { paid: 0, share: 0, balance: 0 };
  return `
    <article class="member-card">
      <div class="member-head">
        <div class="member-main">${avatar(member)}<div class="truncate"><strong>${escapeHtml(member.name)}</strong><div class="muted truncate">${escapeHtml(member.contact || "No contact added")}</div></div></div>
        <div class="inline-actions">
          <button class="icon-button" title="Edit member" data-action="edit-member" data-id="${member.id}">Edit</button>
          <button class="icon-button" title="Remove member" data-action="delete-member" data-id="${member.id}">Delete</button>
        </div>
      </div>
      <div class="meta-grid">
        <div class="meta-box"><span class="label">Paid</span><b>${money(balance.paid, trip.currency)}</b></div>
        <div class="meta-box"><span class="label">Share</span><b>${money(balance.share, trip.currency)}</b></div>
        <div class="meta-box"><span class="label">Balance</span><b>${money(balance.balance, trip.currency)}</b></div>
      </div>
    </article>`;
}

function expensesScreen(trip) {
  const isEditing = Boolean(editingExpenseId);
  return `
    <section>
      ${screenHeader("Expenses", "Add food, petrol, hotel, tickets, and any shared trip cost.", "Expense tracker", `<button class="primary-button" data-action="new-expense">Add Expense</button>`)}
      <form class="form-panel" id="expense-form" style="display:${isEditing || showExpenseForm || !trip.expenses.length ? "block" : "none"}; margin-bottom:1rem">
        <h3>${isEditing ? "Edit expense" : "Add expense"}</h3>
        ${expenseFormFields(trip)}
        <div class="actions-row" style="margin-top:1rem">
          <button class="primary-button" type="submit">Save expense</button>
          <button class="secondary-button" type="button" data-action="cancel-expense">Cancel</button>
        </div>
      </form>
      ${expenseList(trip, [...trip.expenses].reverse(), true)}
    </section>`;
}

function expenseFormFields(trip) {
  const expense = trip.expenses.find((item) => item.id === editingExpenseId) || {
    title: "",
    amount: "",
    paidBy: trip.members[0] && trip.members[0].id,
    date: new Date().toISOString().slice(0, 10),
    category: "Food",
    splitType: "equal",
    participants: trip.members.map((member) => member.id),
    splits: {},
    notes: "",
  };
  return `
    <div class="form-grid">
      ${field("Expense title", "title", "text", expense.title, true)}
      ${field("Amount", "amount", "number", expense.amount, true, "0.01")}
      <div class="field">
        <label for="paidBy">Paid by</label>
        <select id="paidBy" name="paidBy" required>${trip.members.map((member) => `<option value="${member.id}" ${member.id === expense.paidBy ? "selected" : ""}>${escapeHtml(member.name)}</option>`).join("")}</select>
      </div>
      ${field("Date", "date", "date", expense.date, true)}
      <div class="field">
        <label for="category">Category</label>
        <select id="category" name="category">${categories.map((category) => `<option ${category.value === expense.category ? "selected" : ""}>${category.value}</option>`).join("")}</select>
      </div>
      <div class="field">
        <label for="splitType">Split type</label>
        <select id="splitType" name="splitType" data-action="split-type">
          <option value="equal" ${expense.splitType === "equal" ? "selected" : ""}>Equal split</option>
          <option value="custom" ${expense.splitType === "custom" ? "selected" : ""}>Custom amount split</option>
          <option value="percentage" ${expense.splitType === "percentage" ? "selected" : ""}>Percentage split</option>
        </select>
      </div>
      <div class="field full">
        <label>Split between</label>
        <div class="checkbox-grid">
          ${trip.members.map((member) => `<label class="check-card"><input type="checkbox" name="participants" value="${member.id}" ${expense.participants.includes(member.id) ? "checked" : ""}> ${escapeHtml(member.name)}</label>`).join("")}
        </div>
      </div>
      <div class="field full" id="split-values">
        ${splitValueInputs(trip, expense)}
      </div>
      <div class="field full">
        <label for="notes">Notes optional</label>
        <textarea id="notes" name="notes" placeholder="Rahul paid for everyone">${escapeHtml(expense.notes || "")}</textarea>
      </div>
    </div>`;
}

function splitValueInputs(trip, expense) {
  if (expense.splitType === "equal") {
    return `<p class="muted">TripSplit will divide this expense equally among selected members.</p>`;
  }
  const suffix = expense.splitType === "percentage" ? "%" : activeTrip().currency;
  return `
    <label>${expense.splitType === "percentage" ? "Percentage for each selected member" : "Custom amount for each selected member"}</label>
    <div class="split-grid">
      ${trip.members.map((member) => `<div class="field"><label for="split-${member.id}">${escapeHtml(member.name)}</label><input id="split-${member.id}" name="split-${member.id}" type="number" min="0" step="0.01" value="${Number(expense.splits[member.id] || 0)}" placeholder="${suffix}"></div>`).join("")}
    </div>`;
}

function expenseList(trip, expenses, editable) {
  if (!expenses.length) return empty("No expenses yet. Add your first trip expense.", "Add Expense", "expenses", "new-expense");
  return `<div class="list-grid">${expenses.map((expense) => expenseCard(trip, expense, editable)).join("")}</div>`;
}

function expenseCard(trip, expense, editable) {
  const payer = memberById(trip, expense.paidBy);
  const category = categories.find((item) => item.value === expense.category) || categories[categories.length - 1];
  return `
    <article class="expense-card">
      <div class="expense-head">
        <div class="expense-main">
          <span class="category-icon">${category.icon}</span>
          <div>
            <h3>${escapeHtml(expense.title)}</h3>
            <div class="muted">${escapeHtml(payer ? payer.name : "Unknown")} paid for ${expense.participants.length} ${expense.participants.length === 1 ? "person" : "people"}</div>
          </div>
        </div>
        <div class="amount">${money(expense.amount, trip.currency)}</div>
      </div>
      <div class="expense-foot">
        <span class="status-pill neutral">${escapeHtml(expense.category)}</span>
        <span>${dateLabel(expense.date)}</span>
        <span>${splitTypeLabel(expense.splitType)}</span>
        ${expense.notes ? `<span>${escapeHtml(expense.notes)}</span>` : ""}
      </div>
      ${editable ? `<div class="inline-actions"><button class="secondary-button" data-action="edit-expense" data-id="${expense.id}">Edit</button><button class="danger-button" data-action="delete-expense" data-id="${expense.id}">Delete</button></div>` : ""}
    </article>`;
}

function balancesScreen(trip) {
  const balances = calculateBalances(trip);
  return `
    <section>
      ${screenHeader("Balances", "Positive means receive money. Negative means pay money.", "Who owes what")}
      <div class="member-grid">
        ${balances.map((item) => balanceCard(trip, item)).join("")}
      </div>
    </section>`;
}

function balanceCard(trip, item) {
  const status = item.balance > 0.01 ? "receive" : item.balance < -0.01 ? "owes" : "settled";
  const copy = item.balance > 0.01 ? `${item.member.name} should receive ${money(item.balance, trip.currency)}` : item.balance < -0.01 ? `${item.member.name} owes ${money(Math.abs(item.balance), trip.currency)}` : `${item.member.name} is settled`;
  return `
    <article class="balance-card">
      <div class="balance-head">
        <div class="balance-main">${avatar(item.member)}<div><h3>${escapeHtml(item.member.name)}</h3><p class="muted">${escapeHtml(copy)}</p></div></div>
        <span class="status-pill ${status}">${status === "receive" ? "Will receive" : status === "owes" ? "Owes money" : "Settled"}</span>
      </div>
      <div class="amount">${item.balance < 0 ? "-" : ""}${money(Math.abs(item.balance), trip.currency)}</div>
      <div class="meta-grid">
        <div class="meta-box"><span class="label">Total paid</span><b>${money(item.paid, trip.currency)}</b></div>
        <div class="meta-box"><span class="label">Total share</span><b>${money(item.share, trip.currency)}</b></div>
        <div class="meta-box"><span class="label">Final balance</span><b>${money(item.balance, trip.currency)}</b></div>
      </div>
    </article>`;
}

function settlementScreen(trip) {
  const settlements = calculateSettlements(trip);
  const pending = settlements.filter((item) => item.status !== "Paid");
  const allSettled = settlements.length === 0 || pending.length === 0;
  return `
    <section>
      ${screenHeader("Settlement", "The fewest payments needed to finish the trip cleanly.", "Final summary", `<button class="secondary-button" data-action="share">Share Trip</button>`)}
      ${allSettled ? `<div class="empty-state"><div><span class="status-pill receive">Settled</span><h2 style="margin-top:1rem">You are all settled</h2><p class="muted">Every trip balance is zero or every suggested payment has been marked paid.</p></div></div>` : ""}
      ${settlements.length ? `<div class="list-grid" style="margin-top:1rem">${settlements.map((settlement) => settlementCard(trip, settlement)).join("")}</div>` : ""}
    </section>`;
}

function settlementCard(trip, settlement) {
  return `
    <article class="settlement-card">
      <div class="settlement-head">
        <span class="status-pill ${settlement.status === "Paid" ? "paid" : "pending"}">${settlement.status}</span>
        <strong>${money(settlement.amount, trip.currency)}</strong>
      </div>
      <div class="settlement-flow">
        <div class="member-main">${avatar(settlement.from)}<div><strong>${escapeHtml(settlement.from.name)}</strong><div class="muted">Pay</div></div></div>
        <span class="arrow-badge">→</span>
        <div class="member-main">${avatar(settlement.to)}<div><strong>${escapeHtml(settlement.to.name)}</strong><div class="muted">Receive</div></div></div>
      </div>
      <p class="muted">${escapeHtml(settlement.from.name)} pays ${escapeHtml(settlement.to.name)} ${money(settlement.amount, trip.currency)}</p>
      <div class="inline-actions">
        <button class="${settlement.status === "Paid" ? "secondary-button" : "settlement-button"}" data-action="toggle-settlement" data-id="${settlement.id}">${settlement.status === "Paid" ? "Mark pending" : "Mark as paid"}</button>
      </div>
    </article>`;
}

function screenHeader(title, copy, kicker, action = "") {
  return `<div class="screen-header"><div><div class="screen-kicker">${kicker}</div><h2>${title}</h2><p class="muted">${copy}</p></div><div class="actions-row">${action}</div></div>`;
}

function field(label, name, type, value, required, step = "") {
  return `<div class="field"><label for="${name}">${label}</label><input id="${name}" name="${name}" type="${type}" value="${escapeHtml(value || "")}" ${required ? "required" : ""} ${step ? `step="${step}" min="0"` : ""}></div>`;
}

function avatar(member) {
  const index = Math.abs(hashCode(member.id || member.name)) % avatarColors.length;
  return `<span class="avatar small" style="background:${avatarColors[index]}">${escapeHtml((member.name || "?").slice(0, 2).toUpperCase())}</span>`;
}

function empty(copy, actionLabel, targetRoute, action) {
  return `<div class="empty-state"><div><h3>${copy}</h3><p class="muted">TripSplit keeps the math tidy so the trip stays fun.</p><button class="primary-button" data-route="${targetRoute}" data-action="${action}">${actionLabel}</button></div></div>`;
}

function splitTypeLabel(type) {
  if (type === "custom") return "Custom amount split";
  if (type === "percentage") return "Percentage split";
  return "Equal split";
}

function hashCode(value) {
  return String(value).split("").reduce((hash, char) => (hash << 5) - hash + char.charCodeAt(0), 0);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function bindEvents() {
  document.querySelectorAll("[data-route]").forEach((button) => {
    button.addEventListener("click", () => setRoute(button.dataset.route));
  });

  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", (event) => handleAction(event, button.dataset.action, button.dataset.id));
  });

  const tripForm = document.querySelector("#trip-form");
  if (tripForm) tripForm.addEventListener("submit", saveTrip);

  const memberForm = document.querySelector("#member-form");
  if (memberForm) {
    hydrateMemberForm(memberForm);
    memberForm.addEventListener("submit", saveMember);
  }

  const expenseForm = document.querySelector("#expense-form");
  if (expenseForm) {
    expenseForm.addEventListener("submit", saveExpense);
    expenseForm.querySelector("#splitType")?.addEventListener("change", () => {
      const trip = activeTrip();
      const temp = formExpense(expenseForm, trip, true);
      expenseForm.querySelector("#split-values").innerHTML = splitValueInputs(trip, temp);
    });
  }
}

function handleAction(event, action, itemId) {
  if (action === "demo") {
    activeTripId = demoTrip.id;
    if (!state.trips.some((trip) => trip.id === demoTrip.id)) state.trips.unshift(demoTrip);
    saveState();
    setRoute("dashboard");
    return;
  }

  if (action === "new-member") {
    editingMemberId = null;
    showMemberForm = true;
    render();
    document.querySelector("#member-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  if (action === "cancel-member") {
    editingMemberId = null;
    showMemberForm = false;
    render();
    return;
  }

  if (action === "edit-member") {
    editingMemberId = itemId;
    showMemberForm = true;
    render();
    document.querySelector("#member-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  if (action === "delete-member") {
    deleteMember(itemId);
    return;
  }

  if (action === "new-expense") {
    editingExpenseId = null;
    showExpenseForm = true;
    route = "expenses";
    render();
    document.querySelector("#expense-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  if (action === "cancel-expense") {
    editingExpenseId = null;
    showExpenseForm = false;
    render();
    return;
  }

  if (action === "edit-expense") {
    editingExpenseId = itemId;
    showExpenseForm = true;
    render();
    document.querySelector("#expense-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  if (action === "delete-expense") {
    deleteExpense(itemId);
    return;
  }

  if (action === "toggle-settlement") {
    toggleSettlement(itemId);
    return;
  }

  if (action === "share") {
    shareTrip();
  }
}

function saveTrip(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const trip = {
    id: id("trip"),
    name: form.get("name").trim(),
    destination: form.get("destination").trim(),
    startDate: form.get("startDate"),
    endDate: form.get("endDate"),
    currency: form.get("currency"),
    members: [],
    expenses: [],
    paidSettlements: [],
  };
  state.trips.unshift(trip);
  activeTripId = trip.id;
  saveState();
  route = "members";
  render();
  showToast("Trip created. Add your friends next.");
}

function hydrateMemberForm(form) {
  const trip = activeTrip();
  const member = trip.members.find((item) => item.id === editingMemberId);
  form.name.value = member ? member.name : "";
  form.contact.value = member ? member.contact : "";
}

function saveMember(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const trip = activeTrip();
  const name = form.get("name").trim();
  const contact = form.get("contact").trim();
  if (!name) return;

  const members = editingMemberId
    ? trip.members.map((member) => (member.id === editingMemberId ? { ...member, name, contact } : member))
    : [...trip.members, { id: id("member"), name, contact }];
  editingMemberId = null;
  showMemberForm = false;
  updateTrip({ members });
  showToast("Member saved.");
}

function deleteMember(memberId) {
  const trip = activeTrip();
  const used = trip.expenses.some((expense) => expense.paidBy === memberId || expense.participants.includes(memberId));
  if (used) {
    showToast("This member is used in expenses. Delete or edit those expenses first.");
    return;
  }
  if (!confirm("Remove this member from the trip?")) return;
  updateTrip({ members: trip.members.filter((member) => member.id !== memberId) });
}

function saveExpense(event) {
  event.preventDefault();
  const trip = activeTrip();
  if (!trip.members.length) {
    showToast("Add members before saving expenses.");
    setRoute("members");
    return;
  }
  const expense = formExpense(event.currentTarget, trip);
  const validation = validateExpense(expense);
  if (validation) {
    showToast(validation);
    return;
  }
  const expenses = editingExpenseId
    ? trip.expenses.map((item) => (item.id === editingExpenseId ? { ...expense, id: editingExpenseId } : item))
    : [...trip.expenses, { ...expense, id: id("expense") }];
  editingExpenseId = null;
  showExpenseForm = false;
  updateTrip({ expenses, paidSettlements: [] });
  showToast("Expense saved and balances updated.");
}

function formExpense(formNode, trip, loose = false) {
  const form = new FormData(formNode);
  const participants = form.getAll("participants");
  const splitType = form.get("splitType") || "equal";
  const splits = trip.members.reduce((acc, member) => {
    acc[member.id] = Number(form.get(`split-${member.id}`)) || 0;
    return acc;
  }, {});
  return {
    title: (form.get("title") || "").trim(),
    amount: Number(form.get("amount")) || 0,
    paidBy: form.get("paidBy"),
    date: form.get("date"),
    category: form.get("category") || "Other",
    splitType,
    participants: loose && !participants.length ? trip.members.map((member) => member.id) : participants,
    splits,
    notes: (form.get("notes") || "").trim(),
  };
}

function validateExpense(expense) {
  if (!expense.title) return "Give the expense a title.";
  if (expense.amount <= 0) return "Enter an amount greater than zero.";
  if (!expense.paidBy) return "Choose who paid.";
  if (!expense.participants.length) return "Select at least one member to split with.";
  if (expense.splitType === "custom") {
    const total = expense.participants.reduce((sum, memberId) => sum + Number(expense.splits[memberId] || 0), 0);
    if (Math.abs(total - expense.amount) > 0.01) return "Custom split amounts must add up to the expense amount.";
  }
  if (expense.splitType === "percentage") {
    const total = expense.participants.reduce((sum, memberId) => sum + Number(expense.splits[memberId] || 0), 0);
    if (Math.abs(total - 100) > 0.01) return "Percentage split must add up to 100%.";
  }
  return "";
}

function deleteExpense(expenseId) {
  if (!confirm("Delete this expense? Balances will update immediately.")) return;
  const trip = activeTrip();
  updateTrip({ expenses: trip.expenses.filter((expense) => expense.id !== expenseId), paidSettlements: [] });
  showToast("Expense deleted.");
}

function toggleSettlement(settlementId) {
  const trip = activeTrip();
  const paidSettlements = trip.paidSettlements.includes(settlementId)
    ? trip.paidSettlements.filter((idValue) => idValue !== settlementId)
    : [...trip.paidSettlements, settlementId];
  updateTrip({ paidSettlements });
}

async function shareTrip() {
  const payload = encodeSharePayload(activeTrip());
  const url = `${location.origin}${location.pathname}#share=${payload}`;
  try {
    await navigator.clipboard.writeText(url);
    showToast("Share link copied. Friends can open the same trip data.");
  } catch {
    prompt("Copy this share link", url);
  }
}

function bootFromHash() {
  const shareMatch = location.hash.match(/share=([^&]+)/);
  if (shareMatch) {
    const sharedTrip = decodeSharePayload(shareMatch[1]);
    if (sharedTrip) {
      const importedTrip = { ...sharedTrip, id: sharedTrip.id || id("trip") };
      state.trips = [importedTrip, ...state.trips.filter((trip) => trip.id !== importedTrip.id)];
      activeTripId = importedTrip.id;
      route = "dashboard";
      saveState();
      history.replaceState(null, "", `${location.pathname}#trip=${activeTripId}`);
      return;
    }
  }
  const match = location.hash.match(/trip=([^&]+)/);
  if (match && state.trips.some((trip) => trip.id === match[1])) {
    activeTripId = match[1];
    route = "dashboard";
  }
}

function encodeSharePayload(trip) {
  const json = JSON.stringify(trip);
  return btoa(unescape(encodeURIComponent(json))).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function decodeSharePayload(payload) {
  try {
    const normalized = payload.replaceAll("-", "+").replaceAll("_", "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    return JSON.parse(decodeURIComponent(escape(atob(padded))));
  } catch (error) {
    console.warn("Could not load shared TripSplit link", error);
    return null;
  }
}

bootFromHash();
render();
