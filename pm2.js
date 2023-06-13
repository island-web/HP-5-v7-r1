const pm2 = require('pm2');
const path = require('path');
const LOG = require(path.join(__dirname, 'save_log.js'));




pm2.connect((error) => { 
  if (error) { LOG.save_log("Error connected to demon pm2", 'error'); process.exit(1) }

  pm2.start({
    script: path.join(__dirname, 'router.js'),
    name: 'MANAGER',
    maxRestarts: 10,
    maxMemoryRestart: '2G',
    instances: 1,
    autorestart: true,
    exec_mode: 'fork'
  });

});