App.controller("adminCtrl", [
	"$rootScope",
	"$scope",
	"year",
	"data",
	"modal",
	function($rootScope, $scope, YEAR, DATA, MODAL) {

		$scope.createNewYear = function() {
			console.log("here")
			YEAR.getAvailableYears()
				.then(function(years) {
					console.log(years)
					if (years.length) {
						return Number(years[years.length-1]) + 1
					}
					return moment().year() + 1
				})
				.then(function(NEW_YEAR) {
					console.log(NEW_YEAR)
					return YEAR.createNewYear(NEW_YEAR)
				})
				.then(function() {

				}) 

		}
	}
])
