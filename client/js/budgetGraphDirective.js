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

				// drawn as a logarithmic y-axis +/- 100,000 pounds (note all incoming values are in pence)
				$scope.maxBarHeight = Math.log(100000);

				function refreshVals(dailyAmounts) {
					$scope.vals = []
					$scope.negativeVals = []
					$scope.cumulativePath = "M0,0 ";
					$scope.cumulativePathLinear = "M0,0 ";
					var currentCumulativeValue = 0, lastCumulativeValue = 100;
					if (!Array.isArray(dailyAmounts)) {
						return
					}
					dailyAmounts.forEach(function(amount, index) {
						var useCurrent = Math.abs(amount/100)
						if (useCurrent >= 1) { // anything more than £1
							var val = {
								x:index,
								h:Math.log(useCurrent)
							}
							$scope[amount >= 0 ? "vals" : "negativeVals"].push(val)

						}

						currentCumulativeValue += amount;
						if (currentCumulativeValue != lastCumulativeValue && Math.abs(currentCumulativeValue) >= 1) {

							$scope.cumulativePathLinear += " L"+((2*index)+1)+","+lastCumulativeValue
							$scope.cumulativePathLinear += " L"+((2*index)+1)+","+currentCumulativeValue


							$scope.cumulativePath += " L"+((2*index)+1)+","+(lastCumulativeValue >= 0 ? "" : "-")+Math.log(Math.abs(lastCumulativeValue/100))
							$scope.cumulativePath += " L"+((2*index)+1)+","+(currentCumulativeValue >= 0 ? "" : "-")+Math.log(Math.abs(currentCumulativeValue/100))
							lastCumulativeValue = currentCumulativeValue
						}

					})
					$scope.cumulativePath += " H732"
					$scope.cumulativePathLinear += " H732"
					$scope.cumulativeLinearScale = 60 / Math.pow(10, Math.ceil(Math.log10(Math.abs(currentCumulativeValue))))


					// various experiments with logarithmic and linear cumulative lines
					// removed for now
					// linear looks better and is more useful, but appropriate scaling is tricky. especially when comparing 
					// one year against another as you need a consistent scale for the comparison to be useful. As you need
					// a scale that accounts for the peak amplitude not just the final number ,then you need all the data
					// up front which implies a higher level analysis of the data.
					//
					// logarithmic cumulator line just trends to horizontal
					// 
					$scope.cumulativePath = false
					$scope.cumulativePathLinear = false

				}
			}
		]

	}

})