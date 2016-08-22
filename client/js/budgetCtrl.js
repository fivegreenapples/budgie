App.controller("budgetCtrl", [
	"$rootScope",
	"$scope",
	"year",
	"data",
	"budget",
	"modal",
	function($rootScope, $scope, YEAR, DATA, BUDGET, MODAL) {

		var CURRENT_DATA = null
		var cancelNotifier = null
		var CATEGORIES = null

		$scope.MONTHS = []
		function refreshMonths() {
			$scope.MONTHS = "January,February,March,April,May,June,July,August,September,October,November,December"
				.split(",")
				.map(function(m) {
					var weeks = []
					var theMoment = moment().year(YEAR.year()).month(m).date(1)
					for (var i=0; i<theMoment.daysInMonth(); ++i) {
						theMoment.date(i+1)
						var currentDayOfWeek = theMoment.isoWeekday()-1;
						if (currentDayOfWeek == 0 || !weeks.length) {
							weeks.push(["","","","","","",""])
						}
						weeks[weeks.length-1][currentDayOfWeek] = theMoment.dayOfYear()-1
					}
					return { name: m, weeks: weeks };
				})
		}

		$scope.refreshCategories = function() {
			$scope.currentYear = CURRENT_DATA.year()
			$scope.categories = []
			$scope.categoryLabels = {}
			$scope.theBudgetValues = []
			$scope.theBudgetDescriptions = []

			angular.forEach(CATEGORIES, function(val, key) {
				$scope.categories.push({
					name: key
				})
			})
			$scope.categories.sort(function(A, B) { return A.name.toLowerCase().localeCompare(B.name.toLowerCase()) })
			$scope.categories = [$scope.categories[0]]

			$scope.categories.forEach(function(category) {
				$scope.categoryLabels[category.name] = []
				angular.forEach(CATEGORIES[category.name], function(val, key) {
					$scope.categoryLabels[category.name].push({
						name: key,
						budgets: val.budgets || []
					})
				})
				$scope.categoryLabels[category.name].sort(function(A, B) { return A.name.toLowerCase().localeCompare(B.name.toLowerCase()) })
				$scope.categoryLabels[category.name] = [$scope.categoryLabels[category.name][0]]

				$scope.theBudgetValues = BUDGET.totalDailyAmountsForYear($scope.categoryLabels[category.name][0].budgets, CURRENT_DATA.year())
				$scope.theBudgetDescriptions = $scope.categoryLabels[category.name][0].budgets.map(BUDGET.descriptionForBudget)

			})




		}

		YEAR.nowAndWhenChanged($scope, function() {
			if (cancelNotifier) {
				cancelNotifier()
			}
			CURRENT_DATA = DATA(YEAR.year())
			cancelNotifier = CURRENT_DATA.nowAndWhenChanged($scope, function() {
				CURRENT_DATA.getAllCategoryData().then(function(categories) {
					CATEGORIES = categories
					refreshMonths()
					$scope.refreshCategories();
				})
			})
		})

	}
])
App.filter('sumBudgets', [
	"budget",
	"data",
	function(BUDGET, DATA) {
		return function(budgets) {
			return BUDGET.totalSpendForYear(budgets, CURRENT_DATA.year()) / 100
		};
	}
])
