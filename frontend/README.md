# CloudPark 3D — Frontend 🚗⚡

This directory contains the standalone **3D Digital Twin Web Application** for CloudPark, built with **Three.js**, **OrbitControls**, **GSAP**, and modern vanilla JavaScript with glassmorphic CSS styling.

---

## 🌟 Features Included

- **Interactive 3D Parking Lot**: Realistic tarmac, curbs, entry boom-barriers, stylized campus trees, and street lamps with localized night lighting.
- **Dynamic Procedural 3D Cars**: Procedural cars parked inside occupied/reserved spaces.
- **Color-Coded Status Slots**:
  - 🟢 **Green**: Available
  - 🟡 **Amber**: Reserved
  - 🔴 **Red**: Occupied (with 3D car parked)
  - ⚪ **Gray**: Maintenance
- **Atmospheric Toggles**:
  - ☀️ / 🌙 Day and Night mode toggle.
  - 🤖 Live campus traffic simulation mode.
- **Interactive HUD & Controls**:
  - Slide-in **Slot Details & Booking Drawer**.
  - Camera presets (Isometric, Top-Down 2D, Driver view).
  - 1-Slot-Per-Person policy enforcement with warning banners.
  - Digital Campus Parking Pass ticket modal with simulated barcode.
  - Live Analytics modal (occupancy %, breakdown, and accumulated revenue).
  - "My Reservations" modal with instant cancellation.

---

## 🚀 How to Run the Frontend

The frontend is completely static and has **no build steps or node_modules dependencies** (all Three.js and animation libraries are vendored locally in `js/vendor/` for 100% offline reliability).

### Option 1: Live Server (Recommended)
1. Open this `frontend/` folder in **VS Code**.
2. Right-click `index.html` and click **"Open with Live Server"** (runs on `http://127.0.0.1:5500`).

### Option 2: Python Simple HTTP Server
Open terminal in this `frontend/` directory and run:
```bash
python -m http.server 3000
```
Then navigate to: `http://localhost:3000`

### Option 3: Direct Browser File Opening
Simply double-click `index.html` to open it directly in Google Chrome, Microsoft Edge, or Mozilla Firefox (`file:///.../frontend/index.html`).

---

## 🔗 Backend Connectivity
The frontend automatically connects to the Spring Boot backend at **`http://localhost:8080/api`**. Ensure the backend server is running before attempting to log in or reserve slots.
