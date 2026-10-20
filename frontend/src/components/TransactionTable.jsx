import Pagination from "./Pagination.jsx";

export default function TransactionTable({ items, error, search, onSearch, onEdit, onDelete, page, pages, total, onPageChange }) {
  return (
    <div className="panel table-panel">
      <div className="panel-heading">
        <div><span className="eyebrow">Your records</span><h3>Recent activity</h3></div>
        <input className="search" value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search title" />
      </div>
      {error && <div className="form-error">{error}</div>}
      <div className="table-wrap">
        <table>
          <thead><tr><th>Title</th><th>Type</th><th>Category</th><th>Date</th><th>Amount</th><th /></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td><strong>{item.title}</strong><small>{item.paymentMethod || "Unspecified"}{item.notes ? ` · ${item.notes}` : ""}</small></td>
                <td>{item.type}</td><td>{item.category}</td><td>{item.date}</td>
                <td className={item.type === "income" ? "money-in" : "money-out"}>{item.type === "income" ? "+" : "-"}₹{Number(item.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                <td><div className="row-actions"><button className="text-button" onClick={() => onEdit(item)}>Edit</button><button className="text-button" onClick={() => onDelete(item.id)}>Delete</button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!items.length && <div className="empty">No transactions match this view.</div>}
      </div>
      <Pagination page={page} pages={pages} total={total} onChange={onPageChange} />
    </div>
  );
}
