angular.module('WiFind.Scanning', ['WiFind.Logging'])
.factory('scanning', function(
    $rootScope, $http, $filter,
    logger, API, localStorageService
) {
    var configured = false;
    var currentlyScanning = false;
    var timeout = 0;
    var db;
    var uploading = false;
    var tickCounter = 0;

    // Interval to keep app active?
    setInterval(function() {
        // Every hour
        if (++tickCounter == 6) {
            tickCounter = 0;

            // Restart scanning process
            logger.log("RESTARTING SCANNING, BRO");
            //Disable scanning
            handleScanningSetting(false);
            handleScanningSetting($rootScope.settings.enableScanning);
        }
    }, 600000);

    var tryUpload = function() {
        // If we have a network connection and at least 10 scan results
        uploading = true;
        var keys = localStorageService.keys();
        var online = navigator.connection.type !== Connection.NONE;
        if (online && keys.length >= 10 && --timeout < 0) {
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

                uploading = false;
            }, function(res) {
                logger.log('upload failed :(');

                // If upload fails, don't try uploading for a bit
                timeout = 60;

                uploading = false;
            });
        } else {
            uploading = false;
        }
    };

    var scan = function(location) {
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
            acc: location.accuracy
        };

        logger.log("Before Scan");
        WifiWizard.scan(function(results) {
            logger.log("Scan Returned");
            var scan_distance = ((new Date().getTime() - location.time)/1000 * location.speed);
            logger.log("Distance = " + scan_distance);
            if (scan_distance > 10) {
                logger.log("scan distance too far!");
                return;
            }

            //scanResults['acc'] = location.accuracy + Math.ceil((new Date().getTime() - location.time)/1000 * location.speed);

            logger.log(results.length + ' networks found');

            $rootScope.stats.current = results.length;
            storeStats(results.length);

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
                    readings.push({
                        level: results[i].level,
                        BSSID: results[i].BSSID,
                        SSID: results[i].SSID,
                        caps: results[i].capabilities,
                        freq: results[i].frequency
                    });
                }
            }

            // Create scanResults object for API
            scanResults['readings'] = readings;

            // Save scanResults for bulk upload later
            logger.log('saving results');
            localStorageService.set(location.time, scanResults);

            // Attempt to upload if conditions are right
            $rootScope.$apply(function () {
                if (!uploading) {
                    tryUpload();
                }

                $rootScope.networks = results;
            });
        }, function(results) {
            logger.log('WifiWizard Error!');
        });

        //backgroundGeoLocation.finish();
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

    var storeStats = function(count) {
        db.executeSql("select scan_count from scan_counts WHERE day=date(datetime('now', 'localtime'));", [], function(resultSet) {
            if (resultSet.rows.length == 0) {
                db.executeSql("insert into scan_counts values(date(datetime('now', 'localtime'))," + count + ")", [], function(resultSet) {
                    updateStats();
                });
            } else {
                var new_count = resultSet.rows.item(0).scan_count + count;
                db.executeSql("update scan_counts set scan_count = " + new_count + " where day=date(datetime('now', 'localtime'));", [], function(resultSet) {
                    updateStats();
                });
            }
        });
    };

    var updateStats = function() {
        var sql = "select (select sum(scan_count) from scan_counts) as total, (select scan_count from scan_counts where day=date(datetime('now', 'localtime'))) as today, (select scan_count from scan_counts where day=date(datetime('now', 'localtime'), '-1 day')) as yesterday, (select sum(scan_count) from scan_counts where strftime('%m',day)=strftime('%m','now')) as month;";
        db.executeSql(sql, [], function(resultSet) {
            $rootScope.stats.total = resultSet.rows.item(0).total !== null ? resultSet.rows.item(0).total : 0;
            $rootScope.stats.today = resultSet.rows.item(0).today !== null ? resultSet.rows.item(0).today : 0;
            $rootScope.stats.yesterday = resultSet.rows.item(0).yesterday !== null ? resultSet.rows.item(0).yesterday : 0;
            $rootScope.stats.month = resultSet.rows.item(0).month !== null ? resultSet.rows.item(0).month : 0;
            if (!$rootScope.$$phase) {
                $rootScope.$apply();
            }
        });
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
            stopOnTerminate: false, // <-- enable this to clear background location settings when the app terminates
            locationService: backgroundGeoLocation.provider.ANDROID_DISTANCE_FILTER_PROVIDER,
            notificationTitle: 'WiFind',
            notificationText: 'Background location tracking is enabled.',
            startOnBoot: $rootScope.settings.autostart
        };

        if (value === 'low') {
            conf.desiredAccuracy = 10;
            conf.stationaryRadius = 10;
            conf.distanceFilter = 10;
            conf.interval = 10000;
        } else if (value === 'medium') {
            conf.desiredAccuracy = 10;
            conf.stationaryRadius = 5;
            conf.distanceFilter = 5;
            conf.interval = 3000;
        } else if (value === 'high') {
            conf.desiredAccuracy = 0;
            conf.stationaryRadius = 3;
            conf.distanceFilter = 1;
            conf.interval = 1000;
        }

        backgroundGeoLocation.configure(scan, scanError, conf);
        configured = true;

        handleScanningSetting($rootScope.settings.enableScanning);
    };

    var loadStats = function() {
        $rootScope.stats = {
            current: 0,
            total: -1,
            today: -1,
            yesterday: -1,
            month: -1
        };

        db = window.sqlitePlugin.openDatabase({ name: 'wifind.db', location: 'default', androidDatabaseImplementation: 2}, function (db) {
            db.executeSql('CREATE TABLE IF NOT EXISTS scan_counts (day date, scan_count integer)', [], function(resultSet) {
                updateStats();
            }, function(error) {
                console.log('Create Table ERROR: ' + JSON.stringify(error));
            });
        }, function (error) {
            console.log('Open database ERROR: ' + JSON.stringify(error));
        });
    };

    var init = function() {
        // Start a periodic notification to restart scanning because it seems
        // to periodically stop
        // Frequency in minutes
        cordova.plugins.notification.local.clear(1, function () {});
        /*var freq = 1;
        cordova.plugins.notification.local.schedule({
            id: 1,
            title: "WiFind",
            text: "Restarting",
            at: new Date(new Date().getTime() + freq*60),
            every: freq //every 120 minutes
        });

        // Handle when the notification is triggered
        cordova.plugins.notification.local.on("trigger", function (notification) {
            logger.log("RESTARTING SCANNING, BRO");
            //Disable scanning
            handleScanningSetting(false);
            handleScanningSetting($rootScope.settings.enableScanning);

            // Clear the notification automatically
            cordova.plugins.notification.local.clear(1, function () {});
        });*/

        //Clear notification when app closed.
        //window.addEventListener('unload', function() {
        /*window.plugins.OnDestroyPlugin.setEventListener(function() {
            cordova.plugins.notification.local.cancel(1, function() {
                console.log("done");
            });
        });*/

        loadStats();
    };

    return {
        handleScanningSetting: handleScanningSetting,
        configureBackgroundGeoLocation: configureBackgroundGeoLocation,
        init: init
    };
});
