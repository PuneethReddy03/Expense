import os
import re
from getpass import getpass
from werkzeug.security import generate_password_hash
from app import create_app
from app.extensions import db
from app.models import User


def strong(password):
    return len(password) >= 12 and re.search(r"[A-Z]", password) and re.search(r"[a-z]", password) and re.search(r"\d", password)

app = create_app()
with app.app_context():
    email = os.getenv("ADMIN_EMAIL")
    password = os.getenv("ADMIN_PASSWORD")
    if not email:
        email = input("Admin email: ").strip().lower()
    if not password:
        password = getpass("Admin password (12+ chars, upper/lower/number): ")
    if not strong(password):
        raise SystemExit("Admin password must be 12+ characters and contain uppercase, lowercase, and a number.")
    if User.query.filter_by(role="admin").first():
        raise SystemExit("An admin account already exists.")
    if User.query.filter_by(email=email).first():
        raise SystemExit("That email is already registered.")
    db.session.add(User(name="Administrator", email=email, password_hash=generate_password_hash(password), role="admin"))
    db.session.commit()
    print("Admin account created.")
