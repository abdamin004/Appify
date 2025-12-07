const fs = require('fs');
const logFile = 'crash_log.txt';
const log = (msg) => {
    console.log(msg);
    fs.appendFileSync(logFile, msg + '\n');
};
const error = (msg) => {
    console.error(msg);
    fs.appendFileSync(logFile, 'ERROR: ' + msg + '\n');
    if (msg.stack) fs.appendFileSync(logFile, msg.stack + '\n');
};

try {
    fs.writeFileSync(logFile, 'Starting debug...\n');
    log('Loading adminController...');
    require('./controllers/adminController');
    log('adminController loaded.');
} catch (err) {
    error(err);
}
