// A logging module that exposes a log function to allow for the
// log to be visible in the DOM.

angular.module('WiFind.Logging', [])
.factory('logger', function($rootScope, $filter) {
    return {
        // Default log text
        _log: "Enable Debugging to View Log.",

        // The scope containing the in-DOM log
        _scope: null,

        // ## log
        // Add a message to the log prefixed with the timestamp.
        log: function(message) {
            if ($rootScope.settings && $rootScope.settings.debug) {
                // Append message to beginning of log and cut off at 10000
                // characters.
                this._log = ($filter('date')(new Date(), 'HH:mm:ss:sss - ') + message + "<br/>" + this._log).substring(0, 10000);

                // If the scope has been set and it's not currently applying,
                // call apply.
                if (this._scope && !this._scope.$$phase) {
                    this._scope.$apply();
                }
            }
        },

        // ## registerLogScope
        // Register the scope that contains the log so that it can be refreshed
        // when new messages are added to the log.
        registerLogScope: function(scope) {
            this._scope = scope;
        }
    };
});
