# WiFi Network Control System (Windows & Multi-Platform Daemon Setup)

A complete, professional web-based WiFi Network Control System and router management dashboard client built entirely with React + TypeScript, Vite, Tailwind CSS, and Recharts.

---

## 🎨 Design and Visual Concept

Built with a gorgeous cyber-defense dashboard mood (**Enigma Dark Theme**) featuring glassmorphism, glowing telemetry indicator highlights, responsive menus, and crisp modular sections. The system fully supports multi-language capabilities including localized layout formatting for **Arabic** and **English**.

---

## 🚀 Key Functional Modules Embedded

1. **Cyber-Security telemetry Overview**: Live reports on aggregated bandwidth velocities (download and upload), router latencies, local CPU & RAM resources, and active connected leases.
2. **ARP Device Scanner**: Search, prioritize, and isolate devices dynamically. Identifies IPv4 mappings, MAC physical hardware IDs, estimated device category markers (workstations, smartphones, IoT smart fridges, etc.), and hardware vendor prefixes.
3. **Advanced QoS Policies & Blockades**: 
   - Block internet instantly via silent drop packets policies.
   - Speed throttling configuration boundaries.
   - Pause internet access on demand.
   - Individual whitelisting/blacklisting profiles.
4. **Interactive Analytical Charts**: High-performance data visualization rendering real-time incoming bandwidth swings alongside device-consumption ratios.
5. **Real-Time Notification Systems**: Triggers warning banner pop-ups and details logs when new MAC hardware couplings join the subnet topology.
6. **Administrator Log Viewer**: Keeps historic lists of auditing system operations (DHCP scans, security overrides).

---

## 💻 Technical Setup and Installation Instructions

To start playing with the desktop client locally:

### 1. Prerequisites
- **NodeJS 18+** installed on your workstation.
- **Python 3.10+** (if deploying the scapy ARP daemon integration).
- **Npcap (Windows)**: Required for raw socket packet forging. Ensure "Install Npcap in WinPcap API-compatible Mode" is checked during setup.

### 2. Live Client Setup
Inside the React applet root:
```bash
# Install NPM packages
npm install

# Run the live developer workspace
npm run dev
```

### 3. Optional Backend Scapy Python Daemon Integration
If you wish to deploy the background scan triggers inside local workstation hosts:
Create a `backend/requirements.txt` containing:
```text
fastapi==0.109.0
uvicorn[standard]==0.27.0
scapy==2.5.0
psutil==5.9.8
mac-vendor-lookup==1.4.1
```
Install and launch:
```bash
pip install -r requirements.txt

# Run as administrator (necessary for raw arping capabilities)
python main.py
```
And bind your React App WebSocket to the corresponding bridge port.
