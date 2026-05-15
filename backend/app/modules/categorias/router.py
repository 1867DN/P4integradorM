from io import BytesIO
from typing import Annotated, Optional
from fastapi import APIRouter, Depends, Query, Path, status
from fastapi.responses import StreamingResponse
import openpyxl

from app.modules.categorias.schemas import CategoriaCreate, CategoriaUpdate, CategoriaRead, PaginatedCategorias
from app.modules.categorias import service
from app.core.dependencies import require_role
from app.core.unit_of_work import UnitOfWork

router = APIRouter(prefix="/api/v1/categorias", tags=["Categorías"])

_LEER  = Depends(require_role(["ADMIN", "STOCK", "PEDIDOS", "CLIENT"]))
_ADMIN = Depends(require_role(["ADMIN", "STOCK"]))


@router.get("/exportar", summary="Exportar categorías activas a Excel")
def exportar_categorias(_=_ADMIN):
    with UnitOfWork() as uow:
        categorias = service.get_all_activos_for_export(uow)

    # Construir mapa id -> nombre para la columna "Categoría Padre"
    id_to_nombre = {c.id: c.nombre for c in categorias}

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Categorías"
    ws.append(["ID", "Nombre", "Descripción", "Categoría Padre", "Creado en"])
    for cat in categorias:
        ws.append([
            cat.id, cat.nombre, cat.descripcion or "",
            id_to_nombre.get(cat.parent_id, "") if cat.parent_id else "",
            cat.created_at.strftime("%Y-%m-%d %H:%M"),
        ])
    output = BytesIO()
    wb.save(output)
    output.seek(0)
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=categorias.xlsx"},
    )


@router.get("/inactivos", response_model=PaginatedCategorias, summary="Listar categorías inactivas")
def listar_categorias_inactivas(
    page: Annotated[int, Query(ge=1)] = 1,
    size: Annotated[int, Query(ge=1, le=100)] = 20,
    _=_ADMIN,
):
    with UnitOfWork() as uow:
        return service.get_inactivos(uow, page=page, size=size)


@router.get("/", response_model=PaginatedCategorias, summary="Listar categorías")
def listar_categorias(
    nombre: Annotated[Optional[str], Query(max_length=100)] = None,
    page:   Annotated[int, Query(ge=1)] = 1,
    size:   Annotated[int, Query(ge=1, le=100)] = 20,
    _=_LEER,
):
    with UnitOfWork() as uow:
        return service.get_all(uow, nombre=nombre, page=page, size=size)


@router.patch("/{categoria_id}/reactivar", response_model=CategoriaRead, summary="Reactivar categoría")
def reactivar_categoria(categoria_id: Annotated[int, Path(ge=1)], _=_ADMIN):
    with UnitOfWork() as uow:
        return service.reactivar(uow, categoria_id)


@router.get("/{categoria_id}", response_model=CategoriaRead, summary="Obtener categoría por ID")
def obtener_categoria(
    categoria_id: Annotated[int, Path(ge=1)],
    _=_LEER,
):
    with UnitOfWork() as uow:
        return service.get_by_id(uow, categoria_id)


@router.get("/{categoria_id}/subcategorias", response_model=list[CategoriaRead])
def listar_subcategorias(
    categoria_id: Annotated[int, Path(ge=1)],
    _=_LEER,
):
    with UnitOfWork() as uow:
        return service.get_subcategorias(uow, categoria_id)


@router.post("/", response_model=CategoriaRead, status_code=status.HTTP_201_CREATED, summary="Crear categoría")
def crear_categoria(data: CategoriaCreate, _=_ADMIN):
    with UnitOfWork() as uow:
        return service.create(uow, data)


@router.put("/{categoria_id}", response_model=CategoriaRead, summary="Actualizar categoría")
def actualizar_categoria(
    categoria_id: Annotated[int, Path(ge=1)],
    data: CategoriaUpdate,
    _=_ADMIN,
):
    with UnitOfWork() as uow:
        return service.update(uow, categoria_id, data)


@router.delete("/{categoria_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Baja lógica de categoría")
def eliminar_categoria(
    categoria_id: Annotated[int, Path(ge=1)],
    _=_ADMIN,
):
    with UnitOfWork() as uow:
        service.delete(uow, categoria_id)
