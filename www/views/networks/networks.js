angular.module('WiFind.controllers')
.controller('NetworksCtrl', function(
    $scope, $timeout, $http,
    $ionicPlatform, $ionicPopup,
    API, localStorageService, logger
) {
    logger.log('Starting Networks Controller');

    logger.log('enableScanning=' + $scope.settings.enableScanning);

    $scope.tryUpload = function() {
        logger.log('tryupload');
        // If we have a network connection and at least 10 scan results
        var keys = localStorageService.keys();
        var online = navigator.connection.type !== Connection.NONE;
        if (online && keys.length >= 10) {
            logger.log('Commencing upload');
            var scans = {scans: []};

            for (var i = 0; i < keys.length; i++) {
                scans.scans.push(localStorageService.get(keys[i]));
            }
            logger.log('Uploading ' + scans.scans.length + ' scans.');

            // Try posting scans
            $http.post(API.url, scans).then(function() {
                logger.log('Upload success!');
                // If successful remove scans from storage
                for (var i = 0; i < keys.length; i++) {
                    localStorageService.remove(keys[i]);
                }
            }, function(res) {
                logger.log('upload failed :(');
                $scope.networks.push({SSID: res, level:0});
            });
        }
    };

    $ionicPlatform.ready(function() {
        logger.log('ionic ready');
        var scan = function(location) {
            logger.log('Location Update Triggered!  About to scan wifi!');
            logger.log('lat=' + location.latitude + ' lon=' + location.longitude);
            WifiWizard.getScanResults(function(results) {
                logger.log('Wifi results:')
                logger.log(results.length + ' networks found');
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
                    app_version: $scope.APPLICATION_VERSION,
                    device_mac: $scope.settings.uploadMacAddress ? device.uuid : "",

                    time: location.time,

                    altitude: location.altitude,
                    lat: location.latitude,
                    lng: location.longitude,
                    acc: location.accuracy,

                    readings: readings
                };

                // Save scanResults for bulk upload later
                logger.log('saving results');
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
            logger.log('Scan Error!');
        }

        backgroundGeoLocation.configure(scan, scanError, {
            desiredAccuracy: 10,
            stationaryRadius: 5,
            distanceFilter: 5,
            locationTimeout: 1,
            debug: false, // <-- enable this hear sounds for background-geolocation life-cycle.
            stopOnTerminate: true, // <-- enable this to clear background location settings when the app terminates
            locationService: backgroundGeoLocation.service.ANDROID_DISTANCE_FILTER
        });

        $scope.handleScanningSetting = function(enable) {
            logger.log('handleScanningSetting');
            if (enable) {
                logger.log('Enable Scanning');
                backgroundGeoLocation.start();
            } else {
                logger.log('Disable Scanning');
                backgroundGeoLocation.stop();
                $scope.networks = [];
            }

        };

        $scope.$watch(
            'settings.enableScanning',
            $scope.handleScanningSetting
        );
    });
});
