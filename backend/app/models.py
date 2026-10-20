from datetime import date, datetime, timezone
from decimal import Decimal
from .extensions import db


def utcnow():
    return datetime.now(timezone.utc)


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="user")
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)
    last_login_at = db.Column(db.DateTime(timezone=True))
    bank_balance_paise = db.Column(db.Integer, nullable=False, default=0)
    bank_balance_initialized = db.Column(db.Boolean, nullable=False, default=False)
    transactions = db.relationship("Transaction", backref="user", cascade="all, delete-orphan")
    budgets = db.relationship("Budget", backref="user", cascade="all, delete-orphan")


class Transaction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    title = db.Column(db.String(160), nullable=False)
    amount_paise = db.Column(db.Integer, nullable=False)
    type = db.Column(db.String(20), nullable=False, index=True)
    category = db.Column(db.String(80), nullable=False)
    transaction_date = db.Column(db.Date, nullable=False, index=True)
    payment_method = db.Column(db.String(40))
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    def as_dict(self):
        return {
            "id": self.id, "title": self.title, "amount": float(Decimal(self.amount_paise) / 100),
            "type": self.type, "category": self.category, "date": self.transaction_date.isoformat(),
            "paymentMethod": self.payment_method, "notes": self.notes,
        }


class Budget(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    category = db.Column(db.String(80), nullable=False)
    amount_paise = db.Column(db.Integer, nullable=False)
    month = db.Column(db.Integer, nullable=False)
    year = db.Column(db.Integer, nullable=False)
    budget_date = db.Column(db.Date)
    budget_time = db.Column(db.Time)
    __table_args__ = (db.UniqueConstraint("user_id", "category", "month", "year"),)

    def as_dict(self, spent_paise=0):
        amount = float(Decimal(self.amount_paise) / 100)
        spent = float(Decimal(spent_paise) / 100)
        return {"id": self.id, "category": self.category, "amount": amount, "spent": spent,
                "remaining": amount - spent, "percentage": round((spent / amount) * 100, 1) if amount else 0,
            "month": self.month, "year": self.year,
                "date": self.budget_date.isoformat() if self.budget_date else None,
                "daysLeft": (self.budget_date - date.today()).days if self.budget_date else None}


class AuditLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    actor_user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    action = db.Column(db.String(80), nullable=False)
    entity_type = db.Column(db.String(80), nullable=False)
    entity_id = db.Column(db.Integer, nullable=False)
    reason = db.Column(db.String(255))
    timestamp = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)


