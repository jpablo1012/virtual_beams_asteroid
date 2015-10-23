'use strict';

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

      this.loginRequired = function () {
        console.warn('vbaConfigProvider.loginRequired(true|false) has been deprecated');
        console.info('use vbaConfigProvider.loginRequiredInCalls(true|false) and vbaConfigProvider.loginRequiredInSubscribes(true|false)');
      };

      this.ssl = function (value) {
        _ssl = !!value;
      };

      this.extraData = function (value) {
        _extraData = value;
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
          extraData: _extraData
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
          $rootScope.$on('virtualbeamsAsteroidLoginError', function () {
            defered.reject();
          });
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

          asteroid.on('loginError', function (err) {
            $rootScope.$broadcast('virtualbeamsAsteroidLoginError', err);
          });
        }
        return asteroid;
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
        var subscription;
        config.params = config.params || {};

        var notify = function (result) {
          if (typeof config.filter === 'function') {
            result = config.filter(result);
          }

          defered.notify(result);
        };

        if (sendExtraData) {
          config.params.extraData = getExtraData(sendExtraData);
        }

        //no more i love you's
        loginPromise(loginRequired).then(function () {
          subscription = asteroid.subscribe(config.nameSubscribe, config.params);

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

        if (config.returnInstance) {
          return {promise: defered.promise, instance: subscription};
        } else {
          return defered.promise;
        }
      };
    }
  ]);