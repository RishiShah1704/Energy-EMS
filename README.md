# Jetpace Energy EMS

A real-time energy monitoring dashboard built on **Node-RED** with a **FlowFuse Dashboard v2** frontend. It reads energy parameters from physical energy meters over **Modbus TCP**, logs readings every minute to an **MSSQL** database, and provides a live web dashboard, a historical report page, and a monthly email report with PDF and CSV attachments.

---

## Features

### Live Dashboard
- One row per device showing: Device Name, V(R), V(Y), V(B), A(R), A(Y), A(B), PF, Hz, kWh, kVAh
- Values displayed in **kWh / kVAh** (converted from raw Wh/VAh meter registers)
- Summary boxes for **Total kWh** and **Total kVAh** across all active devices
- Offline devices highlighted with a red Device Name cell
- Edit button to add, edit, or delete devices (Device Name, Slave ID, Location, IP Address)

### Energy Report Page
- Date-range filter with interval selector (5 / 15 / 30 / 60 min)
- Tabular report showing all electrical parameters per device per interval (values in kWh / kVAh)
- **Download PDF** — opens browser print dialog for direct PDF save (A4 landscape, company header and footer)
- **Download CSV** — downloads a structured CSV file with company header, report title, date range, data table, and footer — matches the PDF layout

### Monthly Email Report
- Sends a kWh + kVAh consumption summary per device for the selected month
- Auto-sends on the **1st of every month at 8:00 AM** (previous month's data)
- Manual send available from the **Email** button on the dashboard
- **Preview Report** button — opens the formatted report in a new tab with a Download as PDF button
- Future months are blocked; only current and past months are selectable
- Filters to active slave IDs (8–23) only
- Email includes both a **PDF attachment** and a **CSV attachment** (same structured layout as the PDF)

### SMTP Configuration (from Dashboard)
- FROM email address and Gmail App Password can be set directly from the dashboard **without opening the Node-RED editor**
- Settings are stored in file-backed context (persists across restarts)
- Credentials are also written to `flows_cred.json` (encrypted with AES-256-CTR) so the email node in the editor stays in sync

### Email Authentication
- The Email button on the dashboard is password-protected
- Separate login screen before accessing email settings or sending reports
- Password is configurable from the dashboard (Change Password button)

### Device Management
- Add, edit, and delete devices from the live dashboard (no editor access needed)
- Each device has: Device Name, Slave ID, Location, IP Address
- Device list is stored in file-backed context (persists across restarts)

### Error Handling
- Catch nodes for MSSQL errors on both the email query and report query paths
- Auto monthly email is silently skipped if: auto-send is disabled, no recipient is set, or SMTP is not configured
- PDF generation timeout (30 seconds) to prevent indefinite hangs

---

## Tech Stack

| Component | Detail |
|---|---|
| Node-RED | v4.1.10 |
| Dashboard | @flowfuse/node-red-dashboard v1.30.2 (Dashboard v2) |
| Protocol | Modbus TCP — `node-red-contrib-modbus` (Flex Getter) |
| Database | MSSQL — `node-red-contrib-mssql-plus` |
| Email | nodemailer via `node-red-node-email` (Gmail SMTP) |
| PDF Generation | `html-pdf-node` (uses headless Chrome/Chromium) |
| Excel Export | `exceljs` |
| Port | 1881 |

---

## Installation

### Prerequisites
- Node.js v18 or later
- Node-RED v4+
- SQL Server (local instance, database pre-created)
- Modbus TCP gateway accessible on the local network
- Google Chrome or Microsoft Edge installed (required for PDF generation)

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

3. Start Node-RED:
   ```bash
   node-red -u .
   ```

4. Open the dashboard in a browser:
   ```
   http://localhost:1881/dashboard
   ```

5. On first run, open the **Email** button → **SMTP Settings** and enter your Gmail FROM address and App Password. Click **Save SMTP Settings**.

### Auto-start (Windows)
Run `install_autostart.bat` once to register Node-RED as a Windows startup task. Use `launch.vbs` to start it silently in the background and `tray.ps1` for a system tray icon.

### PDF Generation (Windows)
`html-pdf-node` requires a Chromium-based browser to render PDFs. If the bundled Chromium fails to launch, patch it to use the installed Google Chrome:

```cmd
node -e "const fs=require('fs');const p='node_modules\\html-pdf-node\\index.js';let c=fs.readFileSync(p,'utf8');fs.writeFileSync(p+'.bak',c);c=c.replace(/puppeteer\.launch\s*\(\s*\{/,'puppeteer.launch({executablePath:\"C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe\",args:[\"--no-sandbox\",\"--disable-setuid-sandbox\",\"--disable-gpu\"],');fs.writeFileSync(p,c);console.log('Done');"
```

> **Note:** Re-run this command if `npm install` is executed again, as it overwrites `node_modules`.

---

## Architecture

```
Modbus Gateway (TCP)
        │
        ▼
  fn_build_requests ──► modbus_flex_getter ──► fn_parse_modbus
  (one msg per slave)    (FC03, 62 regs)        (float parsing, kWh/kVAh)
                                                        │
                                        ┌───────────────┴───────────────┐
                                        ▼                               ▼
                                 ui_template_1                   fn_log_energy
                                (live dashboard)             (1 min rate limiter)
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
                                  (kWh/kVAh ÷1000, HTML build)
                                          │
                                          ▼
                                  fn_html_to_pdf
                                  (PDF via headless Chrome +
                                   CSV generation + nodemailer send)
                                          │
                                          ▼
                              email_template + ui_template_1
                                   (result feedback)

Report Page ──► fn_build_report_query ──► mssql_energy_report
                                                  │
                                                  ▼
                                          fn_format_report
                                          (kWh/kVAh ÷1000)
                                                  │
                                                  ▼
                                          report_template
                                   (table + PDF + CSV download)

Auto Email ──► inj_monthly_email (cron: 1st of month 08:00)
                       │
                       ▼
               fn_auto_monthly_email
               (checks autoEnabled, recipient, SMTP config)
                       │
                       ▼
               fn_build_monthly_email_query → (same path as manual send)
```

---

## Context Storage

Persistent settings are stored in Node-RED **file-backed context** (`flow.get/set('key', 'file')`). These survive restarts.

| Key | Contents |
|---|---|
| `devices` | List of configured devices (name, slave ID, location, IP) |
| `emailConfig` | Recipient emails, sender name, auto-send toggle |
| `smtpConfig` | FROM email address and Gmail App Password |
| `emailPassword` | Hashed dashboard email-button access password |

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
| `V1/V2/V3` | Voltage R/Y/B phase (V) |
| `AMP1/AMP2/AMP3` | Current R/Y/B phase (A) |
| `PF` | Power factor |
| `HZ` | Frequency (Hz) |
| `KWH` | Active energy (raw meter register value) |
| `KVAH` | Apparent energy (raw meter register value) |
| `IP_ADD` | Gateway IP address |

> `DATE_TIME_DBL` uses the **Macintosh epoch** (seconds since Jan 1, 1904) to match the format used by existing records in the customer database.

> `KWH` and `KVAH` are stored as raw meter register values. All dashboard displays divide by 1000 to show kWh / kVAh.

---

## Monthly Report

Generated from the `DATA` table using `MAX − MIN` per device for the selected month — representing net consumption. Includes:

- Company header (name, address)
- Report title and month/period metadata
- Table: SR. NO | Slave ID | Device Name | Monthly kWh | Monthly kVAh
- Total consumption row
- Signature footer and printed timestamp

The same HTML template is used for the emailed PDF, the in-browser preview, and the CSV export.

---

## Report Formats

### PDF
Generated server-side using `html-pdf-node` (headless Chrome). A4 landscape with company branding, coloured table headers, alternating row shading, and signature footer.

### CSV
Structured plain-text format matching the PDF layout:
```
JETPACE TECHNOLOGIES
Tarsali, Vadodara - 390009 | Jetpace Energy EMS

MONTHLY ENERGY CONSUMPTION REPORT
Equipment: Jetpace Energy EMS, MONTH: <month> | PERIOD: <from> to <to>

SR.,Slave ID,Device Name,Monthly kWh,Monthly kVAh
1,8,Main Incomer,32.26,7.56
...
TOTAL MONTHLY CONSUMPTION,,,102.47,78.32

Check by,,,Reviewed by
Printed Date Time: DD-MM-YYYY HH:MM
```
