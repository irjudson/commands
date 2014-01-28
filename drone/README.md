# nitrogen-drone

This module adds support for droneCommand and droneStatus messages to a Nitrogen application or service.  It also provides the DroneManager class for interpreting message streams and driving the attached device.

Light commands are used to control light devices that have hue, brightness, saturation, and on/off control.

## How to use

1. Add "nitrogen-drone" to the package.json for your service or application.
2. `npm install`

For browser based applications, add this module to the Nitrogen service.  The service will automatically mixin this into the client library that is provided to the browser.