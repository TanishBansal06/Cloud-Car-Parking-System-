@echo off
title CloudPark Backend Service
echo ===================================================
echo   Starting CloudPark Spring Boot Backend Service
echo ===================================================
cd backend
call mvnw.cmd spring-boot:run
pause
