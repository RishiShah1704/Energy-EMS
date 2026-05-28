# Jetpace Energy EMS

A real-time energy monitoring dashboard built on **Node-RED** with a **FlowFuse Dashboard v2** frontend. It reads energy parameters from physical energy meters over **Modbus TCP**, logs readings every minute to an **MSSQL** database, and provides a live web dashboard, a historical report page, and a monthly email report with PDF preview.

---

## Features

### Live Dashboard
- One row per device showing: Device Name, V(R), V(Y), V(B), A(R), A(Y), A(B), PF, Hz, KWH, KVAH
- Summary boxes for Total KWH and Total KVAH across all devices
- Offline devices highlighted with a red Device Name cell
- Edit button to add, edit, or delete devices

### Energy Report Page
- Date-range filter with interval selector (5 / 15 / 30 / 60 min)
- Tabular report showing all electrical parameters per device per interval
- Download PDF button — opens browser print dialog for direct PDF save

### Monthly Email Report
- Sends a KWH + KVAH consumption summary for each device
- Auto-sends on the 1st of every month (previous month's data)
- Manual send available from the Email button in the dashboard
- **Preview Report** button — opens the report in a new tab as a formatted PDF preview with a Download as PDF button
- Future months are blocked; current and past months are available
- Filters to active slave IDs (8–23) only

---

## Tech Stack

| Component | Detail |
|---|---|
| Node-RED | v4.1.10 |
| Dashboard | @flowfuse/node-red-dashboard v1.30.2 (Dashboard v2) |
| Protocol | Modbus TCP — `node-red-contrib-modbus` (Flex Getter) |
| Database | MSSQL — `node-red-contrib-mssql-plus` |
| Email | `node-red-node-email` (Gmail SMTP) |
| Port | 1881 |

---

## Installation

### Prerequisites
- Node.js (v18 or later)
- Node-RED v4+
- SQL Server (local instance, database pre-created)
- Modbus TCP gateway accessible on the local network

### Steps

1. Clone the repository:
   ```bash
   git clone https://github.com/RishiShah1704/Energy-EMS.git
   cd Energy-EMS
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure credentials in Node-RED (MSSQL connection, email SMTP) via the Node-RED editor — credentials are stored encrypted in `flows_cred.json`.

4. Start Node-RED:
   ```bash
   node_modules\.bin\node-red.cmd -s settings.js flows.json
   ```

5. Open the dashboard in a browser:
   ```
   http://localhost:1881/dashboard
   ```

### Auto-start (Windows)
Run `install_autostart.bat` once to register Node-RED as a Windows startup task. Use `launch.vbs` to start it silently in the background and `tray.ps1` for a system tray icon.

---

## Architecture

```
Modbus Gateway (TCP)
        │
        ▼
  fn_build_requests  ──►  modbus_flex_getter  ──►  fn_parse_modbus
  (one msg per slave)       (FC03, 58 regs)          (float parsing)
                                                          │
                                          ┌───────────────┴───────────────┐
                                          ▼                               ▼
                                   ui_template_1                   fn_log_energy
                                  (live dashboard)              (1 min rate limiter)
                                                                          │
                                                                          ▼
                                                                  mssql_energy_log
                                                                  (INSERT into DATA)

Email Button ──► fn_handle_msg ──► fn_build_monthly_email_query
                                          │
                                          ▼
                                  mssql_monthly_email
                                          │
                                          ▼
                                  fn_format_email_html
                                     /          \
                              email_out      ui_template_1
                           (send email)    (preview in new tab)

Report Page ──► fn_build_report_query ──► mssql_energy_report ──► fn_format_report ──► report_template
```

---

## Database Schema

The flow writes to a pre-existing `DATA` table. Key columns:

| Column | Description |
|---|---|
| `METER_NUMBER` | Slave ID |
| `DATE_TIME_DBL` | Seconds since Jan 1, 1904 — `Date.now()/1000 + 2082844800` |
| `DATE_STRING` | `DD-MM-YYYY` (local time) |
| `TIME_STRING` | `HH:MM:SS` (local time) |
| `TAG_NAME` | Device name |
| `M_STATUS` | `ONLINE` or `OFFLINE` |
| `V1/V2/V3` | Voltage R/Y/B phase |
| `AMP1/AMP2/AMP3` | Current R/Y/B phase |
| `PF` | Power factor |
| `HZ` | Frequency |
| `KWH` | Active energy |
| `KVAH` | Apparent energy |
| `IP_ADD` | Gateway IP |

The `DATE_TIME_DBL` column uses the **Macintosh epoch** (seconds since Jan 1, 1904) to match the format used by existing records in the customer database.

---

## Monthly Report

The monthly report is generated from the `DATA` table using `MAX − MIN` KWH and KVAH per device for the selected month — representing net consumption for that period. It includes:

- Company header and report title
- Month and date range
- Table: SR. NO | Slave ID | Device Name | Monthly KWH | Monthly KVAH
- Total consumption row
- Signature footer and print timestamp

The same HTML is used for both the emailed report and the PDF preview.
