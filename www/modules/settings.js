// List of App Settings
var settings = {
    'enableScanning': {
        type: 'boolean',
        default: true
    }
};

angular.module('app')
.run(function($rootScope) {
    $rootScope.settings = {};

    for (var key in settings) {
        var value = localStorage.getItem(key);
        if (settings[key]['type'] === 'boolean' && value !== undefined) {
            value = value === "true";
        } else {
            value = settings[key]['default'];
        }

        $rootScope.settings[key] = value;

        $rootScope.$watch('settings.' + key, function() {
            localStorage.setItem(key, $rootScope.settings[key]);
        });
    }
});
