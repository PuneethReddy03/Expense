from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from config import Config
from .extensions import db, jwt
from .migrations import run_migrations


def create_app():
    load_dotenv()
    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)
    jwt.init_app(app)
    origins = [origin.strip() for origin in app.config["FRONTEND_ORIGIN"].split(",") if origin.strip()]
    CORS(app, resources={r"/api/*": {"origins": origins}})

    from .routes.auth import auth_bp
    from .routes.user import user_bp
    from .routes.admin import admin_bp
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(user_bp, url_prefix="/api/user")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")

    @app.errorhandler(404)
    def not_found(_error):
        return jsonify(error="Resource not found"), 404

    @app.cli.command("upgrade-db")
    def upgrade_db():
        """Create missing tables and apply pending versioned migrations."""
        with app.app_context():
            db.create_all()
            run_migrations(db.engine)
        print("Database schema is up to date.")

    return app
