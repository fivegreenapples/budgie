App.directive("matcherForm", function() {
	var matcherTypes = [
		[ "exact","Matches Exactly" ],
		[ "start", "Starts With" ],
		[ "regex","Regular Expression" ],
	].map(function(t) { return { value:t[0], label:t[1]} })

	var vanillaMatcher = {
		type: "exact",
		match: ""
	}

	return {
		templateUrl: 'partials/matcherForm.html',
		scope: {
			matcher:"=",
			save:"=",
			cancel:"=",
		},
		controller: [ 
			"$scope",
			function($scope) {

				// setup mode
				$scope.mode = $scope.matcher ? "EDIT" : "NEW"
				// validate year
				$scope.year = ($scope.year > 2000) ? $scope.year : moment().year()

				$scope.matcherTypes = matcherTypes

				if ($scope.mode === "NEW") {
					$scope.m = angular.copy(vanillaMatcher)
				} else {
					$scope.m = angular.copy($scope.matcher)
				}

				$scope.validate = function() {
					$scope.matchValidation = ""
					if ($scope.m.match == "") {
						$scope.matchValidation = "A match value is required."
						return false
					}

					if ($scope.m.type === "regex") {
						var match = $scope.m.match.replace(/^\/|\/$/g, "")
						if (match == "") {
							$scope.matchValidation = "Please provide a valid regular expression."
							return false
						}
						try {
							var r = new RegExp(match)
							$scope.m.match = "/"+match+"/"
						} catch (e) {
							$scope.matchValidation = "Please enter a valid regular expression."
							return false
						}
					}
					return true
				}

			}
		]

	}

})
