import { Plus } from "lucide-react";

export default function TransactionEditor({ form, setForm, editingId, onSubmit, onCancel }) {
  return (
    <div className="panel form-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Quick entry</span>
          <h3>{editingId ? "Edit transaction" : "Add transaction"}</h3>
        </div>
      </div>
      <form onSubmit={onSubmit} noValidate>
        <label>Title<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Groceries or salary" /></label>
        <label>Amount<input required min="0.01" step="0.01" type="number" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} placeholder="0.00" /></label>
        <label>Type<select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value, category: event.target.value === "income" ? "Salary" : "Food" })}><option value="expense">Expense</option><option value="income">Income</option></select></label>
        <label>Category<input required value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} /></label>
        <label>Date<input required type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></label>
        <label>Notes <span className="optional-label">Optional</span><textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Add a note about this transaction" rows="3" /></label>
        <button className="primary-button">{editingId ? "Update transaction" : "Save transaction"} <Plus size={16} /></button>
        {editingId && <button type="button" className="secondary-button" onClick={onCancel}>Cancel edit</button>}
      </form>
    </div>
  );
}
