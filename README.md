# virtual Beams Asteroid

A simple implementation of asteroid with angular

##Table of contents

[Installation](#installation)

[Configuration](#configuration)

[API](#api)

##Installation

First, dowload with bower:

    bower install virtual-beams-asteroid

Then, add this in your html

    <script src="bower_components/angular/angular.js"></script>
    <script src="bower_components/ddp.js/src/ddp.js"></script>
    <script src="bower_components/q/q.js"></script>
    <script src="bower_components/asteroid/dist/asteroid.browser.js"></script>
    <script src="bower_components/virtual-beams-asteroid/virtualbeams_asteroid.js"></script>

For Asteroid installation see https://github.com/mondora/asteroid#install

Add `virtualbeamsAsteroid` to your app’s module dependencies.

```
angular
  .module('yourApp', [
    'virtualbeamsAsteroid'
  ]);
````

##Configuration

###vbaConfigProvider

* `setLog(Boolean)`. _default_: `false`

* `setLogError(Boolean)`. _default_: `false`

* `setHost(String)`. _default_: `''`

* `setLoginRequired(Boolean)`. _default_: `true`

##API

