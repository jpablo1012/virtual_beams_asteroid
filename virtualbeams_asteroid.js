'use strict';

angular.module('virtualbeamsAsteroid', [])
.provider('vbaConfig', [
    function () {
      var logPrefix = 'vba->';
      var log = false;
      var logError = false;
      var loginRequired = true;
      var host = '';

      this.setLog = function (value) {
        log = !!value;
      };

      this.setLogError = function (value) {
        log = !!value;
      };

      this.setHost = function (value) {
        host = value;
      };

      this.setLoginRequired = function (value) {
        loginRequired = value;
      };

      this.$get = function () {
        return {
          logPrefix: logPrefix,
          log: log,
          logError: logError,
          host: host,
          loginRequired: loginRequired
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
          asteroid = new Asteroid(vbaConfig.host);
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

        loginPromise(config.loginRequired).then(function () {
          var subscription = asteroid.subscribe(config.nameSubscribe, config.params);
          return $q.when(subscription.ready);
        }).then(function () {
          if (!queries[querySubscribe]) {
            queries[querySubscribe] = self.get().getCollection(config.nameCollection).reactiveQuery({});
            vbaUtils.log(querySubscribe + ' subscribe', queries[querySubscribe].result);

            queries[querySubscribe].on('change', function () {
              vbaUtils.log(querySubscribe + ' change', queries[querySubscribe].result);
              defered.notify(queries[querySubscribe].result);
            });
          }

          defered.notify(queries[querySubscribe].result);
        }).catch(function (error) {
          vbaUtils.error(querySubscribe, error);
          defered.reject(error);
        });

        return defered.promise;
      };
    }
  ]);