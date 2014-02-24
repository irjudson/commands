# nitrogen-reactor

This module adds support for reactorCommand and reactorStatus messages. These messages
are used to control a Nitrogen reactor. It also provides the ReactorManager class for interpreting message streams and driving the attached reactor. This project is by default 
included in the Nitrogen service and therefore is available by default.

## Nitrogen Project

The Nitrogen project is housed in a set of GitHub projects:

1. [service](https://github.com/nitrogenjs/service): Core platform responsible for managing principals, security, and messaging.
2. [client](https://github.com/nitrogenjs/client): JavaScript client library for building Nitrogen devices and applications.
3. [admin](https://github.com/nitrogenjs/admin): Administrative tool for managing the Nitrogen service.
4. [device](https://github.com/nitrogenjs/devices): Adaptors for common pieces of hardware.
5. [commands](https://github.com/nitrogenjs/commands): CommandManagers and schemas for well known command types.
6. [cli](https://github.com/nitrogenjs/cli): Command line interface for working with a Nitrogen service.
7. [reactor](https://github.com/nitrogenjs/reactor): Always-on hosted application execution platform.