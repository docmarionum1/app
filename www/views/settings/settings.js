angular.module('WiFind.controllers')
.controller('SettingsCtrl', function($scope, scanning) {
    $scope.$watch(
        'settings.autostart',
        function(autostart) {
            if (autostart) {
                cordova.plugins.autoStart.enable();
            } else if (autostart === false) {
                cordova.plugins.autoStart.disable();
            }
        }
    );
});
