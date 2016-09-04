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
					newCategory: null,
					label: null,
					newLabel: null,
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
				
				function resetMatchers() {
					if ($scope.data.category && $scope.data.label) {
						$scope.matchersByCategoryAndLabel[$scope.data.category][$scope.data.label] = 
							angular.copy(originalMatchersByCategoryAndLabel[$scope.data.category][$scope.data.label])
					}
					$scope.data.matcher = null
				}
				$scope.categoryChanged = function() {
					if ($scope.data.category) {
						$scope.data.label = $scope.labelsByCategory[$scope.data.category][0].value
					} else {
						$scope.data.label = null
					}
					resetMatchers()
				}
				$scope.addCategory = function() {
					resetMatchers()
					$scope.data.newCategory = ""
					$scope.data.newLabel = ""
					$scope.data.matcher = angular.copy(vanillaMatcher)
				}
				$scope.removeCategory = function() {
					resetMatchers()
					$scope.data.newCategory = null
					$scope.data.newLabel = null
					$scope.data.matcher = null
				}
				$scope.labelChanged = function() {
					resetMatchers()
				}
				$scope.addLabel = function() {
					resetMatchers()
					$scope.data.newLabel = ""
					$scope.data.matcher = angular.copy(vanillaMatcher)
				}
				$scope.removeLabel = function() {
					resetMatchers()
					$scope.data.newLabel = null
					$scope.data.matcher = null
				}
				$scope.allowNewMatcher = function() {
					return $scope.data.category && 
					       $scope.data.label && 
					       $scope.matchersByCategoryAndLabel[$scope.data.category][$scope.data.label].length === 
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

				function validateMatcher(m) {
					if (m.match == "") {
						return "A match value is required."
					}

					if (m.type === "regex") {
						var match = m.match.replace(/^\/|\/$/g, "")
						if (match == "") {
							return "Please provide a valid regular expression."
						}
						try {
							var r = new RegExp(match)
							m.match = "/"+match+"/" // makes sure any regex type has slash delimters
						} catch (e) {
							return "Please enter a valid regular expression."
						}
					}
				}
				function validate() {
					$scope.validation = {category:null, label:null, matchers:[]}

					if (!$scope.data.category && $scope.data.newCategory === null) {
						$scope.validation.category = "Choose a category"
					} else {

						if ($scope.data.newCategory !== null) {
							if ($scope.data.newCategory == "" ) {
								$scope.validation.category = "A category is required"
							} else if (originalMatchersByCategoryAndLabel[$scope.data.newCategory]) {
								$scope.validation.category = "This category exists already."
							}
						}

						if ($scope.data.newLabel !== null) {
							if ($scope.data.newLabel == "" ) {
								$scope.validation.label = "A label is required"
							} else if ($scope.data.newCategory === null && originalMatchersByCategoryAndLabel[$scope.data.category][$scope.data.newLabel]) {
								$scope.validation.label = "This label exists already."
							}
						}

						if ($scope.data.newCategory === null && $scope.data.newLabel === null) {
							$scope.matchersByCategoryAndLabel[$scope.data.category][$scope.data.label].forEach(function (m) {
								var validation = validateMatcher(m)
								if (validation) {
									$scope.validation.matchers.push(validation)
								}
							})
						} else {
							var validation = validateMatcher($scope.data.matcher)
							if (validation) {
								$scope.validation.matcher = validation
							}
						}
					}

					return !$scope.validation.category && !$scope.validation.label && $scope.validation.matchers.length === 0 && !$scope.validation.matcher
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

					if (!validate()) {
						return
					}

					// work out how to add new cat and label

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
