App.directive("dateSelectors", function() {


	return {
		restrict: 'E',
		templateUrl: 'partials/dateSelectors.html',
		scope: {
			model: "="
		},
		controller: [ 
			"$scope",
			function($scope) {
				$scope.days = ["1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18","19","20","21","22","23","24","25","26","27","28","29","30","31"]
				$scope.months = ["January","February","March","April","May","June","July","August","September","October","November","December"]
				$scope.years = ["2014","2015","2016","2017","2018"]

				$scope.model_day = moment($scope.model, "x").format("D")
				$scope.model_month = moment($scope.model, "x").format("MMMM")
				$scope.model_year = moment($scope.model, "x").format("YYYY")


				function reCalculate() {
					$scope.model = Number(moment().set({
						year: Number($scope.model_year),
						month: $scope.months.indexOf($scope.model_month),
						date: Number($scope.model_day),
						hour: 0,
						minute: 0,
						second: 0,
						millisecond: 0
					}).format("x"));
				}
				$scope.$watch("model_day", reCalculate)
				$scope.$watch("model_month", reCalculate)
				$scope.$watch("model_year", reCalculate)
			}
		]

	}

})