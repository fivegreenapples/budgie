App.controller("categoriesCtrl", [
	"$rootScope",
	"$scope",
	"year",
	"data",
	"modal",
	function($rootScope, $scope, YEAR, DATA, MODAL) {

		var CURRENT_DATA = null
		var PREVIOUS_YEAR_DATA = null
		var cancelNotifier = null
		var CATEGORIES

		$scope.matcherMapping = {
			start: "Starts with:",
			exact: "Matches exactly:",
			regex: "Matches the pattern:"
		}
		$scope.activeCategory = null;
		$scope.activeLabel = null;
		$scope.activeBudgetIndex = null;

		$scope.actions = [{
			label: "Add Category",
			onclick: function() {
				alert("ASdsad")
			}
		}]

		$scope.refreshCategories = function() {
			$scope.categories = []
			$scope.categoryLabels = {}
			$scope.categoryDetails = {}

			angular.forEach(CATEGORIES, function(val, key) {
				$scope.categories.push({
					name: key
				})
			})
			$scope.categories.sort(function(A, B) { return A.name.toLowerCase().localeCompare(B.name.toLowerCase()) })

			$scope.categories.forEach(function(category) {
				$scope.categoryLabels[category.name] = []
				angular.forEach(CATEGORIES[category.name], function(val, key) {
					$scope.categoryLabels[category.name].push({
						name: key
					})
				})
				$scope.categoryLabels[category.name].sort(function(A, B) { return A.name.toLowerCase().localeCompare(B.name.toLowerCase()) })
			})

			$scope.categoryDetails = angular.copy(CATEGORIES)

			if (!$scope.activeCategory || !$scope.categoryLabels[$scope.activeCategory]) {
				$scope.activeCategory = $scope.categories.length && $scope.categories[0].name;
			}
			if (!$scope.activeCategory || !$scope.activeLabel || !$scope.categoryDetails[$scope.activeCategory][$scope.activeLabel]) {
				$scope.activeLabel = $scope.activeCategory && $scope.categoryLabels[$scope.activeCategory].length && $scope.categoryLabels[$scope.activeCategory][0].name;
			}

		}

		$scope.chooseCategory = function(categoryIndex) {
			if ($scope.categories[categoryIndex]) {
				if ($scope.categories[categoryIndex].name == $scope.activeCategory) {
					$scope.activeCategory = null
				} else {
					$scope.activeCategory = $scope.categories[categoryIndex].name
					$scope.activeLabel = $scope.activeCategory && $scope.categoryLabels[$scope.activeCategory].length && $scope.categoryLabels[$scope.activeCategory][0].name;
				}
			}
		}
		$scope.chooseLabel = function(labelIndex) {
			if ($scope.activeCategory && 
				$scope.categoryLabels[$scope.activeCategory] && 
				$scope.categoryLabels[$scope.activeCategory][labelIndex])
			{
				if ($scope.categoryLabels[$scope.activeCategory][labelIndex].name == $scope.activeLabel) {
					$scope.activeLabel = null
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
					CURRENT_DATA.addCategory(data.items[0].input.value).then(
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
					CURRENT_DATA.addCategoryLabel($scope.activeCategory, data.items[0].input.value).then(
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
				CURRENT_DATA.setCategoryLabelDetails(
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
								CURRENT_DATA.renameCategory(currentVal, newValue).then(
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
							CURRENT_DATA.deleteCategory($scope.activeCategory)
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
								CURRENT_DATA.renameCategoryLabel($scope.activeCategory, currentVal, newValue).then(
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
							CURRENT_DATA.deleteCategoryLabel($scope.activeCategory, $scope.activeLabel)
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
							CURRENT_DATA.setCategoryLabelDetails(
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
							CURRENT_DATA.setCategoryLabelDetails(
								$scope.activeCategory, 
								$scope.activeLabel, 
								$scope.categoryDetails[$scope.activeCategory][$scope.activeLabel]
							)
							CURRENT_DATA.setCategoryLabelDetails()
							$scope.activeBudgetIndex = null;
						}
					})
				}
			})
		}

		$scope.lastYearBudgetCache = {}
		$scope.lastYearBudgets = function(category, label) {
			if (!$scope.lastYearBudgetCache[category]) {
				$scope.lastYearBudgetCache[category] = {}
			}
			if (!$scope.lastYearBudgetCache[category][label]) {
				$scope.lastYearBudgetCache[category][label] = []
				PREVIOUS_YEAR_DATA
					.getCategoryLabelBudgets(category, label)
					.then(function(budgets) {
						$scope.lastYearBudgetCache[category][label] = budgets
					})
			}
			return $scope.lastYearBudgetCache[category][label]
		}
		$scope.lastYearAmountCache = {}
		$scope.lastYearAmounts = function(category, label) {
			if (!$scope.lastYearAmountCache[category]) {
				$scope.lastYearAmountCache[category] = {}
			}
			if (!$scope.lastYearAmountCache[category][label]) {
				$scope.lastYearAmountCache[category][label] = []
				PREVIOUS_YEAR_DATA
					.getAmountsByDayForCategoryLabel(category, label)
					.then(function(amounts) {
						$scope.lastYearAmountCache[category][label] = amounts
					})
			}
			return $scope.lastYearAmountCache[category][label]
		}

		YEAR.nowAndWhenChanged($scope, function() {
			if (cancelNotifier) {
				cancelNotifier()
			}
			$scope.lastYearBudgetCache = {}
			$scope.lastYearAmountCache = {}
			$scope.year = YEAR.year()
			CURRENT_DATA = DATA(YEAR.year())
			PREVIOUS_YEAR_DATA = DATA(YEAR.year()-1)

			cancelNotifier = CURRENT_DATA.nowAndWhenChanged($scope, function() {
				CURRENT_DATA.getAllCategoryData().then(function(categories) {
					CATEGORIES = categories
					$scope.refreshCategories();
				})
			})
		})

	}
])