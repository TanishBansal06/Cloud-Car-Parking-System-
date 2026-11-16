# ☁️ AWS Cloud Deployment Guide
## CloudPark 3D - Campus Smart Parking System

This guide walks you step-by-step through deploying the **CloudCar Parking System** to **Amazon Web Services (AWS)** using the **AWS Free Tier**.

---

## 📋 Table of Contents
1. [Architecture Overview](#-architecture-overview)
2. [Prerequisites](#-prerequisites)
3. [Method 1: Deploy on AWS EC2 (Recommended - Quickest & Free Tier)](#-method-1-deploy-on-aws-ec2-recommended)
   - [Step 1: Launch EC2 Instance](#step-1-launch-an-ec2-instance)
   - [Step 2: Configure Security Group (Firewall Rules)](#step-2-configure-security-group-inbound-rules)
   - [Step 3: Connect to EC2 via SSH](#step-3-connect-to-your-ec2-instance)
   - [Step 4: Install Java 21 & Tools](#step-4-install-java-21--tools)
   - [Step 5: Clone and Build the Project](#step-5-clone-and-build-the-project)
   - [Step 6: Run as a Background Service](#step-6-run-the-application-in-the-background)
   - [Step 7: Route Port 80 to Port 8080 (Clean URL)](#step-7-route-port-80-to-8080-optional---clean-url)
4. [Method 2: AWS EC2 + AWS RDS (Managed MySQL Database)](#-method-2-aws-ec2--aws-rds-managed-mysql)
5. [Database Persistence Explained](#-database-persistence-explained)
6. [Troubleshooting & FAQs](#-troubleshooting--faqs)

---

## 🏗 Architecture Overview

```
                      Internet Users / Evaluators
                                   │
                                   ▼
                   ┌──────────────────────────────┐
                   │    AWS EC2 Virtual Server    │
                   │  (Ubuntu 22.04 / 24.04 LTS)  │
                   │                              │
                   │  ┌────────────────────────┐  │
                   │  │ Spring Boot Application│  │
                   │  │   • Port 8080          │  │
                   │  │   • Embedded Tomcat    │  │
                   │  │   • Three.js 3D UI     │  │
                   │  │   • REST APIs          │  │
                   │  │   • JWT Auth           │  │
                   │  └───────────┬────────────┘  │
                   │              │               │
                   │              ▼               │
                   │    Persistent Database:      │
                   │    Local H2 (.mv.db file)    │
                   │             OR               │
                   └──────────────┼───────────────┘
                                  │ (Optional)
                                  ▼
                   ┌──────────────────────────────┐
                   │       AWS RDS MySQL          │
                   │    (Managed Cloud DB)        │
                   └──────────────────────────────┘
```

---

## ⚙️ Prerequisites

1. An active **AWS Account** ([Sign up for AWS Free Tier](https://aws.amazon.com/free/)).
2. An SSH client:
   - **Windows**: PowerShell, Command Prompt, or PuTTY.
   - **macOS / Linux**: Terminal.
3. Your GitHub repository URL:
   `https://github.com/TanishBansal06/Cloud-Car-Parking-System-.git`

---

## 🚀 Method 1: Deploy on AWS EC2 (Recommended)

### Step 1: Launch an EC2 Instance
1. Log in to the [AWS Management Console](https://console.aws.amazon.com/).
2. In the top search bar, type **EC2** and select **EC2**.
3. Click the orange **"Launch instance"** button.
4. Fill in the instance details:
   - **Name**: `cloud-parking-server`
   - **Application and OS Images (Amazon Machine Image)**: Select **Ubuntu** (Ubuntu Server 24.04 LTS or 22.04 LTS, Free Tier eligible).
   - **Instance type**: Select `t2.micro` (or `t3.micro` if in regions like Ohio/Frankfurt) — **Free Tier eligible**.
   - **Key pair (login)**: Click **"Create new key pair"**:
     - Key pair name: `parking-key`
     - Private key file format: `.pem` (for OpenSSH / PowerShell)
     - Click **Create key pair** (this downloads `parking-key.pem` to your Downloads folder).

---

### Step 2: Configure Security Group (Inbound Rules)
Under **Network settings**, check:
- ✅ **Allow SSH traffic from**: `Anywhere (0.0.0.0/0)` or `My IP`
- ✅ **Allow HTTP traffic from the internet**
- ✅ **Allow HTTPS traffic from the internet**

Next, click **"Edit"** on Network settings and click **"Add security group rule"**:
- **Type**: `Custom TCP`
- **Port range**: `8080`
- **Source type**: `Anywhere` (`0.0.0.0/0`)
- **Description**: `Spring Boot Web UI & REST API`

Click **"Launch instance"** at the bottom right. Wait ~1 minute until the instance state shows **Running**.

---

### Step 3: Connect to your EC2 Instance
1. Find your EC2 **Public IPv4 address** on the EC2 instances dashboard (e.g., `3.85.120.45`).
2. Open PowerShell or Terminal in the folder where your `parking-key.pem` was downloaded:
   ```powershell
   # If on macOS / Linux, set file permission:
   chmod 400 parking-key.pem

   # Connect via SSH:
   ssh -i "parking-key.pem" ubuntu@<YOUR_EC2_PUBLIC_IP>
   ```
   *(Type `yes` when prompted to verify host authenticity).*

---

### Step 4: Install Java 21 & Tools
Inside the EC2 terminal, run:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y openjdk-21-jdk git
```

Verify Java installation:
```bash
java -version
```
*(Should output `openjdk version "21.x.x"`).*

---

### Step 5: Clone and Build the Project
1. Clone your GitHub repository:
   ```bash
   git clone https://github.com/TanishBansal06/Cloud-Car-Parking-System-.git
   cd Cloud-Car-Parking-System-/backend
   ```

2. Make the Maven wrapper executable and build the application:
   ```bash
   chmod +x mvnw
   ./mvnw clean package -DskipTests
   ```
   *When complete, it will display `BUILD SUCCESS` and create `target/parking-backend-0.0.1-SNAPSHOT.jar`.*

---

### Step 6: Run the Application in the Background

#### Quick Run (nohup):
```bash
nohup java -jar target/parking-backend-0.0.1-SNAPSHOT.jar > app.log 2>&1 &
```
Check the startup logs:
```bash
tail -f app.log
```
*(Press `Ctrl + C` to exit log viewing. The app continues running in the background).*

---

#### Or Production-Grade Auto-Restart (systemd Service):
To make the application restart automatically if the server reboots:

1. Create a service file:
   ```bash
   sudo nano /etc/systemd/system/cloudparking.service
   ```

2. Paste the following configuration:
   ```ini
   [Unit]
   Description=Cloud Car Parking 3D Backend & UI
   After=network.target

   [Service]
   User=ubuntu
   WorkingDirectory=/home/ubuntu/Cloud-Car-Parking-System-/backend
   ExecStart=/usr/bin/java -jar /home/ubuntu/Cloud-Car-Parking-System-/backend/target/parking-backend-0.0.1-SNAPSHOT.jar
   SuccessExitStatus=143
   Restart=always
   RestartSec=10

   [Install]
   WantedBy=multi-user.target
   ```
   *(Press `Ctrl + O`, `Enter` to save, then `Ctrl + X` to exit).*

3. Enable and start the service:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable cloudparking
   sudo systemctl start cloudparking
   sudo systemctl status cloudparking
   ```

---

### Step 7: Route Port 80 to 8080 (Optional - Clean URL)
By default, the app runs on port `8080` (e.g. `http://3.85.120.45:8080/`).
To allow users to access simply via `http://3.85.120.45/` without typing `:8080`:

```bash
sudo iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 8080
```
To persist this rule across reboots:
```bash
sudo apt install -y iptables-persistent
sudo netfilter-persistent save
```

🎉 **You're live!** Open your browser and go to:
- `http://<YOUR_EC2_PUBLIC_IP>:8080/` (or `http://<YOUR_EC2_PUBLIC_IP>/`)

---

## 🗄️ Method 2: AWS EC2 + AWS RDS (Managed MySQL)

If your university presentation or evaluation requires an **external managed database (AWS RDS)**:

### 1. Create RDS MySQL Instance
1. In the AWS Console, search for **RDS** and click **Create database**.
2. Engine: **MySQL** (version 8.0).
3. Template: Select **Free tier**.
4. Settings:
   - DB instance identifier: `cloud-parking-db`
   - Master username: `admin`
   - Master password: `YourSecurePassword123!`
5. Connectivity:
   - **Public access**: Yes (or connect via same VPC security group).
   - Security group: Allow inbound traffic on port `3306` from your EC2 security group.
6. Click **Create database**. Once created, copy the **Endpoint** (e.g., `cloud-parking-db.cxxxxxxx.us-east-1.rds.amazonaws.com`).

### 2. Start Spring Boot with RDS Environment Variables
Run the JAR with RDS connection flags:
```bash
java -Dspring.datasource.url="jdbc:mysql://<RDS-ENDPOINT>:3306/cloud_parking_db?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC" \
     -Dspring.datasource.username="admin" \
     -Dspring.datasource.password="YourSecurePassword123!" \
     -Dspring.datasource.driver-class-name="com.mysql.cj.jdbc.Driver" \
     -Dspring.jpa.database-platform="org.hibernate.dialect.MySQLDialect" \
     -jar target/parking-backend-0.0.1-SNAPSHOT.jar
```

---

## 💾 Database Persistence Explained

### Why did you have to re-register before?
- The backend previously used an **in-memory database** (`jdbc:h2:mem:...`).
- An in-memory database resides solely in the computer's volatile RAM.
- Whenever the server stopped or restarted, RAM was cleared and all user accounts and bookings were deleted.

### How is it fixed now?
- We upgraded the configuration to **persistent file storage**:
  ```yaml
  spring:
    datasource:
      url: jdbc:h2:file:./data/cloud_parking_db;MODE=MySQL;DB_CLOSE_DELAY=-1
  ```
- All tables, registered users, and active bookings are now written directly to physical disk files (`backend/data/cloud_parking_db.mv.db`).
- Even if you stop the server, restart the machine, or reboot EC2, **all user registrations and booking records remain permanently saved**.

---

## 🛠 Troubleshooting & FAQs

### 1. I cannot open `http://<EC2-IP>:8080/` in my browser.
- **Check AWS Security Group**: Go to EC2 > Instances > Select your instance > **Security** tab. Ensure an inbound rule exists for **Port 8080**, Protocol **TCP**, Source **0.0.0.0/0**.
- **Use HTTP, not HTTPS**: Use `http://<EC2-IP>:8080/` (do not prefix with `https://` unless you have configured SSL certificates).

### 2. How to stop or restart the application on EC2?
- If using `systemd`:
  ```bash
  sudo systemctl restart cloudparking
  sudo systemctl stop cloudparking
  ```
- If using `nohup`:
  ```bash
  # Find the running PID:
  ps aux | grep java
  # Kill the process:
  kill -9 <PID>
  ```

### 3. How to check application logs in real time?
```bash
tail -f backend/app.log
# OR if using systemd:
sudo journalctl -u cloudparking -f
```
