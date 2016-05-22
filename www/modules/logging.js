/*
    Create a logging module that will expose a log function and allow for the
    log to be visible in the DOM.
 */
angular.module('Logging', [])
.factory('logger', function() {
    return {
        _log: "",
        _scope: null,

        log: function(message) {
            this._log += message + "<br/>";

            if (this._scope && !this._scope.$$phase) {
                this._scope.$apply();
            }
        },

        registerLogScope: function(scope) {
            this._scope = scope;
        }
    };
});
