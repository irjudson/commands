# nitrogen-switch

This module adds support for switchCommand and switchStatus messages to a Nitrogen application or service.  It also provides the SwitchManager class for interpreting message streams and driving the attached device.

## How to use

1. Add "nitrogen-switch" to the package.json for your service or application.
2. `npm install`

For browser based applications, add this module to the Nitrogen service.  The service will automatically mixin this into the client library that is provided to the browser.