App.directive("budgetGraph", function() {


	return {
		restrict: 'E',
		templateUrl: 'partials/graph.html',
		scope: {
			initialValue:"<",
			amounts:"=",
			budgets:"=",
			year:"=",
		},
		link: function(scope, element) {
            scope.el = element
        },
		controller: [ 
			"$scope",
			"$attrs",
			"budget",
			function($scope, $attrs, BUDGET) {
				$scope.year = ($scope.year > 2000) ? $scope.year : moment().year()
				var daysInYear = moment().year($scope.year).month(11).date(31).dayOfYear();
				var budgetExtrapolationStart = moment().valueOf()
				if (!$scope.initialValue) $scope.initialValue = 0 

				var budgetAmounts = [], showBudget = false
				var spendAmounts = [], showSpend = false
				var showCumulativeSpend = ("cumulative" in $attrs)
				var showBudgetExtrapolation = ("budgetExtrapolation" in $attrs)

				if ($scope.budgets) {
					$scope.$watch("budgets", function(n,o) {
						budgetAmounts = BUDGET.totalDailyAmountsForYear($scope.budgets, $scope.year)
						showBudget = true
						refreshGraph()
					}, true) // deep watch
				}
				if ($scope.amounts) {
					$scope.$watch("amounts", function(n,o) {
						spendAmounts = angular.copy($scope.amounts) 
						showSpend = true
						refreshGraph()
					}, true) // deep watch
				}

				function refreshGraph() {
					var spendCumulativeValue = $scope.initialValue, spendExtrapolatedValue = $scope.initialValue, budgetCumulativeValue = $scope.initialValue
					var cumulativePoints = [], cumulativeExtrapolationPoints = [], positivePoints = [], negativePoints = [], budgetPoints = []
					var currentMoment = moment().year($scope.year).dayOfYear(1).hour(0).minute(0).second(0).millisecond(0)
					var spendAmount, budgetAmount
					var switched = false
					for (var d=1; d<=daysInYear; ++d) {
						currentMoment.dayOfYear(d)
						spendAmount = spendAmounts[d-1] || 0
						spendCumulativeValue += spendAmount;
						budgetAmount = budgetAmounts[d-1] || 0
						budgetCumulativeValue += budgetAmount

						if (showSpend) {
							positivePoints.push({
								x:currentMoment.valueOf(),
								y:(spendAmount > 0 ? spendAmount/100 : 0)
							})
							negativePoints.push({
								x:currentMoment.valueOf(),
								y:(spendAmount < 0 ? spendAmount/100 : 0)
							})

							if (showCumulativeSpend) {
								if (!showBudgetExtrapolation || currentMoment.valueOf() <= budgetExtrapolationStart) {
									spendExtrapolatedValue = spendCumulativeValue 
									cumulativePoints.push({
										x:currentMoment.valueOf(),
										y:spendCumulativeValue/100
									})
								} else {
									spendExtrapolatedValue += budgetAmount
									cumulativeExtrapolationPoints.push({
										x:currentMoment.valueOf(),
										y:spendExtrapolatedValue/100
									})
								}
							}
						}
						if (showBudget) {
							if (!showBudgetExtrapolation || currentMoment.valueOf() <= budgetExtrapolationStart) {
								budgetPoints.push({
									x:currentMoment.valueOf(),
									y:budgetCumulativeValue/100
								})
							}
						}
					}

					var dataSets = []
					if (showSpend && showCumulativeSpend) {
						dataSets.push({
							type: "stepArea",
							color: "slategray",
							xValueType: "dateTime",
							yValueFormatString: "£#,##0.00",
							lineThickness: 1,
							fillOpacity: 0.3,
							markerType: "none",
							dataPoints: cumulativePoints
						})
						dataSets.push({
							type: "stepArea",
							color: "silver",
							xValueType: "dateTime",
							yValueFormatString: "£#,##0.00",
							lineThickness: 1,
							fillOpacity: 0.3,
							markerType: "none",
							dataPoints: cumulativeExtrapolationPoints
						})
					}
					if (showBudget) {
						dataSets.push({
							type: "stepArea",
							color: "darkseagreen",
							xValueType: "dateTime",
							yValueFormatString: "£#,##0.00",
							lineThickness: 1,
							fillOpacity: 0.3,
							markerType: "none",
							dataPoints: budgetPoints
						})
					}
					if (showSpend) {
						dataSets.push({
							type: "column",
							color: "#4356f4",
							xValueType: "dateTime",
							yValueFormatString: "£#,##0.00",
							dataPoints: positivePoints
						})
						dataSets.push({
							type: "column",
							color: "#f06789",
							xValueType: "dateTime",
							yValueFormatString: "£#,##0.00",
							dataPoints: negativePoints
						})
					}
					var chart = new CanvasJS.Chart($scope.el.find(".canvas-element")[0], {
						axisX:{
							labelFormatter: function ( e ) {
								return CanvasJS.formatDate( e.value , "DD MMM" )  
							},
							minimum: moment().year($scope.year).dayOfYear(-2).valueOf(),  
							maximum: moment().year($scope.year).dayOfYear(daysInYear+3).valueOf(),
							intervalType: "month",
							interval: 1,
						},
						axisY: {
							valueFormatString: "£#,##0.##", 
							gridThickness: 1,
						},
						zoomEnabled: true,
						dataPointWidth: 3, 
						data: dataSets
					});
					chart.render();

				}
			}
		]

	}

})