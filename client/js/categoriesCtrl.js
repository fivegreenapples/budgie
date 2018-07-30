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
		$scope.activeDetail = "transactions";
		$scope.activeBudgetId = null;
		$scope.activeMatcherIndex = null;

		$scope.chooseCategory = function(categoryId) {
			if (magic_constants[categoryId]) {
				$scope.activeCategory = magic_constants[categoryId]
				$scope.activeLabel = null
				$scope.activeDetail = "transactions"
				return
			}

			if (categoryId == $scope.activeCategory) {
				$scope.activeCategory = $scope.ALL
			} else {
				$scope.activeCategory = categoryId
				$scope.activeLabel = $scope.ALLLAB
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
		$scope.chooseBudget = function(budgetId) {
			if ($scope.activeBudgetId == budgetId) {
				$scope.activeBudgetId = null
			} else {
				$scope.activeBudgetId = budgetId
			}
		}
		$scope.chooseMatcher = function(matcherIndex) {
			if ($scope.activeCategory && 
				$scope.categoryLabels[$scope.activeCategory] && 
				$scope.activeLabel && 
				$scope.categoryDetails[$scope.activeCategory][$scope.activeLabel] &&
				$scope.categoryDetails[$scope.activeCategory][$scope.activeLabel].matchers[matcherIndex])
			{
				if ($scope.activeMatcherIndex == matcherIndex) {
					$scope.activeMatcherIndex = null
				} else {
					$scope.activeMatcherIndex = matcherIndex
				}
			}
		}
		$scope.chooseDetail = function(detail) {
			$scope.activeDetail = detail
		}

		function addOrEditCategory(bEdit, catData) {
			return MODAL.addForm({
				title: bEdit ? "Edit Category" : "Add New Category",
				message: "Categories allow you to break down income and expense into manageable units.",
				items: [{
					label: "Name",
					input: {
						type: "TEXTBOX",
						value: (catData && catData.name) || "Aardvark"
					}
				},{
					label: "Type",
					input: {
						type: "SELECT",
						value: (catData && catData.type) || "expense",
						options: [{value:"expense",label:"Expense"},{value:"income",label:"Income"}]
					}
				}],
				buttons: [{
					type: "red",
					label: "Cancel"
				},{
					type: "green",
					label: bEdit ? "Save" : "Add"
				}]
			})
		}
		$scope.addCategory = function() {
			addOrEditCategory(false).then(function(data) {
				if (data.button == "Add") {
					var newCat = {
						name: data.items[0].input.value,
						type: data.items[1].input.value
					}
					LOCAL_DATA.CURRENT_YEAR.addCategory(newCat).then(
						function() {
							$scope.activeCategory = newCat.name
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
								addOrEditCategory(false, newCat)
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
			MODAL.addBudgetForm($scope.year).then(function(data) {
				data.category = $scope.activeCategory in magic_constants ? null : $scope.activeCategory 
				data.label = $scope.activeLabel in magic_constants ? null : $scope.activeLabel
				$scope.activeBudgetId = data.id
				LOCAL_DATA.CURRENT_YEAR.setBudget(data)
			})
		}
		$scope.addMatcher = function() {
			if (!$scope.activeCategory || 
				!($scope.activeCategory in $scope.categoryLabels) ||
				!$scope.activeLabel ||
				!($scope.activeLabel in $scope.categoryDetails[$scope.activeCategory])) {
				return
			}
			MODAL.addMatcherForm().then(function(data) {
				console.log(data)
				$scope.categoryDetails[$scope.activeCategory][$scope.activeLabel].matchers.push(data)
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
					"Edit...",
					"Delete..."
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
				} else if (which == "Edit...") {
					addOrEditCategory(true, $scope.activeCategory) //??
				} else if (which == "Delete...") {
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
				],
				rightEdge: true
			}).then(function(which) {
				if (which == "Edit...") {
					MODAL.addBudgetForm($scope.year, LOCAL_DATA.CURRENT_YEAR.budgetById($scope.activeBudgetId))
						.then(function(data) {
							LOCAL_DATA.CURRENT_YEAR.setBudget(data)
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
							LOCAL_DATA.CURRENT_YEAR.deleteBudgetById($scope.activeBudgetId)
						}
					})
				}
			})
		}
		$scope.showMatcherPopoverMenu = function(ev) {
			ev.stopPropagation()
			MODAL.addPopoverMenu({
				element: $(ev.target),
				menuitems: [
					"Edit...",
					"Delete"
				],
				rightEdge: true
			}).then(function(which) {
				if (which == "Edit...") {
					MODAL.addMatcherForm($scope.categoryDetails[$scope.activeCategory][$scope.activeLabel].matchers[$scope.activeMatcherIndex])
						.then(function(data) {
							$scope.categoryDetails[$scope.activeCategory][$scope.activeLabel].matchers[$scope.activeMatcherIndex] = data
							LOCAL_DATA.CURRENT_YEAR.setCategoryLabelDetails(
								$scope.activeCategory, 
								$scope.activeLabel, 
								$scope.categoryDetails[$scope.activeCategory][$scope.activeLabel]
							)
						})
				} else if (which == "Delete") {
					MODAL.addAlert({
						title: "Delete Matcher",
						message: "Are you sure you want to delete this matcher?",
						buttons: [{
							type: "red",
							label: "Cancel"
						}, {
							type: "green",
							label: "Yes"
						}]
					}).then(function(whichDelete) {
						if (whichDelete == "Yes") {
							$scope.categoryDetails[$scope.activeCategory][$scope.activeLabel].matchers.splice($scope.activeMatcherIndex, 1)
							LOCAL_DATA.CURRENT_YEAR.setCategoryLabelDetails(
								$scope.activeCategory, 
								$scope.activeLabel, 
								$scope.categoryDetails[$scope.activeCategory][$scope.activeLabel]
							)
							$scope.activeMatcherIndex = null;
						}
					})
				}
			})
		}

		function amountsFor(when, category, label) {
			if (category === $scope.ALL) {
				return LOCAL_DATA[when].dailyAmountsForAll()
			} else if (category === $scope.CAT) {
				return LOCAL_DATA[when].dailyAmountsForCategorised()
			} else if (category === $scope.UNCAT) {
				return LOCAL_DATA[when].dailyAmountsForUncategorised()
			}
			if (label === $scope.ALLLAB) label = null
			return LOCAL_DATA[when].dailyAmountsForCategoryAndLabel(category, label)
		}
		function transactionsFor(when, category, label) {
			if (category === $scope.ALL) {
				return LOCAL_DATA[when].transactionsForAll()
			} else if (category === $scope.CAT) {
				return LOCAL_DATA[when].transactionsForCategorised()
			} else if (category === $scope.UNCAT) {
				return LOCAL_DATA[when].transactionsForUncategorised()
			}
			if (label === $scope.ALLLAB) label = null
			return LOCAL_DATA[when].transactionsForCategoryAndLabel(category, label)
		}
		function budgetsFor(when, category, label) {
			if (category === $scope.ALL) {
				return LOCAL_DATA[when].budgetsForAll()
			} else if (category === $scope.CAT) {
				return LOCAL_DATA[when].budgetsForCategorised()
			} else if (category === $scope.UNCAT) {
				return LOCAL_DATA[when].budgetsForUncategorised()
			}
			if (label === $scope.ALLLAB) label = null
			return LOCAL_DATA[when].budgetsForCategoryAndLabel(category, label)
		}
		function matchersFor(when, category, label) {
			if (category === $scope.ALL) {
				return LOCAL_DATA[when].matchersForAll()
			} else if (category === $scope.CAT) {
				return LOCAL_DATA[when].matchersForCategorised()
			} else if (category === $scope.UNCAT) {
				return LOCAL_DATA[when].matchersForUncategorised()
			}
			if (label === $scope.ALLLAB) label = null
			return LOCAL_DATA[when].matchersForCategoryAndLabel(category, label)
		}
		function initialValueFor(when, category, label) {
			if (category === $scope.ALL) {
				return LOCAL_DATA[when].initialValueForYear()
			}
			return 0
		}
		$scope.currentYearAmounts = function(category, label) {
			return amountsFor("CURRENT_YEAR", category, label)
		}
		$scope.currentYearTransactions = function(category, label) {
			return transactionsFor("CURRENT_YEAR", category, label)
		}
		$scope.currentYearBudgets = function(category, label) {
			return budgetsFor("CURRENT_YEAR", category, label)
		}
		$scope.currentYearMatchers = function(category, label) {
			return matchersFor("CURRENT_YEAR", category, label)
		}
		$scope.currentYearInitialValue = function(category, label) {
			return initialValueFor("CURRENT_YEAR", category, label)
		}

		$scope.launchCategoriseModal = function(t) {
			MODAL.addCategoriseForm($scope.year, t)
				.then(function(data) {})
		}


		var LOCAL_DATA = null
		var cancelNotifier = null

		$scope.loading = true;
		YEAR.nowAndWhenChanged($scope, function() {
			$scope.loading = true;
			if (cancelNotifier) {
				cancelNotifier()
			}
			$scope.year = YEAR.year()
			LOCAL_DATA = {
				CURRENT_YEAR: DATA(YEAR.year()),
			}

			cancelNotifier = LOCAL_DATA.CURRENT_YEAR.whenCachedAndWhenChanged($scope, function() {
				$scope.refreshCategories();
				$scope.loading = false;
			})

		})

		$scope.refreshCategories = function() {
			$scope.categories = {income:[],expense:[]}
			$scope.categoryLabels = {}
			$scope.categoryDetails = {}
			$scope.aggregateData = {}
			$scope.aggregateData[$scope.ALL] = {
				amount: LOCAL_DATA.CURRENT_YEAR.totalForAll()
			}
			$scope.aggregateData[$scope.CAT] = {
				amount: LOCAL_DATA.CURRENT_YEAR.totalForCategorised()
			}
			$scope.aggregateData[$scope.UNCAT] = {
				amount: LOCAL_DATA.CURRENT_YEAR.totalForUncategorised()
			}

			LOCAL_DATA.CURRENT_YEAR.allCategories().forEach(function(cat) {
				$scope.categories[cat.type].push({
					id: cat.id,
					name: cat.name,
					type: cat.type,
					amount: LOCAL_DATA.CURRENT_YEAR.totalForCategory(cat.id)
				})

				$scope.categoryLabels[cat.id] = []
				LOCAL_DATA.CURRENT_YEAR.activeLabelsForCategory(cat.id).forEach(function(label) {
					$scope.categoryLabels[cat.id].push({
						name: label,
						amount: LOCAL_DATA.CURRENT_YEAR.totalForLabel(cat.id, label)
					})
				})
			})

			if (!$scope.activeCategory || (!magic_constants[$scope.activeCategory] && !$scope.categoryLabels[$scope.activeCategory])) {
				$scope.activeCategory = $scope.ALL
			}
			if (magic_constants[$scope.activeCategory]) {
				$scope.activeLabel = null;
			} else {
				if (!$scope.activeLabel || ($scope.categoryLabels[$scope.activeCategory].findIndex(function(l) { return l.name === $scope.activeLabel }) === -1)) {
					$scope.activeLabel = $scope.ALLLAB;
				}
			}

		}

	}
])