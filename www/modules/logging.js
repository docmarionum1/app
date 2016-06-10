/*
    Create a logging module that will expose a log function and allow for the
    log to be visible in the DOM.
 */
angular.module('WiFind.Logging', [])
.factory('logger', function($rootScope) {
    return {
        _log: "Enable Debugging to View Log.",
        _scope: null,

        log: function(message) {
            if ($rootScope.settings && $rootScope.settings.debug) {
                this._log += message + "<br/>";

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
