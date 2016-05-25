// List of App Settings
var settings = {
    'enableScanning': {
        type: 'boolean',
        default: true
    },
    'uploadMacAddress': {
        type: 'boolean',
        default: false
    }
};

angular.module('WiFind.app')
.run(function($rootScope) {
    $rootScope.settings = {};

    for (var key in settings) {
        var value = localStorage.getItem('WiFind.'+key);
        if (settings[key]['type'] === 'boolean' && value !== undefined) {
            value = value === "true";
        } else {
            value = settings[key]['default'];
        }

        $rootScope.settings[key] = value;

        (function(key) {
          $rootScope.$watch('settings.' + key, function() {
              localStorage.setItem('WiFind.'+key, $rootScope.settings[key]);
          });
        })(key);
    }
});
