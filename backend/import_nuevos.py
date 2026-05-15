"""
Importa data_nuevos.json a la DB (solo los registros nuevos, no toca los existentes).
Uso: python import_nuevos.py  (desde la carpeta backend/)
"""
import json
import sys
from pathlib import Path
from sqlmodel import Session, text
from app.core.database import engine

INPUT = Path(__file__).parent.parent / "data_nuevos.json"


def insert_rows(session, table: str, rows: list[dict], pk: str = "id"):
    if not rows:
        print(f"  {table}: sin datos, saltando.")
        return
    for row in rows:
        cols = ", ".join(row.keys())
        placeholders = ", ".join(f":{k}" for k in row.keys())
        session.execute(
            text(f"INSERT INTO {table} ({cols}) VALUES ({placeholders}) ON CONFLICT DO NOTHING"),
            row,
        )
    max_id = max(r[pk] for r in rows)
    session.execute(text(f"SELECT setval(pg_get_serial_sequence('{table}', '{pk}'), {max_id})"))
    print(f"  {table}: {len(rows)} filas insertadas (ON CONFLICT DO NOTHING).")


def insert_pivot(session, table: str, rows: list[dict]):
    if not rows:
        print(f"  {table}: sin datos, saltando.")
        return
    for row in rows:
        cols = ", ".join(row.keys())
        placeholders = ", ".join(f":{k}" for k in row.keys())
        session.execute(
            text(f"INSERT INTO {table} ({cols}) VALUES ({placeholders}) ON CONFLICT DO NOTHING"),
            row,
        )
    print(f"  {table}: {len(rows)} filas insertadas (ON CONFLICT DO NOTHING).")


def insert_categorias(session, rows: list[dict]):
    if not rows:
        print("  categoria: sin datos, saltando.")
        return
    existing = session.execute(text("SELECT id FROM categoria"))
    inserted = set(r[0] for r in existing)
    pending = list(rows)
    for _ in range(len(rows) + 1):
        if not pending:
            break
        remaining = []
        for row in pending:
            parent = row.get("parent_id")
            if parent is None or parent in inserted:
                cols = ", ".join(row.keys())
                placeholders = ", ".join(f":{k}" for k in row.keys())
                session.execute(
                    text(f"INSERT INTO categoria ({cols}) VALUES ({placeholders}) ON CONFLICT DO NOTHING"),
                    row,
                )
                inserted.add(row["id"])
            else:
                remaining.append(row)
        pending = remaining
    max_id = max(r["id"] for r in rows)
    session.execute(text(f"SELECT setval(pg_get_serial_sequence('categoria', 'id'), {max_id})"))
    print(f"  categoria: {len(rows)} filas insertadas (ON CONFLICT DO NOTHING).")


def main():
    if not INPUT.exists():
        print(f"Archivo no encontrado: {INPUT}")
        sys.exit(1)

    data = json.loads(INPUT.read_text(encoding="utf-8"))
    print(f"Importando desde: {INPUT}\n")

    with Session(engine) as session:
        insert_categorias(session, data.get("categorias", []))
        insert_rows(session, "ingrediente", data.get("ingredientes", []))
        insert_rows(session, "producto", data.get("productos", []))
        insert_pivot(session, "producto_categoria", data.get("producto_categoria", []))
        insert_pivot(session, "producto_ingrediente", data.get("producto_ingrediente", []))
        session.commit()

    print("\nImportacion completada.")


if __name__ == "__main__":
    main()
