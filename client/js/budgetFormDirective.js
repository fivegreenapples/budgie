App.directive("budgetForm", function() {

	var budgetTypes = [
		[ "date", "One off" ],
		[ "daily","Daily" ],
		[ "weekly","Weekly" ],
		[ "monthly","Monthly" ],
		[ "yearly","Yearly" ]
	].map(function(t) { return { value:t[0], label:t[1]} })
	var monthlySubTypes = [
		[ "each", "Choose days..." ],
		[ "first", "First..." ],
		[ "second", "Second..." ],
		[ "third", "Third..." ],
		[ "fourth", "Fourth..." ],
		[ "fifth", "Fifth..." ],
		[ "last", "Last..." ],
	].map(function(t) { return { value:t[0], label:t[1]} })
	var monthlyWhat = [
		[ "day", "...day" ],
		[ "weekday", "...weekday" ],
		[ "weekendday", "...weekend day" ],
		[ "monday", "...Monday" ],
		[ "tuesday", "...Tuesday" ],
		[ "wednesday", "...Wednesday" ],
		[ "thursday", "...Thursday" ],
		[ "friday", "...Friday" ],
		[ "saturday", "...Saturday" ],
		[ "sunday", "...Sunday" ],
	].map(function(t) { return { value:t[0], label:t[1]} })


	var vanillaBudget = {
		type: "dates",
		day: 30,
		month: 2,
		value: 12
	}

	function sanitiseIsOneOf(obj, key, values, defaultVar) {
		if (values.indexOf(obj[key]) === -1) {
			obj[key] = defaultVar
		}
	}
	function sanitiseValue(obj) {
		if (!Number.isInteger(obj.value) || obj.value < 0) {
			obj.value = 0
		}
	}
	function sanitiseDayMonthCombo(obj, dayVar, monthVar, year, forceToEnd) {
		if (!Number.isInteger(obj[monthVar]) || obj[monthVar] < 1 || obj[monthVar] > 12) {
			obj[monthVar] = forceToEnd ? 12 : 1
		}
		if (!Number.isInteger(obj[dayVar]) || obj[dayVar] < 1 || obj[dayVar] > 31) {
			obj[dayVar] = forceToEnd ? 31 : 1
		}
		if (obj[dayVar] > moment().year(year).month(obj[monthVar]-1).daysInMonth()) {
			obj[dayVar] = moment().year(year).month(obj[monthVar]-1).daysInMonth()
		}
	}
	function sanitiseBudget(budget, year) {
		sanitiseIsOneOf(budget, "type", ["date","daily","weekly","monthly","yearly"], "date")
		if (budget.type === "date") {
			sanitiseDayMonthCombo(budget, "day", "month", year)
		} else if (budget.type === "daily") {
			sanitiseDayMonthCombo(budget, "startday", "startmonth", year)
			sanitiseDayMonthCombo(budget, "endday", "endmonth", year, true)
			if (!Number.isInteger(budget.every) || budget.every < 1) {
				budget.every = 1
			}
		} else if (budget.type === "weekly") {
			sanitiseDayMonthCombo(budget, "startday", "startmonth", year)
			sanitiseDayMonthCombo(budget, "endday", "endmonth", year, true)
			if (!Number.isInteger(budget.every) || budget.every < 1) {
				budget.every = 1
			}
			if (!Array.isArray(budget.days) || budget.days.length != 7) {
				budget.days = [0,0,0,0,0,0,0]
			}
			budget.days = budget.days.map(function(d) { return Number(d) })
		} else if (budget.type === "monthly") {
			sanitiseIsOneOf(budget, "subtype", ["each","first","second","third","fourth","fifth","last"], "each")
			sanitiseDayMonthCombo(budget, "startday", "startmonth", year)
			sanitiseDayMonthCombo(budget, "endday", "endmonth", year, true)
			if (!Number.isInteger(budget.every) || budget.every < 1) {
				budget.every = 1
			}
			if (budget.subtype === "each") {
				if (!Array.isArray(budget.days) || budget.days.length != 31) {
					budget.days = [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
				}
				budget.days = budget.days.map(function(d) { return Number(d) })
			} else {
				sanitiseIsOneOf(budget, "what", ["day","weekday","weekendday","monday","tuesday","wednesday","thursday","friday","saturday","sunday"], "day")
			}
		}
		sanitiseValue(budget)
	}

	return {
		templateUrl: 'partials/budgetForm.html',
		scope: {
			budget:"=",
			year:"=",
			save:"=",
			cancel:"=",
		},
		controller: [ 
			"$scope",
			"budget",
			function($scope, BUDGET) {

				// setup mode
				$scope.mode = $scope.budget ? "EDIT" : "NEW"
				// validate year
				$scope.year = ($scope.year > 2000) ? $scope.year : moment().year()

				// init globals
				$scope.budgetTypes = budgetTypes
				$scope.monthlySubTypes = monthlySubTypes
				$scope.monthlyWhat = monthlyWhat

				if ($scope.mode === "NEW") {
					$scope.b = angular.copy(vanillaBudget)
				} else {
					$scope.b = angular.copy($scope.budget)
				}

				$scope.validateType = function() {
					sanitiseBudget($scope.b, $scope.year)
					console.log(angular.copy($scope.b))
				}
				$scope.validateType()

				$scope.$watch(function() {
					$scope.summary = BUDGET.descriptionForBudget($scope.b)
				})

			}
		]

	}

})
App.directive("dayMonth", function() {
	return {
		templateUrl: 'partials/dayMonth.html',
		scope: {
			day:"=",
			month:"=",
			year:"=",
		},
		controller: [ 
			"$scope",
			function($scope) {

				// validate year
				$scope.year = ($scope.year > 2000) ? $scope.year : moment().year()
				// init months and days
				$scope.months = Array(12).fill(null).map(function(_, m) {
					return {
						value: m+1,
						label: moment().year($scope.year).month(m).format("MMMM")
					}
				})
				$scope.days = Array(12).fill(null).map(function(_, m) {
					return Array(moment().year($scope.year).month(m).daysInMonth()).fill(null).map(function(_, d) {
						return {
							value: d+1,
							label: moment().year($scope.year).month(m).date(d+1).format("dddd, Do")
						}
					})
				})

				// sanitise input month and year
				if (!Number.isInteger($scope.month) || $scope.month < 1 || $scope.month > 12) {
					$scope.month = 1
				}
				if (!Number.isInteger($scope.day) || $scope.day < 1 || $scope.day > 31) {
					$scope.day = 1
				}
				if ($scope.day > $scope.days[$scope.month-1].length) {
					$scope.day = $scope.days[$scope.month-1].length
				}

				$scope.monthOnChange = function() {
					if ($scope.day > $scope.days[$scope.month-1].length) {
						$scope.day = $scope.days[$scope.month-1].length
					}
				}
			}
		]

	}
})


