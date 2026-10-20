from datetime import date, datetime, timedelta
from decimal import Decimal, InvalidOperation
import csv
import io
from flask import Blueprint, jsonify, request, Response
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy import func
from ..extensions import db
from ..models import Budget, Transaction, User

user_bp = Blueprint("user", __name__)


def current_user():
    return db.session.get(User, int(get_jwt_identity()))


def amount_paise(value):
    try:
        amount = int(Decimal(str(value)) * 100)
        if amount <= 0: raise InvalidOperation
        return amount
    except (InvalidOperation, ValueError, TypeError):
        return None


def nonnegative_amount_paise(value):
    try:
        amount = Decimal(str(value))
        paise = amount * 100
        if not amount.is_finite() or amount < 0 or paise != paise.to_integral_value():
            return None
        return int(paise)
    except (InvalidOperation, ValueError, TypeError):
        return None


def parse_transaction(data):
    title, category = str(data.get("title", "")).strip(), str(data.get("category", "")).strip()
    transaction_type = data.get("type", "expense")
    amount = amount_paise(data.get("amount"))
    try: transaction_date = date.fromisoformat(data.get("date", ""))
    except (TypeError, ValueError): transaction_date = None
    if not title or not category or not amount or not transaction_date or transaction_type not in ("income", "expense"):
        return None
    return {"title": title, "category": category, "amount_paise": amount, "transaction_date": transaction_date,
            "payment_method": data.get("paymentMethod"), "notes": data.get("notes"), "type": transaction_type}


def transaction_balance_effect(transaction_type, amount_paise):
    return amount_paise if transaction_type == "income" else -amount_paise


@user_bp.get("/profile")
@jwt_required()
def profile():
    user = current_user()
    return jsonify(user={"id": user.id, "name": user.name, "email": user.email, "role": user.role})


@user_bp.put("/profile")
@jwt_required()
def update_profile():
    user = current_user(); data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    if len(name) < 2: return jsonify(error="Name must be at least 2 characters."), 400
    user.name = name; db.session.commit()
    return jsonify(user={"id": user.id, "name": user.name, "email": user.email, "role": user.role})


@user_bp.get("/bank-balance")
@jwt_required()
def get_bank_balance():
    user = current_user()
    return jsonify(bankBalance=user.bank_balance_paise / 100, initialized=user.bank_balance_initialized)


@user_bp.put("/bank-balance")
@jwt_required()
def update_bank_balance():
    amount = nonnegative_amount_paise((request.get_json(silent=True) or {}).get("amount"))
    if amount is None:
        return jsonify(error="Enter a non-negative bank balance with no more than 2 decimal places."), 400
    user = current_user()
    user.bank_balance_paise = amount
    user.bank_balance_initialized = True
    db.session.commit()
    return jsonify(bankBalance=user.bank_balance_paise / 100, initialized=user.bank_balance_initialized)


@user_bp.get("/transactions")
@jwt_required()
def transactions():
    user = current_user(); query = Transaction.query.filter_by(user_id=user.id)
    transaction_type = request.args.get("type")
    if transaction_type in ("income", "expense"): query = query.filter_by(type=transaction_type)
    search = request.args.get("search", "").strip()
    if search: query = query.filter(Transaction.title.ilike(f"%{search}%"))
    try:
        page = max(int(request.args.get("page", 1)), 1)
        per_page = min(max(int(request.args.get("per_page", 10)), 1), 100)
    except (TypeError, ValueError):
        return jsonify(error="Page and page size must be integers."), 400
    pagination = query.order_by(Transaction.transaction_date.desc(), Transaction.id.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    return jsonify(items=[row.as_dict() for row in pagination.items], page=page,
                   perPage=per_page, total=pagination.total, pages=pagination.pages)


@user_bp.post("/transactions")
@jwt_required()
def create_transaction():
    data = request.get_json(silent=True) or {}; values = parse_transaction(data)
    if not values: return jsonify(error="Title, positive amount, category, and valid date are required."), 400
    user = current_user()
    values["user_id"] = user.id
    row = Transaction(**values); db.session.add(row)
    user.bank_balance_paise += transaction_balance_effect(row.type, row.amount_paise)
    if row.type == "income":
        budgets = Budget.query.filter(Budget.user_id == row.user_id, func.lower(Budget.category) == row.category.lower(), Budget.month == row.transaction_date.month, Budget.year == row.transaction_date.year).all()
        for budget in budgets:
            budget.amount_paise += row.amount_paise
    db.session.commit()
    return jsonify(transaction=row.as_dict()), 201


@user_bp.put("/transactions/<int:transaction_id>")
@jwt_required()
def update_transaction(transaction_id):
    user = current_user()
    row = Transaction.query.filter_by(id=transaction_id, user_id=user.id).first()
    if not row: return jsonify(error="Transaction not found."), 404
    values = parse_transaction(request.get_json(silent=True) or {})
    if not values: return jsonify(error="Invalid transaction data."), 400
    user.bank_balance_paise += transaction_balance_effect(values["type"], values["amount_paise"]) - transaction_balance_effect(row.type, row.amount_paise)
    for key, value in values.items(): setattr(row, key, value)
    db.session.commit(); return jsonify(transaction=row.as_dict())


@user_bp.delete("/transactions/<int:transaction_id>")
@jwt_required()
def delete_transaction(transaction_id):
    user = current_user()
    row = Transaction.query.filter_by(id=transaction_id, user_id=user.id).first()
    if not row: return jsonify(error="Transaction not found."), 404
    user.bank_balance_paise -= transaction_balance_effect(row.type, row.amount_paise)
    db.session.delete(row); db.session.commit(); return jsonify(message="Transaction deleted.")


@user_bp.get("/dashboard")
@jwt_required()
def dashboard():
    user = current_user(); rows = Transaction.query.filter_by(user_id=user.id).all()
    income = sum(row.amount_paise for row in rows if row.type == "income")
    expense = sum(row.amount_paise for row in rows if row.type == "expense")
    today = date.today(); monthly = [row for row in rows if row.transaction_date.year == today.year and row.transaction_date.month == today.month]
    monthly_income = sum(row.amount_paise for row in monthly if row.type == "income")
    monthly_expense = sum(row.amount_paise for row in monthly if row.type == "expense")
    categories = {}
    for row in monthly:
        if row.type == "expense": categories[row.category] = categories.get(row.category, 0) + row.amount_paise
    return jsonify(summary={"totalIncome": income / 100, "totalExpenses": expense / 100, "balance": (income-expense)/100,
                            "bankBalance": user.bank_balance_paise / 100,
                            "bankBalanceInitialized": user.bank_balance_initialized,
                            "monthlySavings": (monthly_income-monthly_expense)/100}, categorySpending=[{"name": k, "value": v/100} for k,v in categories.items()], recent=[r.as_dict() for r in sorted(rows, key=lambda item: item.transaction_date, reverse=True)[:6]])


@user_bp.get("/budgets")
@jwt_required()
def budgets():
    user = current_user(); month = int(request.args.get("month", date.today().month)); year = int(request.args.get("year", date.today().year))
    rows = Budget.query.filter_by(user_id=user.id, month=month, year=year).all()
    result = []
    for budget in rows:
        spent = db.session.query(func.coalesce(func.sum(Transaction.amount_paise), 0)).filter(Transaction.user_id == user.id, Transaction.type == "expense", func.lower(Transaction.category) == budget.category.lower(), func.extract("month", Transaction.transaction_date) == month, func.extract("year", Transaction.transaction_date) == year).scalar()
        result.append(budget.as_dict(spent))
    return jsonify(items=result)


@user_bp.post("/budgets")
@jwt_required()
def create_budget():
    data = request.get_json(silent=True) or {}; amount = amount_paise(data.get("amount"))
    try: month, year = int(data.get("month")), int(data.get("year"))
    except (TypeError, ValueError): month, year = 0, 0
    try: budget_date = date.fromisoformat(data.get("date", ""))
    except (TypeError, ValueError): budget_date = None
    if not data.get("category") or not amount or not budget_date or month not in range(1,13) or year < 2000: return jsonify(error="Valid category, amount, date, month, and year are required."), 400
    category = str(data["category"]).strip()
    if Budget.query.filter(Budget.user_id == current_user().id, func.lower(Budget.category) == category.lower(), Budget.month == month, Budget.year == year).first(): return jsonify(error="That budget already exists."), 409
    row = Budget(user_id=current_user().id, category=category, amount_paise=amount, month=month, year=year, budget_date=budget_date); db.session.add(row); db.session.commit()
    return jsonify(budget=row.as_dict()), 201


@user_bp.patch("/budgets/<int:budget_id>/adjust")
@jwt_required()
def adjust_budget(budget_id):
    row = Budget.query.filter_by(id=budget_id, user_id=current_user().id).first()
    try: amount = int(Decimal(str((request.get_json(silent=True) or {}).get("amount"))) * 100)
    except (InvalidOperation, TypeError, ValueError): amount = 0
    if not row:
        return jsonify(error="Budget not found."), 404
    if not amount or row.amount_paise + amount <= 0:
        return jsonify(error="Adjustment must leave a positive budget amount."), 400
    row.amount_paise += amount
    db.session.commit()
    return jsonify(budget=row.as_dict()), 200


@user_bp.delete("/budgets/<int:budget_id>")
@jwt_required()
def delete_budget(budget_id):
    row = Budget.query.filter_by(id=budget_id, user_id=current_user().id).first()
    if not row:
        return jsonify(error="Budget not found."), 404
    db.session.delete(row)
    db.session.commit()
    return jsonify(message="Budget deleted.")


@user_bp.get("/reports")
@jwt_required()
def reports():
    period = request.args.get("period", "monthly")
    today = date.today()
    try: start_date = date.fromisoformat(request.args["startDate"]) if request.args.get("startDate") else None
    except ValueError: start_date = None
    try: end_date = date.fromisoformat(request.args["endDate"]) if request.args.get("endDate") else None
    except ValueError: end_date = None
    if not start_date or not end_date:
        if period == "weekly":
            start_date, end_date = today - timedelta(days=today.weekday()), today
        elif period == "yearly":
            start_date, end_date = date(today.year, 1, 1), today
        else:
            start_date, end_date = date(today.year, today.month, 1), today
    if start_date > end_date: start_date, end_date = end_date, start_date
    try:
        statement_page = max(int(request.args.get("statement_page", 1)), 1)
        statement_per_page = min(max(int(request.args.get("statement_per_page", 10)), 1), 100)
    except (TypeError, ValueError):
        return jsonify(error="Statement page and page size must be integers."), 400
    statement_query = Transaction.query.filter(
        Transaction.user_id == current_user().id,
        Transaction.transaction_date >= start_date,
        Transaction.transaction_date <= end_date,
    ).order_by(Transaction.transaction_date.desc(), Transaction.id.desc())
    statement = statement_query.paginate(page=statement_page, per_page=statement_per_page, error_out=False)
    rows = list(reversed(statement_query.order_by(Transaction.transaction_date.asc(), Transaction.id.asc()).all()))
    by_month = {}
    by_category = {}
    for row in rows:
        key = row.transaction_date.strftime("%Y-%m-%d" if period == "weekly" else "%Y" if period == "yearly" else "%Y-%m")
        by_month.setdefault(key, {"month": key, "income": 0, "expenses": 0})
        by_month[key]["income" if row.type == "income" else "expenses"] += row.amount_paise / 100
        if row.type == "expense":
            by_category[row.category] = by_category.get(row.category, 0) + row.amount_paise / 100
    categories = [{"name": key, "value": value} for key, value in sorted(by_category.items(), key=lambda item: item[1], reverse=True)]
    return jsonify(monthly=list(by_month.values()), categories=categories,
                   transactions=[row.as_dict() for row in statement.items],
                   statementPage=statement_page, statementPerPage=statement_per_page,
                   statementTotal=statement.total, statementPages=statement.pages,
                   startDate=start_date.isoformat(), endDate=end_date.isoformat(), period=period)


@user_bp.get("/export/csv")
@jwt_required()
def export_csv():
    rows = Transaction.query.filter_by(user_id=current_user().id).order_by(Transaction.transaction_date.desc()).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["id", "title", "type", "amount", "category", "date", "payment_method", "notes"])
    for row in rows:
        writer.writerow([row.id, row.title, row.type, f"{row.amount_paise / 100:.2f}", row.category, row.transaction_date.isoformat(), row.payment_method or "", row.notes or ""])
    return Response(output.getvalue(), mimetype="text/csv", headers={"Content-Disposition": "attachment; filename=transactions.csv"})


