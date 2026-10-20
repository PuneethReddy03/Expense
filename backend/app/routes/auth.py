from datetime import datetime, timezone
from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required
from werkzeug.security import check_password_hash, generate_password_hash
from email_validator import validate_email, EmailNotValidError
from ..extensions import db
from ..models import User

auth_bp = Blueprint("auth", __name__)


def user_payload(user):
    return {"id": user.id, "name": user.name, "email": user.email, "role": user.role, "isActive": user.is_active}


@auth_bp.post("/register")
def register():
    data = request.get_json(silent=True) or {}
    name, email, password = str(data.get("name", "")).strip(), str(data.get("email", "")).strip().lower(), data.get("password", "")
    if len(name) < 2 or len(password) < 8:
        return jsonify(error="Name and a password of at least 8 characters are required."), 400
    try:
        email = validate_email(email, check_deliverability=False).normalized
    except EmailNotValidError:
        return jsonify(error="Enter a valid email address."), 400
    if User.query.filter_by(email=email).first():
        return jsonify(error="Unable to register with those details."), 409
    user = User(name=name, email=email, password_hash=generate_password_hash(password), role="user")
    db.session.add(user)
    db.session.commit()
    return jsonify(user=user_payload(user)), 201


@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    user = User.query.filter_by(email=str(data.get("email", "")).strip().lower()).first()
    if not user or not check_password_hash(user.password_hash, data.get("password", "")) or not user.is_active:
        return jsonify(error="Invalid email or password."), 401
    user.last_login_at = datetime.now(timezone.utc)
    db.session.commit()
    return jsonify(accessToken=create_access_token(identity=str(user.id)), user=user_payload(user))


@auth_bp.get("/me")
@jwt_required()
def me():
    user = db.session.get(User, int(get_jwt_identity()))
    if not user or not user.is_active:
        return jsonify(error="Account is inactive."), 401
    return jsonify(user=user_payload(user))


@auth_bp.post("/change-password")
@jwt_required()
def change_password():
    user = db.session.get(User, int(get_jwt_identity()))
    data = request.get_json(silent=True) or {}
    if not user or not check_password_hash(user.password_hash, data.get("currentPassword", "")):
        return jsonify(error="Current password is incorrect."), 400
    if len(data.get("newPassword", "")) < 8:
        return jsonify(error="New password must be at least 8 characters."), 400
    user.password_hash = generate_password_hash(data["newPassword"])
    db.session.commit()
    return jsonify(message="Password updated successfully.")


@auth_bp.post("/logout")
@jwt_required()
def logout():
    return jsonify(message="Signed out successfully.")
