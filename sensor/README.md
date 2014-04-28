# nitrogen-sensor

This module adds support for sensorCommand messages to a Nitrogen application or service.  It also provides the SensorManager class for interpreting message streams and driving the attached device.

Sensor devices are devices that rely telemetry in a one way direction. For example, a thermometer, humidity, or pressure sensor.  SensorCommands control the frequency with which this telemetry is relayed to the cloud, as expressed in milliseconds between samples.

This module also houses a number of common telemetry message types like temperature, pressure, etc.

## How to use

1. Add "nitrogen-sensor" to the package.json for your service or application.
2. `npm install`

For browser based applications, add this module to the Nitrogen service.  The service will automatically mixin this into the client library that is provided to the browser.