App.directive("modals", function() {


	return {
		restrict: 'E',
		templateUrl: 'partials/modals.html',
		scope: {},
		controller: [ 
			"$scope",
			"$timeout",
			"modal",
			function($scope, $timeout, MODAL) {

				MODAL.nowAndWhenChanged($scope, function() {
					$scope.modals = MODAL.getAllModals()
					if ($scope.modals.length && $scope.modals[$scope.modals.length-1].type == "INPLACEEDIT") {
						$timeout(function() {
							$(".modaldetail .inplaceedit input").select()
						}, 50)
					}
				})


			}
		]

	}

})