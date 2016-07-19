// The main app module.

// Create the Angular module for the app.
angular.module('WiFind.app', [
    'ionic',
    'WiFind.controllers', 'LocalStorageModule', 'WiFind.Logging', 'WiFind.Scanning'
])

// Define the API endpoint for ingestion.
.constant('API', {
  url: 'http://wifindproject.com/ingestion/'
})

.run(function($ionicPlatform, $rootScope, logger, scanning) {
    //Add in-app logger to console.log
    var previousConsole = window.console || {};
    window.console = {
        log:function(msg){
            previousConsole.log && previousConsole.log(msg);
            logger.log(msg);
        },
        warn:function(msg){
            previousConsole.warn && previousConsole.warn(msg);
            logger.log(msg);
        },
        error:function(msg){
            previousConsole.error && previousConsole.error(msg);
            logger.log(msg);
        },
        assert:function(assertion, msg){
            previousConsole.assert && previousConsole.assert(assertion, msg);
            if(assertion){
                logger.log(msg);
            }
        }
    };

    $ionicPlatform.ready(function() {
        // Get the version number
        cordova.getAppVersion.getVersionNumber().then(function (version) {
            $rootScope.APPLICATION_VERSION = version;
        });

        $rootScope.$apply(function() {
            // Initialize scanning once the app is ready.
            scanning.init();
        });

    });

    // Watch the pollingIntensity config and reconfigure background geolocation
    // if it's changed.
    $rootScope.$watch(
        'settings.pollingIntensity',
        scanning.configureBackgroundGeoLocation
    );
})

// ## Views

// Define the different views of the app
.config(function($stateProvider, $urlRouterProvider, localStorageServiceProvider) {
    $stateProvider
    .state('app', {
        url: '/app',
        abstract: true,
        templateUrl: 'views/menu/menu.html',
        controller: 'AppCtrl'
    })
    .state('app.networks', {
        url: '/networks',
        views: {
            'menuContent': {
                templateUrl: 'views/networks/networks.html',
                controller: 'NetworksCtrl'
            }
        }
    })
    .state('app.map', {
        url: '/map',
        views: {
            'menuContent': {
                templateUrl: 'views/map/map.html',
                controller: 'MapCtrl'
            }
        }
    })
    .state('app.about', {
        url: '/about',
        views: {
            'menuContent': {
                templateUrl: 'views/about/about.html',
                controller: 'AboutCtrl'
            }
        }
    })
    .state('app.settings', {
        url: '/settings',
        views: {
            'menuContent': {
                templateUrl: 'views/settings/settings.html',
                controller: 'SettingsCtrl'
            }
        }
    })
    .state('app.log', {
        url: '/log',
        views: {
            'menuContent': {
                templateUrl: 'views/log/log.html',
                controller: 'LogCtrl'
            }
        }
    });

    // if none of the above states are matched, use this as the fallback
    $urlRouterProvider.otherwise('/app/networks');

    // Configure the local storage module
    localStorageServiceProvider.setPrefix('WiFind');
});
