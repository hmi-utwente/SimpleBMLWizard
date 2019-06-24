# SimpleBMLWizard
Simple web panel with customizable layout, forwarding speech messages to middleware. This wizard is not yet capable of other things than speech.

## Requirements
* ActiveMQ
* Node.js

## Installation
* Run `npm install` to install the required packages
* Make sure to install an ActiveMQ service

## Setup
* In `settings.json` you can set the IP of the middleware, the topics, the Unity Agent.

## Run
* Use the `wizard.cmd` to run the wizard
* You can go to http://localhost:5601/ for the wizard interface
* In `/dialogs/default.json`, you can find all the dialog options
* Make sure that when ASAP is running, it listens to the correct topic of the Wizard.
* Have a Unity agent that responds to the correct topic

