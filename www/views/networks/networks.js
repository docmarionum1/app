angular.module('WiFind.controllers')
.controller('NetworksCtrl', function(
    $scope, $timeout, $http,
    $ionicPlatform, $ionicPopup,
    API, localStorageService, logger, scanning
) {
    $ionicPlatform.ready(function() {
        $scope.$watch(
            'settings.enableScanning',
            scanning.handleScanningSetting
        );
    });
});
