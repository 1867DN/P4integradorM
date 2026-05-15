@echo off
echo Exportando datos de la base de datos...
cd backend
call .venv\Scripts\activate.bat
python export_data.py
if errorlevel 1 (
    echo ERROR: Fallo la exportacion. Fijate que el venv este creado y la DB corra.
    pause
    exit /b 1
)
echo.
echo Listo! Se genero data_export.json en la carpeta raiz del proyecto.
pause
