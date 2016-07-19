// Controls loading and saving app settings.

// ## settings


var settings = {
    // Whether to enable or disable scanning for wifi.
    'enableScanning': {
        type: 'boolean',
        default: true
    },
    // Whether to upload the user's phone's mac address when storing wifi data.
    'uploadMacAddress': {
        type: 'boolean',
        default: false
    },
    // Debugging mode enables the log
    'debug': {
        type: 'boolean',
        default: false
    },
    // How intense to poll - either "low", "medium" or "high".
    // See [scanning](scanning.html#section-37) for details.
    'pollingIntensity': {
        type: 'select',
        default: 'medium'
    },
    // Whether to start the app automatically when the phone boots up.
    'autostart': {
        type: 'boolean',
        default: false
    }
};

angular.module('WiFind.app')
.run(function($ionicPlatform, $rootScope, logger) {
    // The settings module isn't used directly.  Instead it loads the settings
    // into the `$rootScope` when the app starts up and other components
    // of the app read the settings from there.  This module watches for any
    // changes to the settings and if there are, saves the change.
    $ionicPlatform.ready(function() {
        $rootScope.settings = {};
        var prefs = plugins.appPreferences;

        // For each of the settings, try to load it.
        for (var key in settings) {
            (function(key) {
                prefs.fetch(key).then(function(value) {
                    if (value === null) {
                        // When the setting is currently null, use the default
                        // value.
                        $rootScope.settings[key] = settings[key]['default'];
                    } else {
                        $rootScope.settings[key] = value;
                    }
                }, function(error) {
                    $rootScope.settings[key] = settings[key]['default'];
                });

                // Watch for changes to settings and store the new values.
                $rootScope.$watch('settings.' + key, function() {
                    prefs.store(key, $rootScope.settings[key]);
                    logger.log(key + '=' + $rootScope.settings[key]);
                });
            })(key);
        }
    });
});
