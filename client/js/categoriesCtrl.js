App.controller("categoriesCtrl", [
	"$rootScope",
	"$scope",
	"$stateParams",
	"$q",
	"year",
	"data",
	"modal",
	function($rootScope, $scope, $stateParams, $q, YEAR, DATA, MODAL) {

		$scope.matcherMapping = {
			start: "Starts with:",
			exact: "Matches exactly:",
			regex: "Matches the pattern:"
		}

		// this is all a bit hideous
		$scope.ALL = "Everything";
		$scope.ALLLAB = "All Labels";
		$scope.CAT = "All Categorised";
		$scope.UNCAT = "All Uncategorised";
		var magic_constants = {}
		magic_constants[$scope.ALL] = $scope.ALL
		magic_constants[$scope.ALLLAB] = $scope.ALLLAB
		magic_constants[$scope.CAT] = $scope.CAT
		magic_constants[$scope.UNCAT] = $scope.UNCAT
		// end hideous

		$scope.activeCategory = $stateParams.category ? $stateParams.category : $scope.ALL;
		$scope.activeLabel = $stateParams.label ? $stateParams.label : null;;
		$scope.activeDetail = null;
		$scope.activeBudgetIndex = null;

		$scope.refreshCategories = function() {
			$scope.categories = []
			$scope.categoryLabels = {}
			$scope.categoryDetails = {}
			$scope.magicStats = {}
			$scope.magicStats[$scope.ALL] = STATS[$scope.ALL]
			$scope.magicStats[$scope.CAT] = STATS[$scope.CAT]
			$scope.magicStats[$scope.UNCAT] = STATS[$scope.UNCAT]

			angular.forEach(CATEGORIES, function(val, key) {
				$scope.categories.push({
					name: key,
					amount: STATS.categories[key].amount
				})
			})
			$scope.categories.sort(function(A, B) { return A.name.toLowerCase().localeCompare(B.name.toLowerCase()) })

			$scope.categories.forEach(function(category) {
				$scope.categoryLabels[category.name] = []
				angular.forEach(CATEGORIES[category.name], function(val, key) {
					$scope.categoryLabels[category.name].push({
						name: key,
						amount: STATS.categories[category.name].labels[key].amount
					})
				})
				$scope.categoryLabels[category.name].sort(function(A, B) { return A.name.toLowerCase().localeCompare(B.name.toLowerCase()) })
			})

			$scope.categoryDetails = angular.copy(CATEGORIES)

			if (!$scope.activeCategory || (!magic_constants[$scope.activeCategory] && !$scope.categoryLabels[$scope.activeCategory])) {
				$scope.activeCategory = $scope.ALL
			}
			if (magic_constants[$scope.activeCategory]) {
				$scope.activeLabel = null;
			} else {
				if (!$scope.activeLabel || !$scope.categoryDetails[$scope.activeCategory][$scope.activeLabel]) {
					$scope.activeLabel = $scope.ALLLAB;
				}
			}

		}

		$scope.chooseCategory = function(categoryIndex) {
			if (magic_constants[categoryIndex]) {
				$scope.activeCategory = magic_constants[categoryIndex]
				$scope.activeLabel = null
				$scope.activeDetail = null
				return
			}
			if ($scope.categories[categoryIndex]) {
				if ($scope.categories[categoryIndex].name == $scope.activeCategory) {
					$scope.activeCategory = $scope.ALL
				} else {
					$scope.activeCategory = $scope.categories[categoryIndex].name
					$scope.activeLabel = $scope.ALLLAB
				}
			}
		}
		$scope.chooseLabel = function(labelIndex) {
			if (magic_constants[labelIndex]) {
				$scope.activeLabel = magic_constants[labelIndex]
				return
			}
			if ($scope.activeCategory && 
				$scope.categoryLabels[$scope.activeCategory] && 
				$scope.categoryLabels[$scope.activeCategory][labelIndex])
			{
				if ($scope.categoryLabels[$scope.activeCategory][labelIndex].name == $scope.activeLabel) {
					$scope.activeLabel = $scope.ALLLAB
				} else {
					$scope.activeLabel = $scope.categoryLabels[$scope.activeCategory][labelIndex].name
				}
			}
		}
		$scope.chooseBudget = function(budgetIndex) {
			if ($scope.activeCategory && 
				$scope.categoryLabels[$scope.activeCategory] && 
				$scope.activeLabel && 
				$scope.categoryDetails[$scope.activeCategory][$scope.activeLabel] &&
				$scope.categoryDetails[$scope.activeCategory][$scope.activeLabel].budgets[budgetIndex])
			{
				if ($scope.activeBudgetIndex == budgetIndex) {
					$scope.activeBudgetIndex = null
				} else {
					$scope.activeBudgetIndex = budgetIndex
				}
			}
		}
		$scope.chooseDetail = function(detail) {
			$scope.activeDetail = detail
		}

		$scope.addCategory = function(initialValue) {
			MODAL.addForm({
				title: "Add New Category",
				message: "Supply a name for the new category",
				items: [{
					label: "Name",
					input: {
						type: "TEXTBOX",
						value: initialValue || "Aardvark"
					}
				}],
				buttons: [{
					type: "red",
					label: "Cancel"
				},{
					type: "green",
					label: "Add"
				}]
			}).then(function(data) {
				if (data.button == "Add") {
					LOCAL_DATA.CURRENT_YEAR.addCategory(data.items[0].input.value).then(
						function() {
							$scope.activeCategory = data.items[0].input.value
						},
						function(err) {
							MODAL.addAlert({
								title: "New Category Error",
								message: err,
								buttons: [{
									type: "green",
									label: "OK"
								}]
							}).then(function() {
								$scope.addCategory(data.items[0].input.value)
							})
						}
					)
				}
			})
		}
		$scope.addLabel = function(initialValue) {
			if (!$scope.activeCategory || !($scope.activeCategory in $scope.categoryLabels)) {
				return
			}
			MODAL.addForm({
				title: "Add New Label",
				message: "Supply a name for the new label",
				items: [{
					label: "Name",
					input: {
						type: "TEXTBOX",
						value: initialValue || "Aardvark's Toes"
					}
				}],
				buttons: [{
					type: "red",
					label: "Cancel"
				},{
					type: "green",
					label: "Add"
				}]
			}).then(function(data) {
				if (data.button == "Add") {
					LOCAL_DATA.CURRENT_YEAR.addCategoryLabel($scope.activeCategory, data.items[0].input.value).then(
						function() {
							$scope.activeLabel = data.items[0].input.value
						},
						function(err) {
							MODAL.addAlert({
								title: "New Label Error",
								message: err,
								buttons: [{
									type: "green",
									label: "OK"
								}]
							}).then(function() {
								$scope.addLabel(data.items[0].input.value)
							})
						}
					)
				}
			})
		}
		$scope.addBudget = function() {
			if (!$scope.activeCategory || 
				!($scope.activeCategory in $scope.categoryLabels) ||
				!$scope.activeLabel ||
				!($scope.activeLabel in $scope.categoryDetails[$scope.activeCategory])) {
				return
			}
			MODAL.addBudgetForm().then(function(data) {
				$scope.categoryDetails[$scope.activeCategory][$scope.activeLabel].budgets.push(data)
				LOCAL_DATA.CURRENT_YEAR.setCategoryLabelDetails(
					$scope.activeCategory, 
					$scope.activeLabel, 
					$scope.categoryDetails[$scope.activeCategory][$scope.activeLabel]
				)
			})
		}

		$scope.showCategoryPopoverMenu = function(ev) {
			ev.stopPropagation()
			MODAL.addPopoverMenu({
				element: $(ev.target),
				menuitems: [
					"Rename",
					"Delete"
				]
			}).then(function(which) {
				var container = $(ev.target).parent()
				var offsets = container.offset()
				var currentVal = $scope.activeCategory
				if (which == "Rename") {
					function doRename(initialValue) {
						MODAL.addInPlaceEditor({
							top: offsets.top,
							left: offsets.left,
							width: container.outerWidth(),
							height: container.outerHeight(),
							value: initialValue,
							class: "category"
						}).then(function(newValue) {
							if (newValue != currentVal) {
								$scope.activeCategory = newValue
								LOCAL_DATA.CURRENT_YEAR.renameCategory(currentVal, newValue).then(
									null,
									function(err) {
										$scope.activeCategory = currentVal
										MODAL.addAlert({
											title: "Rename Error",
											message: err,
											buttons: [{
												type: "green",
												label: "OK"
											}]
										}).then(function() {
											doRename(newValue)
										})
									}
								)
							}
						})
					}
					doRename($scope.activeCategory)
				} else if (which == "Delete") {
					MODAL.addAlert({
						title: "Delete Category",
						message: "Are you sure you want to delete the "+$scope.activeCategory+" category?",
						buttons: [{
							type: "red",
							label: "Cancel"
						}, {
							type: "green",
							label: "Yes"
						}]
					}).then(function(whichDelete) {
						if (whichDelete == "Yes") {
							LOCAL_DATA.CURRENT_YEAR.deleteCategory($scope.activeCategory)
							$scope.activeCategory = null;
						}
					})
				}
			})
		}
		$scope.showLabelPopoverMenu = function(ev) {
			ev.stopPropagation()
			MODAL.addPopoverMenu({
				element: $(ev.target),
				menuitems: [
					"Rename",
					"Delete"
				]
			}).then(function(which) {
				var container = $(ev.target).parent()
				var offsets = container.offset()
				var currentVal = $scope.activeLabel
				if (which == "Rename") {
					function doRename(initialValue) {
						MODAL.addInPlaceEditor({
							top: offsets.top,
							left: offsets.left,
							width: container.outerWidth(),
							height: container.outerHeight(),
							value: initialValue,
							class: "category"
						}).then(function(newValue) {
							if (newValue != currentVal) {
								$scope.activeLabel = newValue
								LOCAL_DATA.CURRENT_YEAR.renameCategoryLabel($scope.activeCategory, currentVal, newValue).then(
									null,
									function(err) {
										$scope.activeLabel = currentVal
										MODAL.addAlert({
											title: "Rename Error",
											message: err,
											buttons: [{
												type: "green",
												label: "OK"
											}]
										}).then(function() {
											doRename(newValue)
										})
									}
								)
							}
						})
					}
					doRename($scope.activeLabel)
				} else if (which == "Delete") {
					MODAL.addAlert({
						title: "Delete Label",
						message: "Are you sure you want to delete the "+$scope.activeLabel+" label?",
						buttons: [{
							type: "red",
							label: "Cancel"
						}, {
							type: "green",
							label: "Yes"
						}]
					}).then(function(whichDelete) {
						if (whichDelete == "Yes") {
							LOCAL_DATA.CURRENT_YEAR.deleteCategoryLabel($scope.activeCategory, $scope.activeLabel)
							$scope.activeLabel = null;
						}
					})
				}
			})
		}

		$scope.showBudgetPopoverMenu = function(ev) {
			ev.stopPropagation()
			MODAL.addPopoverMenu({
				element: $(ev.target),
				menuitems: [
					"Edit...",
					"Delete"
				]
			}).then(function(which) {
				if (which == "Edit...") {
					MODAL.addBudgetForm($scope.categoryDetails[$scope.activeCategory][$scope.activeLabel].budgets[$scope.activeBudgetIndex])
						.then(function(data) {
							$scope.categoryDetails[$scope.activeCategory][$scope.activeLabel].budgets[$scope.activeBudgetIndex] = data
							LOCAL_DATA.CURRENT_YEAR.setCategoryLabelDetails(
								$scope.activeCategory, 
								$scope.activeLabel, 
								$scope.categoryDetails[$scope.activeCategory][$scope.activeLabel]
							)
						})
				} else if (which == "Delete") {
					MODAL.addAlert({
						title: "Delete Budget",
						message: "Are you sure you want to delete this budget configuration?",
						buttons: [{
							type: "red",
							label: "Cancel"
						}, {
							type: "green",
							label: "Yes"
						}]
					}).then(function(whichDelete) {
						if (whichDelete == "Yes") {
							$scope.categoryDetails[$scope.activeCategory][$scope.activeLabel].budgets.splice($scope.activeBudgetIndex, 1)
							LOCAL_DATA.CURRENT_YEAR.setCategoryLabelDetails(
								$scope.activeCategory, 
								$scope.activeLabel, 
								$scope.categoryDetails[$scope.activeCategory][$scope.activeLabel]
							)
							LOCAL_DATA.CURRENT_YEAR.setCategoryLabelDetails()
							$scope.activeBudgetIndex = null;
						}
					})
				}
			})
		}

		var caches = {}
		function cacheFor(when, category, label) {
			var cacheKey = [when,category,label].join(":")
			if (!(cacheKey in caches)) {
				caches[cacheKey] = {}
			}
			return caches[cacheKey]
		}
		function amountsFor(when, category, label) {
			var cache = cacheFor(when, category, label)
			if (cache.amounts) {
				return cache.amounts
			}

			cache.amounts = []

			var promise
			if (category === $scope.UNCAT) {
				promise = LOCAL_DATA[when].getAmountsByDayForUncategorised()
			} else if (category === $scope.ALL) {
				promise = LOCAL_DATA[when].getAmountsByDayForAll()
			} else if (category === $scope.CAT) {
				promise = LOCAL_DATA[when].getAmountsByDayForCategorised()
			} else {
				promise = LOCAL_DATA[when].getAmountsByDayForCategoryLabel(category, (label === $scope.ALLLAB ? null : label))
			}

			promise.then(function(amounts) {
				cache.amounts = amounts
			})
		}
		function transactionsFor(when, category, label) {
			var cache = cacheFor(when, category, label)
			if (cache.transactions) {
				return cache.transactions
			}

			cache.transactions = []

			var promise
			if (category === $scope.UNCAT) {
				promise = LOCAL_DATA[when].getUncategorisedTransactions()
			} else if (category === $scope.ALL) {
				promise = LOCAL_DATA[when].getAllTransactions()
			} else if (category === $scope.CAT) {
				promise = LOCAL_DATA[when].getCategorisedTransactions()
			} else {
				promise = LOCAL_DATA[when].getTransactionsForCategoryLabel(category, (label === $scope.ALLLAB ? null : label))
			}

			promise.then(function(transactions) {
				transactions.sort(function(a,b) {
					var val = 0
					val = a.date - b.date
					if (val === 0) {
						val = a.description.localeCompare(b.description)
					}
					return val;
				})
				cache.transactions = transactions
			})
		}
		$scope.previousYearAmounts = function(category, label) {
			return amountsFor("PREVIOUS_YEAR", category, label)
		}
		$scope.previousYearTransactions = function(category, label) {
			return transactionsFor("PREVIOUS_YEAR", category, label)
		}
		$scope.currentYearAmounts = function(category, label) {
			return amountsFor("CURRENT_YEAR", category, label)
		}
		$scope.currentYearTransactions = function(category, label) {
			return transactionsFor("CURRENT_YEAR", category, label)
		}

		var LOCAL_DATA = null
		var cancelNotifier = null
		var CATEGORIES
		var STATS

		YEAR.nowAndWhenChanged($scope, function() {
			if (cancelNotifier) {
				cancelNotifier()
			}
			caches = {}
			$scope.year = YEAR.year()
			LOCAL_DATA = {
				CURRENT_YEAR: DATA(YEAR.year()),
				PREVIOUS_YEAR: DATA(YEAR.year()-1)
			}

			cancelNotifier = LOCAL_DATA.CURRENT_YEAR.nowAndWhenChanged($scope, function() {
				$q.all({
					categories: LOCAL_DATA.CURRENT_YEAR.getAllCategoryData(),
					stats: LOCAL_DATA.CURRENT_YEAR.getStats()
				}).then(function(res) {
					CATEGORIES = res.categories
					STATS = res.stats
					$scope.refreshCategories();
				})
			})
		})

	}
])