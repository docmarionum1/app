# WiFind Mobile App

Documentation for the WiFind mobile application that is used for collecting
Wi-Fi data.

The WiFind mobile application is built as a non-native app using cordova,
phonegap, ionic and angular.

The code for the app is contained within the `www` directory. Within that there
is a `css` directory with the style sheet, a `modules` directory which contains
most of the javascript logic (outlined below) and a `views` directory which
contains the html template and javascript controllers for each of the app's
views.

# Modules

* [app](app.html)
* [controllers](controllers.html)
* [logging](logging.html)
* [scanning](scanning.html)
* [settings](settings.html)

# Setup

1. Install [Nodejs](nodejs.org)
2. Install phonegap, cordova, ionic and bower globally

    `npm install -g phonegap cordova ionic bower`

3. Setup the app's platforms and plugins:

      `ionic state restore`

4. Install bower packages:

      `bower install`

# Testing

Test the app locally with:

    `phonegap serve`

None of the native phone features will work, but the app should load in a browser and not have javascript errors.

To test it on a phone you can build an APK and then install it. Build it with:

    `phonegap remote build android`
