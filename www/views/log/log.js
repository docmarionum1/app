angular.module('controllers')
.controller('LogCtrl', function($scope, logger) {
    logger.registerLogScope($scope);
    $scope.logger = logger;
});
