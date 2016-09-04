App.directive("categoriseForm", function() {
	var matcherTypes = [
	].map(function(t) { return { value:t[0], label:t[1]} })

	var vanillaMatcher = {
		type: "exact",
		match: ""
	}

	function itemToOptionsItem(item) {
		return {
			value: item,
			label: item
		}
	}
	function optionAlphaSort(A, B) {
		return A.label.toLowerCase().localeCompare(B.label.toLowerCase())
	}

	return {
		templateUrl: 'partials/categoriseForm.html',
		scope: {
			transaction:"=",
			year:"=",
			save:"=",
			cancel:"=",
		},
		controller: [ 
			"$scope",
			"data",
			function($scope, DATA) {

				$scope.matcherTypes = {
					start: "Starts With",
					exact: "Matches Exactly",
					regex: "Regular Expression",
				}
				$scope.matcherTypeOptions = []
				angular.forEach($scope.matcherTypes, function(label, value) {
					$scope.matcherTypeOptions.push({ value: value, label: label })
				})

				$scope.data = {
					category: null,
					label: null,
					matcher: null
				}
				$scope.categories = []
				$scope.labelsByCategory = {}
				$scope.matchersByCategoryAndLabel = {}
				var originalMatchersByCategoryAndLabel = {}

				DATA($scope.year).getAllCategoryData().then(function(categoryData) {

					$scope.categories = Object.keys(categoryData).map(itemToOptionsItem)
					$scope.categories.sort(optionAlphaSort)

					$scope.labelsByCategory = {}
					$scope.labelsByCategory[null] = [{value:null, label:"Choose a category"}]
					angular.forEach(categoryData, function(labelsHash, category) {
						$scope.labelsByCategory[category] = Object.keys(labelsHash).map(itemToOptionsItem)
						$scope.labelsByCategory[category].sort(optionAlphaSort)
					})

					$scope.matchersByCategoryAndLabel = {}
					angular.forEach(categoryData, function(labelsHash, category) {
						$scope.matchersByCategoryAndLabel[category] = {}
						angular.forEach(labelsHash, function(labelData, label) {
							$scope.matchersByCategoryAndLabel[category][label] = labelData.matchers
						})
					})
					originalMatchersByCategoryAndLabel = angular.copy($scope.matchersByCategoryAndLabel)

				}).then(function() {
					$scope.data.category = "Cash Withdrawal"
					$scope.categoryChanged()
				})
				
				$scope.categoryChanged = function() {
					$scope.data.label = $scope.labelsByCategory[$scope.data.category][0].value
					$scope.labelChanged()
				}
				$scope.labelChanged = function() {
					$scope.matchersByCategoryAndLabel[$scope.data.category][$scope.data.label] = 
						angular.copy(originalMatchersByCategoryAndLabel[$scope.data.category][$scope.data.label])
					$scope.data.matcher = null
				}
				$scope.allowNew = function() {
					return $scope.matchersByCategoryAndLabel[$scope.data.category][$scope.data.label].length === 
						originalMatchersByCategoryAndLabel[$scope.data.category][$scope.data.label].length
				}
				$scope.editMatcher = function(i) {
					if (i === undefined) {
						$scope.matchersByCategoryAndLabel[$scope.data.category][$scope.data.label].push(angular.copy(vanillaMatcher))
						i = $scope.matchersByCategoryAndLabel[$scope.data.category][$scope.data.label].length - 1
					}
					$scope.data.matcher = $scope.matchersByCategoryAndLabel[$scope.data.category][$scope.data.label][i]
				}
				$scope.hasMatcherChanged = function(i) {
					return !angular.equals(
						$scope.matchersByCategoryAndLabel[$scope.data.category][$scope.data.label][i],
						originalMatchersByCategoryAndLabel[$scope.data.category][$scope.data.label][i]
						)
				}
				$scope.resetMatcher = function(i) {
					if (!originalMatchersByCategoryAndLabel[$scope.data.category][$scope.data.label][i]) {
						$scope.matchersByCategoryAndLabel[$scope.data.category][$scope.data.label].splice(i, 1)
						$scope.data.matcher = null
						return
					}
					$scope.matchersByCategoryAndLabel[$scope.data.category][$scope.data.label][i] = 
						angular.copy(originalMatchersByCategoryAndLabel[$scope.data.category][$scope.data.label][i])
					$scope.editMatcher(i)
				}

				function validate() {
					$scope.validation = {matchers:[]}

					$scope.matchersByCategoryAndLabel[$scope.data.category][$scope.data.label].forEach(function (m) {
						if (m.match == "") {
							$scope.validation.matchers.push("A match value is required.")
						}

						if (m.type === "regex") {
							var match = m.match.replace(/^\/|\/$/g, "")
							if (match == "") {
								$scope.validation.matchers.push("Please provide a valid regular expression.")
							}
							try {
								var r = new RegExp(match)
								m.match = "/"+match+"/" // makes sure any regex type has slash delimters
							} catch (e) {
								$scope.validation.matchers.push("Please enter a valid regular expression.")
							}
						}
					})

					return $scope.validation.matchers.length === 0
				}

				var alwaysValidate = false
				$scope.$watch(function() {
					if (!alwaysValidate) {
						return
					}
					if (validate()) {
						alwaysValidate = false
					}
				})

				$scope.commit = function() {
					alwaysValidate = true
					if (!$scope.data.category || !$scope.data.label) {
						alert("Choose a category etc")
						return
					}
					if (!validate()) {
						return
					}

					if (angular.equals(
							$scope.matchersByCategoryAndLabel[$scope.data.category][$scope.data.label],
							originalMatchersByCategoryAndLabel[$scope.data.category][$scope.data.label]
						)) {
						$scope.save()
						return
					}

					var category = $scope.data.category, label = $scope.data.label
					DATA($scope.year).getAllCategoryData()
						.then(function(categoryData) {
							categoryData[category][label].matchers = angular.copy($scope.matchersByCategoryAndLabel[category][label])
							return DATA($scope.year).setCategoryLabelDetails(category, label, categoryData[category][label])
						})
						.then(function() {
							$scope.save()
						})

				}

			}
		]

	}

})
