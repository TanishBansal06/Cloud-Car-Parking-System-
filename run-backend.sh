#!/bin/bash
echo "==================================================="
echo "  Starting CloudPark Spring Boot Backend Service"
echo "==================================================="
cd backend
chmod +x mvnw
./mvnw spring-boot:run
