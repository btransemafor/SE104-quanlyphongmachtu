@echo off
echo Starting Clinic Management System...
echo.

echo Installing backend dependencies...
npm install

echo Installing frontend dependencies...
cd client
npm install
cd ..

echo.
echo Starting the application...
echo Backend will run on http://localhost:5000
echo Frontend will run on http://localhost:3000
echo.

npm run dev

pause
