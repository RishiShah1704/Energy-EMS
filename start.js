const path = require("path");
const fs = require("fs");

const baseDir = process.pkg ? path.dirname(process.execPath) : __dirname;
const logFile = path.join(baseDir, "start.log");

function log(msg) {
  fs.appendFileSync(logFile, new Date().toISOString() + " " + msg + "\n");
}

process.on("uncaughtException", function(err) {
  log("UNCAUGHT: " + err.message);
});

log("Starting Node-RED...");

process.argv = [
  process.execPath,
  "node-red",
  "-s",
  path.join(baseDir, "settings.js"),
  path.join(baseDir, "flows.json")
];

process.env.NODE_PATH = path.join(baseDir, "node_modules");
process.env.NODE_RED_HOME = baseDir;

require("module").Module._initPaths();

try {
  require(path.join(baseDir, "node_modules", "node-red", "red.js"));
  log("Node-RED started");
} catch (err) {
  log("Node-RED failed: " + err.message);
  process.exit(1);
}
