from datetime import date
import csv
import io
from flask import Blueprint, jsonify, request, Response
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy import func, or_
from ..extensions import db
from ..models import AuditLog, Budget, Transaction, User

admin_bp = Blueprint("admin", __name__)


def admin_required(fn):
    from functools import wraps
    @wraps(fn)
    @jwt_required()
    def wrapped(*args, **kwargs):
        user = db.session.get(User, int(get_jwt_identity()))
        if not user or not user.is_active or user.role != "admin": return jsonify(error="Admin access required."), 403
        return fn(*args, **kwargs)
    return wrapped


@admin_bp.get("/dashboard")
@admin_required
def dashboard():
    users = User.query.filter_by(role="user").count()
    income = db.session.query(func.coalesce(func.sum(Transaction.amount_paise), 0)).filter_by(type="income").scalar()
    expense = db.session.query(func.coalesce(func.sum(Transaction.amount_paise), 0)).filter_by(type="expense").scalar()
    return jsonify(summary={"users": users, "income": income / 100, "expenses": expense / 100, "transactions": Transaction.query.count()})


@admin_bp.get("/users")
@admin_required
def users():
    rows = User.query.order_by(User.created_at.desc()).all()
    return jsonify(items=[{"id": u.id, "name": u.name, "email": u.email, "role": u.role, "isActive": u.is_active, "createdAt": u.created_at.isoformat()} for u in rows])


@admin_bp.get("/users/<int:user_id>")
@admin_required
def user_detail(user_id):
    user = db.session.get(User, user_id)
    if not user:
        return jsonify(error="User not found."), 404
    rows = Transaction.query.filter_by(user_id=user.id).order_by(Transaction.transaction_date.desc(), Transaction.id.desc()).all()
    budgets = Budget.query.filter_by(user_id=user.id).order_by(Budget.year.desc(), Budget.month.desc()).all()
    return jsonify(user={"id": user.id, "name": user.name, "email": user.email, "role": user.role, "isActive": user.is_active, "createdAt": user.created_at.isoformat()}, transactions=[row.as_dict() for row in rows], income=[row.as_dict() for row in rows if row.type == "income"], expenses=[row.as_dict() for row in rows if row.type == "expense"], budgets=[budget.as_dict() for budget in budgets])


@admin_bp.get("/transactions")
@admin_required
def transactions():
    query = Transaction.query.join(User)
    search = request.args.get("search", "").strip()
    if search:
        term = f"%{search}%"
        query = query.filter(or_(Transaction.title.ilike(term), Transaction.category.ilike(term), User.name.ilike(term), User.email.ilike(term)))
    try:
        page = max(int(request.args.get("page", 1)), 1)
        per_page = min(max(int(request.args.get("per_page", 10)), 1), 100)
    except (TypeError, ValueError):
        return jsonify(error="Page and page size must be integers."), 400
    pagination = query.order_by(Transaction.transaction_date.desc(), Transaction.id.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    items = [{**row.as_dict(), "user": row.user.name, "email": row.user.email} for row in pagination.items]
    return jsonify(items=items, page=page, perPage=per_page, total=pagination.total, pages=pagination.pages)


@admin_bp.patch("/users/<int:user_id>/status")
@admin_required
def status(user_id):
    user = db.session.get(User, user_id)
    if not user: return jsonify(error="User not found."), 404
    if user.role == "admin": return jsonify(error="Admin accounts cannot be changed here."), 400
    is_active = bool((request.get_json(silent=True) or {}).get("isActive"))
    user.is_active = is_active
    db.session.add(AuditLog(actor_user_id=int(get_jwt_identity()), action="account_status_changed", entity_type="user", entity_id=user.id, reason="Admin account management"))
    db.session.commit()
    return jsonify(isActive=user.is_active)


@admin_bp.delete("/users/<int:user_id>")
@admin_required
def delete_user(user_id):
    actor_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if not user:
        return jsonify(error="User not found."), 404
    if user.id == actor_id:
        return jsonify(error="You cannot delete your own Admin account."), 400
    if user.role == "admin":
        active_admins = User.query.filter_by(role="admin", is_active=True).count()
        if user.is_active and active_admins <= 1:
            return jsonify(error="The last active Admin cannot be deleted."), 400
        return jsonify(error="Admin accounts cannot be deleted here."), 400
    db.session.add(AuditLog(actor_user_id=actor_id, action="user_deleted", entity_type="user", entity_id=user.id, reason="Admin account deletion"))
    db.session.delete(user)
    db.session.commit()
    return jsonify(message="User and associated financial records deleted.")


@admin_bp.get("/export/csv")
@admin_required
def export_csv():
    rows = Transaction.query.order_by(Transaction.transaction_date.desc()).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["id", "user", "email", "title", "type", "amount", "category", "date"])
    for row in rows:
        writer.writerow([row.id, row.user.name, row.user.email, row.title, row.type, f"{row.amount_paise / 100:.2f}", row.category, row.transaction_date.isoformat()])
    return Response(output.getvalue(), mimetype="text/csv", headers={"Content-Disposition": "attachment; filename=application-transactions.csv"})
