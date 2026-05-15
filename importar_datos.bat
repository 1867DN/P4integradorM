@echo off
echo Importando datos a la base de datos...
echo (La DB y las tablas ya deben existir - corre run.bat primero si no lo hiciste)
echo.
cd backend
call .venv\Scripts\activate.bat
python import_data.py
if errorlevel 1 (
    echo ERROR: Fallo la importacion.
    pause
    exit /b 1
)
echo.
echo Listo! Los datos fueron importados correctamente.
pause
