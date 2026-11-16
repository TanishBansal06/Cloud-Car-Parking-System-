# CloudPark — Backend Service 🚗⚙️

The backend of CloudPark is a **Spring Boot 3.3.4** RESTful service built with **Java 21**, **Spring Data JPA (Hibernate)**, and **Spring Security** with stateless **JWT Bearer Token** authentication.

---

## 🌟 Key Features

- **Domain Restriction**: Requires user email registration to end in `@thapar.edu`.
- **1-Slot-Per-Person Policy**: Strictly enforces that a user cannot hold more than one overlapping active booking simultaneously.
- **Anti-Collision Protection**: Verifies that no two vehicles can double-book the same physical slot in the same time frame.
- **Zero-Setup In-Memory H2 Database**: Pre-configured with `jdbc:h2:mem:cloud_parking_db;MODE=MySQL` with an enabled web console at `/h2-console`.
- **Local MySQL Server Ready**: Seamlessly switchable to local MySQL in `application.yml`.
- **Data Initializer**: Automatically seeds demo accounts and 100 campus parking slots across 2 lots (Main Gate & R&D Gate) upon first launch.

---

## 🚀 How to Run the Backend

From this `backend/` directory:

### Windows:
```cmd
mvnw.cmd spring-boot:run
```

### Linux / macOS:
```bash
chmod +x mvnw
./mvnw spring-boot:run
```

Once started, the backend runs on: **`http://localhost:8080`**

---

## 📋 Default Test Accounts

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Student** | `alex@thapar.edu` | `user123` | View lots, check availability, book/cancel personal reservations |
| **Campus Admin** | `admin@thapar.edu` | `admin123` | Student permissions + Live Analytics & Add New Space |

---

## 🛠️ API Endpoints Summary

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | Health status check |
| `POST` | `/api/auth/register` | Public | Register new `@thapar.edu` user |
| `POST` | `/api/auth/login` | Public | Authenticate and receive JWT token |
| `GET` | `/api/lots` | Public | Fetch all parking lots |
| `GET` | `/api/spaces/lot/{id}/all` | Public | Fetch all spaces in a lot for 3D digital twin |
| `POST` | `/api/bookings` | User/Admin | Reserve a space (enforces 1 slot per user) |
| `PUT` | `/api/bookings/{id}/cancel` | User/Admin | Cancel a booking and release the slot |
| `GET` | `/api/bookings?email={email}` | User/Admin | Fetch booking history for a user |
| `GET` | `/api/analytics/lots/{id}/occupancy` | Admin | Lot occupancy rate and status breakdown |
| `GET` | `/api/analytics/lots/{id}/revenue` | Admin | Total revenue accumulated for a lot |
