const crypto = require('crypto');
let nonce = crypto.randomBytes(16).toString('base64');
module.exports = nonce;