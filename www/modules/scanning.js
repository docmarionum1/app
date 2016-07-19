// The meat of the WiFind app.  Contains all the logic for GPS tracking and
// Wi-Fi scanning.
//
angular.module('WiFind.Scanning', ['WiFind.Logging'])
.factory('scanning', function(
    $rootScope, $http, $filter,
    logger, API, localStorageService
) {
    // ## Global Variables

    // Whether or not backgroundGeoLocation has been configured yet
    var configured = false;

    // Whether the app is currently scanning
    // (i.e. whether backgroundGeoLocation) is started.
    var currentlyScanning = false;

    // A counter that gets increased when the app encounters upload trouble.
    // Only attempts to upload when timeout is less than 0.
    var timeout = 0;

    // A varible to hold the local sqlite database pointer
    var db;

    // Whether the app is currently in the upload function.  Won't try and
    // upload again during this time.
    var uploading = false;

    // Counts once every ten minutes and restarts backgroundGeoLocation after
    // 6 ticks.
    var tickCounter = 0;

    // Start an interval to make sure that backgroundGeoLocation doesn't die.
    // Occasionally after long time of inactivity (such as having the phone)
    // still overnight, the backgroundGeoLocation doesn't resume.  This ensures
    // that it will restart at least every hour.
    setInterval(function() {
        if (++tickCounter == 6) {
            tickCounter = 0;

            handleScanningSetting(false);
            handleScanningSetting($rootScope.settings.enableScanning);
        }
    }, 600000);

    // ## tryUpload
    // A function which will check whether upload conditions are met and if they
    // are, will attempt uploading.
    var tryUpload = function() {
        uploading = true;
        var keys = localStorageService.keys();
        var online = navigator.connection.type !== Connection.NONE;

        // If we have a network connection and at least 10 scan results and
        // don't have a timeout.
        if (online && keys.length >= 10 && --timeout < 0) {
            var scans = {scans: []};

            // Get each scan out of local storage.
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

    // ## scan
    // Function that is called when movement is detected by
    // backgroundGeoLocation.
    var scan = function(location) {
        logger.log('lat=' + location.latitude + ' lon=' + location.longitude);

        // Add the non-wifi data to the scan results.
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

        // Scan for wifi networks
        WifiWizard.scan(function(results) {
            logger.log("Scan Returned");

            // Calculate the distance moved between getting geolocation
            // and finishing the Wi-Fi scan based on speed at the time of the
            // scan and duration of the scan.
            var scan_distance = Math.abs((new Date().getTime() - location.time)/1000 * location.speed);
            logger.log("Distance = " + scan_distance);

            // If the distance is more than 10 meters, ignore the data because
            // it is likely inaccurate.
            if (scan_distance > 10) {
                logger.log("scan distance too far!");
                return;
            }

            logger.log(results.length + ' networks found');

            // Update the user's stats
            $rootScope.stats.current = results.length;
            storeStats(results.length);


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
                    // Convert results format for API
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
            logger.log('Scan count = ' + localStorageService.keys().length);

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
    };

    // ## scanError
    // Function called when there is a backgroundGeoLocation error
    var scanError = function(error) {
        logger.log('Scan Error!');
    };

    // ## handleScanningSetting
    // Handle a change to the scanning enabled/disabled setting
    var handleScanningSetting = function(enable) {
        logger.log('handleScanningSetting');

        // If not yet configured, return.
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

    // ## storeStats
    // Store the newly found network count into the local sqlite database.
    // Counts are stored as a pair (date,count).
    var storeStats = function(count) {
        // First check to see if there is an entry for the current date.
        db.executeSql("select scan_count from scan_counts WHERE day=date(datetime('now', 'localtime'));", [], function(resultSet) {
            if (resultSet.rows.length == 0) {
                // If not, insert a new row with the current count.
                db.executeSql("insert into scan_counts values(date(datetime('now', 'localtime'))," + count + ")", [], function(resultSet) {
                    updateStats();
                });
            } else {
                // If there is, update the row with the new count.
                var new_count = resultSet.rows.item(0).scan_count + count;
                db.executeSql("update scan_counts set scan_count = " + new_count + " where day=date(datetime('now', 'localtime'));", [], function(resultSet) {
                    updateStats();
                });
            }
        });
    };

    // ## updateStats
    // Update the stats display on the main page.
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

    // ## configureBackgroundGeoLocation
    // Configure backgroundGeoLocation plugin based on user settings.
    var configureBackgroundGeoLocation = function(value) {
        logger.log('configureBackgroundGeoLocation = ' + value);

        if (value === undefined) {
            return;
        }

        // If there is a change in settings and backgroundGeoLocation is
        // currently running, stop it.
        if (currentlyScanning) {
            backgroundGeoLocation.stop();
            currentlyScanning = false;
        }

        // backgroundGeoLocation common settings
        var conf = {
            debug: false, // <-- enable this hear sounds for background-geolocation life-cycle.
            stopOnTerminate: false, // <-- enable this to clear background location settings when the app terminates
            locationService: backgroundGeoLocation.provider.ANDROID_DISTANCE_FILTER_PROVIDER,
            notificationTitle: 'WiFind',
            notificationText: 'Background location tracking is enabled.',
            startOnBoot: $rootScope.settings.autostart
        };

        // Different settings depending on the user's polling intensity setting.
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

        // Restart scanning if it's enabled
        handleScanningSetting($rootScope.settings.enableScanning);
    };

    // ## loadStats
    // Load the stats on startup
    var loadStats = function() {
        // Default stats while the DB is queried
        $rootScope.stats = {
            current: 0,
            total: -1,
            today: -1,
            yesterday: -1,
            month: -1
        };

        db = window.sqlitePlugin.openDatabase({ name: 'wifind.db', location: 'default', androidDatabaseImplementation: 2}, function (db) {
            // If this is the first time the app is launched, create the table.
            db.executeSql('CREATE TABLE IF NOT EXISTS scan_counts (day date, scan_count integer)', [], function(resultSet) {
                updateStats();
            }, function(error) {
                console.log('Create Table ERROR: ' + JSON.stringify(error));
            });
        }, function (error) {
            console.log('Open database ERROR: ' + JSON.stringify(error));
        });
    };

    // ## init
    // Intialize things at app startup.
    var init = function() {
        // Clear notification which may still exist from previous version.
        // Once everyone no users are on 0.3.0 anymore, this line can be
        // removed.
        cordova.plugins.notification.local.clear(1, function () {});

        // load the stats DB
        loadStats();
    };

    // Return the public functions
    return {
        handleScanningSetting: handleScanningSetting,
        configureBackgroundGeoLocation: configureBackgroundGeoLocation,
        init: init
    };
});
