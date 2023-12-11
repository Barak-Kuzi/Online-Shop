const fs = require('fs');
const path = require('path');

const deleteFile = (filePath) => {
    const fullPath = path.join(path.dirname(process.mainModule.filename), filePath);
    fs.unlink(fullPath , (err) => {
        if (err)
            throw (err);
    });
}

exports.deleteFile = deleteFile;