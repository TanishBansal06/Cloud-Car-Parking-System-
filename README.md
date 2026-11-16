# CloudPark 3D - Campus Smart Parking System 🚗⚡

An intelligent, cloud-connected Car Parking Management System featuring a **real-time 3D interactive user interface** built with **Three.js** and backed by a **Spring Boot REST API** with MySQL and JWT security.

Developed specifically for campus environments (with built-in `@thapar.edu` domain verification and pre-seeded campus parking zones).

---

## 🌟 Key Highlights

### 🏎️ Interactive 3D Digital Twin (Three.js)
- **Procedural 3D Parking Lot**: Realistic asphalt tarmac, curbs, road markings, entry boom-barriers, trees, and campus street lamps with localized night illumination.
- **Dynamic 3D Cars**: Procedurally rendered modern 3D vehicle models (with colored body chassis, tinted glass cabin, headlights, taillights, and metallic rims) parked inside reserved and occupied spaces.
- **Color-Coded Status Slots**:
  - 🟢 **Emerald Green**: `AVAILABLE` (with subtle animated breathing glow)
  - 🟡 **Amber Gold**: `RESERVED`
  - 🔴 **Ruby Red**: `OCCUPIED` (with parked 3D car)
  - ⚪ **Steel Hazard**: `MAINTENANCE`
- **Slot Type Markers**: Standard, ⚡ EV Charging, 🚙 Compact, ♿ Handicap / VIP.
- **Raycasting Interactivity**:
  - Hovering reveals a dynamic floating tooltip showing space number, type, and hourly rate.
  - Clicking a slot smoothly flies the 3D camera to frame the space and opens the **Booking & Inspection Drawer**.
- **Cinematic Camera Controls**:
  - 🎥 **Isometric View** (45° angle)
  - 📐 **Top-Down 2D Architectural View**
  - 🏎️ **Driveway / Driver View**
  - 🔄 **OrbitControls** (drag to rotate, scroll to zoom, right-click to pan)
- **Atmospheric Controls**:
  - ☀️ / 🌙 **Day & Night Mode Toggle**: Switches between sunny daylight and a cyberpunk night mode with glowing street lamps and slot lines.
  - 🤖 **Live Traffic Simulation Mode**: Simulates real-time campus cars arriving and departing every few seconds.

---

### 🛡️ Robust Spring Boot REST API
- **Spring Security & Stateless JWT Authentication**: Generates 24-hour signed HMAC-SHA256 tokens. Enforces `@thapar.edu` domain restriction.
- **Conflict & Overlap Prevention**: Robust JPQL queries detect and prevent double-booking collisions for the same parking slot or overlapping bookings by the same user.
- **Dynamic Fee Calculator**: Computes parking fees based on duration and hourly rate ($$\text{Fee} = \max(1, \text{Hours}) \times \text{Rate}$$).
- **Admin Analytics**: Real-time lot occupancy rate (%) calculation and accumulated revenue metrics.
- **Pre-Configured Data Seeder**: Automatically seeds default accounts and 100 campus parking slots across 2 parking zones upon first launch.

---

## 🏗️ Project Architecture

```
Cloud-Car-Parking-System-/
├── backend/                       # Spring Boot REST API Service
│   ├── .mvn/wrapper/              # Maven Wrapper files
│   ├── src/
│   │   ├── main/java/com/cloudparking/parking/backend/
│   │   │   ├── config/            # DataInitializer (seeds campus slots & demo accounts)
│   │   │   ├── controller/        # REST APIs (Auth, Booking, Spaces, Lots, Analytics)
│   │   │   ├── dto/               # Request/Response Data Transfer Objects
│   │   │   ├── entity/            # JPA Entities (User, ParkingLot, ParkingSpace, Booking)
│   │   │   ├── enums/             # Role, SpaceStatus, SpaceType, BookingStatus
│   │   │   ├── exception/         # Global Exception Handlers
│   │   │   ├── repository/        # Spring Data JPA Repositories
│   │   │   ├── security/          # Spring Security, JWT Filter, CORS Config
│   │   │   └── service/           # Business Logic (Auth, Booking, Analytics)
│   │   └── resources/
│   │       ├── application.yml    # Database & server configuration (H2 & MySQL)
│   │       └── static/            # Packaged UI (serves directly at :8080)
│   ├── mvnw / mvnw.cmd            # Maven wrapper executables
│   ├── pom.xml                    # Maven dependencies (Spring Boot 3.3.4, Java 21)
│   └── README.md                  # Backend service documentation
│
├── frontend/                      # Standalone 3D Web Application
│   ├── index.html                 # Main HUD & 3D WebGL viewport
│   ├── css/
│   │   └── style.css              # Glassmorphic dark cyber theme
│   ├── js/
│   │   ├── api.js                 # REST API client with CORS & JWT bearer tokens
│   │   ├── parking3d.js           # Three.js 3D digital twin engine & procedural cars
│   │   ├── app.js                 # Application state, 1-slot-per-person policy, modals
│   │   └── vendor/                # Offline local Three.js, OrbitControls, GSAP
│   └── README.md                  # Frontend development & launching guide
│
├── run-backend.bat                # Windows 1-click launcher for backend
├── run-backend.sh                 # Linux/macOS launcher for backend
├── Backend_Business_rules.md      # Approved system business rules
└── README.md                      # Main project documentation
```

---

## 🚀 Quick Start Guide

### 1. Run the Backend
You can launch the backend using the 1-click launcher or terminal:

**Windows (1-Click):**
Double-click `run-backend.bat` in the root folder, or run:
```cmd
cd backend
mvnw.cmd spring-boot:run
```

**Linux / macOS:**
```bash
chmod +x run-backend.sh
./run-backend.sh
```

*(Zero setup required: Boots automatically using an in-memory MySQL-compatible H2 database. To use local MySQL instead, toggle the configuration in `backend/src/main/resources/application.yml`).*

### 2. Open the 3D Web Application
Once the backend is running, open the application in your browser:
- **Direct Backend URL**: [http://localhost:8080/](http://localhost:8080/)
- **Or Standalone Frontend**: Open `frontend/index.html` directly in your browser or with VS Code **Live Server** (it automatically connects to the backend at `http://localhost:8080/api`).

---

## 🔑 Default Test Accounts

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Student** | `alex@thapar.edu` | `user123` | View 3D lots, reserve slots, view & cancel bookings |
| **Campus Admin** | `admin@thapar.edu` | `admin123` | All student features + Live Analytics & Add Space tools |

*(Note: The login popup includes **1-Click Demo Fill** buttons for immediate sign-in!)*

---

## 📡 API Endpoints Reference

| Method | Route | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | System status check |
| `POST` | `/api/auth/register` | Public | Register new `@thapar.edu` user |
| `POST` | `/api/auth/login` | Public | Login and receive JWT token |
| `GET` | `/api/lots` | Public | List all parking lots |
| `POST` | `/api/lots` | Admin | Create a new parking lot |
| `GET` | `/api/spaces/lot/{lotId}/all` | Public | Fetch all slots for 3D digital twin |
| `GET` | `/api/spaces/lot/{lotId}` | Public | Fetch only available slots |
| `POST` | `/api/spaces` | Admin | Add new parking slot |
| `PATCH`| `/api/spaces/{id}/status` | Admin | Override slot status |
| `POST` | `/api/bookings` | User/Admin | Reserve a parking space |
| `PUT` | `/api/bookings/{id}/cancel` | User/Admin | Cancel a reservation |
| `GET` | `/api/bookings?email={email}` | User/Admin | View user booking history |
| `GET` | `/api/analytics/lots/{id}/occupancy` | Admin | View live occupancy % and breakdown |
| `GET` | `/api/analytics/lots/{id}/revenue` | Admin | View total revenue earned |

---

## 👥 Contributors

- **Ayush Jindal** — Computer Engineering, Thapar Institute of Engineering and Technology, Patiala
- **Tanish Bansal** — Computer Engineering, Thapar Institute of Engineering and Technology, Patiala
- **Mehak Garg** — Computer Engineering, Thapar Institute of Engineering and Technology, Patiala

---

## 📜 License

This project is developed for educational and academic purposes at Thapar Institute of Engineering and Technology.
