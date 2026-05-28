# Energy Meter EMS — Project Brief

**Project Title:** Jetpace Energy Meter EMS  
**Company:** Jetpace Technologies  
**Created:** May 25, 2026  
**Last Updated:** May 28, 2026  
**Status:** Live — Modbus polling, MSSQL logging, and report generation all working

---

## 1. What We Are Building

A real-time energy monitoring dashboard built on **Node-RED** with **FlowFuse Dashboard v2** frontend. It reads energy parameters from physical energy meters via **Modbus TCP**, stores readings every minute in an **MSSQL** database, and displays live data and historical reports on a web-based dashboard accessible over the local network.

**No login page** — single main page with a live data table, plus a report page for historical data.

**Customer database:** `MERIL_EMS_GW1` on SQL Server (localhost:1433), user `ems_user`.  
**Target table:** `DATA` (pre-existing customer table with historical records).

---

## 2. Parameters and Device Count

**16 devices** (Slave IDs 8–23) connected via a single Modbus gateway at `192.168.2.125:502`.

| Slave ID | Device Name |
|---|---|
| 8 | Main Incomer |
| 9 | Lift and Common |
| 10 | Motor |
| 11 | First Floor A |
| 12 | First Floor B |
| 13 | Second Floor A |
| 14 | Second Floor B |
| 15 | Third Floor A |
| 16 | Third Floor B |
| 17 | 4-A [LASER] |
| 18 | 4-B [SCANNING] |
| 19 | Fifth Floor A |
| 20 | Fifth Floor B |
| 21 | Fifth Floor C |
| 22 | Sixth Floor A |
| 23 | Sixth Floor B |

Each device exposes:

| Parameter | Registers | Label |
|---|---|---|
| Voltage | 3 | R phase, Y phase, B phase |
| Current | 3 | R phase, Y phase, B phase |
| Power Factor | 1 | Average |
| Frequency | 1 | Hz |
| KWh | 2 (32-bit float) | Total active energy |
| KVAh | 2 (32-bit float) | Total apparent energy |

---

## 3. Features — Implemented

- **Live dashboard** — tabular layout, one row per device, 11 columns
- **Columns:** Device Name | V(R) V | V(Y) V | V(B) V | A(R) Amp | A(Y) Amp | A(B) Amp | PF | Hz | KWH | KVAH
- **Summary boxes** — Total KWH and Total KVAH (sum of all live readings)
- **Offline indication** — Device Name cell turns red for offline/non-responding devices; V(R) shows `---`
- **Edit button** → modal with Add, Edit, Delete device options
- **Modbus TCP polling** — polls all 16 slaves every 5 seconds
- **Float register parsing** — 32-bit IEEE 754 floats, Big-Endian word order (ABCD)
- **MSSQL logging** — inserts one row per device per minute into the `DATA` table
  - Online devices: `M_STATUS = 'ONLINE'` with live readings
  - Offline devices: `M_STATUS = 'OFFLINE'` with `0` for all numeric values
- **Report page** — date-range + interval selector (5 / 15 / 30 / 60 min), tabular report with all energy parameters, **Download PDF** button opens browser print/PDF dialog
- **Monthly email** — sends KWH + KVAH summary report on a scheduled date

---

## 4. Features — Pending

| Feature | Details |
|---|---|
| Report — offline device ID column | Currently shows slave ID; plan to map to a friendly name |
| Monthly email fine-tuning | Recipient, date, format to be finalised with customer |

---

## 5. Technical Stack

| Component | Detail |
|---|---|
| Node-RED | v4.1.10 |
| Dashboard | @flowfuse/node-red-dashboard v1.30.2 (Dashboard v2) |
| Protocol | Modbus TCP via `node-red-contrib-modbus` (Flex Getter) |
| Database | MSSQL — `node-red-contrib-mssql-plus` (older version — uses `msg.payload` for query, not `msg.topic`) |
| Email | node-red-node-email (Gmail SMTP) |
| Port | **1881** |

---

## 6. Environment

- **Working directory:** `C:\SPB_Data\.node-red-energy\`
- **Settings file:** `settings.js` (port 1881, credentialSecret: `jetpace-energy-ems-2026`)
- **Flows file:** `flows.json`
- **Customer install path:** `C:\Users\Administrator\Downloads\EnergyMeter`
- **Start command:** `node_modules\.bin\node-red.cmd -s settings.js flows.json`

---

## 7. Modbus Configuration

| Item | Value |
|---|---|
| Gateway IP | `192.168.2.125` |
| Port | `502` |
| Slave IDs | 8–23 (16 devices) |
| Poll interval | 5 seconds (live display) |
| Store interval | Every 1 minute (to MSSQL, rate-limited per device) |
| Read block | Address 100 (register 40101), Quantity 58 |
| Function code | FC03 |

---

## 8. Modbus Register Map

Read block: address **100** (40101), quantity **58**. All values are 32-bit IEEE 754 floats (2 registers each, Big-Endian ABCD word order).

| Parameter | Modbus Register | Array Offset |
|---|---|---|
| KWh | 40101 | regs[0], regs[1] |
| PF Average | 40117 | regs[16], regs[17] |
| KVAh | 40125 | regs[24], regs[25] |
| V R phase | 40143 | regs[42], regs[43] |
| V Y phase | 40145 | regs[44], regs[45] |
| V B phase | 40147 | regs[46], regs[47] |
| Current R | 40151 | regs[50], regs[51] |
| Current Y | 40153 | regs[52], regs[53] |
| Current B | 40155 | regs[54], regs[55] |
| Frequency | 40157 | regs[56], regs[57] |

> Word order: ABCD (Big-Endian). If values appear garbled on a live device, swap hi/lo words in `fn_parse_modbus`.

---

## 9. Database — DATA Table Schema

The `DATA` table is pre-existing in `MERIL_EMS_GW1`. Our flow inserts into it without altering the schema.

| Column | Type | Populated by our flow |
|---|---|---|
| `METER_NUMBER` | NVARCHAR | Slave ID (e.g. `17`) |
| `DATE_TIME_DBL` | FLOAT | Seconds since Jan 1 1904 (Mac epoch): `Date.now()/1000 + 2082844800` |
| `DATE_STRING` | NVARCHAR | `DD-MM-YYYY` (local time) |
| `TIME_STRING` | NVARCHAR | `HH:MM:SS` (local time) |
| `TAG_NAME` | NVARCHAR | Device name (e.g. `4-A [LASER]`) |
| `M_STATUS` | NVARCHAR | `ONLINE` or `OFFLINE` |
| `V1` / `V2` / `V3` | NVARCHAR | Voltage R / Y / B phase |
| `AMP1` / `AMP2` / `AMP3` | NVARCHAR | Current R / Y / B phase |
| `PF` | NVARCHAR | Power factor |
| `HZ` | NVARCHAR | Frequency |
| `KWH` | NVARCHAR | Active energy |
| `KVAH` | NVARCHAR | Apparent energy |
| `IP_ADD` | NVARCHAR | Gateway IP (max 20 chars) |

**DATE_TIME_DBL format:** The existing customer data uses seconds since **January 1, 1904 UTC** (Macintosh epoch). The formula used: `Date.now() / 1000 + 2082844800` where `2082844800` is the number of seconds from Jan 1 1904 to Jan 1 1970.

---

## 10. Node-RED Flow Structure

| Node ID | Type | Role |
|---|---|---|
| `tab_main` | tab | Main flow tab |
| `ui_template_1` | ui-template | Vue 3 SFC — live dashboard |
| `report_template` | ui-template | Vue 3 SFC — report page |
| `inj_startup` | inject | Fires once on startup, seeds device list |
| `fn_load_devices` | function | Seeds 16 devices if list empty |
| `fn_handle_msg` | function | Handles add/edit/delete device messages from UI |
| `modbus_client_1` | modbus-client | TCP connection to 192.168.2.125:502 |
| `inj_poll` | inject | Every 5s Modbus poll trigger |
| `fn_build_requests` | function | Generates one Modbus read message per slave |
| `modbus_flex_getter_1` | modbus-flex-getter | FC03 reads 58 registers per slave |
| `fn_parse_modbus` | function | Parses 32-bit floats, builds tableData, passes deviceName + slaveId |
| `fn_log_energy` | function | 60s rate-limiter + builds INSERT SQL into DATA table |
| `mssql_energy_log` | MSSQL | Executes INSERT — reads query from `msg.payload` |
| `mssql_energy_report` | MSSQL | Executes report SELECT — reads query from `msg.payload` |
| `mssql_cn_energy` | MSSQL-CN | Connection config: localhost:1433, MERIL_EMS_GW1, ems_user |
| `fn_build_report_query` | function | Builds date-range SELECT query with interval grouping |
| `fn_format_report` | function | Maps SQL result rows to report display format |
| `dbg_log_energy` | debug | Monitors fn_log_energy output messages |
| `catch_mssql_log` | catch | Catches MSSQL node errors, routes to debug |

---

## 11. Bugs Fixed and Changes Made (May 28, 2026)

### 11.1 Data Not Logging — Root Causes and Fixes

**Bug 1 — Duplicate key typo in `fn_parse_modbus`**

The return statement had `payload` written twice:
```javascript
// Wrong — second payload overwrites the first (topic never set)
return { payload: 'tableData', payload: buildRows(...) };

// Fixed
return { topic: 'tableData', payload: buildRows(...), deviceName: msg.deviceName, slaveId: msg.slaveId };
```

**Bug 2 — Wrong wires format on `fn_log_energy`**

The output wires were a flat array instead of a nested array. Node-RED iterates `wires[0]` as an array of target IDs — a bare string gets iterated character by character, so no message ever reached the MSSQL node.
```json
// Wrong — flat array, messages go nowhere
"wires": ["mssql_energy_log", "dbg_log_energy"]

// Fixed — nested array, both nodes receive the message
"wires": [["mssql_energy_log", "dbg_log_energy"]]
```

**Bug 3 — Wrong `queryOpt` on MSSQL node**

The reference NXT dashboard uses a newer `node-red-contrib-mssql-plus` that supports `msg.topic` as the query source. The customer's PC has an older version that only supports `msg.payload`. Setting `queryOpt: "topic"` caused `INVALID_EXPR` errors.
```
Fixed: queryOpt = "payload"  (msg.payload carries the full INSERT string)
```

**Bug 4 — INVALID_EXPR from `flow.get()` with hyphenated key**

Node-RED v4 uses a property expression parser for context keys. Device names like `TR-01` contain a hyphen which the parser interprets as a minus operator:
```javascript
// Wrong — hyphen in key causes INVALID_EXPR at runtime
var key = 'lastEnergyLog_' + msg.deviceName;  // e.g. 'lastEnergyLog_TR-01'

// Fixed — use numeric slaveId (no special characters)
var key = 'lastEnergyLog_' + msg.slaveId;     // e.g. 'lastEnergyLog_17'
```

**Bug 5 — Wrong DATE_TIME_DBL format**

The flow was computing an OLE Automation date (~45804 for May 2026). The existing customer DATA table stores seconds since **Jan 1, 1904** (~3,862,700,000 for May 2026). Inserting OLE dates made new rows incompatible with existing data and broke the report date filter.
```javascript
// Wrong — OLE Automation date (~45804)
var oleDateDbl = (now / 86400000) + 25569;

// Fixed — Mac epoch seconds (~3,862,700,000)
var dateTimeDbl = now / 1000 + 2082844800;
// 2082844800 = seconds from Jan 1 1904 to Jan 1 1970
```

**Bug 6 — Wrong KWH and KVAH register offsets**

The flow was reading KWH from regs[58–59] (register 40159) and KVAH from regs[60–61] (register 40161). Actual register map:
```
KWH  → register 40101 = regs[0],  regs[1]
KVAh → register 40125 = regs[24], regs[25]
```

### 11.2 Report Page — Date Filter Fix

`fn_build_report_query` was using OLE date arithmetic for the WHERE clause and interval grouping. Updated to Mac epoch seconds to match the DATA table format:

```javascript
// Old (OLE date)
var oleFrom = Math.floor(new Date(p.dateFrom + 'T00:00:00').getTime() / 86400000 + 25569);

// Fixed (Mac epoch seconds)
var macOffset = 2082844800;
var secFrom = Math.floor(new Date(p.dateFrom + 'T00:00:00').getTime() / 1000) + macOffset;
var secTo   = Math.floor(new Date(p.dateTo   + 'T23:59:59').getTime() / 1000) + macOffset;
```

Interval grouping (seconds, not fractional days):
```sql
-- Old (OLE fractional days)
FLOOR(DATE_TIME_DBL * 1440.0 / 5) * 5 / 1440.0 AS interval_dbl

-- Fixed (seconds)
FLOOR(DATE_TIME_DBL / 300.0) * 300.0 AS interval_sec
```

`logged_at` timestamp conversion (Mac epoch → IST datetime):
```sql
CONVERT(varchar(19),
  DATEADD(SECOND,
    CAST(CAST(ROUND(interval_sec,0) AS BIGINT) - 2082844800 + 19800 AS INT),
    '1970-01-01'),
  120) AS logged_at
-- +19800 = IST offset (UTC+5:30 = 5×3600 + 30×60 seconds)
```

### 11.3 Offline Device Handling

**Before:** `fn_log_energy` returned `null` for offline/non-responding devices — no row inserted, devices absent from report.

**After:** All devices are logged every minute regardless of status:
```javascript
var mStatus = (row.offline || row.vR === '---' || row.vR === 'BAD DATA') ? 'OFFLINE' : 'ONLINE';
// Continues to INSERT with M_STATUS = mStatus, numeric fields = 0 for offline
```

**Dashboard UI change:** Offline devices now show a **red Device Name cell** instead of the word "OFFLINE" in the V(R) column:
```html
<!-- Device name cell — red background when offline -->
<td :style="row.vR === 'OFFLINE' ? {background:'#C41E1E',color:'#fff',fontWeight:'700'} : {}">
  {{ row.deviceName }}
</td>

<!-- V(R) cell — shows --- instead of OFFLINE -->
<td>{{ row.vR === 'OFFLINE' ? '---' : row.vR }}</td>
```

### 11.4 Report UI Changes

- **Column rename:** `LOCATION` → `DEVICE ID` (shows slave ID number)
- **Download button:** Replaced dropdown menu with a single **Download PDF** button that directly triggers the browser print/PDF dialog

---

## 12. Related Project

Isolated from the **NXT Environmental Monitoring dashboard** (`C:\SPB_Data\.node-red`, port 1880). Do not edit files in the NXT directory.

The NXT dashboard uses a **newer** `node-red-contrib-mssql-plus` that supports `msg.topic` as the query. The Energy EMS uses an **older** version that only supports `msg.payload`. This is why the two flows have different MSSQL query patterns.
