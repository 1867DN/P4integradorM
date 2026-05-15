"""
Exporta todos los datos de la DB a data_export.json (en esta misma carpeta).
Uso: python export_data.py   (desde la carpeta backend/, con el venv activado)
"""
import json
from decimal import Decimal
from datetime import datetime
from pathlib import Path
from sqlmodel import Session, text
from app.core.database import engine

OUTPUT = Path(__file__).parent / "data_export.json"


def serialize(value):
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, datetime):
        return value.isoformat()
    return value


def fetch_table(session: Session, table: str) -> list[dict]:
    rows = session.exec(text(f"SELECT * FROM {table} ORDER BY id")).all()
    if not rows:
        return []
    keys = rows[0]._fields
    return [{k: serialize(v) for k, v in zip(keys, row)} for row in rows]


def fetch_pivot(session: Session, table: str) -> list[dict]:
    rows = session.exec(text(f"SELECT * FROM {table}")).all()
    if not rows:
        return []
    keys = rows[0]._fields
    return [{k: serialize(v) for k, v in zip(keys, row)} for row in rows]


def main():
    with Session(engine) as session:
        data = {
            "categorias": fetch_table(session, "categoria"),
            "ingredientes": fetch_table(session, "ingrediente"),
            "productos": fetch_table(session, "producto"),
            "producto_categoria": fetch_pivot(session, "producto_categoria"),
            "producto_ingrediente": fetch_pivot(session, "producto_ingrediente"),
        }

    OUTPUT.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"Exportado en: {OUTPUT}")
    print(f"  Categorias:          {len(data['categorias'])}")
    print(f"  Ingredientes:        {len(data['ingredientes'])}")
    print(f"  Productos:           {len(data['productos'])}")
    print(f"  Producto-Categoria:  {len(data['producto_categoria'])}")
    print(f"  Producto-Ingrediente:{len(data['producto_ingrediente'])}")


if __name__ == "__main__":
    main()
