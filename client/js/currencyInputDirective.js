App.directive("currencyInput", function() {


	return {
		restrict: 'E',
		template: '<input ng-model="model_value">',
		scope: {
			model: "="
		},
		controller: [ 
			"$scope",
			function($scope) {
				if (typeof $scope.model === "number") {
					var intNumber = Math.round($scope.model)
					$scope.model_value = ""+((intNumber / 100)|0)+"."+Math.abs(((intNumber%100)/10)|0)+Math.abs(intNumber%10)
				} else {
					$scope.model_value = ""+$scope.model
				}


				function reCalculate() {
					var matches = $scope.model_value.match(/^ *(-?[0-9]+)(\.([0-9][0-9]))? *$/)
					if (!matches) {
						$scope.model = $scope.model_value
					} else {
						$scope.model = parseInt(matches[1], 10)*100
						if (matches[3] !== undefined) {
							$scope.model += parseInt(matches[3], 10)
						}
					}
				}

				$scope.$watch("model_value", reCalculate)
			}
		]

	}

})