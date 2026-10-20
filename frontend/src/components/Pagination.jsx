export default function Pagination({ page, pages, total, onChange }) {
  if (pages <= 1) return null;

  return (
    <nav className="pagination" aria-label="Pagination">
      <span>{total} records · Page {page} of {pages}</span>
      <div>
        <button type="button" className="secondary-button" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page">Previous</button>
        <button type="button" className="secondary-button" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Next page">Next</button>
      </div>
    </nav>
  );
}
