// List of App Settings
var settings = {
    'enableScanning': {
        type: 'boolean',
        default: true
    },
    'uploadMacAddress': {
        type: 'boolean',
        default: false
    },
    'debug': {
        type: 'boolean',
        default: false
    },
    'pollingIntensity': {
        type: 'select',
        default: 'medium'
    },
    'autostart': {
        type: 'boolean',
        default: false
    }
};

angular.module('WiFind.app')
.run(function($ionicPlatform, $rootScope, logger) {
    $ionicPlatform.ready(function() {
        $rootScope.settings = {};
        var prefs = plugins.appPreferences;

        for (var key in settings) {
            (function(key) {
                prefs.fetch(key).then(function(value) {
                    if (value === null) {
                        $rootScope.settings[key] = settings[key]['default'];
                    } else {
                        $rootScope.settings[key] = value;
                    }
                }, function(error) {
                    $rootScope.settings[key] = settings[key]['default'];
                });

                $rootScope.$watch('settings.' + key, function() {
                    prefs.store(key, $rootScope.settings[key]);
                    logger.log(key + '=' + $rootScope.settings[key]);
                });
            })(key);
        }
    });
});
