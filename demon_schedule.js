const pm2 = require('pm2');
const path = require('path');
const os = require('os');

pm2.start({
  script: path.join(__dirname, 'schedule.js'),
  name: 'SCHEDULE',
  watch: path.join(os.homedir(), "huinity", "configs"),
  maxRestarts: 10,
  maxMemoryRestart: '2G',
  instances: 1,
  autorestart: true,
  exec_mode: 'fork'
})