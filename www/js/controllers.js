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

.controller('NetworksCtrl', function($scope, $timeout, $ionicPlatform, $http, $ionicPopup, API, localStorageService) {
    $scope.enableScanning = localStorage.getItem('enableScanning') === "true";

    $scope.tryUpload = function() {
        // If we have a network connection and at least 10 scan results
        var keys = localStorageService.keys();
        var online = navigator.connection.type !== Connection.NONE;
        if (online && keys.length >= 10) {
            var scans = {scans: []};

            for (var i = 0; i < keys.length; i++) {
                scans.scans.push(localStorageService.get(keys[i]));
            }

            // Try posting scans
            $http.post(API.url, scans).then(function() {
                // If successful remove scans from storage
                for (var i = 0; i < keys.length; i++) {
                    localStorageService.remove(keys[i]);
                }
            }, function(res) {
                $scope.networks.push({SSID: res, level:0});
            });
        }
    };

    $ionicPlatform.ready(function() {
        var scan = function(location) {
            WifiWizard.getScanResults(function(results) {
                // Convert results format for API
                var readings = [];
                for (var i = 0; i < results.length; i++) {
                    readings.push({
                        level: results[i].level,
                        BSSID: results[i].BSSID,
                        SSID: results[i].SSID,
                        caps: results[i].capabilities,
                        freq: results[i].frequency
                    });
                }

                // Create scanResults object for API
                var scanResults = {
                    device_model: device.model,
                    droid_version: device.version,
                    app_version: "0.0",
                    device_mac: device.uuid,

                    time: location.time,

                    altitude: location.altitude,
                    lat: location.latitude,
                    lng: location.longitude,
                    acc: location.accuracy,

                    readings: readings
                };

                // Save scanResults for bulk upload later
                localStorageService.set(location.time, scanResults);

                // Attempt to upload if conditions are right
                $scope.$apply(function () {
                    $scope.tryUpload();

                    $scope.networks = results;
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
                $scope.networks = [{SSID: error, level: 0}];
            });
        }

        backgroundGeoLocation.configure(scan, scanError, {
            desiredAccuracy: 10,
            stationaryRadius: 5,
            distanceFilter: 5,
            debug: false, // <-- enable this hear sounds for background-geolocation life-cycle.
            stopOnTerminate: true, // <-- enable this to clear background location settings when the app terminates
            locationService: backgroundGeoLocation.service.ANDROID_FUSED_LOCATION,
            interval: 10000,
            fastestInterval: 2000,
            activitiesInterval: 10000
        });

        $scope.handleScanningSetting = function(enable) {
            if (enable) {
                backgroundGeoLocation.start();
            } else {
                backgroundGeoLocation.stop();
                $scope.networks = [];
            }

            //plugins.toast.show('toggle', 'long', 'bottom');
        };

        $scope.handleScanningSetting($scope.enableScanning);

        $scope.toggleScanning = function() {
            $scope.enableScanning = !$scope.enableScanning;
            localStorage.setItem('enableScanning', $scope.enableScanning);
            $scope.handleScanningSetting($scope.enableScanning);
        };
    });
})

.controller('AboutCtrl', function() {});
