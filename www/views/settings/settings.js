angular.module('WiFind.controllers')
.controller('SettingsCtrl', function($scope, scanning) {
    $scope.$watch(
        'settings.pollingIntensity',
        scanning.configureBackgroundGeoLocation
    );
});
