App.controller("headerCtrl", [
	"$rootScope",
	"$scope",
	"year",
	"data",
	"modal",
	function($rootScope, $scope, YEAR, DATA, MODAL) {

		
		var AVAILABLE_YEARS = []
		var CURRENT_DATA = null
		var cancelNotifier = null

		YEAR.nowAndWhenChanged($scope, function() {
			YEAR.getAvailableYears().then(function(years) {
				AVAILABLE_YEARS = years
			})
			if (cancelNotifier) {
				cancelNotifier()
			}
			$scope.activeYear = YEAR.year()
			CURRENT_DATA = DATA($scope.activeYear)
			cancelNotifier = CURRENT_DATA.nowAndWhenChanged($scope, function() {
				$scope.changes = CURRENT_DATA.hasChanged()
			})
		})

		$scope.saving = false
		$scope.saveChanges = function() {
			if ($scope.saving) {
				return
			}
			$scope.saving = true

			CURRENT_DATA.saveChanges().then(
				function() {
					$scope.saving = false
				},
				function(httpResponse) {
					MODAL.addAlert({
						title: "Save Error",
						message: "There was error while saving as follows: "+httpResponse.data,
						buttons: [{
							type: "green",
							label: "OK"
						}]
					}).then(function() {
						$scope.saving = false
					})
				}
			)
		}
		$scope.showYearPopoverMenu = function(ev) {
			ev.stopPropagation()
			MODAL.addPopoverMenu({
				element: $(ev.target),
				menuitems: AVAILABLE_YEARS
			}).then(function(which) {

				if ($scope.activeYear == which) return

				if ($scope.changes) {
					MODAL.addAlert({
						title:"Unsaved Changes",
						message: "There are unsaved changes to the data for "+$scope.activeYear+".",
						buttons: [{
							type: "green",
							label: "Review Changes"
						},{
							type: "red",
							label: "Discard"
						}]
					}).then(function(which2) {
						if (which2 == "Discard") {
							YEAR.year(which)
						}
					})
				} else {
					YEAR.year(which)
				}
			})
		}

	}
])