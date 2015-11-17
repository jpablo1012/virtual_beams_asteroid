'use strict';

(function () {
  var loginThen = function (err, res, self, defered) {
    var key = self._host + '__' + self._instanceId + '__login_token__';
    var vars = ['userId', 'loggedIn'];
    var alter = Array.isArray(self._runData) ? self._runData : [];
    vars =  alter.concat(vars);

    if (err) {
      for (var i = 0; i < vars.length; i++) {
        delete self[vars[i]];
      }

      Asteroid.utils.multiStorage.del(key);
      defered.reject(err);
      self._emit('loginError', err);
    } else {
      self.userId = res.id;
      self.loggedIn = true;

      for (var j = 0; j < alter.length; j++) {
        self[alter[j]] = res[alter[j]];
      }

      Asteroid.utils.multiStorage.set(key, res.token);
      self._emit('login', res);
      defered.resolve(res);
    }
  };

  var VBAsteroid = function (host, ssl, config) {
    Asteroid.utils.must.beString(host);
    this._instanceId ='0';
    this._host = (ssl ? "https://" : "http://") + host;
    this.collections = {};
    this.subscriptions = {};
    this._subscriptionsCache = {};
    this._setDdpOptions(host, ssl);

    this._loginMethod = config.loginMethod;
    this._resumeMethod = config.resumeMethod;
    this._logoutMethod = config.logoutMethod;
    this._runData = config.runData;

    this._init();
  };

  VBAsteroid.prototype = Asteroid.prototype;
  VBAsteroid.prototype.constructor = VBAsteroid;
  VBAsteroid.utils = Asteroid.utils;
  window.Asteroid = VBAsteroid;

  Asteroid.prototype.loginWithPassword = function (usernameOrEmail, password, data) {
    var self = this;
    var defered = Q.defer();

    var params = {
      password: password,
      user: {
        username: Asteroid.utils.isEmail(usernameOrEmail) ? undefined : usernameOrEmail,
        email: Asteroid.utils.isEmail(usernameOrEmail) ? usernameOrEmail : undefined
      }
    };

    self.ddp.method(self._loginMethod, [params, data], function (err, res) {
      loginThen(err, res, self, defered);
    });

    return defered.promise;
  };

  Asteroid.prototype._tryResumeLogin = function () {
    var self = this;
    var key = self._host + '__' + self._instanceId + '__login_token__';

    return Q().then(function () {
      return Asteroid.utils.multiStorage.get(key);
    }).then(function (token) {
      if (!token) {
        self._emit('loginError');
        throw new Error('No login token');
      }

      return token;
    }).then(function (token) {
      var defered = Q.defer();
      var params = {
        resume: token
      };

      self.ddp.method(self._resumeMethod, [params], function (err, res) {
        loginThen(err, res, self, defered);
      });

      return defered.promise;
    });
  };

  Asteroid.prototype.logout = function (data) {
    var self = this;
    var key = self._host + '__' + self._instanceId + '__login_token__';

    return Q().then(function () {
      return Asteroid.utils.multiStorage.get(key);
    }).then(function (token) {
      var defered = Q.defer();

      self.ddp.method(self._logoutMethod, [token, data], function (err) {
        if (err) {
          self._emit('logoutError', err);
          defered.reject(err);
        } else {
          var vars = ['userId', 'loggedIn'];
          vars = Array.isArray(self._runData) ? self._runData.concat(vars) : vars;

          for (var i = 0; i < vars.length; i++) {
            delete self[vars[i]];
          }

          Asteroid.utils.multiStorage.del(key);
          self._emit('logout');
          defered.resolve();
        }
      });

      return defered.promise;
    });
  };
})();

angular.module('virtualbeamsAsteroid', [])
.provider('vbaConfig', [
    function () {
      var _logPrefix = 'vba->';
      var _host = '';
      var _log = false;
      var _logError = false;
      var _loginRequiredInCalls = false;
      var _loginRequiredInSubscribes = false;
      var _ssl = false;
      var _extraData = false;
      var _loginMethod = 'login';
      var _resumeMethod = 'login';
      var _logoutMethod = 'logout';
      var _runData = [];

      this.logPrefix = function (value) {
        _logPrefix = value;
      };

      this.host = function (value) {
        _host = value;
      };

      this.log = function (value) {
        _log = !!value;
      };

      this.logError = function (value) {
        _logError = !!value;
      };

      this.loginRequiredInCalls = function (value) {
        _loginRequiredInCalls = value;
      };

      this.loginRequiredInSubscribes = function (value) {
        _loginRequiredInSubscribes = value;
      };

      this.ssl = function (value) {
        _ssl = !!value;
      };

      this.extraData = function (value) {
        _extraData = value;
      };

      this.loginMethod = function (value) {
        _loginMethod = value;
      };

      this.resumeMethod = function (value) {
        _resumeMethod = value;
      };

      this.logoutMethod = function (value) {
        _logoutMethod = value;
      };

      this.runData = function (value) {
        _runData = value;
      };

      this.$get = function () {
        return {
          logPrefix: _logPrefix,
          host: _host,
          log: _log,
          logError: _logError,
          loginRequiredInCalls: _loginRequiredInCalls,
          loginRequiredInSubscribes: _loginRequiredInSubscribes,
          ssl: _ssl,
          extraData: _extraData,
          loginMethod: _loginMethod,
          resumeMethod: _resumeMethod,
          logoutMethod: _logoutMethod,
          runData: _runData
        };
      };
    }
  ])
.service('vbaUtils', [
    'vbaConfig',
    function (vbaConfig) {
      this.log = function () {
        if (vbaConfig.log) {
          var args = Array.prototype.slice.call(arguments);
          args.unshift(vbaConfig.logPrefix);
          console.log.apply(console, args);
        }
      };

      this.error = function () {
        if (vbaConfig.logError) {
          var args = Array.prototype.slice.call(arguments);
          args.unshift(vbaConfig.logPrefix);
          console.error.apply(console, args);
        }
      };
    }
  ])
.service('vbaService', [
    '$rootScope',
    '$q',
    'vbaUtils',
    'vbaConfig',
    function ($rootScope, $q, vbaUtils, vbaConfig) {

      var asteroid;
      var self = this;
      var queries = {};

      var loginPromise = function (loginRequired) {
        var defered = $q.defer();

        if (self.get().userId || !loginRequired) {
          defered.resolve();
        } else {
          $rootScope.$on('virtualbeamsAsteroidLogin', function () {
            defered.resolve();
          });
          // $rootScope.$on('virtualbeamsAsteroidLoginError', function () {
          //   defered.reject();
          // });
        }

        return defered.promise;
      };

      var getExtraData = function (extra) {
        var aste = self.get();
        var key;

        if (extra === true) {
          key = aste._host + '__' + aste._instanceId + '__login_token__';
        } else if (extra !== false) {
          key = extra;
        }

        return localStorage[key];
      };

      self.get = function () {
        if (typeof asteroid === 'undefined') {
          asteroid = new Asteroid(vbaConfig.host, vbaConfig.ssl, vbaConfig);
          vbaUtils.log('asteroid', asteroid);

          asteroid.on('connected', function () {
            vbaUtils.log('connected');
            $rootScope.$broadcast('virtualbeamsAsteroidConnected');
          });

          asteroid.on('login', function (idUser) {
            vbaUtils.log('login', idUser);
            $rootScope.$broadcast('virtualbeamsAsteroidLogin', idUser);
          });

          asteroid.on('logout', function () {
            vbaUtils.log('logout');
            $rootScope.$broadcast('virtualbeamsAsteroidLogout');
          });

          asteroid.on('loginError', function (err) {
            $rootScope.$broadcast('virtualbeamsAsteroidLoginError', err);
          });
        }
        return asteroid;
      };

      self.login = function (config) {
        var defered = $q.defer();
        var promise = this.get().loginWithPassword(config.usernameOrEmail, config.password, config.data);

        $q.when(promise).then(function (data) {
          vbaUtils.log('login', data);
          defered.resolve(data);
        }, function (error) {
          vbaUtils.error('login error', error);
          defered.reject(error);
        });

        return defered.promise;
      };

      self.logout = function (data) {
        var defered = $q.defer();
        var promise = this.get().logout(data);

        $q.when(promise).then(function (data) {
          vbaUtils.log('logout', data);
          defered.resolve(data);
        }, function (error) {
          vbaUtils.error('logout error', error);
          defered.reject(error);
        });

        return defered.promise;
      };

      self.call = function (method, data, config) {
        config = config || {};
        data = data || {};
        var defered = $q.defer();
        var extraData = vbaConfig.extraData || config.extraData;
        var loginRequired = angular.isUndefined(config.loginRequired) ? vbaConfig.loginRequiredInCalls : config.loginRequired;

        if (extraData) {
          data.extraData = getExtraData(extraData);
        }


        loginPromise(loginRequired).then(function () {
          var promise = self.get().call(method, data);
          return $q.when(promise.result);
        }).then(function (result) {
          vbaUtils.log(method, result);
          defered.resolve(result);
        }).catch(function (error) {
          vbaUtils.error(method, error);
          defered.reject(error);
        });

        return defered.promise;
      };

      self.subscribe = function (config) {
        var defered = $q.defer();
        var querySubscribe = config.nameSubscribe + (config.id ? config.id : '');
        var sendExtraData = vbaConfig.extraData || config.extraData;
        var loginRequired = angular.isUndefined(config.loginRequired) ? vbaConfig.loginRequiredInSubscribes : config.loginRequired;
        config.params = config.params || {};

        var notify = function (result) {
          if (typeof config.filter === 'function') {
            result = config.filter(result);
          }

          vbaUtils.log(querySubscribe + ' change', result);
          defered.notify(result);
        };

        var onChange = function () {
          notify(queries[querySubscribe].result);
        };

        var onDestroy = function () {
          if (config.scope) {
            config.scope.$on('$destroy', function () {
              queries[querySubscribe].off('change', onChange);
              delete queries[querySubscribe];
            });
          }
        };

        if (sendExtraData) {
          config.params.extraData = getExtraData(sendExtraData);
        }
        //no more i love you's
        loginPromise(loginRequired).then(function () {
          var subscription = asteroid.subscribe(config.nameSubscribe, config.params);

          return $q.when(subscription.ready);
        }).then(function () {
          if (!queries[querySubscribe]) {
            queries[querySubscribe] = self.get().getCollection(config.nameCollection).reactiveQuery(config.selector || {});
            vbaUtils.log(querySubscribe + ' subscribe');
            onDestroy();
          } else {
            queries[querySubscribe].off('change', onChange);
          }

          queries[querySubscribe].on('change', onChange);
          notify(queries[querySubscribe].result);
        }).catch(function (error) {
          vbaUtils.error(querySubscribe, error);
          defered.reject(error);
        });

        return defered.promise;
      };

      self.getSubscription = function (config) {
        var subscriptions = self.get().subscriptions;
        var keys =  Object.keys(subscriptions);
        for (var i = 0; i < keys.length; i++) {
          var subscription = subscriptions[keys[i]];

          if (subscription._name === config.nameSubscribe) {
            return subscription;
          }
        }
      };
    }
  ]);
