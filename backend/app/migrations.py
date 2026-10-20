from sqlalchemy import inspect, text


def run_migrations(engine):
    """Apply small, versioned schema changes without changing existing data."""
    with engine.begin() as connection:
        connection.execute(text("CREATE TABLE IF NOT EXISTS schema_migrations (version VARCHAR(50) PRIMARY KEY)"))
        applied = {row[0] for row in connection.execute(text("SELECT version FROM schema_migrations"))}
        columns = {column["name"] for column in inspect(engine).get_columns("budget")}
        if "budget_dates_v1" not in applied:
            if "budget_date" not in columns:
                connection.execute(text("ALTER TABLE budget ADD COLUMN budget_date DATE"))
            if "budget_time" not in columns:
                connection.execute(text("ALTER TABLE budget ADD COLUMN budget_time TIME"))
            connection.execute(text("INSERT INTO schema_migrations (version) VALUES ('budget_dates_v1')"))
        user_columns = {column["name"] for column in inspect(engine).get_columns("user")}
        if "manual_bank_balance_v1" not in applied:
            if "bank_balance_paise" not in user_columns:
                connection.execute(text("ALTER TABLE user ADD COLUMN bank_balance_paise INTEGER NOT NULL DEFAULT 0"))
            connection.execute(text("INSERT INTO schema_migrations (version) VALUES ('manual_bank_balance_v1')"))
        user_columns = {column["name"] for column in inspect(engine).get_columns("user")}
        if "bank_balance_setup_v1" not in applied:
            if "bank_balance_initialized" not in user_columns:
                connection.execute(text("ALTER TABLE user ADD COLUMN bank_balance_initialized BOOLEAN NOT NULL DEFAULT FALSE"))
            connection.execute(text("UPDATE user SET bank_balance_initialized = TRUE WHERE bank_balance_paise <> 0"))
            connection.execute(text("INSERT INTO schema_migrations (version) VALUES ('bank_balance_setup_v1')"))
        if "bank_balance_existing_balance_v1" not in applied:
            connection.execute(text("UPDATE user SET bank_balance_initialized = TRUE WHERE bank_balance_paise <> 0"))
            connection.execute(text("INSERT INTO schema_migrations (version) VALUES ('bank_balance_existing_balance_v1')"))
