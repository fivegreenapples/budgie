App.directive("budgetGraph", function() {


	return {
		restrict: 'E',
		templateUrl: 'partials/budgetGraph.html',
		scope: {
			budgets:"=",
			amounts:"=",
			year:"=",
			label:"=",
		},
		controller: [ 
			"$scope",
			"budget",
			function($scope, BUDGET) {
				$scope.year = ($scope.year > 2000) ? $scope.year : moment().year()
				var daysInYear = moment().year($scope.year).month(11).date(31).dayOfYear();
				var tags = {
					weekdays:[],
					weekenddays:[],
					months:[]
				}
				var currentMoment = moment().year($scope.year)
				for (var d=1; d<daysInYear; d++) {
					currentMoment.dayOfYear(d)
					if (currentMoment.isoWeekday() <= 5) {
						tags.weekdays.push(d-1)
					} else {
						tags.weekenddays.push(d-1)
					}
					if (currentMoment.date() == 1) {
						tags.months.push(d-1)
					}
				}
				$scope.tags = tags

				if ($scope.budgets) {
					$scope.$watch("budgets", function() {
						refreshVals(BUDGET.totalDailyAmountsForYear($scope.budgets, $scope.year))
					}, true) // deep watch
				} else {
					$scope.$watch("amounts", function() {
						refreshVals($scope.amounts)
					}, true) // deep watch
				}

				// drawn as a logarithmic y-axis up to 10,000 pounds (note all values are in pence)

				function refreshVals(dailyAmounts) {
					$scope.maxBarHeight = Math.log(10000);
					if (!Array.isArray(dailyAmounts)) {
						$scope.vals = []
						return
					}
					$scope.vals = dailyAmounts
						.reduce(function(prev, current, index) {
							var useCurrent = Math.abs(current/100)
							if (useCurrent >= 1) {
								prev.push({
									x:index,
									h:Math.log(useCurrent),
								})
							}
							return prev
						}, [])
				}
			}
		]

	}

})