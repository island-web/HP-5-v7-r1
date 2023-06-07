const { exec } = require('child_process');
const path = require('path');
const LOG = require(path.join(__dirname, 'save_log.js'));


exec('npm install pm2 -g', (error, stdout, stderr) => {
  if (error) { throw error }
  else { LOG.save_log("Successful install demon pm2") }
})