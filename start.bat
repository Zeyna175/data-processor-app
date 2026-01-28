@echo off
echo Demarrage du serveur Flask...
start cmd /k "cd /d c:\Projet Python && python app.py"

echo Attente de 3 secondes...
timeout /t 3 /nobreak > nul

echo Demarrage du serveur Angular...
cd /d "c:\Projet Python\python_Angular"
npm start