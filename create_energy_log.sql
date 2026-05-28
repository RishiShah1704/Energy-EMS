-- Run this once in the customer's database.
-- Before running, make sure you are connected to the correct database in SSMS.
CREATE TABLE energy_log (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    device_name NVARCHAR(50)  NOT NULL,
    slave_id    INT           NOT NULL,
    ip_address  NVARCHAR(50)  NOT NULL DEFAULT '',
    location    NVARCHAR(100) NOT NULL DEFAULT '',
    v_r         FLOAT,
    v_y         FLOAT,
    v_b         FLOAT,
    a_r         FLOAT,
    a_y         FLOAT,
    a_b         FLOAT,
    pf          FLOAT,
    hz          FLOAT,
    kwh         FLOAT,
    kvah        FLOAT,
    logged_at   DATETIME      NOT NULL
);
CREATE INDEX IX_energy_log_slave_time ON energy_log (slave_id, logged_at);
CREATE INDEX IX_energy_log_logged_at  ON energy_log (logged_at);
