angular.module('WiFind.Scanning', ['WiFind.Logging'])
.factory('scanning', function(
    $rootScope, $http,
    logger, API, localStorageService
) {
    var configured = false;
    var currentlyScanning = false;
    var timeout = 0;
    var

    var tryUpload = function() {
        logger.log('tryupload function');
        // If we have a network connection and at least 10 scan results
        var keys = localStorageService.keys();
        var online = navigator.connection.type !== Connection.NONE;
        if (online && keys.length >= 10 && --timeout < 0) {
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

                // If upload fails, don't try uploading for a bit
                timeout = 60;
            });
        }
    };

    var scan = function(location) {
        logger.log('Location Update Triggered!  About to scan wifi!');
        logger.log('lat=' + location.latitude + ' lon=' + location.longitude);

        var scanResults = {
            device_model: device.model,
            droid_version: device.version,
            app_version: $rootScope.APPLICATION_VERSION,
            device_mac: $rootScope.settings.uploadMacAddress ? device.uuid : "",

            time: location.time,

            altitude: location.altitude,
            lat: location.latitude,
            lng: location.longitude,
            acc: location.accuracy,
        };

        // TODO: Figure out if startScan should be called before getScanResults?
        WifiWizard.getScanResults(function(results) {
            // If time has been too long, cancel
            // TODO: figure out time
            if (currentTime - scanResults.time > 1000) {
              return;
            }

            logger.log('Wifi results:')
            logger.log(results.length + ' networks found');
            // Convert results format for API
            var readings = [];

            if (results.length === 0) {
                // If there were no wifi results, add a dummy result
                logger.log('Egad! No wifi scan results!');
                readings.push({
                    BSSID: "",
                    SSID: "",
                    caps: ""
                });
            } else {
                for (var i = 0; i < results.length; i++) {
                    // TODO convert to same units, wifi timestamp is in microseconds since boot
                    // Assuming units are milliseconds
                    if (Math.abs(scanResults.time - resuts[i].timestamp) < 1000) {
                      readings.push({
                          level: results[i].level,
                          BSSID: results[i].BSSID,
                          SSID: results[i].SSID,
                          caps: results[i].capabilities,
                          freq: results[i].frequency
                      });
                    }
                }
            }


            // Create scanResults object for API
            scanResults['readings'] = readings;

            // Save scanResults for bulk upload later
            logger.log('saving results');
            localStorageService.set(location.time, scanResults);

            // Attempt to upload if conditions are right
            $rootScope.$apply(function () {
                tryUpload();

                $rootScope.networks = results;
            });
        }, function(results) {
            logger.log('WifiWizard Error!');
        });

        backgroundGeoLocation.finish();
    };

    var scanError = function(error) {
        logger.log('Scan Error!');
    };

    var handleScanningSetting = function(enable) {
        logger.log('handleScanningSetting');

        if (!configured) {
            logger.log('Not yet configured!');
            return;
        }

        if (enable && !currentlyScanning) {
            logger.log('Enable Scanning');
            backgroundGeoLocation.start();
            currentlyScanning = true;
        } else if (!enable && currentlyScanning) {
            logger.log('Disable Scanning');
            backgroundGeoLocation.stop();
            $rootScope.networks = [];
            currentlyScanning = false;
        }
    };

    var configureBackgroundGeoLocation = function(value) {
        logger.log('configureBackgroundGeoLocation = ' + value);

        if (value === undefined) {
            return;
        }

        if (currentlyScanning) {
            backgroundGeoLocation.stop();
            currentlyScanning = false;
        }

        var conf = {
            debug: false, // <-- enable this hear sounds for background-geolocation life-cycle.
            stopOnTerminate: true, // <-- enable this to clear background location settings when the app terminates
            locationService: backgroundGeoLocation.service.ANDROID_DISTANCE_FILTER,
            notificationTitle: 'WiFind',
            notificationText: 'Background location tracking is enabled.',
        };

        if (value === 'low') {
            conf.desiredAccuracy = 10;
            conf.stationaryRadius = 10;
            conf.distanceFilter = 10;
            conf.locationTimeout = 10;
        } else if (value === 'medium') {
            conf.desiredAccuracy = 10;
            conf.stationaryRadius = 5;
            conf.distanceFilter = 5;
            conf.locationTimeout = 3;
        } else if (value === 'high') {
            conf.desiredAccuracy = 0;
            conf.stationaryRadius = 3;
            conf.distanceFilter = 1;
            conf.locationTimeout = 1;
        }

        logger.log(conf);

        backgroundGeoLocation.configure(scan, scanError, conf);
        configured = true;

        // Start a periodic notification to restart scanning because it seems
        // to periodically stop
        cordova.plugins.notification.local.schedule({
            id: 1,
            title: "WiFind",
            text: "Restarting Scanning",
            //firstAt: monday_9_am,
            every: 120 //every 120 minutes
            //sound: "file://sounds/reminder.mp3",
            //icon: "http://icons.com/?cal_id=1",
            //data: { meetingId:"123#fg8" }
        });

        // Handle when the notification is triggered
        cordova.plugins.notification.local.on("trigger", function (notification) {
            logger.log("RESTARTING SCANNING, BRO");
            //Disable scanning
            handleScanningSetting(false);
            handleScanningSetting($rootScope.settings.enableScanning);

            // Clear the notification automatically
            cordova.plugins.notification.local.clear(1, function () {}, scope);
        });

        handleScanningSetting($rootScope.settings.enableScanning);
    };

    return {
        handleScanningSetting: handleScanningSetting,
        configureBackgroundGeoLocation: configureBackgroundGeoLocation
    };
});
