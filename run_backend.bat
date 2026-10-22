@echo off
title ProStock Institutional Backend (.NET 10)
echo ===================================================
echo Starting ProStock Backend API and Real-Time Hubs...
echo Port: http://localhost:5000
echo Swagger / OpenAPI: http://localhost:5000/openapi/v1.json
echo ===================================================
dotnet run --project src/ProStock.Api/ProStock.Api.csproj
pause
