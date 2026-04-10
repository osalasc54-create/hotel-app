const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, '../../logs');
const logFile = path.join(logsDir, 'app.log');

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

function getTimestamp() {
  return new Date().toISOString().replace('T', ' ').split('.')[0];
}

function writeLog(level, message) {
  const line = `[${getTimestamp()}] ${level}: ${message}\n`;
  fs.appendFileSync(logFile, line, 'utf8');
}

module.exports = {
  info: (message) => writeLog('INFO', message),
  error: (message) => writeLog('ERROR', message)
};