# switchCommand Schema

switchCommand messages relay switch control commands to devices with that capability.  Required fields:

* on (number, required): The degree that this switch should be open on a scale of 0.0, representing completely closed, and 1.0, representing completely open. The device should reply to the switchCommand with a [switchState](switchCommand.md) message with the response_to field set to the id of this message.