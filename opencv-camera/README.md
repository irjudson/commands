# nitrogen-opencv-camera

This module builds on `nitrogen-camera` and adds motion detection to the available set of executable camera commands via OpenCV.

## How to use

1. Make sure you have the opencv development libraries installed. 
   a. For Mac: sudo port install opencv
   b. For Linux/Raspberry Pi: sudo apt-get install libopencv-dev 
2. Add "nitrogen-opencv-camera" to the package.json for your service or application.
3. `npm install`