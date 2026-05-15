"""
Importa datos desde data_export.json a la DB.
Uso: python import_data.py   (desde la carpeta backend/, con el venv activado)
El schema ya debe existir (correr alembic upgrade head antes).
"""
import json
from pathlib import Path
from sqlmodel import Session, text
from app.core.database import engine

INPUT = Path(__file__).parent.parent / "data_export.json"


def insert_rows(session: Session, table: str, rows: list[dict], pk: str = "id"):
    if not rows:
        print(f"  {table}: sin datos, saltando.")
        return

    for row in rows:
        cols = ", ".join(row.keys())
        placeholders = ", ".join(f":{k}" for k in row.keys())
        session.exec(
            text(f"INSERT INTO {table} ({cols}) VALUES ({placeholders}) ON CONFLICT DO NOTHING"),
            row,
        )

    max_id = max(r[pk] for r in rows)
    session.exec(text(f"SELECT setval(pg_get_serial_sequence('{table}', '{pk}'), {max_id})"))
    print(f"  {table}: {len(rows)} filas insertadas.")


def insert_pivot(session: Session, table: str, rows: list[dict]):
    if not rows:
        print(f"  {table}: sin datos, saltando.")
        return

    for row in rows:
        cols = ", ".join(row.keys())
        placeholders = ", ".join(f":{k}" for k in row.keys())
        session.exec(
            text(f"INSERT INTO {table} ({cols}) VALUES ({placeholders}) ON CONFLICT DO NOTHING"),
            row,
        )
    print(f"  {table}: {len(rows)} filas insertadas.")


def insert_categorias_ordered(session: Session, rows: list[dict]):
    if not rows:
        print("  categoria: sin datos, saltando.")
        return

    inserted_ids: set[int] = set()
    pending = list(rows)

    for _ in range(len(rows) + 1):
        if not pending:
            break
        remaining = []
        for row in pending:
            parent = row.get("parent_id")
            if parent is None or parent in inserted_ids:
                cols = ", ".join(row.keys())
                placeholders = ", ".join(f":{k}" for k in row.keys())
                session.exec(
                    text(f"INSERT INTO categoria ({cols}) VALUES ({placeholders}) ON CONFLICT DO NOTHING"),
                    row,
                )
                inserted_ids.add(row["id"])
            else:
                remaining.append(row)
        pending = remaining

    if pending:
        print(f"  ADVERTENCIA: {len(pending)} categorias sin parent encontrado.")

    max_id = max(r["id"] for r in rows)
    session.exec(text(f"SELECT setval(pg_get_serial_sequence('categoria', 'id'), {max_id})"))
    print(f"  categoria: {len(rows) - len(pending)} filas insertadas.")


def main():
    if not INPUT.exists():
        print(f"Archivo no encontrado: {INPUT}")
        print("Copiá data_export.json a la carpeta backend/ y volvé a correr.")
        return

    data = json.loads(INPUT.read_text(encoding="utf-8"))
    print(f"Importando desde: {INPUT}\n")

    with Session(engine) as session:
        insert_categorias_ordered(session, data.get("categorias", []))
        insert_rows(session, "ingrediente", data.get("ingredientes", []))
        insert_rows(session, "producto", data.get("productos", []))
        insert_pivot(session, "producto_categoria", data.get("producto_categoria", []))
        insert_pivot(session, "producto_ingrediente", data.get("producto_ingrediente", []))
        session.commit()

    print("\nImportacion completada.")


if __name__ == "__main__":
    main()
