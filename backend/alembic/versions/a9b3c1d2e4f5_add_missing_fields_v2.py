"""add_missing_fields_v2

Revision ID: a9b3c1d2e4f5
Revises: f12a04ecf383
Create Date: 2026-05-08 00:00:00.000000

Agrega:
- Producto.stock_cantidad, disponible, deleted_at, precio como NUMERIC(10,2)
- Categoria.deleted_at
- PasswordResetToken table
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
import sqlmodel

revision: str = "a9b3c1d2e4f5"
down_revision: Union[str, None] = "f12a04ecf383"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_exists(table: str, column: str) -> bool:
    bind = op.get_bind()
    result = bind.execute(
        sa.text(
            "SELECT 1 FROM information_schema.columns "
            "WHERE table_name = :t AND column_name = :c"
        ),
        {"t": table, "c": column},
    )
    return result.fetchone() is not None


def _table_exists(table: str) -> bool:
    bind = op.get_bind()
    result = bind.execute(
        sa.text(
            "SELECT 1 FROM information_schema.tables WHERE table_name = :t"
        ),
        {"t": table},
    )
    return result.fetchone() is not None


def upgrade() -> None:
    # ── Producto: nuevos campos ────────────────────────────────────────────────
    if not _column_exists("producto", "stock_cantidad"):
        op.add_column("producto", sa.Column("stock_cantidad", sa.Integer(), nullable=False, server_default="0"))
    if not _column_exists("producto", "disponible"):
        op.add_column("producto", sa.Column("disponible", sa.Boolean(), nullable=False, server_default="true"))
    if not _column_exists("producto", "deleted_at"):
        op.add_column("producto", sa.Column("deleted_at", sa.DateTime(), nullable=True))

    # Convertir precio de FLOAT a NUMERIC(10,2) si hace falta
    bind = op.get_bind()
    row = bind.execute(
        sa.text(
            "SELECT data_type FROM information_schema.columns "
            "WHERE table_name='producto' AND column_name='precio'"
        )
    ).fetchone()
    if row and row[0].lower() in ("double precision", "real", "float"):
        op.alter_column(
            "producto", "precio",
            existing_type=sa.Float(),
            type_=sa.Numeric(10, 2),
            existing_nullable=False,
        )

    # ── Categoria: soft delete ─────────────────────────────────────────────────
    if not _column_exists("categoria", "deleted_at"):
        op.add_column("categoria", sa.Column("deleted_at", sa.DateTime(), nullable=True))

    # ── ProductoIngrediente: es_removible ──────────────────────────────────────
    if not _column_exists("producto_ingrediente", "es_removible"):
        op.add_column(
            "producto_ingrediente",
            sa.Column("es_removible", sa.Boolean(), nullable=False, server_default="true"),
        )

    # ── PasswordResetToken ─────────────────────────────────────────────────────
    if not _table_exists("password_reset_token"):
        op.create_table(
            "password_reset_token",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("usuario_id", sa.Integer(), nullable=False),
            sa.Column("token_hash", sqlmodel.sql.sqltypes.AutoString(length=64), nullable=False),
            sa.Column("expires_at", sa.DateTime(), nullable=False),
            sa.Column("used_at", sa.DateTime(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["usuario_id"], ["usuario.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("token_hash"),
        )


def downgrade() -> None:
    op.drop_table("password_reset_token")
    op.drop_column("producto_ingrediente", "es_removible")
    op.drop_column("categoria", "deleted_at")
    op.alter_column("producto", "precio", existing_type=sa.Numeric(10, 2), type_=sa.Float(), existing_nullable=False)
    op.drop_column("producto", "deleted_at")
    op.drop_column("producto", "disponible")
    op.drop_column("producto", "stock_cantidad")
