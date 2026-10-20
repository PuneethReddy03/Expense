export default function BudgetWarnings({ budgets }) {
  const warnings = budgets.filter((budget) => budget.percentage >= 80);
  if (!warnings.length) return null;

  return (
    <section className="budget-warnings" aria-label="Budget alerts">
      {warnings.map((budget) => {
        const exceeded = budget.percentage >= 100;
        return (
          <div className={exceeded ? "budget-warning exceeded" : "budget-warning"} role={exceeded ? "alert" : "status"} key={budget.id}>
            <strong>{exceeded ? "Budget limit reached" : "Budget nearly reached"}</strong>
            <span>{budget.category}: {budget.percentage}% used ({exceeded ? "over budget" : "80% or more used"}).</span>
          </div>
        );
      })}
    </section>
  );
}
