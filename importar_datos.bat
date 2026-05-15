@echo off
echo Importando datos a la base de datos...
echo.
cd backend
echo [INFO] Aplicando migraciones (creando tablas si no existen)...
alembic upgrade head
if errorlevel 1 (
    echo ERROR: Fallo alembic upgrade head. Verifica que PostgreSQL este corriendo.
    pause
    exit /b 1
)
echo.
python import_data.py
if errorlevel 1 (
    echo ERROR: Fallo la importacion.
    pause
    exit /b 1
)
echo.
echo Listo! Los datos fueron importados correctamente.
pause
