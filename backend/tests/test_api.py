import os
import sys
from pathlib import Path

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import create_app
from app.extensions import db
from app.models import User
from sqlalchemy import inspect, text
from werkzeug.security import generate_password_hash


def create_test_app():
    app = create_app()
    with app.app_context():
        db.create_all()
    return app


def test_schema_is_initialized_only_by_explicit_upgrade_command():
    app = create_app()
    with app.app_context():
        assert not inspect(db.engine).has_table("user")
        db.create_all()
        db.session.execute(text("ALTER TABLE user DROP COLUMN bank_balance_paise"))
        db.session.execute(text("ALTER TABLE user DROP COLUMN bank_balance_initialized"))
        db.session.commit()

    result = app.test_cli_runner().invoke(args=["upgrade-db"])
    assert result.exit_code == 0
    with app.app_context():
        assert inspect(db.engine).has_table("user")
        assert inspect(db.engine).has_table("schema_migrations")
        user_columns = {column["name"] for column in inspect(db.engine).get_columns("user")}
        assert "bank_balance_paise" in user_columns
        assert "bank_balance_initialized" in user_columns


def test_balance_migration_preserves_existing_nonzero_balance_as_initialized():
    app = create_test_app()
    with app.app_context():
        user = User(name="Existing", email="existing@example.com", password_hash="hash", bank_balance_paise=73100)
        db.session.add(user)
        db.session.commit()
        db.session.execute(text("ALTER TABLE user DROP COLUMN bank_balance_initialized"))
        db.session.commit()

    result = app.test_cli_runner().invoke(args=["upgrade-db"])
    assert result.exit_code == 0
    with app.app_context():
        user = User.query.filter_by(email="existing@example.com").one()
        assert user.bank_balance_paise == 73100
        assert user.bank_balance_initialized is True


def test_registration_login_and_dashboard():
    app = create_test_app()
    client = app.test_client()
    response = client.post("/api/auth/register", json={"name": "Test User", "email": "test@example.com", "password": "StrongPass123"})
    assert response.status_code == 201
    response = client.post("/api/auth/login", json={"email": "test@example.com", "password": "StrongPass123"})
    assert response.status_code == 200
    token = response.get_json()["accessToken"]
    headers = {"Authorization": f"Bearer {token}"}
    response = client.post("/api/user/transactions", headers=headers, json={"title": "Lunch", "amount": "125.50", "category": "Food", "date": "2026-10-19", "type": "expense"})
    assert response.status_code == 201
    response = client.get("/api/user/dashboard", headers=headers)
    assert response.status_code == 200
    assert response.get_json()["summary"]["totalExpenses"] == 125.5


def test_manual_bank_balance_is_separate_from_tracked_balance():
    app = create_test_app()
    client = app.test_client()
    client.post("/api/auth/register", json={"name": "Balance User", "email": "balance@example.com", "password": "StrongPass123"})
    login = client.post("/api/auth/login", json={"email": "balance@example.com", "password": "StrongPass123"}).get_json()
    headers = {"Authorization": f"Bearer {login['accessToken']}"}

    assert client.get("/api/user/bank-balance", headers=headers).get_json()["bankBalance"] == 0
    assert client.get("/api/user/bank-balance", headers=headers).get_json()["initialized"] is False
    invalid_type = client.post("/api/user/transactions", headers=headers, json={
        "title": "Unsupported", "amount": 10, "category": "Other", "date": "2026-10-19", "type": "transfer",
    })
    assert invalid_type.status_code == 400
    assert client.get("/api/user/bank-balance", headers=headers).get_json()["bankBalance"] == 0
    updated = client.put("/api/user/bank-balance", headers=headers, json={"amount": "4120.55"})
    assert updated.status_code == 200
    assert updated.get_json()["bankBalance"] == 4120.55
    assert updated.get_json()["initialized"] is True
    assert client.put("/api/user/bank-balance", headers=headers, json={"amount": "-1"}).status_code == 400
    assert client.put("/api/user/bank-balance", headers=headers, json={"amount": "1.001"}).status_code == 400

    expense = client.post("/api/user/transactions", headers=headers, json={
        "title": "Lunch", "amount": 20, "category": "Food", "date": "2026-10-19", "type": "expense",
    }).get_json()["transaction"]
    summary = client.get("/api/user/dashboard", headers=headers).get_json()["summary"]
    assert summary["balance"] == -20
    assert summary["bankBalance"] == 4100.55

    income = client.post("/api/user/transactions", headers=headers, json={
        "title": "Refund", "amount": 100, "category": "Other", "date": "2026-10-19", "type": "income",
    }).get_json()["transaction"]
    assert client.get("/api/user/bank-balance", headers=headers).get_json()["bankBalance"] == 4200.55

    client.put(f"/api/user/transactions/{expense['id']}", headers=headers, json={
        "title": "Lunch", "amount": 30, "category": "Food", "date": "2026-10-19", "type": "expense",
    })
    assert client.get("/api/user/bank-balance", headers=headers).get_json()["bankBalance"] == 4190.55
    client.delete(f"/api/user/transactions/{expense['id']}", headers=headers)
    assert client.get("/api/user/bank-balance", headers=headers).get_json()["bankBalance"] == 4220.55
    assert income["type"] == "income"


def test_transaction_and_statement_pagination():
    app = create_test_app()
    client = app.test_client()
    client.post("/api/auth/register", json={"name": "Page User", "email": "page@example.com", "password": "StrongPass123"})
    login = client.post("/api/auth/login", json={"email": "page@example.com", "password": "StrongPass123"}).get_json()
    headers = {"Authorization": f"Bearer {login['accessToken']}"}
    for index in range(3):
        response = client.post("/api/user/transactions", headers=headers, json={
            "title": f"Purchase {index}", "amount": 10 + index, "category": "Food",
            "date": f"2026-10-{19 - index:02d}", "type": "expense",
        })
        assert response.status_code == 201

    transactions = client.get("/api/user/transactions?page=2&per_page=2", headers=headers).get_json()
    assert len(transactions["items"]) == 1
    assert (transactions["page"], transactions["pages"], transactions["total"]) == (2, 2, 3)

    statement = client.get("/api/user/reports?period=monthly&statement_page=2&statement_per_page=2", headers=headers).get_json()
    assert len(statement["transactions"]) == 1
    assert (statement["statementPage"], statement["statementPages"], statement["statementTotal"]) == (2, 2, 3)


def test_income_transaction_is_counted_as_income():
    app = create_test_app()
    client = app.test_client()
    client.post("/api/auth/register", json={"name": "Income User", "email": "income@example.com", "password": "StrongPass123"})
    response = client.post("/api/auth/login", json={"email": "income@example.com", "password": "StrongPass123"})
    headers = {"Authorization": f"Bearer {response.get_json()['accessToken']}"}

    response = client.post("/api/user/transactions", headers=headers, json={"title": "Salary", "amount": "2000", "category": "Salary", "date": "2026-10-19", "type": "income"})
    assert response.status_code == 201
    assert response.get_json()["transaction"]["type"] == "income"

    dashboard = client.get("/api/user/dashboard", headers=headers).get_json()
    assert dashboard["summary"]["totalIncome"] == 2000
    assert dashboard["summary"]["totalExpenses"] == 0


def test_budget_adjustment_updates_budget_without_dashboard_income():
    app = create_test_app()
    client = app.test_client()
    client.post("/api/auth/register", json={"name": "Budget Income User", "email": "budget-income@example.com", "password": "StrongPass123"})
    response = client.post("/api/auth/login", json={"email": "budget-income@example.com", "password": "StrongPass123"})
    headers = {"Authorization": f"Bearer {response.get_json()['accessToken']}"}
    budget = client.post("/api/user/budgets", headers=headers, json={"category": "Travel", "amount": 5000, "date": "2026-10-25", "month": 10, "year": 2026}).get_json()["budget"]

    response = client.patch(f"/api/user/budgets/{budget['id']}/adjust", headers=headers, json={"amount": 1000})
    assert response.status_code == 200
    assert response.get_json()["budget"]["amount"] == 6000
    assert client.get("/api/user/dashboard", headers=headers).get_json()["summary"]["totalIncome"] == 0


def test_budget_category_matching_is_case_insensitive():
    app = create_test_app()
    client = app.test_client()
    client.post("/api/auth/register", json={"name": "Category User", "email": "category@example.com", "password": "StrongPass123"})
    response = client.post("/api/auth/login", json={"email": "category@example.com", "password": "StrongPass123"})
    headers = {"Authorization": f"Bearer {response.get_json()['accessToken']}"}
    budget = client.post("/api/user/budgets", headers=headers, json={"category": "TRIP", "amount": 5000, "date": "2026-10-25", "month": 10, "year": 2026}).get_json()["budget"]
    response = client.post("/api/user/transactions", headers=headers, json={"title": "Taxi", "amount": 250, "category": "trip", "date": "2026-10-19", "type": "expense"})
    assert response.status_code == 201
    item = client.get("/api/user/budgets?month=10&year=2026", headers=headers).get_json()["items"][0]
    assert item["id"] == budget["id"]
    assert item["spent"] == 250


def test_income_transaction_increases_matching_budget():
    app = create_test_app()
    client = app.test_client()
    client.post("/api/auth/register", json={"name": "Budget Transaction User", "email": "budget-transaction@example.com", "password": "StrongPass123"})
    response = client.post("/api/auth/login", json={"email": "budget-transaction@example.com", "password": "StrongPass123"})
    headers = {"Authorization": f"Bearer {response.get_json()['accessToken']}"}
    budget = client.post("/api/user/budgets", headers=headers, json={"category": "TRIP", "amount": 5000, "date": "2026-10-25", "month": 10, "year": 2026}).get_json()["budget"]
    client.post("/api/user/transactions", headers=headers, json={"title": "Travel funding", "amount": 1000, "category": "trip", "date": "2026-10-19", "type": "income"})
    item = client.get("/api/user/budgets?month=10&year=2026", headers=headers).get_json()["items"][0]
    assert item["id"] == budget["id"]
    assert item["amount"] == 6000


def test_public_registration_cannot_create_admin():
    app = create_test_app()
    client = app.test_client()
    response = client.post("/api/auth/register", json={"name": "Not Admin", "email": "notadmin@example.com", "password": "StrongPass123", "role": "admin"})
    assert response.status_code == 201
    with app.app_context():
        user = User.query.filter_by(email="notadmin@example.com").one()
        assert user.role == "user"


def test_user_cannot_access_admin_api():
    app = create_test_app()
    client = app.test_client()
    client.post("/api/auth/register", json={"name": "Regular User", "email": "regular@example.com", "password": "StrongPass123"})
    response = client.post("/api/auth/login", json={"email": "regular@example.com", "password": "StrongPass123"})
    token = response.get_json()["accessToken"]
    response = client.get("/api/admin/dashboard", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403


def test_admin_can_view_and_delete_selected_user():
    app = create_test_app()
    client = app.test_client()
    with app.app_context():
        admin = User(name="Admin", email="test-admin@example.com", password_hash=generate_password_hash("StrongPass123"), role="admin")
        db.session.add(admin)
        db.session.commit()
    client.post("/api/auth/register", json={"name": "Selected User", "email": "selected@example.com", "password": "StrongPass123"})
    selected_login = client.post("/api/auth/login", json={"email": "selected@example.com", "password": "StrongPass123"}).get_json()
    selected_headers = {"Authorization": f"Bearer {selected_login['accessToken']}"}
    for index in range(3):
        client.post("/api/user/transactions", headers=selected_headers, json={
            "title": f"Record {index}", "amount": 25, "category": "Food",
            "date": f"2026-10-{19 - index:02d}", "type": "expense",
        })
    response = client.post("/api/auth/login", json={"email": "test-admin@example.com", "password": "StrongPass123"})
    headers = {"Authorization": f"Bearer {response.get_json()['accessToken']}"}
    selected = client.get("/api/admin/users", headers=headers).get_json()["items"]
    selected_id = next(item["id"] for item in selected if item["email"] == "selected@example.com")
    response = client.get(f"/api/admin/users/{selected_id}", headers=headers)
    assert response.status_code == 200
    assert response.get_json()["user"]["email"] == "selected@example.com"
    transactions = client.get("/api/admin/transactions?page=2&per_page=2&search=Selected", headers=headers).get_json()
    assert len(transactions["items"]) == 1
    assert (transactions["page"], transactions["pages"], transactions["total"]) == (2, 2, 3)
    response = client.delete(f"/api/admin/users/{selected_id}", headers=headers)
    assert response.status_code == 200
