const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

// disk storage configuration for multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/images/uploads'); // Set the destination for uploaded files
    },
    filename: function (req, file, cb) {
        crypto.randomBytes(12, function (err, name){
            const fn=name.toString('hex') + path.extname(file.originalname); // Generate a unique filename
                cb(null, fn); // Set the filename with the unique suffix and original file extension

        })
      }
});


// export the multer upload instance
const upload = multer({ storage:storage });

module.exports = upload; // Export the configured multer instance for use in other files