App.controller("adminCtrl", [
	"$rootScope",
	"$scope",
	"$q",
	"year",
	"data",
	"modal",
	function($rootScope, $scope, $q, YEAR, DATA, MODAL) {

		$scope.newYear = null;
		YEAR.getAvailableYears()
			.then(function(years) {
				if (years.length) {
					return Number(years[years.length-1]) + 1
				}
				return Number(moment().year())
			}).then(function(newYear) {
				$scope.newYear = newYear;
			})

		$scope.createNewYear = function(NEW_YEAR) {
			return YEAR.createNewYear(NEW_YEAR)
				.then(function() {
					var PREV_YEAR = DATA(NEW_YEAR-1)
					var CUR_YEAR = DATA(NEW_YEAR)

					var accPromise = PREV_YEAR.getAllAccountData().then(function(accData) {
						accData.forEach(function(acc) {
							acc.transactions = []
						})
						return CUR_YEAR.setAllAccountData(accData)
					})
					var categoryPromise = PREV_YEAR.getAllCategoryData().then(function(categoryData) {
						return CUR_YEAR.setAllCategoryData(categoryData)
					})

					return $q.all([accPromise, categoryPromise])
				}).then(function() {
					YEAR.year(NEW_YEAR)
				})


		}
	}
])
