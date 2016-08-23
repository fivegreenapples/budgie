App.directive("budgetGraph", function() {


	return {
		restrict: 'E',
		templateUrl: 'partials/budgetGraph.html',
		scope: {
			budgets:"=",
			amounts:"=",
			year:"=",
			autoscale: "="
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
				function refreshVals(dailyAmounts) {
					$scope.maxBarHeight = 0
					$scope.vals = dailyAmounts
						.reduce(function(prev, current, index) {
							if (current != 0) {
								prev.push({
									x:index,
									h:current,
								})
								$scope.maxBarHeight = Math.max(
									$scope.maxBarHeight, 
									current
								)
							}
							return prev
						}, [])
				}
			}
		]

	}

})