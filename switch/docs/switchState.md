# switchState Schema

switchState messages carry the current state of a [switch](switch.md) device in its body.

* response_to (id, required): The switchCommand message id that initiated this state change.

* body (object, required):
	* on (number, required): The degree that this switch is open on a scale of 0.0 (representing completely closed) to 1.0 (representing completely open).