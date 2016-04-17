angular.module('starter.controllers', [])

.controller('AppCtrl', function($scope, $ionicModal, $timeout) {

    // With the new view caching in Ionic, Controllers are only called
    // when they are recreated or on app start, instead of every page change.
    // To listen for when this page is active (for example, to refresh data),
    // listen for the $ionicView.enter event:
    //$scope.$on('$ionicView.enter', function(e) {
    //});

    // Form data for the login modal
    $scope.loginData = {};

    // Create the login modal that we will use later
    $ionicModal.fromTemplateUrl('templates/login.html', {
        scope: $scope
    }).then(function(modal) {
        $scope.modal = modal;
    });

    // Triggered in the login modal to close it
    $scope.closeLogin = function() {
        $scope.modal.hide();
    };

    // Open the login modal
    $scope.login = function() {
        $scope.modal.show();
    };

    // Perform the login action when the user submits the login form
    $scope.doLogin = function() {
        console.log('Doing login', $scope.loginData);

        // Simulate a login delay. Remove this and replace with your login
        // code if using a login system
        $timeout(function() {
            $scope.closeLogin();
        }, 1000);
    };
})

.controller('NetworksCtrl', function($scope, $timeout, $ionicPlatform, $http, API) {
    $ionicPlatform.ready(function() {
        //var backgroundGeoLocation = plugins.backgroundGeoLocation;

        var scan = function(location) {
            /*$scope.$apply(function () {
                $scope.networks = [{SSID: location, level: 0}];
            });*/

            WifiWizard.getScanResults(function(results) {
                $scope.$apply(function () {
                    $scope.networks = results;
                });

                $http.post(API.url, location).then(function() {
                    $scope.networks.push({SSID: location, level: 0})
                });
            }, function(results) {
                $scope.$apply(function () {
                    $scope.networks.push({SSID: results, level:0});
                });
            });

            backgroundGeoLocation.finish();
        };

        var scanError = function(error) {
            $scope.$apply(function () {
                $scope.networks = [{SSID: error, level: 0}]
            });
        }

        backgroundGeoLocation.configure(scan, scanError, {
            desiredAccuracy: 0,
            stationaryRadius: 1,
            distanceFilter: 1,
            debug: true, // <-- enable this hear sounds for background-geolocation life-cycle.
            stopOnTerminate: true, // <-- enable this to clear background location settings when the app terminates
            locationService: backgroundGeoLocation.service.ANDROID_FUSED_LOCATION,
            //locationTimeout: 10000
            interval: 1000,
            fastestInterval: 1000,
            activitiesInterval: 1000
        });

        backgroundGeoLocation.start();

    });
});
