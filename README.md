# 🍔 Food Store

Sistema de gestión de pedidos de comida — Trabajo Práctico Integrador  
**Stack:** React 19 + TypeScript · FastAPI · PostgreSQL · SQLModel

---

## Índice

- [Descripción](#descripción)
- [Funcionalidades implementadas](#funcionalidades-implementadas)
- [Stack tecnológico](#stack-tecnológico)
- [Arquitectura](#arquitectura)
- [Requisitos previos](#requisitos-previos)
- [Instalación y setup](#instalación-y-setup)
- [Credenciales de acceso](#credenciales-de-acceso)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Endpoints principales](#endpoints-principales)
- [Roles del sistema](#roles-del-sistema)
- [Variables de entorno](#variables-de-entorno)

---

## Descripción

Food Store es una aplicación web full-stack para la gestión integral de un negocio de comidas. Permite a los clientes explorar el catálogo, gestionar un carrito de compras y realizar pedidos con pago integrado via MercadoPago. Los administradores gestionan el catálogo, el stock, los pedidos y los usuarios desde un panel centralizado.

---

## Funcionalidades implementadas

### Autenticación y autorización
- JWT con access token (15 min) + refresh token (7 días) con rotación por UUID
- Login con Google OAuth
- RBAC con 4 roles: `ADMIN`, `STOCK`, `PEDIDOS`, `CLIENT`
- Rutas protegidas en frontend (`ProtectedRoute`)

### Categorías
- CRUD completo con validaciones
- **Árbol de categorías**: cada categoría puede tener una categoría padre (`parent_id`), visible como badge en la tabla y asignable desde el formulario
- **Borrado lógico**: baja con `deleted_at`, pestaña "Inactivos" con contador y botón "Reactivar"
- Búsqueda por nombre en tiempo real (URL state)
- Paginación del lado del servidor
- **Exportar a Excel** (ID, Nombre, Descripción, Categoría Padre, Creado en)

### Ingredientes
- CRUD completo con validaciones
- Filtros por nombre y tipo alérgeno (URL state)
- **Borrado lógico**: pestaña "Inactivos" con botón "Reactivar"
- **Exportar a Excel**
- **Importar desde Excel** con plantilla descargable y reporte de errores por fila

### Productos
- CRUD completo con categorías e ingredientes asociados
- Búsqueda por nombre en tiempo real (URL state)
- **Borrado lógico**: pestaña "Inactivos" con botón "Reactivar"
- **Exportar a Excel** (ID, Nombre, Descripción, Precio, Stock, Disponible, Creado en)
- Toggle de disponibilidad
- Formulario de creación: **sin ingredientes duplicados** (los ya seleccionados desaparecen de los otros dropdowns)

### UI / UX
- Diseño uniforme en las tres secciones: barra de filtros con búsqueda, botones Excel y limpiar filtros en la misma fila
- Paginación con URL state (el estado sobrevive recarga y navegación)
- Feedback visual: spinners, estados vacíos, mensajes de error del servidor

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Estilos | Tailwind CSS 4 |
| Estado servidor | TanStack Query v5 |
| Estado cliente | Zustand v5 |
| HTTP client | fetch API nativo con headers JWT |
| Backend | FastAPI + Python 3.11+ |
| ORM | SQLModel |
| Base de datos | PostgreSQL 15 |
| Migraciones | Alembic |
| Autenticación | JWT HS256 (access 15min + refresh 7 dias con rotacion UUID) |
| Rate limiting | slowapi |
| Export / Import Excel | openpyxl |

---

## Arquitectura

El backend sigue una arquitectura **feature-first** con capas estrictas:

```
Router → Service → UnitOfWork → Repository → Model
```

Cada módulo contiene sus propios archivos `model.py`, `schemas.py`, `repository.py`, `service.py` y `router.py`. Ninguna capa importa de una capa superior.

El frontend sigue **Feature-Sliced Design** con separación estricta entre estado del servidor (TanStack Query) y estado del cliente (Zustand).

---

## Requisitos previos

| Herramienta | Versión mínima | Descarga |
|---|---|---|
| Python | 3.11+ | https://www.python.org/downloads |
| Node.js | 18+ | https://nodejs.org |
| PostgreSQL | 15+ | https://www.postgresql.org/download |

---

## Instalación y setup

### 1. Clonar el repositorio

```bash
git clone https://github.com/AxelMejias/Prgo-4-Magni.git
cd Prgo-4-Magni
git checkout Integrador
```

### 2. Base de datos

Abrí pgAdmin o psql y creá la base de datos:

```sql
CREATE DATABASE foodstore_db;
```

### 3. Backend

Todos los comandos desde la carpeta `backend/`.

```bash
cd backend
```

**Crear y activar el entorno virtual:**

```bash
# Windows (PowerShell)
python -m venv .venv
.venv\Scripts\Activate.ps1

# Mac / Linux
python -m venv .venv
source .venv/bin/activate
```

**Instalar dependencias:**

```bash
pip install -r requirements.txt
```

**Configurar la base de datos:**

Editá `app/core/config.py` y cambiá la contraseña de PostgreSQL:

```python
DATABASE_URL: str = "postgresql://postgres:TU_CONTRASEÑA@localhost:5432/foodstore_db"
```

**Correr migraciones:**

```bash
alembic upgrade head
```

**Cargar datos iniciales:**

```bash
python -m app.db.seed
```

**Iniciar el servidor:**

```bash
uvicorn main:app --reload
```

El backend queda disponible en:
- API: http://localhost:8000
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### 4. Frontend

Abrí una **nueva terminal** (sin cerrar el backend).

```bash
cd frontend
npm install
npm run dev
```

El frontend queda disponible en: http://localhost:5173

---

## Credenciales de acceso

| Rol | Email | Contraseña |
|---|---|---|
| Administrador | admin@foodstore.com | Admin1234! |

> El usuario administrador se crea automáticamente al correr el seed. Nuevos usuarios que se registran desde la pantalla de login reciben el rol CLIENT automáticamente.

---

## Estructura del proyecto

```
Prgo-4-Magni/
├── backend/
│   ├── main.py                  # Entry point FastAPI
│   ├── requirements.txt
│   ├── alembic/                 # Migraciones de base de datos
│   │   └── versions/
│   └── app/
│       ├── core/                # Infraestructura compartida
│       │   ├── config.py
│       │   ├── database.py
│       │   ├── security.py
│       │   ├── dependencies.py  # get_current_user, require_role
│       │   ├── links.py         # Tablas pivot N:N
│       │   ├── base_repository.py
│       │   └── unit_of_work.py
│       ├── db/
│       │   └── seed.py          # Datos iniciales
│       └── modules/             # Arquitectura feature-first
│           ├── auth/            # Login, registro, Google OAuth, JWT + refresh
│           ├── categorias/      # CRUD + parent_id (arbol) + soft delete + export Excel
│           ├── ingredientes/    # CRUD + soft delete + export/import Excel
│           ├── productos/       # CRUD + soft delete + export Excel + disponibilidad
│           ├── pedidos/         # FSM de pedidos (en desarrollo)
│           ├── pagos/           # MercadoPago (en desarrollo)
│           ├── direcciones/     # Direcciones de entrega (en desarrollo)
│           ├── admin/           # Dashboard métricas (en desarrollo)
│           └── usuarios/        # Gestión usuarios (en desarrollo)
└── frontend/
    └── src/
        ├── components/          # Layout, Modal
        ├── entities/            # Modelos y API por entidad
        ├── features/            # Lógica de features
        ├── pages/               # Páginas por ruta
        ├── services/            # API clients
        ├── shared/
        │   ├── api/             # axiosClient con interceptores JWT
        │   ├── store/           # authStore (Zustand)
        │   └── ui/              # ProtectedRoute
        └── widgets/             # Componentes compuestos
```

---

## Endpoints principales

Todos los endpoints usan el prefijo `/api/v1`.

| Método | Endpoint | Descripción | Rol |
|---|---|---|---|
| POST | /api/v1/auth/register | Registrar usuario | Público |
| POST | /api/v1/auth/login | Iniciar sesión | Público |
| POST | /api/v1/auth/refresh | Renovar token | Público |
| POST | /api/v1/auth/logout | Cerrar sesión | Autenticado |
| GET | /api/v1/auth/me | Usuario actual | Autenticado |
| GET | /api/v1/categorias/ | Listar (paginado, filtro nombre) | Autenticado |
| GET | /api/v1/categorias/inactivos | Listar inactivos (soft deleted) | ADMIN, STOCK |
| GET | /api/v1/categorias/exportar | Exportar Excel | ADMIN, STOCK |
| GET | /api/v1/categorias/{id} | Obtener por ID | Autenticado |
| GET | /api/v1/categorias/{id}/subcategorias | Listar subcategorias | Autenticado |
| POST | /api/v1/categorias/ | Crear categoria (con parent_id) | ADMIN, STOCK |
| PUT | /api/v1/categorias/{id} | Actualizar | ADMIN, STOCK |
| PATCH | /api/v1/categorias/{id}/reactivar | Reactivar (deshacer baja) | ADMIN, STOCK |
| DELETE | /api/v1/categorias/{id} | Baja logica | ADMIN, STOCK |
| GET | /api/v1/ingredientes/ | Listar (paginado, filtros nombre/alergeno) | Autenticado |
| GET | /api/v1/ingredientes/inactivos | Listar inactivos | ADMIN, STOCK |
| GET | /api/v1/ingredientes/exportar | Exportar Excel | ADMIN, STOCK |
| GET | /api/v1/ingredientes/plantilla | Descargar plantilla de importacion | ADMIN, STOCK |
| POST | /api/v1/ingredientes/importar | Importar desde Excel | ADMIN, STOCK |
| POST | /api/v1/ingredientes/ | Crear ingrediente | ADMIN, STOCK |
| PUT | /api/v1/ingredientes/{id} | Actualizar | ADMIN, STOCK |
| PATCH | /api/v1/ingredientes/{id}/reactivar | Reactivar | ADMIN, STOCK |
| DELETE | /api/v1/ingredientes/{id} | Baja logica | ADMIN, STOCK |
| GET | /api/v1/productos/ | Listar (paginado, filtro nombre/disponibilidad) | Autenticado |
| GET | /api/v1/productos/inactivos | Listar inactivos | ADMIN, STOCK |
| GET | /api/v1/productos/exportar | Exportar Excel | ADMIN, STOCK |
| GET | /api/v1/productos/{id} | Obtener con detalle (categorias + ingredientes) | Autenticado |
| POST | /api/v1/productos/ | Crear producto | ADMIN, STOCK |
| PUT | /api/v1/productos/{id} | Actualizar | ADMIN, STOCK |
| PATCH | /api/v1/productos/{id}/disponibilidad | Toggle disponibilidad | ADMIN, STOCK |
| PATCH | /api/v1/productos/{id}/reactivar | Reactivar | ADMIN, STOCK |
| DELETE | /api/v1/productos/{id} | Baja logica | ADMIN, STOCK |

La documentación interactiva completa está en http://localhost:8000/docs

---

## Roles del sistema

| Rol | Código | Permisos |
|---|---|---|
| Administrador | ADMIN | Acceso total al sistema |
| Gestor de Stock | STOCK | Gestión de catálogo e inventario |
| Gestor de Pedidos | PEDIDOS | Gestión del ciclo de vida de pedidos |
| Cliente | CLIENT | Catálogo, carrito y sus propios pedidos |

---

## Variables de entorno

### Backend — `app/core/config.py`

| Variable | Descripción | Default |
|---|---|---|
| DATABASE_URL | Cadena de conexión PostgreSQL | postgresql://postgres:postgres@localhost:5432/foodstore_db |
| SECRET_KEY | Clave para firmar JWT (mín. 32 chars) | — |
| ALGORITHM | Algoritmo JWT | HS256 |
| ACCESS_TOKEN_EXPIRE_MINUTES | Duración del access token | 30 |
| REFRESH_TOKEN_EXPIRE_DAYS | Duración del refresh token | 7 |
| CORS_ORIGINS | Orígenes permitidos | ["http://localhost:5173"] |
| FRONTEND_URL | URL del frontend | http://localhost:5173 |

### Frontend — `frontend/.env`

| Variable | Descripción |
|---|---|
| VITE_API_URL | URL base del backend (http://localhost:8000) |

---

## Comandos de referencia rápida

```bash
# Arrancar backend (Windows)
cd backend
.venv\Scripts\Activate.ps1
uvicorn main:app --reload

# Arrancar frontend
cd frontend
npm run dev

# Correr migraciones
cd backend && alembic upgrade head

# Cargar datos iniciales
cd backend && python -m app.db.seed

# Ver estado de migraciones
cd backend && alembic current
```
