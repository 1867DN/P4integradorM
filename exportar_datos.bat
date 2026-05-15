@echo off
echo Exportando datos de la base de datos...
cd backend
call .venv\Scripts\activate.bat
python export_data.py
if errorlevel 1 (
    echo ERROR: Fallo la exportacion. Fijate que el backend este configurado y la DB corra.
    pause
    exit /b 1
)
cd ..
echo.
echo Subiendo data_export.json a GitHub...
git add backend/data_export.json
git commit -m "datos: actualizar data_export.json"
git push
echo.
echo Listo! Los datos estan en GitHub.
pause
