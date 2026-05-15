"""
Crea la base de datos PostgreSQL si no existe todavia.
Uso: python init_db.py  (desde la carpeta backend/)
"""
import sys
import os

sys.path.insert(0, os.getcwd())

from urllib.parse import urlparse
from app.core.config import settings


def create_database() -> bool:
    url = urlparse(settings.DATABASE_URL)
    db_name = url.path.lstrip("/")

    try:
        import psycopg2
        from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

        conn = psycopg2.connect(
            dbname="postgres",
            user=url.username,
            password=url.password,
            host=url.hostname,
            port=url.port or 5432,
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()

        cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (db_name,))
        if cur.fetchone() is None:
            cur.execute(f'CREATE DATABASE "{db_name}"')
            print(f"[OK] Base de datos '{db_name}' creada.")
        else:
            print(f"[OK] Base de datos '{db_name}' ya existe.")

        cur.close()
        conn.close()
        return True

    except Exception as e:
        print(f"[ERROR] No se pudo crear la base de datos: {e}")
        print("        Verifica que PostgreSQL este corriendo y que DATABASE_URL en .env sea correcta.")
        return False


if __name__ == "__main__":
    if not create_database():
        sys.exit(1)
