# nitrogen-camera

This module adds support for cameraCommand and cameraStatus messages to a Nitrogen application or service.  It also provides the CameraManager class for interpreting message streams and driving the attached device.

## How to use

1. Add "nitrogen-camera" to the package.json for your service or application.
2. `npm install`

For browser based applications, add this module to the Nitrogen service.  The service will automatically mixin this into the client library that is provided to the browser.

## See also

1. [nitrogen-opencv-camera](http://github.com/nitrogenjs/commands/opencv-camera/): Building on this module, adds motion detection capabilities using OpenCV. 