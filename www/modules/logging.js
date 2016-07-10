/*
    Create a logging module that will expose a log function and allow for the
    log to be visible in the DOM.
 */
angular.module('WiFind.Logging', [])
.factory('logger', function($rootScope, $filter) {
    return {
        _log: "Enable Debugging to View Log.",
        _scope: null,

        log: function(message) {
            if ($rootScope.settings && $rootScope.settings.debug) {
                // Append message to beginning of log and cut off at 10000
                // characters.
                this._log = ($filter('date')(new Date(), 'HH:mm:ss:sss - ') + message + "<br/>" + this._log).substring(0, 10000);

                if (this._scope && !this._scope.$$phase) {
                    this._scope.$apply();
                }
            }
        },

        registerLogScope: function(scope) {
            this._scope = scope;
        }
    };
});
