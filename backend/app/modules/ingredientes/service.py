"""
Service de Ingredientes.
Regla: NO crea su propio UoW. Recibe `uow` del router.
"""
import math
from datetime import datetime
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError

from app.modules.ingredientes.model import Ingrediente
from app.modules.ingredientes.schemas import (
    IngredienteCreate, IngredienteUpdate, IngredienteResponse, PaginatedIngredientes,
    ImportarResult, ImportErrorRow,
)


def _problem(code: str, detail: str, http_status: int):
    raise HTTPException(
        status_code=http_status,
        detail={"detail": detail, "code": code, "timestamp": datetime.utcnow().isoformat()},
    )


def get_all(
    uow,
    nombre: Optional[str] = None,
    es_alergeno: Optional[bool] = None,
    unidad_medida: Optional[str] = None,
    page: int = 1,
    size: int = 20,
) -> PaginatedIngredientes:
    items, total = uow.ingredientes.get_all(
        nombre=nombre, es_alergeno=es_alergeno, unidad_medida=unidad_medida,
        page=page, size=size,
    )
    return PaginatedIngredientes(
        items=[IngredienteResponse.model_validate(i) for i in items],
        total=total, page=page, size=size,
        pages=math.ceil(total / size) if total else 0,
    )


def get_by_id(uow, ingrediente_id: int) -> IngredienteResponse:
    ingrediente = uow.ingredientes.get_by_id(ingrediente_id)
    if not ingrediente:
        _problem("INGREDIENTE_NOT_FOUND", f"Ingrediente {ingrediente_id} no encontrado", status.HTTP_404_NOT_FOUND)
    return IngredienteResponse.model_validate(ingrediente)


def create(uow, data: IngredienteCreate) -> IngredienteResponse:
    if uow.ingredientes.get_by_nombre_any(data.nombre):
        _problem("NOMBRE_CONFLICT", f"Ya existe un ingrediente '{data.nombre}'", status.HTTP_409_CONFLICT)
    try:
        ingrediente = Ingrediente(**data.model_dump())
        uow.ingredientes.add(ingrediente)
        return IngredienteResponse.model_validate(ingrediente)
    except IntegrityError:
        _problem("NOMBRE_CONFLICT", f"Ya existe un ingrediente '{data.nombre}'", status.HTTP_409_CONFLICT)


def update(uow, ingrediente_id: int, data: IngredienteUpdate) -> IngredienteResponse:
    ingrediente = uow.ingredientes.get_by_id(ingrediente_id)
    if not ingrediente:
        _problem("INGREDIENTE_NOT_FOUND", f"Ingrediente {ingrediente_id} no encontrado", status.HTTP_404_NOT_FOUND)
    changes = data.model_dump(exclude_unset=True)
    if "nombre" in changes and changes["nombre"] != ingrediente.nombre:
        if uow.ingredientes.get_by_nombre_any(changes["nombre"]):
            _problem("NOMBRE_CONFLICT", f"Ya existe un ingrediente '{changes['nombre']}'", status.HTTP_409_CONFLICT)
    for key, value in changes.items():
        setattr(ingrediente, key, value)
    ingrediente.updated_at = datetime.utcnow()
    uow.ingredientes.add(ingrediente)
    return IngredienteResponse.model_validate(ingrediente)


def delete(uow, ingrediente_id: int) -> None:
    ingrediente = uow.ingredientes.get_by_id(ingrediente_id)
    if not ingrediente:
        _problem("INGREDIENTE_NOT_FOUND", f"Ingrediente {ingrediente_id} no encontrado", status.HTTP_404_NOT_FOUND)
    uow.ingredientes.soft_delete(ingrediente)


def get_all_activos_for_export(uow) -> list[IngredienteResponse]:
    return [IngredienteResponse.model_validate(i) for i in uow.ingredientes.get_all_activos()]


def get_inactivos(uow, page: int = 1, size: int = 20) -> PaginatedIngredientes:
    items, total = uow.ingredientes.get_inactivos(page=page, size=size)
    return PaginatedIngredientes(
        items=[IngredienteResponse.model_validate(i) for i in items],
        total=total, page=page, size=size,
        pages=math.ceil(total / size) if total else 0,
    )


def importar_excel(uow, contenido: bytes) -> ImportarResult:
    import openpyxl
    from io import BytesIO

    try:
        wb = openpyxl.load_workbook(BytesIO(contenido), read_only=True, data_only=True)
        ws = wb.active
    except Exception:
        _problem("ARCHIVO_INVALIDO", "El archivo no es un Excel válido (.xlsx)", status.HTTP_422_UNPROCESSABLE_ENTITY)

    creados = 0
    omitidos = 0
    errores: list[ImportErrorRow] = []

    rows = list(ws.iter_rows(min_row=2, values_only=True))
    for idx, row in enumerate(rows, start=2):
        nombre = str(row[0]).strip() if row[0] is not None else ""
        descripcion = str(row[1]).strip() if len(row) > 1 and row[1] is not None else None
        unidad_medida = str(row[2]).strip() if len(row) > 2 and row[2] is not None else ""
        raw_alergeno = row[3] if len(row) > 3 else None

        if not nombre or not unidad_medida:
            errores.append(ImportErrorRow(fila=idx, nombre=nombre or "(vacío)", motivo="Nombre y Unidad de medida son obligatorios"))
            continue

        if len(nombre) < 2:
            errores.append(ImportErrorRow(fila=idx, nombre=nombre, motivo="El nombre debe tener al menos 2 caracteres"))
            continue

        if uow.ingredientes.get_by_nombre_any(nombre):
            omitidos += 1
            continue

        if isinstance(raw_alergeno, bool):
            es_alergeno = raw_alergeno
        elif isinstance(raw_alergeno, str):
            es_alergeno = raw_alergeno.strip().lower() in ("sí", "si", "true", "1", "yes")
        else:
            es_alergeno = False

        try:
            ing = Ingrediente(
                nombre=nombre,
                descripcion=descripcion or None,
                unidad_medida=unidad_medida,
                es_alergeno=es_alergeno,
            )
            uow.ingredientes.add(ing)
            uow.flush()
            creados += 1
        except Exception as e:
            errores.append(ImportErrorRow(fila=idx, nombre=nombre, motivo=str(e)[:120]))

    return ImportarResult(creados=creados, omitidos=omitidos, errores=errores)


def reactivar(uow, ingrediente_id: int) -> IngredienteResponse:
    ingrediente = uow.ingredientes.get_by_id_including_deleted(ingrediente_id)
    if not ingrediente:
        _problem("INGREDIENTE_NOT_FOUND", f"Ingrediente {ingrediente_id} no encontrado", status.HTTP_404_NOT_FOUND)
    if ingrediente.deleted_at is None:
        _problem("INGREDIENTE_ACTIVE", f"Ingrediente {ingrediente_id} ya está activo", status.HTTP_409_CONFLICT)
    uow.ingredientes.reactivar(ingrediente)
    return IngredienteResponse.model_validate(ingrediente)
