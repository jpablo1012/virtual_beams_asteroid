'use strict';

angular.module('virtualbeamsAsteroid', [])
.provider('vbaConfig', [
    function () {
      var _logPrefix = 'vba->';
      var _host = '';
      var _log = false;
      var _logError = false;
      var _loginRequired = false;
      var _ssl = false;

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

      this.loginRequired = function (value) {
        _loginRequired = value;
      };

      this.ssl = function (value) {
        _ssl = !!value;
      };

      this.setLog = function (value) {
        console.warn('vbaConfigProvider.setLog(true|false) has been deprecated, use vbaConfigProvider.log(true|false)');
        _log = !!value;
      };

      this.setLogError = function (value) {
        console.warn('vbaConfigProvider.setLogError(true|false) has been deprecated, use vbaConfigProvider.logError(true|false)');
        _logError = !!value;
      };

      this.setHost = function (value) {
        console.warn('vbaConfigProvider.setHost("host") has been deprecated, use vbaConfigProvider.host("host")');
        _host = value;
      };

      this.setLoginRequired = function (value) {
        console.warn('vbaConfigProvider.setLoginRequired(true|false) has been deprecated, use vbaConfigProvider.loginRequired(true|false)');
        _loginRequired = value;
      };

      this.$get = function () {
        return {
          logPrefix: _logPrefix,
          host: _host,
          log: _log,
          logError: _logError,
          loginRequired: _loginRequired,
          ssl: _ssl
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

        loginRequired = angular.isUndefined(loginRequired) ? vbaConfig.loginRequired : loginRequired;

        if (self.get().userId || !loginRequired) {
          defered.resolve();
        } else {
          $rootScope.$on('virtualbeamsAsteroidLogin', function () {
            defered.resolve();
          });
        }

        return defered.promise;
      };

      self.get = function () {
        if (typeof asteroid === 'undefined') {
          asteroid = new Asteroid(vbaConfig.host, vbaConfig.ssl);
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
        }
        return asteroid;
      };

      self.call = function () {
        var args = Array.prototype.slice.call(arguments);
        var method = args.shift();
        var defered = $q.defer();
        var promise = self.get().apply(method, args);

        $q.when(promise.result).then(function (result) {
          vbaUtils.log(method, result);
          defered.resolve(result);
        }, function (error) {
          vbaUtils.error(method, error);
          defered.reject(error);
        });
        return defered.promise;
      };

      self.subscribe = function (config) {
        var defered = $q.defer();
        var querySubscribe = config.nameSubscribe + (config.id ? config.id : '');
        
        var notify = function (result) {
          if (typeof config.filter === 'function') {
            result = config.filter(result);
          }

          defered.notify(result);
        };

        loginPromise(config.loginRequired).then(function () {
          var subscription = asteroid.subscribe(config.nameSubscribe, config.params);
          return $q.when(subscription.ready);
        }).then(function () {
          if (!queries[querySubscribe] || config.force) {
            queries[querySubscribe] = self.get().getCollection(config.nameCollection).reactiveQuery(config.selector || {});
            vbaUtils.log(querySubscribe + ' subscribe', queries[querySubscribe].result);

            queries[querySubscribe].on('change', function () {
              vbaUtils.log(querySubscribe + ' change', queries[querySubscribe].result);
              notify(queries[querySubscribe].result);
            });
          }

          notify(queries[querySubscribe].result);
        }).catch(function (error) {
          vbaUtils.error(querySubscribe, error);
          defered.reject(error);
        });

        return defered.promise;
      };
    }
  ]);