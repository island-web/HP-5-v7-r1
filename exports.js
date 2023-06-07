const path = require('path');
const fs = require('fs');
const os = require('os');
const _PATH_CONFIGS_ = path.join(os.homedir(), "huinity", "configs");
const LOG = require(path.join(__dirname, 'save_log'));
const _ = require('lodash');
const clear_config = ["empty"];



module.exports.set_config = (async (config) => {
  try {
    const old_config = await JSON.parse(fs.readFileSync(path.join(_PATH_CONFIGS_, `station_settings.json`)));
    const new_config = JSON.parse(config);
    const isEqual = _.isEqual(old_config, new_config);
    LOG.save_log(`isEqual ===> isEqual`, "worker")
    if (!isEqual) {
      fs.writeFileSync(path.join(_PATH_CONFIGS_, `station_settings.json`), config, 'utf8', function (err) {
        if (err) { LOG.save_log("CONFIG UPDATE ===> ERROR", "error") }
        else { 
          LOG.save_log("CONFIG UPDATE ===> OK", "worker");
        }
      })
    }
  } catch (error) {
    fs.writeFileSync(path.join(_PATH_CONFIGS_, `station_settings.json`), config, 'utf8', function (err) {
      if (err) { LOG.save_log("CONFIG UPDATE ===> ERROR", "error") }
      else { LOG.save_log("CONFIG UPDATE ===> OK", "worker") }
    })
  }
});
