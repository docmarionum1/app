angular
.module('Logging', [])
.factory('logger', function() {
    return {
        _log: "",
        _scope: null,

        log: function(message) {
            this._log += message + "\n";

            if (this._scope && !this._scope.$$phase) {
                this._scope.$apply();
            }
        },

        registerLogScope: function(scope) {
            this._scope = scope;
        }
    };
});
