import { useCallback, useEffect, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  NavLink,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import axios from "axios";
import {
  ArrowUpRight,
  BarChart3,
  CircleDollarSign,
  Eye,
  EyeOff,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Receipt,
  Trash2,
  TrendingDown,
  TrendingUp,
  UserMinus,
  Users,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useConfirmation } from "./components/Dialogs.jsx";
import Pagination from "./components/Pagination.jsx";
import BudgetWarnings from "./components/BudgetWarnings.jsx";
import TransactionEditor from "./components/TransactionEditor.jsx";
import TransactionTable from "./components/TransactionTable.jsx";
import { ThemeModeControl, ThemeProvider } from "./components/ThemeMode.jsx";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});
function localDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("expenseToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

function Shell({ user, children }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const admin = user.role === "admin";
  const links = admin
    ? [
        ["/admin/dashboard", "Overview", LayoutDashboard],
        ["/admin/users", "People", Users],
        ["/admin/transactions", "Transactions", Receipt],
        ["/admin/settings", "Settings", Users],
      ]
    : [
        ["/user/dashboard", "Overview", LayoutDashboard],
        ["/user/transactions", "Transactions", Receipt],
        ["/user/budgets", "Budgets", CircleDollarSign],
        ["/user/reports", "Reports", BarChart3],
        ["/user/settings", "Settings", Users],
      ];
  function logout() {
    sessionStorage.removeItem("expenseToken");
    navigate("/login");
  }
  return (
    <div className="app-shell">
      <aside className={open ? "sidebar open" : "sidebar"}>
        <div className="brand">
          <span className="brand-mark">₹</span>
          <span>ledgerly</span>
        </div>
        <button className="close-nav" onClick={() => setOpen(false)}>
          <X size={18} />
        </button>
        <nav>
          {links.map(([to, label, Icon]) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="profile">
            <div className="avatar">{user.name.slice(0, 1).toUpperCase()}</div>
            <div>
              <strong>{user.name}</strong>
              <small>{admin ? "Administrator" : "Personal account"}</small>
            </div>
          </div>
          <button className="logout" onClick={logout}>
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <button className="menu-button" onClick={() => setOpen(true)}>
            <Menu size={20} />
          </button>
          <span className="crumb">
            {admin ? "Admin workspace" : "Personal workspace"}
          </span>
          <div className="top-actions">
            <ThemeModeControl />
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}

function AuthPage({ register = false }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { notify, dialog } = useConfirmation();
  async function submit(event) {
    event.preventDefault();
    if ((register && form.name.trim().length < 2) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) || form.password.length < 8) {
      await notify("Enter a valid email and a password of at least 8 characters. Names must contain at least 2 characters.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post(
        register ? "/auth/register" : "/auth/login",
        form,
      );
      if (register) navigate("/login");
      else {
        sessionStorage.setItem("expenseToken", data.accessToken);
        window.location.assign(
          data.user.role === "admin" ? "/admin/dashboard" : "/user/dashboard",
        );
      }
    } catch (err) {
      setError(
        err.response?.data?.error || "Something went wrong. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <div className="auth-art">
        <div className="art-copy">
          <div className="brand">
            <span className="brand-mark">₹</span>
            <span>ledgerly</span>
          </div>
          <h1>A clearer view of your money.</h1>
          <p>
            Bring your everyday spending, goals, and momentum into one calm
            place.
          </p>
          <div className="art-stat">
            <span>Monthly clarity</span>
            <strong>86%</strong>
            <div className="meter">
              <i />
            </div>
          </div>
        </div>
      </div>
      <div className="auth-panel">
        <div className="auth-theme">
          <ThemeModeControl />
        </div>
        <div className="auth-form">
          <span className="eyebrow">
            {register ? "Create your account" : "Welcome back"}
          </span>
          <h2>
            {register
              ? "Start tracking with intention."
              : "Your finances, in focus."}
          </h2>
          <p className="muted">
            {register
              ? "Set up your personal workspace in a minute."
              : "Sign in to continue to your workspace."}
          </p>
          <form onSubmit={submit} noValidate>
            {register && (
              <label>
                Full name
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Puneeth"
                />
              </label>
            )}
            <label>
              Email address
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
              />
            </label>
            <label>
              Password
              <div className="password-field">
                <input
                  required
                  minLength="8"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  placeholder="8+ characters"
                />
                <button
                  type="button"
                  className="password-toggle"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </label>
            {error && <div className="form-error">{error}</div>}
            <button className="primary-button" disabled={busy}>
              {busy
                ? "Please wait..."
                : register
                  ? "Create account"
                  : "Sign in"}
              <ArrowUpRight size={17} />
            </button>
          </form>
          <p className="switch-auth">
            {register ? "Already have an account?" : "New to ledgerly?"}{" "}
            <button onClick={() => navigate(register ? "/login" : "/register")}>
              {register ? "Sign in" : "Create account"}
            </button>
          </p>
        </div>
      </div>
      {dialog}
    </div>
  );
}

function Protected({ user, role, children }) {
  if (!sessionStorage.getItem("expenseToken"))
    return <Navigate to="/login" replace />;
  if (!user)
    return <div className="loading-screen">Checking your session...</div>;
  if (user.role !== role)
    return <Navigate to={`/${user.role}/dashboard`} replace />;
  return children;
}

function Dashboard({ user }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [showBankSetup, setShowBankSetup] = useState(false);
  const [bankBalanceInput, setBankBalanceInput] = useState("");
  const [savingBankBalance, setSavingBankBalance] = useState(false);
  const { notify, dialog } = useConfirmation();
  useEffect(() => {
    api
      .get(user.role === "admin" ? "/admin/dashboard" : "/user/dashboard")
      .then((res) => {
        setData(res.data);
        const skippedKey = `bankBalanceSetupSkipped:${user.id}`;
        if (user.role === "user" && !res.data.summary.bankBalanceInitialized && !sessionStorage.getItem(skippedKey)) {
          setBankBalanceInput("");
          setShowBankSetup(true);
        }
      })
      .catch((err) =>
        setError(err.response?.data?.error || "Could not load dashboard."),
      );
  }, [user.id, user.role]);
  useEffect(() => {
    const hour = new Date().getHours();
    const greeting =
      hour < 12
        ? "Good morning"
        : hour < 18
          ? "Good afternoon"
          : "Good evening";
    const heading = document.querySelector(".page-heading h1");
    if (heading)
      heading.textContent = `${greeting}, ${user.role === "admin" ? "Admin" : user.name.split(" ")[0]}.`;
  }, [user]);
  async function saveStartingBankBalance(event) {
    event.preventDefault();
    if (!/^\d+(\.\d{1,2})?$/.test(bankBalanceInput)) {
      await notify("Enter a non-negative balance with no more than 2 decimal places.");
      return;
    }
    setSavingBankBalance(true);
    try {
      const { data: balanceData } = await api.put("/user/bank-balance", { amount: bankBalanceInput });
      setData((current) => ({
        ...current,
        summary: { ...current.summary, bankBalance: balanceData.bankBalance, bankBalanceInitialized: true },
      }));
      sessionStorage.removeItem(`bankBalanceSetupSkipped:${user.id}`);
      setShowBankSetup(false);
      setError("");
    } catch (err) {
      setError(err.response?.data?.error || "Could not update bank balance.");
    } finally {
      setSavingBankBalance(false);
    }
  }
  function skipBankSetup() {
    sessionStorage.setItem(`bankBalanceSetupSkipped:${user.id}`, "true");
    setShowBankSetup(false);
  }
  const summary = data?.summary || {};
  const cards =
    user.role === "admin"
      ? [
          ["Registered users", summary.users, Users, "number"],
          ["Recorded income", summary.income, TrendingUp, "money"],
          ["Recorded expenses", summary.expenses, TrendingDown, "money"],
          ["Transactions", summary.transactions, Receipt, "number"],
        ]
      : [
          ["Total income", summary.totalIncome, TrendingUp, "money"],
          ["Total expenses", summary.totalExpenses, TrendingDown, "money"],
          ["Ledger balance", summary.balance, CircleDollarSign, "money"],
          ["Bank balance estimate", summary.bankBalance, CircleDollarSign, "money"],
          ["Monthly savings", summary.monthlySavings, ArrowUpRight, "money"],
        ];
  return (
    <Shell user={user}>
      <section className="page-heading">
        <div>
          <span className="eyebrow">
            {user.role === "admin" ? "Application pulse" : "Personal workspace"}
          </span>
          <h1>
            {user.role === "admin"
              ? "Good morning, Admin."
              : `Good morning, ${user.name.split(" ")[0]}.`}
          </h1>
          <p className="muted">
            Here is what is happening with your finances today.
          </p>
        </div>
        <button
          className="primary-button compact"
          onClick={() =>
            navigate(
              user.role === "admin"
                ? "/admin/transactions"
                : "/user/transactions",
            )
          }
        >
          <Plus size={17} />
          {user.role === "admin" ? "View transactions" : "Add transaction"}
        </button>
      </section>
      {error && <div className="form-error">{error}</div>}
      <div className="metrics">
        {cards.map(([label, value, Icon, kind]) => (
          <div className="metric-card" key={label}>
            <div className="metric-top">
              <span>{label}</span>
              <Icon size={18} />
            </div>
            <strong>
              {kind === "money"
                ? `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                : Number(value || 0).toLocaleString("en-IN")}
            </strong>
            <small>
              <span className="positive">+ 8.4%</span> from last month
            </small>
            {label === "Bank balance estimate" && (
              <button className="text-button metric-action" onClick={() => setShowBankSetup(true)}>
                {summary.bankBalanceInitialized ? "Update balance" : "Set starting balance"}
              </button>
            )}
          </div>
        ))}
      </div>
      {user.role === "user" && (
        <div className="dashboard-grid">
          <div className="panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">This month</span>
                <h3>Spending by category</h3>
              </div>
              <span className="panel-kicker">Expenses</span>
            </div>
            {data?.categorySpending?.length ? (
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={data.categorySpending}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={72}
                      outerRadius={100}
                      paddingAngle={3}
                    >
                      {data.categorySpending.map((_, i) => (
                        <Cell
                          key={i}
                          fill={
                            [
                              "#dc6b4f",
                              "#e9a23b",
                              "#3f8f80",
                              "#8a9a72",
                              "#765b83",
                            ][i % 5]
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v) => `₹${Number(v).toLocaleString("en-IN")}`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="empty">
                Add an expense to see your spending mix.
              </div>
            )}
          </div>
          <div className="panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Latest activity</span>
                <h3>Recent transactions</h3>
              </div>
            </div>
            <div className="activity-list">
              {(data?.recent || []).map((item) => (
                <div className="activity" key={item.id}>
                  <div className={`activity-icon ${item.type}`}>
                    <Receipt size={16} />
                  </div>
                  <div>
                    <strong>{item.title}</strong>
                    <small>
                      {item.category} · {item.date}
                    </small>
                  </div>
                  <b className={item.type}>
                    {item.type === "income" ? "+" : "-"}₹
                    {item.amount.toLocaleString("en-IN")}
                  </b>
                </div>
              ))}
              {!data?.recent?.length && (
                <div className="empty">No transactions yet.</div>
              )}
            </div>
          </div>
        </div>
      )}
      {showBankSetup && (
        <div className="dialog-backdrop">
          <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="bank-balance-title" aria-describedby="bank-balance-description">
            <span className="eyebrow">Starting balance</span>
            <h2 id="bank-balance-title">Enter your bank balance</h2>
            <p id="bank-balance-description">This sets your estimate. Recorded income and expenses will adjust it from this amount.</p>
            <form onSubmit={saveStartingBankBalance} noValidate>
              <label>Bank balance<input autoFocus type="number" inputMode="decimal" min="0" step="0.01" value={bankBalanceInput} onChange={(event) => setBankBalanceInput(event.target.value)} /></label>
              <div className="dialog-actions">
                <button type="button" className="secondary-button" onClick={skipBankSetup}>Skip for now</button>
                <button className="primary-button" disabled={savingBankBalance}>{savingBankBalance ? "Saving..." : "Save balance"}</button>
              </div>
            </form>
          </section>
        </div>
      )}
      {dialog}
    </Shell>
  );
}

function Transactions({ user }) {
  const transactionParams = new URLSearchParams(window.location.search);
  const startingType =
    transactionParams.get("type") === "income" ? "income" : "expense";
  const startingCategory =
    transactionParams.get("category") ||
    (startingType === "income" ? "Salary" : "Food");
  const blankForm = {
    title: "",
    amount: "",
    category: startingCategory,
    date: localDateInputValue(),
    type: startingType,
    paymentMethod: "UPI",
    notes: "",
  };
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(blankForm);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const { confirm, notify, dialog } = useConfirmation();
  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/user/transactions", {
        params: { page, per_page: 10, ...(search ? { search } : {}) },
      });
      setItems(data.items);
      setPages(data.pages);
      setTotal(data.total);
    } catch (err) {
      setError(err.response?.data?.error || "Could not load transactions.");
    }
  }, [page, search]);
  useEffect(() => {
    load();
  }, [load]);
  async function add(event) {
    event.preventDefault();
    setError("");
    if (!form.title.trim() || !form.category.trim() || !form.date || !Number.isFinite(Number(form.amount)) || Number(form.amount) <= 0) {
      await notify("Enter a title, category, valid date, and amount greater than zero.");
      return;
    }
    try {
      if (editingId) await api.put(`/user/transactions/${editingId}`, form);
      else await api.post("/user/transactions", form);
      window.dispatchEvent(new Event("transactions-updated"));
      setForm(blankForm);
      setEditingId(null);
      if (page === 1) await load();
      else setPage(1);
    } catch (err) {
      setError(err.response?.data?.error || "Could not save transaction.");
    }
  }
  function edit(item) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      amount: item.amount,
      category: item.category,
      date: item.date,
      type: item.type,
      paymentMethod: item.paymentMethod || "UPI",
      notes: item.notes || "",
    });
  }
  async function remove(id) {
    if (!(await confirm("Delete this transaction?", "Delete transaction"))) return;
    try {
      await api.delete(`/user/transactions/${id}`);
      if (items.length === 1 && page > 1) setPage(page - 1);
      else await load();
    } catch (err) {
      setError(err.response?.data?.error || "Could not delete transaction.");
    }
  }
  return (
    <Shell user={user}>
      <section className="page-heading">
        <div>
          <span className="eyebrow">Personal ledger</span>
          <h1>Transactions</h1>
          <p className="muted">
            Record income and expenses together in one place.
          </p>
        </div>
      </section>
      <div className="content-grid">
        <TransactionEditor
          form={form}
          setForm={setForm}
          editingId={editingId}
          onSubmit={add}
          onCancel={() => {
            setEditingId(null);
            setForm(blankForm);
          }}
        />
        <TransactionTable
          items={items}
          error={error}
          search={search}
          onSearch={(value) => {
            setSearch(value);
            setPage(1);
          }}
          onEdit={edit}
          onDelete={remove}
          page={page}
          pages={pages}
          total={total}
          onPageChange={setPage}
        />
      </div>
      {dialog}
    </Shell>
  );
}

function Budgets({ user }) {
  const navigate = useNavigate();
  const now = new Date();
  const today = localDateInputValue(now);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({
    category: "Food",
    amount: "",
    date: today,
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  });
  const [error, setError] = useState("");
  const { confirm, notify, dialog } = useConfirmation();
  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/user/budgets", {
        params: { month: form.month, year: form.year },
      });
      setItems(data.items);
    } catch (err) {
      setError(err.response?.data?.error || "Could not load budgets.");
    }
  }, [form.month, form.year]);
  useEffect(() => {
    const refresh = () => load();
    window.addEventListener("transactions-updated", refresh);
    window.addEventListener("focus", refresh);
    const interval = window.setInterval(refresh, 30000);
    load();
    return () => {
      window.removeEventListener("transactions-updated", refresh);
      window.removeEventListener("focus", refresh);
      window.clearInterval(interval);
    };
  }, [load]);
  async function add(event) {
    event.preventDefault();
    if (!form.category.trim() || !form.date || !Number.isFinite(Number(form.amount)) || Number(form.amount) <= 0) {
      await notify("Enter a category, valid deadline, and amount greater than zero.");
      return;
    }
    try {
      await api.post("/user/budgets", form);
      setForm({ ...form, amount: "" });
      await load();
    } catch (err) {
      setError(err.response?.data?.error || "Could not save budget.");
    }
  }
  const [editingId, setEditingId] = useState(null);
  function adjustBudget(id, direction) {
    const item = items.find((entry) => entry.id === id);
    if (item)
      navigate(
        `/user/transactions?type=${direction === "add" ? "income" : "expense"}&category=${encodeURIComponent(item.category)}`,
      );
  }
  async function remove(id) {
    if (!(await confirm("Delete this budget?", "Delete budget"))) return;
    try {
      await api.delete(`/user/budgets/${id}`);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || "Could not delete budget.");
    }
  }
  return (
    <Shell user={user}>
      <section className="page-heading">
        <div>
          <span className="eyebrow">Plan ahead</span>
          <h1>Budgets</h1>
          <p className="muted">Give each category a boundary for the month.</p>
        </div>
      </section>
      <BudgetWarnings budgets={items} />
      <div className="content-grid">
        <div className="panel form-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">New limit</span>
              <h3>Set a budget</h3>
            </div>
          </div>
          <form onSubmit={add} noValidate>
            <label>
              Category
              <input
                required
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </label>
            <label>
              Amount
              <input
                required
                min="0.01"
                step="0.01"
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00"
              />
            </label>
            <label>
              Deadline
              <input
                required
                type="date"
                value={form.date}
                onChange={(e) => {
                  const date = e.target.value;
                  const [year, month] = date.split("-");
                  setForm({
                    ...form,
                    date,
                    year: Number(year),
                    month: Number(month),
                  });
                }}
              />
            </label>
            <button className="primary-button">
              Save budget <Plus size={16} />
            </button>
          </form>
        </div>
        <div className="panel table-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Selected period</span>
              <h3>Budget health</h3>
            </div>
            <input
              className="search"
              type="month"
              value={`${form.year}-${String(form.month).padStart(2, "0")}`}
              onChange={(e) => {
                const [year, month] = e.target.value.split("-");
                setForm({ ...form, year: Number(year), month: Number(month) });
              }}
            />
          </div>
          {error && <div className="form-error">{error}</div>}
          <div className="budget-list">
            {items.map((item) => (
              <div className="budget-row" key={item.id}>
                <div>
                  <strong>{item.category}</strong>
                  <small>
                    ₹{Number(item.spent).toLocaleString("en-IN")} spent of ₹
                    {Number(item.amount).toLocaleString("en-IN")} ·{" "}
                    {item.date || "No deadline"} ·{" "}
                    {item.daysLeft === null
                      ? "No deadline"
                      : item.daysLeft < 0
                        ? "Expired"
                        : item.daysLeft === 0
                          ? "Due today"
                          : `${item.daysLeft} days left`}
                  </small>
                </div>
                <div className="budget-bar">
                  <i style={{ width: `${Math.min(item.percentage, 100)}%` }} />
                </div>
                <span>{item.percentage}%</span>
                <button
                  className="text-button"
                  onClick={() =>
                    setEditingId(editingId === item.id ? null : item.id)
                  }
                >
                  Edit
                </button>
                {editingId === item.id && (
                  <>
                    <button
                      className="text-button"
                      onClick={() => adjustBudget(item.id, "add")}
                    >
                      Add
                    </button>
                    <button
                      className="text-button"
                      onClick={() => adjustBudget(item.id, "less")}
                    >
                      Less
                    </button>
                    <button
                      className="text-button"
                      onClick={() => remove(item.id)}
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            ))}
            {!items.length && (
              <div className="empty">No budgets set for this month.</div>
            )}
          </div>
        </div>
      </div>
      {dialog}
    </Shell>
  );
}

function ReportsLegacy({ user }) {
  const [data, setData] = useState([]);
  const [categories, setCategories] = useState([]);
  useEffect(() => {
    api
      .get("/user/reports")
      .then((res) => {
        setData(res.data.monthly);
        setCategories(res.data.categories || []);
      })
      .catch(() => {
        setData([]);
        setCategories([]);
      });
  }, []);
  const chartData = data.map((row) => ({
    ...row,
    savings: row.income - row.expenses,
  }));
  const totals = chartData.reduce(
    (result, row) => ({
      income: result.income + row.income,
      expenses: result.expenses + row.expenses,
      savings: result.savings + row.savings,
    }),
    { income: 0, expenses: 0, savings: 0 },
  );
  const money = (value) =>
    `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  const savingsRate = totals.income
    ? Math.round((totals.savings / totals.income) * 100)
    : 0;
  const topCategory = categories[0];
  return (
    <Shell user={user}>
      <section className="page-heading">
        <div>
          <span className="eyebrow">Understand the pattern</span>
          <h1>Reports</h1>
          <p className="muted">
            A simple view of where money came from, where it went, and what
            remained.
          </p>
        </div>
      </section>
      {data.length ? (
        <>
          <div className="report-metrics">
            <div className="report-metric income">
              <span>Total income</span>
              <strong>{money(totals.income)}</strong>
              <small>Across the selected records</small>
            </div>
            <div className="report-metric expense">
              <span>Total expenses</span>
              <strong>{money(totals.expenses)}</strong>
              <small>Across the selected records</small>
            </div>
            <div className="report-metric savings">
              <span>Net savings</span>
              <strong>{money(totals.savings)}</strong>
              <small>Income minus expenses</small>
            </div>
          </div>
          <div className="reports-layout">
            <div className="panel chart-panel wide">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">Cash flow</span>
                  <h3>Income compared with expenses</h3>
                </div>
                <span className="panel-kicker">Monthly</span>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e7eee8"
                    vertical={false}
                  />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => money(value)} />
                  <Legend />
                  <Bar
                    dataKey="income"
                    name="Income"
                    fill="#3f8f80"
                    radius={[5, 5, 0, 0]}
                  />
                  <Bar
                    dataKey="expenses"
                    name="Expenses"
                    fill="#dc6b4f"
                    radius={[5, 5, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="panel chart-panel">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">Where it went</span>
                  <h3>Spending by category</h3>
                </div>
              </div>
              {categories.length ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={categories}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={58}
                      outerRadius={88}
                      paddingAngle={3}
                    >
                      {categories.map((_, index) => (
                        <Cell
                          key={index}
                          fill={
                            [
                              "#dc6b4f",
                              "#e9a23b",
                              "#3f8f80",
                              "#8a9a72",
                              "#765b83",
                            ][index % 5]
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => money(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty">No expense categories yet.</div>
              )}
            </div>
            <div className="panel chart-panel insight-panel">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">Quick read</span>
                  <h3>What needs attention</h3>
                </div>
                <span className="panel-kicker">At a glance</span>
              </div>
              <div className="insight-list">
                <div>
                  <span>Savings rate</span>
                  <strong>{savingsRate}%</strong>
                  <small>
                    {totals.savings >= 0
                      ? "You kept money this period"
                      : "Spending is above income"}
                  </small>
                </div>
                <div>
                  <span>Largest category</span>
                  <strong>{topCategory?.name || "No data"}</strong>
                  <small>
                    {topCategory
                      ? `${money(topCategory.value)} spent`
                      : "Add an expense to compare"}
                  </small>
                </div>
                <div>
                  <span>Cash position</span>
                  <strong
                    className={totals.savings >= 0 ? "money-in" : "money-out"}
                  >
                    {totals.savings >= 0 ? "Positive" : "Needs review"}
                  </strong>
                  <small>
                    {totals.savings >= 0
                      ? "Income covers expenses"
                      : "Reduce spending or add income"}
                  </small>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="panel report-panel">
          <div className="empty">
            Add income and expenses to generate your report dashboard.
          </div>
        </div>
      )}
    </Shell>
  );
}

function Reports({ user }) {
  const [report, setReport] = useState({
    monthly: [],
    categories: [],
    transactions: [],
  });
  const [period, setPeriod] = useState("monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statementPage, setStatementPage] = useState(1);
  const [statementPages, setStatementPages] = useState(1);
  const [statementTotal, setStatementTotal] = useState(0);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/user/reports", {
        params: {
          period,
          statement_page: statementPage,
          statement_per_page: 10,
          ...(startDate ? { startDate } : {}),
          ...(endDate ? { endDate } : {}),
        },
      });
      setReport(data);
      setStatementPages(data.statementPages);
      setStatementTotal(data.statementTotal);
      setError("");
    } catch (err) {
      setError(err.response?.data?.error || "Could not load reports.");
    }
  }, [period, startDate, endDate, statementPage]);
  useEffect(() => {
    load();
  }, [load]);
  const chartData = report.monthly.map((row) => ({
    ...row,
    savings: row.income - row.expenses,
  }));
  const totals = chartData.reduce(
    (result, row) => ({
      income: result.income + row.income,
      expenses: result.expenses + row.expenses,
      savings: result.savings + row.savings,
    }),
    { income: 0, expenses: 0, savings: 0 },
  );
  const money = (value) =>
    `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  const savingsRate = totals.income
    ? Math.round((totals.savings / totals.income) * 100)
    : 0;
  const topCategory = report.categories[0];
  return (
    <Shell user={user}>
      <section className="page-heading">
        <div>
          <span className="eyebrow">Understand the pattern</span>
          <h1>Reports</h1>
          <p className="muted">
            Review overall money flow or inspect a specific date range.
          </p>
        </div>
      </section>
      <div className="report-filters panel">
        <label>
          Period
          <select value={period} onChange={(e) => { setPeriod(e.target.value); setStatementPage(1); }}>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </label>
        <label>
          From
          <input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setStatementPage(1); }}
          />
        </label>
        <label>
          To
          <input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setStatementPage(1); }}
          />
        </label>
        <button className="primary-button" onClick={load}>
          Apply filter
        </button>
      </div>
      {error && <div className="form-error">{error}</div>}
      {report.monthly.length ? (
        <>
          <div className="report-metrics">
            <div className="report-metric income">
              <span>Total income</span>
              <strong>{money(totals.income)}</strong>
              <small>
                {report.startDate} to {report.endDate}
              </small>
            </div>
            <div className="report-metric expense">
              <span>Total expenses</span>
              <strong>{money(totals.expenses)}</strong>
              <small>{statementTotal} transactions</small>
            </div>
            <div className="report-metric savings">
              <span>Net savings</span>
              <strong>{money(totals.savings)}</strong>
              <small>{savingsRate}% savings rate</small>
            </div>
          </div>
          <div className="reports-layout">
            <div className="panel chart-panel wide">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">Cash flow</span>
                  <h3>Income compared with expenses</h3>
                </div>
                <span className="panel-kicker">{period}</span>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e7eee8"
                    vertical={false}
                  />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => money(value)} />
                  <Legend />
                  <Bar
                    dataKey="income"
                    name="Income"
                    fill="#3f8f80"
                    radius={[5, 5, 0, 0]}
                  />
                  <Bar
                    dataKey="expenses"
                    name="Expenses"
                    fill="#dc6b4f"
                    radius={[5, 5, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="panel chart-panel">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">Where it went</span>
                  <h3>Spending by category</h3>
                </div>
              </div>
              {report.categories.length ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={report.categories}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={58}
                      outerRadius={88}
                      paddingAngle={3}
                    >
                      {report.categories.map((_, index) => (
                        <Cell
                          key={index}
                          fill={
                            [
                              "#dc6b4f",
                              "#e9a23b",
                              "#3f8f80",
                              "#8a9a72",
                              "#765b83",
                            ][index % 5]
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => money(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty">
                  No expense categories in this range.
                </div>
              )}
            </div>
            <div className="panel chart-panel insight-panel">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">Quick read</span>
                  <h3>What needs attention</h3>
                </div>
                <span className="panel-kicker">At a glance</span>
              </div>
              <div className="insight-list">
                <div>
                  <span>Savings rate</span>
                  <strong>{savingsRate}%</strong>
                  <small>
                    {totals.savings >= 0
                      ? "You kept money this period"
                      : "Spending is above income"}
                  </small>
                </div>
                <div>
                  <span>Largest category</span>
                  <strong>{topCategory?.name || "No data"}</strong>
                  <small>
                    {topCategory
                      ? `${money(topCategory.value)} spent`
                      : "No expenses in this range"}
                  </small>
                </div>
                <div>
                  <span>Cash position</span>
                  <strong
                    className={totals.savings >= 0 ? "money-in" : "money-out"}
                  >
                    {totals.savings >= 0 ? "Positive" : "Needs review"}
                  </strong>
                  <small>
                    {totals.savings >= 0
                      ? "Income covers expenses"
                      : "Reduce spending or add income"}
                  </small>
                </div>
              </div>
            </div>
          </div>
          <div className="panel statement-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Mini statement</span>
                <h3>
                  {report.startDate} to {report.endDate}
                </h3>
              </div>
              <span className="panel-kicker">
                {statementTotal} records
              </span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Category</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {report.transactions.map((item) => (
                    <tr key={item.id}>
                      <td>{item.date}</td>
                      <td>
                        <strong>{item.title}</strong>
                        <small>{item.notes || "No note"}</small>
                      </td>
                      <td>{item.type}</td>
                      <td>{item.category}</td>
                      <td
                        className={
                          item.type === "income" ? "money-in" : "money-out"
                        }
                      >
                        {item.type === "income" ? "+" : "-"}
                        {money(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={statementPage}
              pages={statementPages}
              total={statementTotal}
              onChange={setStatementPage}
            />
          </div>
        </>
      ) : (
        <div className="panel report-panel">
          <div className="empty">No transactions found for this period.</div>
        </div>
      )}
    </Shell>
  );
}

function Settings({ user }) {
  const [name, setName] = useState(user.name);
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const { notify, dialog } = useConfirmation();
  async function saveProfile(event) {
    event.preventDefault();
    if (name.trim().length < 2) {
      await notify("Your name must contain at least 2 characters.");
      return;
    }
    try {
      const { data } = await api.put("/user/profile", { name });
      setName(data.user.name);
      setMessage("Profile updated.");
      setError("");
    } catch (err) {
      setError(err.response?.data?.error || "Could not update profile.");
    }
  }
  async function changePassword(event) {
    event.preventDefault();
    if (!passwords.currentPassword || passwords.newPassword.length < 8) {
      await notify("Enter your current password and a new password of at least 8 characters.");
      return;
    }
    try {
      await api.post("/auth/change-password", passwords);
      setPasswords({ currentPassword: "", newPassword: "" });
      setMessage("Password updated.");
      setError("");
    } catch (err) {
      setError(err.response?.data?.error || "Could not update password.");
    }
  }
  async function exportCsv() {
    const response = await api.get("/user/export/csv", {
      responseType: "blob",
    });
    const url = URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = url;
    link.download = "transactions.csv";
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <Shell user={user}>
      <section className="page-heading">
        <div>
          <span className="eyebrow">Account</span>
          <h1>Settings</h1>
          <p className="muted">Keep your profile and access details current.</p>
        </div>
      </section>
      <div className="settings-grid">
        <div className="panel form-panel">
          <span className="eyebrow">Profile</span>
          <h3>Personal details</h3>
          <form onSubmit={saveProfile} noValidate>
            <label>
              Full name
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label>
              Email
              <input disabled value={user.email} />
            </label>
            <button className="primary-button">Save profile</button>
          </form>
        </div>
        <div className="panel form-panel">
          <span className="eyebrow">Security</span>
          <h3>Change password</h3>
          <form onSubmit={changePassword} noValidate>
            <label>
              Current password
              <input
                required
                type="password"
                value={passwords.currentPassword}
                onChange={(e) =>
                  setPasswords({
                    ...passwords,
                    currentPassword: e.target.value,
                  })
                }
              />
            </label>
            <label>
              New password
              <input
                required
                minLength="8"
                type="password"
                value={passwords.newPassword}
                onChange={(e) =>
                  setPasswords({ ...passwords, newPassword: e.target.value })
                }
              />
            </label>
            <button className="primary-button">Update password</button>
          </form>
          <button className="secondary-button" onClick={exportCsv}>
            Export my CSV
          </button>
        </div>
      </div>
      {message && <div className="success-message">{message}</div>}
      {error && <div className="form-error">{error}</div>}
      {dialog}
    </Shell>
  );
}

function Recurring({ user }) {
  const blank = {
    title: "",
    amount: "",
    category: "Bills and Utilities",
    type: "expense",
    frequency: "monthly",
    startDate: localDateInputValue(),
  };
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const { confirm, notify, dialog } = useConfirmation();
  const load = useCallback(async () => {
    const { data } = await api.get("/user/recurring");
    setItems(data.items);
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  async function save(event) {
    event.preventDefault();
    if (!form.title.trim() || !form.category.trim() || !form.startDate || !Number.isFinite(Number(form.amount)) || Number(form.amount) <= 0) {
      await notify("Enter a title, category, start date, and amount greater than zero.");
      return;
    }
    try {
      if (editingId) await api.put(`/user/recurring/${editingId}`, form);
      else await api.post("/user/recurring", form);
      setForm(blank);
      setEditingId(null);
      setError("");
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Could not save recurring rule.");
    }
  }
  async function toggle(item) {
    await api.patch(`/user/recurring/${item.id}/status`, {
      isActive: !item.isActive,
    });
    load();
  }
  async function remove(item) {
    if (!(await confirm(`Delete recurring rule ${item.title}?`, "Delete recurring rule"))) return;
    await api.delete(`/user/recurring/${item.id}`);
    load();
  }
  function edit(item) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      amount: item.amount,
      category: item.category,
      type: item.type,
      frequency: item.frequency,
      startDate: item.startDate,
    });
  }
  return (
    <Shell user={user}>
      <section className="page-heading">
        <div>
          <span className="eyebrow">Repeat with clarity</span>
          <h1>Recurring</h1>
          <p className="muted">
            Save rules for regular payments and income. Posting remains
            explicit.
          </p>
        </div>
      </section>
      <div className="content-grid">
        <div className="panel form-panel">
          <span className="eyebrow">
            {editingId ? "Edit rule" : "New rule"}
          </span>
          <h3>
            {editingId ? "Update recurring rule" : "Create recurring rule"}
          </h3>
          <form onSubmit={save} noValidate>
            <label>
              Title
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Rent"
              />
            </label>
            <label>
              Amount
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </label>
            <label>
              Type
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </label>
            <label>
              Frequency
              <select
                value={form.frequency}
                onChange={(e) =>
                  setForm({ ...form, frequency: e.target.value })
                }
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </label>
            <label>
              Start date
              <input
                required
                type="date"
                value={form.startDate}
                onChange={(e) =>
                  setForm({ ...form, startDate: e.target.value })
                }
              />
            </label>
            {error && <div className="form-error">{error}</div>}
            <button className="primary-button">
              {editingId ? "Update rule" : "Save rule"} <Plus size={16} />
            </button>
            {editingId && (
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setEditingId(null);
                  setForm(blank);
                }}
              >
                Cancel edit
              </button>
            )}
          </form>
        </div>
        <div className="panel table-panel">
          <span className="eyebrow">Your rules</span>
          <h3>Scheduled patterns</h3>
          <div className="report-list">
            {items.map((item) => (
              <div className="recurring-row" key={item.id}>
                <div>
                  <strong>{item.title}</strong>
                  <small>
                    {item.type} · {item.frequency} · ₹
                    {Number(item.amount).toLocaleString("en-IN")} · starts{" "}
                    {item.startDate}
                  </small>
                </div>
                <span
                  className={item.isActive ? "status-active" : "status-off"}
                >
                  {item.isActive ? "Active" : "Paused"}
                </span>
                <button className="text-button" onClick={() => edit(item)}>
                  Edit
                </button>
                <button
                  className="text-button danger"
                  onClick={() => remove(item)}
                >
                  Delete
                </button>
                <button className="text-button" onClick={() => toggle(item)}>
                  {item.isActive ? "Pause" : "Resume"}
                </button>
              </div>
            ))}
            {!items.length && (
              <div className="empty">No recurring rules yet.</div>
            )}
          </div>
        </div>
      </div>
      {dialog}
    </Shell>
  );
}

function AdminUsers({ user }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const { confirm, dialog } = useConfirmation();
  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/admin/users");
      setItems(
        data.items.filter((item) =>
          `${item.name} ${item.email}`
            .toLowerCase()
            .includes(search.toLowerCase()),
        ),
      );
    } catch (err) {
      setError(err.response?.data?.error || "Could not load users.");
    }
  }, [search]);
  useEffect(() => {
    load();
  }, [load]);
  async function toggle(item) {
    try {
      await api.patch(`/admin/users/${item.id}/status`, {
        isActive: !item.isActive,
      });
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Could not update account.");
    }
  }
  async function remove(item) {
    if (!(await confirm(`Delete ${item.name} and all associated financial records?`, "Delete user")))
      return;
    try {
      await api.delete(`/admin/users/${item.id}`);
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Could not delete user.");
    }
  }
  return (
    <Shell user={user}>
      <section className="page-heading">
        <div>
          <span className="eyebrow">Administration</span>
          <h1>People</h1>
          <p className="muted">
            Review registered accounts and their access status.
          </p>
        </div>
        <input
          className="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setItems(
              items.filter((item) =>
                `${item.name} ${item.email}`
                  .toLowerCase()
                  .includes(e.target.value.toLowerCase()),
              ),
            );
          }}
          placeholder="Search people"
        />
      </section>
      <div className="panel report-panel">
        {error && <div className="form-error">{error}</div>}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.name}</strong>
                    <small>{item.createdAt.slice(0, 10)}</small>
                  </td>
                  <td>{item.email}</td>
                  <td>{item.role}</td>
                  <td>
                    <span
                      className={item.isActive ? "status-active" : "status-off"}
                    >
                      {item.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="icon-button view"
                        aria-label="View user transactions"
                        title="View user transactions"
                        onClick={() =>
                          window.location.assign(`/admin/users/${item.id}`)
                        }
                      >
                        <Eye size={15} />
                      </button>
                      {item.role === "user" && (
                        <>
                          <button
                            className="icon-button"
                            aria-label={
                              item.isActive
                                ? "Deactivate user"
                                : "Activate user"
                            }
                            title={
                              item.isActive
                                ? "Deactivate user"
                                : "Activate user"
                            }
                            onClick={() => toggle(item)}
                          >
                            <UserMinus size={15} />
                          </button>
                          <button
                            className="icon-button danger"
                            aria-label="Delete user"
                            title="Delete user"
                            onClick={() => remove(item)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {dialog}
    </Shell>
  );
}

function AdminUserDetail({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  useEffect(() => {
    api
      .get(`/admin/users/${id}`)
      .then((res) => setData(res.data))
      .catch(() => setData(null));
  }, [id]);
  const total = (rows) =>
    rows.reduce((sum, item) => sum + Number(item.amount), 0);
  return (
    <Shell user={user}>
      <section className="page-heading">
        <div>
          <button
            className="text-button"
            onClick={() => navigate("/admin/users")}
          >
            Back to People
          </button>
          {data && (
            <>
              <span className="eyebrow">Selected user</span>
              <h1>{data.user.name}</h1>
              <p className="muted">
                {data.user.email} · {data.user.isActive ? "Active" : "Inactive"}
              </p>
            </>
          )}
        </div>
      </section>
      {data && (
        <>
          <div className="report-metrics">
            <div className="report-metric income">
              <span>Total income</span>
              <strong>₹{total(data.income).toLocaleString("en-IN")}</strong>
              <small>{data.income.length} records</small>
            </div>
            <div className="report-metric expense">
              <span>Total expenses</span>
              <strong>₹{total(data.expenses).toLocaleString("en-IN")}</strong>
              <small>{data.expenses.length} records</small>
            </div>
            <div className="report-metric savings">
              <span>Budgets</span>
              <strong>{data.budgets.length}</strong>
              <small>Configured limits</small>
            </div>
          </div>
          <div className="panel report-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Private support view</span>
                <h3>Transactions for this user</h3>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Category</th>
                    <th>Date</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.transactions.map((item) => (
                    <tr key={item.id}>
                      <td>{item.title}</td>
                      <td>{item.type}</td>
                      <td>{item.category}</td>
                      <td>{item.date}</td>
                      <td
                        className={
                          item.type === "income" ? "money-in" : "money-out"
                        }
                      >
                        ₹
                        {Number(item.amount).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!data.transactions.length && (
                <div className="empty">This user has no transactions.</div>
              )}
            </div>
          </div>
        </>
      )}
    </Shell>
  );
}

function AdminTransactions({ user }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState(
    new URLSearchParams(window.location.search).get("user") || "",
  );
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/admin/transactions", {
        params: { page, per_page: 10, ...(search ? { search } : {}) },
      });
      setItems(data.items);
      setPages(data.pages);
      setTotal(data.total);
      setError("");
    } catch (err) {
      setError(err.response?.data?.error || "Could not load transactions.");
    }
  }, [page, search]);
  useEffect(() => {
    load();
  }, [load]);
  return (
    <Shell user={user}>
      <section className="page-heading">
        <div>
          <span className="eyebrow">Application records</span>
          <h1>Transactions</h1>
          <p className="muted">
            Inspect financial activity across registered users.
          </p>
        </div>
        <input
          className="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search records"
        />
      </section>
      <div className="panel report-panel">
        {error && <div className="form-error">{error}</div>}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Title</th>
                <th>Type</th>
                <th>Category</th>
                <th>Date</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.user}</strong>
                    <small>{item.email}</small>
                  </td>
                  <td>{item.title}</td>
                  <td>{item.type}</td>
                  <td>{item.category}</td>
                  <td>{item.date}</td>
                  <td
                    className={
                      item.type === "income" ? "money-in" : "money-out"
                    }
                  >
                    ₹
                    {Number(item.amount).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!items.length && (
            <div className="empty">No records match this view.</div>
          )}
        </div>
        <Pagination page={page} pages={pages} total={total} onChange={setPage} />
      </div>
    </Shell>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    function preventNumberStepping(event) {
      const target = event.target;
      if (
        target instanceof HTMLInputElement &&
        target.type === "number" &&
        (event.type === "wheel" || event.key === "ArrowUp" || event.key === "ArrowDown")
      ) {
        event.preventDefault();
      }
    }

    document.addEventListener("wheel", preventNumberStepping, { capture: true, passive: false });
    document.addEventListener("keydown", preventNumberStepping, true);
    return () => {
      document.removeEventListener("wheel", preventNumberStepping, true);
      document.removeEventListener("keydown", preventNumberStepping, true);
    };
  }, []);
  useEffect(() => {
    const token = sessionStorage.getItem("expenseToken");
    if (!token) {
      setChecking(false);
      return;
    }
    api
      .get("/auth/me")
      .then((res) => setUser(res.data.user))
      .catch(() => sessionStorage.removeItem("expenseToken"))
      .finally(() => setChecking(false));
  }, []);
  if (checking)
    return <div className="loading-screen">Checking your session...</div>;
  return (
    <ThemeProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<AuthPage />} />
        <Route path="/register" element={<AuthPage register />} />
        <Route
          path="/user/dashboard"
          element={
            <Protected user={user} role="user">
              <Dashboard user={user} />
            </Protected>
          }
        />
        <Route
          path="/user/transactions"
          element={
            <Protected user={user} role="user">
              <Transactions user={user} />
            </Protected>
          }
        />
        <Route
          path="/user/budgets"
          element={
            <Protected user={user} role="user">
              <Budgets user={user} />
            </Protected>
          }
        />
        <Route
          path="/user/reports"
          element={
            <Protected user={user} role="user">
              <Reports user={user} />
            </Protected>
          }
        />
        <Route
          path="/user/settings"
          element={
            <Protected user={user} role="user">
              <Settings user={user} />
            </Protected>
          }
        />
        <Route
          path="/user/*"
          element={<Navigate to="/user/dashboard" replace />}
        />
        <Route
          path="/admin/dashboard"
          element={
            <Protected user={user} role="admin">
              <Dashboard user={user} />
            </Protected>
          }
        />
        <Route
          path="/admin/users"
          element={
            <Protected user={user} role="admin">
              <AdminUsers user={user} />
            </Protected>
          }
        />
        <Route
          path="/admin/users/:id"
          element={
            <Protected user={user} role="admin">
              <AdminUserDetail user={user} />
            </Protected>
          }
        />
        <Route
          path="/admin/transactions"
          element={
            <Protected user={user} role="admin">
              <AdminTransactions user={user} />
            </Protected>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <Protected user={user} role="admin">
              <Settings user={user} />
            </Protected>
          }
        />
        <Route
          path="/admin/*"
          element={<Navigate to="/admin/dashboard" replace />}
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
