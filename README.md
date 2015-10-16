# Virtual Beams Asteroid

An implementation of Asteroid with Angular.

##Table of contents

* [Installation](#installation)

* [Configuration](#configuration)

    * [vbaConfigProvider](#vbaconfigprovider)

* [API](#api)

    * [vbaService](#vbaservice)

    * [vbaUtils](#vbautils)

---

##Installation

First, dowload the library with bower:

    bower install virtual-beams-asteroid

Then, add this in your html:

    <script src="bower_components/angular/angular.js"></script>
    <script src="bower_components/ddp.js/src/ddp.js"></script>
    <script src="bower_components/q/q.js"></script>
    <script src="bower_components/asteroid/dist/asteroid.browser.js"></script>
    <script src="bower_components/virtual-beams-asteroid/virtualbeams_asteroid.js"></script>

For documentation and installation of **Asteroid** see https://github.com/mondora/asteroid

Add `virtualbeamsAsteroid` to your app’s dependencies module.

```js
angular
  .module('yourApp', [
    'virtualbeamsAsteroid'
  ]);
```

---

##Configuration

###vbaConfigProvider

---

####logPrefix(prefix)

Set logPrefix.

**Arguments**

* `prefix` **String** *required*.

***Default***: `'vba->'`.

---

####host(host)

Set host.

**Arguments**

* `host` **String** *required*.

***Default***: `''`.

---

####ssl(isSSLActive)

Set ssl.

**Arguments**

* `isSSLActive` **Boolean** *required*.

***Default***: `false`.

---

####log(isLog)

Set log.

**Arguments**

* `isLog` **Boolean** *required*.

***Default***: `false`.

---

####logError(isLogError)

Set logError.

**Arguments**

* `isLogError` **Boolean** *required*.

***Default***: `false`.

---

####loginRequired(loginIsRequired)

Set loginRequired.

**Arguments**

* `loginIsRequired` **Boolean** *required*.

***Default***: `false`.

---

####Example

```js
angular.module('yourApp')
  .config(['vbaConfigProvider', function (vbaConfigProvider) {
    vbaConfigProvider.logPrefix('yourApp->');
    vbaConfigProvider.host('localhost:3000');
    vbaConfigProvider.ssl(true);
    vbaConfigProvider.log(true);
    vbaConfigProvider.logError(true);
    vbaConfigProvider.loginRequired(false);
  }]);
```

---

##API

###vbaService

---

####get()

Creates a new Asteroid instance if is undefined.

**Return**

An Asteroid instance.

---

####call(method, params...)

Calls a server-side method with the specified arguments.

**Arguments**

* `method` **String** *required*.

* `params...` *optional*.

**Return**

An Angular promise.

---

####subscribe(config)

Subscribes to the specified subscription.

This function **only** *notify* to the promise when data collection changes.

**Arguments**

* `config` **Object**

    * `nameSubscribe` **String** *required*

    * `nameCollection` **String** *required*

    * `id` **String** *optional*, ***default***: `''`

    * `params` **Any** *optional*, ***default***: `undefined`

    * `force` **Boolean** *optional*, ***default***: `false`

    * `loginRequired` **Boolean** *optional*, ***default***: `false`

    * `selector` **Object | Function** *optional*, ***default***: `{}`

    * `filter` **Function** *optional*, ***default***: `undefined`

**Return**

An Angular promise.

---

###vbaUtils

---

####log(params...)

If `vbaconfigprovider.log` is true then call:

`console.log(vbaConfigProvider.logPrefix, params...)`

---

####error(params...)

If `vbaconfigprovider.logError` is true then call:

`console.error(vbaConfigProvider.logPrefix, params...)`