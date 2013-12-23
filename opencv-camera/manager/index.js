var async = require('async')
  , CameraManager = require('nitrogen-camera').CameraManager
  , cv = require('nitrogen-opencv');

function OpenCVCameraManager() {
    CameraManager.apply(this, arguments);
}

OpenCVCameraManager.DEFAULT_MOTION_THRESHOLD = 0.03;  // 3% of pixels showing motion.

OpenCVCameraManager.prototype = Object.create(CameraManager.prototype);
OpenCVCameraManager.prototype.constructor = OpenCVCameraManager;

OpenCVCameraManager.prototype.detectMotion = function(command, callback) {
    if (this.history.length < 2) return callback(false);

    // load any images that haven't been loaded (in general, should be 1)
    async.map(this.history, function(shot, cb) {
        if (!shot.image) {
            cv.readImage(shot.path, function(err, image) {
                if (err) return console.log(err);
                shot.image = image;
                cb(null, image);
            });
        } else {
            cb(null, shot.image);
        }
    }, function(err, images) {
        if (err) return callback(err);

        // if the images don't match in size, then just fail the comparison.
        if (images[0].width() != images[1].width() || images[0].height() != images[1].height())
            return callback(false);

        var diff1 = new cv.Matrix(images[0].width(), images[0].height());
        diff1.absDiff(images[0], images[1]);

        var thresholdedResult = diff1.threshold(140, 255);
        thresholdedResult.convertGrayscale();

        var totalPixels = images[0].width() * images[0].height();
        var motionPixels = thresholdedResult.countNonZero();

        var motionPercentage = motionPixels / totalPixels;

        var detectedMotion = motionPercentage > (command.body.threshold || OpenCVCameraManager.DEFAULT_MOTION_THRESHOLD);

        console.log('motion detection active: pixels: ' + motionPixels + ' %: ' + motionPercentage + ': ' + detectedMotion);        return callback(detectedMotion);
    });
};

module.exports = OpenCVCameraManager;
