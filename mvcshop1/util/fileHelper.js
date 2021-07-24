const fs = require("fs");
exports.deleteFile = (fileLoc) => {
    fs.unlink(fileLoc,(err) => {
        console.log(err);
    })
}