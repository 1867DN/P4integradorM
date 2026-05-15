@echo off
title P4Integrador - Food Store
chcp 65001 >nul
setlocal enabledelayedexpansion

set ROOT=%~dp0

echo.
echo ============================================
echo   Food Store - Iniciando proyecto...
echo ============================================
echo.

REM -- 1. Crear .env si no existe --
if not exist "%ROOT%backend\.env" (
    echo [INFO] Creando backend\.env con valores por defecto...
    (
        echo DATABASE_URL=postgresql://postgres:postgres@localhost:5432/foodstore_db
        echo SECRET_KEY=change-this-super-secret-key-min-32-chars-very-secure
        echo ALGORITHM=HS256
        echo ACCESS_TOKEN_EXPIRE_MINUTES=30
        echo REFRESH_TOKEN_EXPIRE_DAYS=7
        echo GOOGLE_CLIENT_ID=294873652507-1bcbqukkqdokhsdv0u76i2pdhhnb19vm.apps.googleusercontent.com
        echo N8N_WEBHOOK_URL=https://akcel11.app.n8n.cloud/webhook/food-store-reset
    ) > "%ROOT%backend\.env"
    echo [OK] backend\.env creado.
    echo.
    echo  AVISO: La contrasena de PostgreSQL en .env es "postgres".
    echo  Si la tuya es distinta, edita backend\.env antes de continuar.
    echo.
    pause
)

REM -- 2. Instalar dependencias Python --
echo [INFO] Verificando dependencias Python...
python -c "import fastapi" >nul 2>&1
if errorlevel 1 (
    echo [INFO] Instalando dependencias Python...
    pip install -r "%ROOT%backend\requirements.txt"
    if errorlevel 1 (
        echo [ERROR] Fallo la instalacion de dependencias Python.
        pause
        exit /b 1
    )
    echo [OK] Dependencias Python instaladas.
) else (
    echo [OK] Dependencias Python ya instaladas.
)

REM -- 3. Instalar dependencias Node --
if not exist "%ROOT%frontend\node_modules" (
    echo [INFO] Instalando dependencias Node...
    pushd "%ROOT%frontend"
    npm install
    popd
    if errorlevel 1 (
        echo [ERROR] Fallo npm install.
        pause
        exit /b 1
    )
    echo [OK] Dependencias Node instaladas.
) else (
    echo [OK] Dependencias Node ya instaladas.
)

REM -- 4. Crear base de datos PostgreSQL si no existe --
echo [INFO] Verificando base de datos PostgreSQL...
pushd "%ROOT%backend"
python init_db.py
if errorlevel 1 (
    echo.
    echo [ERROR] No se pudo conectar a PostgreSQL.
    echo         Verifica que el servicio PostgreSQL este corriendo.
    echo         Luego edita backend\.env con tu DATABASE_URL correcta.
    echo.
    popd
    pause
    exit /b 1
)
popd

REM -- 5. Iniciar backend (FastAPI + uvicorn) --
echo [INFO] Iniciando backend...
start "FoodStore - Backend [8000]" /D "%ROOT%backend" cmd /k "uvicorn main:app --reload"

REM -- 6. Iniciar frontend (Vite + React) --
echo [INFO] Iniciando frontend...
start "FoodStore - Frontend [5173]" /D "%ROOT%frontend" cmd /k "npm run dev"

REM -- 7. Abrir navegador --
echo [INFO] Esperando que los servidores levanten...
timeout /t 8 /nobreak >nul
echo [INFO] Abriendo navegador...
start http://localhost:5173

echo.
echo ============================================
echo   Servidores activos:
echo   Backend  ^>  http://localhost:8000
echo   API Docs ^>  http://localhost:8000/docs
echo   Frontend ^>  http://localhost:5173
echo.
echo   Admin: admin@foodstore.com / Admin1234^!
echo ============================================
echo.
pause
