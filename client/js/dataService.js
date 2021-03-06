App.factory("data", [
	"$http",
	"$q",
	"guid",
	function($http, $q, GUID) {

		var servicesByYear = {}
		function daysInYear(year) {
			return moment().year(year).month(11).date(31).dayOfYear()
		}
		function zeroesForYear(year) {
			return Array(daysInYear(year)).fill(0)
		}
		function amountsByDayForTransactions(year, transactions) {
			var amounts = zeroesForYear(year)
			transactions.forEach(function(transaction) {
				amounts[moment(transaction.date).dayOfYear()-1] += transaction.amount
			})
			return amounts
		}
		function transactionToEntries(t) {
			return t.entries.map(function(e, index) {
				return {
					id: t.id+":"+index,
					date: t.date,
					description: e.description ? e.description : t.bankDescription,
					amount: e.amount,
					category: e.categorisation ? e.categorisation[0] : (t.autoCategorisation ? t.autoCategorisation[0] : null),
					label: e.categorisation ? e.categorisation[1] : (t.autoCategorisation ? t.autoCategorisation[1] : null),
				}
			})
		}
		function accountsToTransactions(accounts) {
			return accounts.reduce(function(previous, account) {
				return previous.concat(
					account
						.transactions
						.map(transactionToEntries)
						.reduce(function(prev, entries) {
							return prev.concat(entries)
						}, [])
					)
			}, [])
		}

		return function(theYear) {

			if (servicesByYear[theYear]) {
				return servicesByYear[theYear]
			}

			var CURRENT_YEAR = theYear
			var watchers = []
			function triggerWatchers() {
				watchers.forEach(function(w) {
					if (w) w()
				})
				refreshCache()
			}

			var DATA = null
			var DATAp = null
			var ORIGINAL_DATA = null

			var CACHE = {}
			var CACHE_PROMISE = null
			var CACHE_WATCHERS = []
			function refreshCache() {
				CACHE_PROMISE = null
				cacheEverything().then(triggerCacheWatchers)
			}
			function triggerCacheWatchers() {
				CACHE_WATCHERS.forEach(function(w) {
					if (w) w()
				})
			}

			function cacheEverything() {
				if (!CACHE_PROMISE) {


					CACHE_PROMISE = loadData().then(function() {

						if (angular.equals(DATA.cats, {})) {
							angular.forEach(DATA.categories, function(_, cat) {
								let id = GUID.generate()
								DATA.cats[id] = {
									id: id,
									name: cat,
									type: "expense"
								}
							})
							triggerWatchers()
						}
						if (angular.equals(DATA.labels, {})) {
							angular.forEach(DATA.categories, (catInfo) => {
								angular.forEach(catInfo, (labelInfo, label) => {
									let id = GUID.generate()
									DATA.labels[id] = {
										id: id,
										name: label,
										matchers: labelInfo.matchers
									}
								})
							})
							triggerWatchers()
						}
						function categoryToId(category) {
							for(let id in DATA.cats) {
								if (category == DATA.cats[id].name) return id
							}
							return null
						}
						function labelToId(label) {
							for(let id in DATA.labels) {
								if (label == DATA.labels[id].name) return id
							}
							return null
						}
						if (angular.equals(DATA.accs, {})) {
							DATA.transactions = {}
							DATA.accounts.forEach( acc => {
								let accId = GUID.generate()
								DATA.accs[accId] = {
									id: accId,
									shortName: acc.shortName,
									fullName: acc.fullName,
									openingBalance: acc.openingBalance,
									type: acc.type,
								}

								acc.transactions.forEach( t => {
									DATA.transactions[t.id] = {
										id: t.id,
										accountId: accId,
										imported: t.imported,
										date: t.date,
										bankDescription: t.bankDescription,
										autoLabelId: t.autoCategorisation ? labelToId(t.autoCategorisation[1]) : null,
										autoCategoryId: t.autoCategorisation ? categoryToId(t.autoCategorisation[0]) : null,
										originalAmount: t.originalAmount,
										entries: t.entries.map( e => {
											return {
												id: GUID.generate(),
												parentTransaction: t.id,
												account: accId, 
												amount: e.amount,
												description: e.description,
												labelId: e.categorisation ? labelToId(e.categorisation[1]) : null,
												categoryId: e.categorisation ? categoryToId(e.categorisation[0]) : null,
											}
										}),
									}
								})
							})
							triggerWatchers()
						}

						CACHE = {}
						CACHE.accountsById = angular.copy(DATA.accs)
						CACHE.categoriesById = angular.copy(DATA.cats)
						CACHE.labelsById = angular.copy(DATA.labels)
						CACHE.transactionsById = angular.copy(DATA.transactions)
						CACHE.budgetsById = angular.copy(DATA.budgets)
						CACHE.entriesById = {}
						angular.forEach(CACHE.transactionsById, (t) => {
							t.entries.forEach(e => {
								CACHE.entriesById[e.id] = {
									id: e.id,
									date: t.date,
									parentTransaction: e.parentTransaction,
									account: e.account,
									amount: e.amount,
									description: e.description ? e.description : t.bankDescription,
									labelId: e.labelId ? e.labelId : (t.autoLabelId ? t.autoLabelId : null),
									categoryId: e.categoryId ? e.categoryId : (t.autoCategoryId ? t.autoCategoryId : null),
								}
								CACHE.entriesById[e.id].label = CACHE.entriesById[e.id].labelId ? CACHE.labelsById[CACHE.entriesById[e.id].labelId].name : null
								CACHE.entriesById[e.id].category = CACHE.entriesById[e.id].categoryId ? CACHE.categoriesById[CACHE.entriesById[e.id].categoryId].name : null
							})
						})

						CACHE.accountData = {
							initialValueForYear: 0
						}

						const DATA_SET = { amount: 0, number: 0, entries: [], dailyAmounts: [], budgets: [], matchers: [] }

						CACHE.aggregateData = {
							ALL: angular.copy(DATA_SET),
							UNMATCHED: angular.copy(DATA_SET),
							UNCATEGORISED: angular.copy(DATA_SET),
							CATEGORISED: angular.copy(DATA_SET),
						}


						angular.forEach(CACHE.accountsById, a => {
							CACHE.accountData.initialValueForYear += a.openingBalance 
						})

						CACHE.allCategories = Object.keys(CACHE.categoriesById)
							.map( catId => CACHE.categoriesById[catId] )
							.sort( (A, B) => A.name.toLowerCase().localeCompare(B.name.toLowerCase()) )
						CACHE.categories = CACHE.allCategories.map( cat => cat.name )


						// angular.forEach(DATA.cats, function(catInfo, catId) {
						// 	angular.extend(catInfo, DATA_SET)
						// 	CACHE.categoryData[catInfo.name] = angular.copy(DATA_SET)
						// 	var data = CACHE.categoryData[catInfo.name]
						// 	data.labels = Object.keys(DATA.categories[catInfo.name]).sort(function(A, B) { return A.toLowerCase().localeCompare(B.toLowerCase()) })
						// 	data.labelData = {}


						// 	angular.forEach(DATA.categories[catInfo.name], function(labelInfo, label) {
						// 		data.labelData[label] = angular.copy(DATA_SET)

						// 		var labelData = data.labelData[label]

						// 		Array.prototype.push.apply(CACHE.aggregateData.ALL.matchers, labelInfo.matchers)
						// 		Array.prototype.push.apply(CACHE.aggregateData.CATEGORISED.matchers, labelInfo.matchers)
						// 		Array.prototype.push.apply(data.matchers, labelInfo.matchers)
						// 		Array.prototype.push.apply(labelData.matchers, labelInfo.matchers)

						// 	})
						// })

						angular.forEach(CACHE.entriesById, e => {
							CACHE.aggregateData.ALL.amount += e.amount
							CACHE.aggregateData.ALL.number += 1
							CACHE.aggregateData.ALL.entries.push(e)
							if (e.categoryId === null) {
								CACHE.aggregateData.UNCATEGORISED.amount += e.amount
								CACHE.aggregateData.UNCATEGORISED.number += 1
								CACHE.aggregateData.UNCATEGORISED.entries.push(e)
							}
							if (e.categoryId === null && e.labelId === null) {
								CACHE.aggregateData.UNMATCHED.amount += e.amount
								CACHE.aggregateData.UNMATCHED.number += 1
								CACHE.aggregateData.UNMATCHED.entries.push(e)
							}
							if (e.categoryId !== null) {
								CACHE.aggregateData.CATEGORISED.amount += e.amount
								CACHE.aggregateData.CATEGORISED.number += 1
								CACHE.aggregateData.CATEGORISED.entries.push(e)
								CACHE.categoriesById[e.categoryId].amount += e.amount
								CACHE.categoriesById[e.categoryId].number += 1
								CACHE.categoriesById[e.categoryId].entries.push(e)
							}
							if (e.labelId !== null) {
								CACHE.labelsById[e.labelId].amount += e.amount
								CACHE.labelsById[e.labelId].number += 1
								CACHE.labelsById[e.labelId].entries.push(e)
							}
							if (e.categoryId !== null && e.labelId !== null) {
								CACHE.categoriesById[e.categoryId].labelData[e.labelId].amount += e.amount
								CACHE.categoriesById[e.categoryId].labelData[e.labelId].number += 1
								CACHE.categoriesById[e.categoryId].labelData[e.labelId].entries.push(e)
							}
						})
						angular.forEach(CACHE.budgetsById, function(b) {

							CACHE.aggregateData.ALL.budgets.push(b)
							CACHE.aggregateData.CATEGORISED.budgets.push(b)
							CACHE.categoriesById[b.categoryId].budgets.push(b)
							if (b.labelId !== null) {
								CACHE.categoriesById[b.categoryId].labelData[b.labelId].budgets.push(b)
							}
							
						})

						CACHE.activeCategories = Object.keys(CACHE.categoriesById).filter( catId => CACHE.categoriesById[catId].number > 0 )
						for (let catId in CACHE.categoriesById) {
							let data = CACHE.categoriesById[catId]
							data.activeLabels = Object.keys(data.labelData).filter( labelId => data.labelData[labelId].number > 0)
						}


						CACHE.aggregateData.ALL.dailyAmounts = amountsByDayForTransactions(CURRENT_YEAR, CACHE.aggregateData.ALL.entries) 
						CACHE.aggregateData.CATEGORISED.dailyAmounts = amountsByDayForTransactions(CURRENT_YEAR, CACHE.aggregateData.CATEGORISED.entries) 
						CACHE.aggregateData.UNCATEGORISED.dailyAmounts = amountsByDayForTransactions(CURRENT_YEAR, CACHE.aggregateData.UNCATEGORISED.entries) 

						CACHE.activeCategories.forEach( catId => {
							let data = CACHE.categoriesById[catId]
							data.dailyAmounts = amountsByDayForTransactions(CURRENT_YEAR, data.entries) 
							data.activeLabels.forEach( labelId => {
								data.labelData[labelId].dailyAmounts = amountsByDayForTransactions(CURRENT_YEAR, data.labelData[labelId].entries) 
							})
						})
							 
						CACHE = angular.copy(CACHE)
						CACHE.warm = true

					})
				}
				return CACHE_PROMISE
			}

			function loadData() {
				if (!DATAp) {
					DATAp = $http.get("/server/data/"+CURRENT_YEAR+".json")
						.then(function(response) {
							DATA = angular.copy(response.data)
						}, function() {
							DATA = { accounts:[], categories:{}, budgets: {}, cats:{} }
						})
						.finally(function() {
							if (!("budgets" in DATA)) {
								DATA.budgets = {}
							}
							if (!("cats" in DATA)) {
								DATA.cats = {}
							}
							if (!("labels" in DATA)) {
								DATA.labels = {}
							}
							if (!("accs" in DATA)) {
								DATA.accs = {}
							}
							ORIGINAL_DATA = angular.copy(DATA)
						})
				}
				return DATAp
			}
			function whenLoaded(func) {
				return function() {
					var calleeArgs = arguments
					return loadData().then(function() { return func.apply(null, calleeArgs) })
				}
			}
			function ifCached(func) {
				return function() {
					if (CACHE.warm) {
						var calleeArgs = arguments
						return func.apply(null, calleeArgs)
					}
					throw "Data caches not ready. Tried to call synchronous method when data not ready."
				}
			}

			function accountIndex(accountShortName) {
				return DATA.accounts.findIndex(function(acc) {
					return accountShortName === acc.shortName
				})
			}
			function transactionIndex(accIndex, transactionId) {
				return DATA.accounts[accIndex].transactions.findIndex(function(t) {
					return t.id === transactionId
				})
			}

			function validateAccountData(mode, data) {
				var isValid=true, validation={}
				data.shortName = "" + data.shortName
				if (data.shortName === "") {
					isValid = false
					validation.shortName = "A short name must be provided."
				}
				data.fullName = "" + data.fullName
				if (data.fullName === "") {
					isValid = false
					validation.fullName = "A full name must be provided."
				}
				if (data.openingBalance === null || data.openingBalance === undefined || !Number.isInteger(data.openingBalance)) {
					isValid = false
					validation.openingBalance = "An opening balance must be a valid number e.g. -45.33."
				}
				data.type = "" + data.type
				if (data.type != "debit" && data.type != "credit") {
					isValid = false
					validation.type = "Account type must be either debit or credit."
				}
				if (mode === "add") {
					var aIndex = accountIndex(data.shortName)
					if (aIndex !== -1) {
						validation.shortName = "An account with this name already exists."
						isValid = false
					}
				}
				if (!isValid) {
					return validation
				}
				return null
			}
			function validateTransactionData(mode, data) {
				var validation={}
				if (moment(data.date, "x").year() !== CURRENT_YEAR) {
					validation.date = "Transaction must be within the current year."
				}
				if (data.imported) {
					if (data.bankDescription === undefined || data.bankDescription === null || data.bankDescription === "") {
						validation.description = "A bank description must be provided."
					}
					if (data.autoCategorisation === undefined) {
						validation.autoCategorisation = "No auto categorisation data has been provided."
					} else {
						if (data.autoCategorisation !== null &&
							(!Array.isArray(data.autoCategorisation) || data.autoCategorisation.length !== 2))
						{
							validation.autoCategorisation = "Auto categorisation data is not in a valid format."
						}
					}
				}
				if (data.originalAmount === null || data.originalAmount === undefined || !Number.isInteger(data.originalAmount) || data.originalAmount === 0) {
					validation.originalAmount = "The original amount must be a valid non zero number e.g. -4533."
				}
				if (!Array.isArray(data.entries) || data.entries.length === 0) {
					validation.entrydata = "No transaction entries are provided."
				}
				var entries = [], anError = false, sum = 0
				data.entries.forEach(function(e, i) {
					entries[i] = {}
					if (e.amount === null || e.amount === undefined || !Number.isInteger(e.amount) || e.amount === 0) {
						entries[i].amount = "The amount must be a valid non zero number e.g. -4533."
					} else {
						sum += e.amount
					}
					if (e.description === undefined) {
						entries[i].description = "A description must be provided."
					} else if (!data.imported && (e.description === null || e.description === "")) {
						entries[i].description = "A description must be provided."
					}
					if (e.categorisation === undefined) {
						entries[i].categorisation = "No categorisation data has been provided."
					} else {
						if (e.categorisation !== null &&
							(!Array.isArray(e.categorisation) || e.categorisation.length !== 2))
						{
							entries[i].categorisation = "Categorisation data is not in a valid format."
						}
					}
					if (i === data.entries.length - 1) {
						if (data.imported && !entries[i].amount && !validation.originalAmount && sum !== data.originalAmount) {
							entries[i].amount = "The transaction amounts must sum to the original amount."
						}
					}
					anError = anError || !angular.equals(entries[i], {})
				})
				if (anError) validation.entries = entries
				return angular.equals(validation, {}) ? null : validation
			}
			function categorise(description) {
				if (!DATA) return null
				if (typeof description !== "string") return null
				if (description === "") return null
				var reggy
				for (category in DATA.categories) {
					for (label in DATA.categories[category]) {
						for (var i=0; i<DATA.categories[category][label].matchers.length; ++i) {
							var match = DATA.categories[category][label].matchers[i]
							if (match.type === "start") {
								if (description.substr(0, match.match.length) === match.match) {
									return [category, label]
								}
							} else if (match.type === "exact") {
								if (description === match.match) {
									return [category, label]
								}
							} else if (match.type === "regex") {
								reggy = new RegExp(match.match.replace(/^\/|\/$/g, ""))
								if (description.match(reggy)) {
									return [category, label]
								}
							}
						}
					}
				}
				return null
			}

			function reAutoCategorise() {
				DATA.accounts.forEach(function(account) {
					account.transactions.forEach(function(t) {
						t.autoCategorisation = categorise(t.bankDescription)
					})
				})
			}

			var service = {

				whenCachedAndWhenChanged: function(scope, cb) {
					var currentLength = CACHE_WATCHERS.length
					CACHE_WATCHERS.push(cb)
					scope.$on("$destroy", function() {
						CACHE_WATCHERS[currentLength] = null
					})
					
					cacheEverything().then(cb)

					return function() {
						CACHE_WATCHERS[currentLength] = null
					}
				},

				nowAndWhenChanged: function(scope, cb) {
					var currentLength = watchers.length
					watchers.push(cb)
					scope.$on("$destroy", function() {
						watchers[currentLength] = null
					})
					cb()
					return function() {
						watchers[currentLength] = null
					}
				},
				hasChanged: function() {
					return !angular.equals(DATA, ORIGINAL_DATA)
				},
				saveChanges: function() {
					return $http.post("/server/save.php", {year: CURRENT_YEAR, data: DATA}).then(function(response) {
						DATA = response.data
						ORIGINAL_DATA = angular.copy(DATA)
						triggerWatchers()
					})
				},
				year: function(year) {
					if (year === undefined) {
						return CURRENT_YEAR
					}
				},

				initialValueForYear: ifCached(function() {
					return CACHE.accountData.initialValueForYear
				}),
				allCategories: ifCached(function() {
					return CACHE.allCategories
				}),
				labelsForCategory: ifCached(function(category) {
					return CACHE.categoryData[category].labels
				}),
				activeLabelsForCategory: ifCached(function(category) {
					return CACHE.categoryData[category].activeLabels
				}),
				totalForCategory: ifCached(function(category) {
					return CACHE.categoryData[category].amount
				}),
				totalForLabel: ifCached(function(category, label) {
					return CACHE.categoryData[category].labelData[label].amount
				}),
				totalForAll: ifCached(function(category) {
					return CACHE.aggregateData.ALL.amount
				}),
				totalForCategorised: ifCached(function(category) {
					return CACHE.aggregateData.CATEGORISED.amount
				}),
				totalForUncategorised: ifCached(function(category) {
					return CACHE.aggregateData.UNCATEGORISED.amount
				}),
				transactionsForCategoryAndLabel: ifCached(function(category, label) {
					if (label === null) {
						return (CACHE.categoryData[category] && CACHE.categoryData[category].transactions) || []
					}
					return (CACHE.categoryData[category] && CACHE.categoryData[category].labelData[label] && CACHE.categoryData[category].labelData[label].transactions) || []
				}),
				transactionsForAll: ifCached(function(category) {
					return CACHE.aggregateData.ALL.transactions
				}),
				transactionsForCategorised: ifCached(function(category) {
					return CACHE.aggregateData.CATEGORISED.transactions
				}),
				transactionsForUncategorised: ifCached(function(category) {
					return CACHE.aggregateData.UNCATEGORISED.transactions
				}),
				dailyAmountsForCategoryAndLabel: ifCached(function(category, label) {
					if (label === null) {
						return (CACHE.categoryData[category] && CACHE.categoryData[category].dailyAmounts) || amountsByDayForTransactions(CURRENT_YEAR, [])
					}
					return (CACHE.categoryData[category] && CACHE.categoryData[category].labelData[label] && CACHE.categoryData[category].labelData[label].dailyAmounts) || amountsByDayForTransactions(CURRENT_YEAR, [])
				}),
				dailyAmountsForAll: ifCached(function(category) {
					return CACHE.aggregateData.ALL.dailyAmounts
				}),
				dailyAmountsForCategorised: ifCached(function(category) {
					return CACHE.aggregateData.CATEGORISED.dailyAmounts
				}),
				dailyAmountsForUncategorised: ifCached(function(category) {
					return CACHE.aggregateData.UNCATEGORISED.dailyAmounts
				}),

				budgetById: ifCached(function(id) {
					return CACHE.budgetsById[id]
				}),
				budgetsForCategoryAndLabel: ifCached(function(category, label) {
					if (label === null) {
						return (CACHE.categoryData[category] && CACHE.categoryData[category].budgets) || amountsByDayForTransactions(CURRENT_YEAR, [])
					}
					return (CACHE.categoryData[category] && CACHE.categoryData[category].labelData[label] && CACHE.categoryData[category].labelData[label].budgets) || []
				}),
				budgetsForAll: ifCached(function(category) {
					return CACHE.aggregateData.ALL.budgets
				}),
				budgetsForCategorised: ifCached(function(category) {
					return CACHE.aggregateData.CATEGORISED.budgets
				}),
				budgetsForUncategorised: ifCached(function(category) {
					return CACHE.aggregateData.UNCATEGORISED.budgets
				}),

				matcherById: ifCached(function(id) {
					return CACHE.matchersById[id]
				}),
				matchersForCategoryAndLabel: ifCached(function(category, label) {
					if (label === null) {
						return (CACHE.categoryData[category] && CACHE.categoryData[category].matchers) || amountsByDayForTransactions(CURRENT_YEAR, [])
					}
					return (CACHE.categoryData[category] && CACHE.categoryData[category].labelData[label] && CACHE.categoryData[category].labelData[label].matchers) || []
				}),
				matchersForAll: ifCached(function(category) {
					return CACHE.aggregateData.ALL.matchers
				}),
				matchersForCategorised: ifCached(function(category) {
					return CACHE.aggregateData.CATEGORISED.matchers
				}),
				matchersForUncategorised: ifCached(function(category) {
					return CACHE.aggregateData.UNCATEGORISED.matchers
				}),



				getAllAccountData: whenLoaded(function() {
					return angular.copy(DATA.accounts)
				}),
				setAllAccountData: whenLoaded(function(accData) {
					// No validation! Only done if empty.
					if (DATA.accounts.length) {
						return $q.reject("ACCOUNT_DATA_NOT_EMPTY")
					}
					DATA.accounts = angular.copy(accData);
					triggerWatchers()
				}),
				getAllCategoryData: whenLoaded(function () {
					return angular.copy(DATA.categories)
				}),
				setAllCategoryData: whenLoaded(function (categoryData) {
					// No validation! Only done if empty.
					if (Object.keys(DATA.categories).length) {
						return $q.reject("CATEGORY_DATA_NOT_EMPTY")
					}
					DATA.categories = angular.copy(categoryData);
					triggerWatchers()
				}),


				addAccount: whenLoaded(function(newData) {
					var validation = validateAccountData("add", newData)
					if (validation) {
						return $q.reject(validation)
					}
					DATA.accounts.push({
						shortName: newData.shortName,
						fullName: newData.fullName,
						openingBalance: newData.openingBalance,
						type: newData.type,
						transactions: []
					})
					triggerWatchers()
					return DATA.accounts[DATA.accounts.length-1]
				}),

				editAccount: whenLoaded(function(accountShortName, newData) {
					var accIndex = accountIndex(accountShortName)
					if (accIndex === -1) {
						return $q.reject({shortName: "Account doesn't exist."})
					}
					var validation = validateAccountData("edit", newData)
					if (validation) {
						return $q.reject(validation)
					}
					DATA.accounts[accIndex].shortName = newData.shortName
					DATA.accounts[accIndex].fullName = newData.fullName
					DATA.accounts[accIndex].openingBalance = newData.openingBalance
					DATA.accounts[accIndex].type = newData.type
					triggerWatchers()
					return DATA.accounts[accIndex]
				}),
				deleteAccount: whenLoaded(function(accountShortName) {
					var accIndex = accountIndex(accountShortName)
					if (accIndex === -1) {
						return $q.reject("ACCOUNT_NOT_FOUND")
					}
					DATA.accounts.splice(accIndex, 1)
					triggerWatchers()
				}),
				addTransaction: function(accountShortName, newData) {
					return service.addMultipleTransactions(accountShortName, [newData]).catch(function(validations) {
						return $q.reject(validations[0])
					})
				},
				addMultipleTransactions: whenLoaded(function(accountShortName, arrNewData) {
					var accIndex = accountIndex(accountShortName)
					if (accIndex === -1) {
						return $q.reject({global: "Account doesn't exist."})
					}
					var validations = [], anError = false, arrInsert = []
					arrNewData.forEach(function(newData) {
						arrInsert.push({
							id: GUID.generate(),
							imported: newData.imported,
							reconciled: newData.reconciled,
							dupe: newData.dupe,
							date: newData.date,
							bankDescription: newData.bankDescription,
							autoCategorisation: categorise(newData.bankDescription),
							originalAmount: newData.entries && newData.entries.reduce(function(prev, current) { return prev + current.amount}, 0),
							entries: newData.entries // {amount, description, categorisation}
						})
						validations.push(validateTransactionData("add", arrInsert[arrInsert.length-1]))
						if (validations[validations.length-1]) {
							anError = true
						}
					})
					if (anError) {
						return $q.reject(validations)
					} else {
						arrInsert.forEach(function(newData) {
							DATA.accounts[accIndex].transactions.push(newData)
						})
						triggerWatchers()
					}
				}),
				editTransaction: whenLoaded(function(accountShortName, newData) {
					var accIndex = accountIndex(accountShortName)
					if (accIndex === -1) {
						return $q.reject({global: "Account doesn't exist."})
					}
					var tIndex = transactionIndex(accIndex, newData.id)
					if (tIndex === -1) {
						return $q.reject({global: "Transaction was not found."})
					}
					var validation = validateTransactionData("edit", newData)
					if (validation) {
						return $q.reject(validation)
					}
					DATA.accounts[accIndex].transactions[tIndex] = newData
					triggerWatchers()
				}),
				splitTransaction: whenLoaded(function(accountShortName, id) {
					var accIndex = accountIndex(accountShortName)
					if (accIndex === -1) {
						return $q.reject({global: "Account doesn't exist."})
					}
					var tIndex = transactionIndex(accIndex, id)
					if (tIndex === -1) {
						return $q.reject({global: "Transaction was not found."})
					}
					var currentNumSplits = DATA.accounts[accIndex].transactions[tIndex].entries.length
					DATA.accounts[accIndex].transactions[tIndex].entries.push({
						amount:0,
						description:"New entry",
						categorisation: null
					})
					if (DATA.accounts[accIndex].transactions[tIndex].entries[currentNumSplits-1].description === null) {
						DATA.accounts[accIndex].transactions[tIndex].entries[currentNumSplits-1].description = "Split 1"
						DATA.accounts[accIndex].transactions[tIndex].entries[currentNumSplits].description = "Split 2"
					}
					triggerWatchers()
				}),
				deleteTransaction: whenLoaded(function(accountShortName, id) {
					var accIndex = accountIndex(accountShortName)
					if (accIndex === -1) {
						return $q.reject({global: "Account doesn't exist."})
					}
					var tIndex = transactionIndex(accIndex, id)
					if (tIndex === -1) {
						return $q.reject({global: "Transaction was not found."})
					}
					DATA.accounts[accIndex].transactions.splice(tIndex, 1)
					triggerWatchers()
				}),

				getTransactionsForCategoryLabel: whenLoaded(function(category, label) {
					var noLabel = (label === undefined) || (label === null)
					if (!DATA.categories[category]) {
						return $q.reject("CATEGORY_NOT_FOUND")
					}
					if (!noLabel && !DATA.categories[category][label]) {
						return $q.reject("LABEL_NOT_FOUND")
					}

					return accountsToTransactions(DATA.accounts).filter(function(entry) {
						return entry.category === category &&
						       (noLabel || entry.label === label)
					})
				}),
				getUncategorisedTransactions: whenLoaded(function() {
					return accountsToTransactions(DATA.accounts).filter(function(entry) {
						return entry.category === null
					})
				}),
				getCategorisedTransactions: whenLoaded(function() {
					return accountsToTransactions(DATA.accounts).filter(function(entry) {
						return entry.category !== null && entry.label !== null
					})
				}),
				getAllTransactions: whenLoaded(function() {
					return accountsToTransactions(DATA.accounts)
				}),


				getAmountsByDayForCategoryLabel: whenLoaded(function(category, label) {
					return service.getTransactionsForCategoryLabel(category, label).then(function(transactions) {
						return amountsByDayForTransactions(CURRENT_YEAR, transactions)
					})
				}),
				getAmountsByDayForCategorised: whenLoaded(function() {
					return service.getCategorisedTransactions().then(function(transactions) {
						return amountsByDayForTransactions(CURRENT_YEAR, transactions)
					})
				}),
				getAmountsByDayForUncategorised: whenLoaded(function() {
					return service.getUncategorisedTransactions().then(function(transactions) {
						return amountsByDayForTransactions(CURRENT_YEAR, transactions)
					})
				}),
				getAmountsByDayForAll: whenLoaded(function() {
					return service.getAllTransactions().then(function(transactions) {
						return amountsByDayForTransactions(CURRENT_YEAR, transactions)
					})
				}),

				getStats: whenLoaded(function() {
					var stats = {
						"Everything": { amount: 0, number: 0 },
						"All Categorised": { amount: 0, number: 0 },
						"All Uncategorised": { amount: 0, number: 0 },
						"categories" : {}
					}
					angular.forEach(DATA.categories, function(catInfo, category) {
						stats.categories[category] = {
							amount: 0,
							number: 0,
							labels: {}
						}
						angular.forEach(catInfo, function(labelInfo, label) {
							stats.categories[category].labels[label] = { amount: 0, number: 0 }
						})
					}) 
					return service.getAllTransactions().then(function(transactions) {
						transactions.forEach(function(t) {
							stats.Everything.amount += t.amount
							stats.Everything.number += 1
							if (t.category === null) {
								stats["All Uncategorised"].amount += t.amount
								stats["All Uncategorised"].number += 1
							} else {
								stats["All Categorised"].amount += t.amount
								stats["All Categorised"].number += 1
								stats.categories[t.category].amount += t.amount
								stats.categories[t.category].number += 1
								stats.categories[t.category].labels[t.label].amount += t.amount
								stats.categories[t.category].labels[t.label].number += 1
							}
						})
						return stats
					})
				}),

				renameCategory: whenLoaded(function(oldVal, newVal) {
					if (!DATA.categories[oldVal]) {
						return $q.reject("CATEGORY_NOT_FOUND")
					}
					if (DATA.categories[newVal]) {
						return $q.reject("NEW_CATEGORY_EXISTS")
					}
					DATA.categories[newVal] = DATA.categories[oldVal]
					delete DATA.categories[oldVal]
					DATA.accounts.forEach(function(account) {
						account.transactions.forEach(function(t) {
							if (t.autoCategorisation && t.autoCategorisation[0] == oldVal) {
								t.autoCategorisation[0] = newVal
							}
							t.entries.forEach(function(e) {
								if (e.categorisation && e.categorisation[0] == oldVal) {
									e.categorisation[0] = newVal
								}
							})
						})
					})
					triggerWatchers()
				}),
				addCategory: whenLoaded(function(newVal) {
					if (DATA.categories[newVal]) {
						return $q.reject("NEW_CATEGORY_EXISTS")
					}
					DATA.categories[newVal] = {}
					triggerWatchers()
					return $q.resolve()
				}),
				deleteCategory: whenLoaded(function(oldVal) {
					if (!DATA.categories[oldVal]) {
						return $q.reject("CATEGORY_NOT_FOUND")
					}
					delete DATA.categories[oldVal]
					DATA.accounts.forEach(function(account) {
						account.transactions.forEach(function(t) {
							if (t.autoCategorisation && t.autoCategorisation[0] == oldVal) {
								t.autoCategorisation = null
							}
							t.entries.forEach(function(e) {
								if (e.categorisation && e.categorisation[0] == oldVal) {
									e.categorisation = null
								}
							})
						})
					})
					triggerWatchers()
				}),

				renameCategoryLabel: whenLoaded(function(category, oldVal, newVal) {
					if (!DATA.categories[category]) {
						return $q.reject("CATEGORY_NOT_FOUND")
					}
					if (!DATA.categories[category][oldVal]) {
						return $q.reject("LABEL_NOT_FOUND")
					}
					if (DATA.categories[category][newVal]) {
						return $q.reject("NEW_LABEL_EXISTS")
					}
					DATA.categories[category][newVal] = DATA.categories[category][oldVal]
					delete DATA.categories[category][oldVal]
					DATA.accounts.forEach(function(account) {
						account.transactions.forEach(function(t) {
							if (t.autoCategorisation && t.autoCategorisation[1] == oldVal) {
								t.autoCategorisation[1] = newVal
							}
							t.entries.forEach(function(e) {
								if (e.categorisation && e.categorisation[1] == oldVal) {
									e.categorisation[1] = newVal
								}
							})
						})
					})
					triggerWatchers()
				}),
				addCategoryLabel: whenLoaded(function(category, newVal) {
					if (!DATA.categories[category]) {
						return $q.reject("CATEGORY_NOT_FOUND")
					}
					if (DATA.categories[category][newVal]) {
						return $q.reject("NEW_LABEL_EXISTS")
					}
					DATA.categories[category][newVal] = {budgets:[],matchers:[]}
					triggerWatchers()
				}),
				deleteCategoryLabel: whenLoaded(function(category, oldVal) {
					if (!DATA.categories[category]) {
						return $q.reject("CATEGORY_NOT_FOUND")
					}
					if (!DATA.categories[category][oldVal]) {
						return $q.reject("LABEL_NOT_FOUND")
					}
					delete DATA.categories[category][oldVal]
					DATA.accounts.forEach(function(account) {
						account.transactions.forEach(function(t) {
							if (t.autoCategorisation && t.autoCategorisation[1] == oldVal) {
								t.autoCategorisation = null
							}
							t.entries.forEach(function(e) {
								if (e.categorisation && e.categorisation[1] == oldVal) {
									e.categorisation = null
								}
							})
						})
					})
					triggerWatchers()
				}),
				setCategoryLabelDetails: whenLoaded(function(category, label, details) {
					if (!DATA.categories[category]) {
						return $q.reject("CATEGORY_NOT_FOUND")
					}
					if (!DATA.categories[category][label]) {
						return $q.reject("LABEL_NOT_FOUND")
					}
					if (!Array.isArray(details.budgets)) {
						return $q.reject("BUDGETS_NOT_FOUND")
					}
					if (!Array.isArray(details.matchers)) {
						return $q.reject("MATCHERS_NOT_FOUND")
					}
					var needReCategorise = !angular.equals(DATA.categories[category][label].matchers, details.matchers)
					DATA.categories[category][label] = angular.copy(details)
					if (needReCategorise) {
						reAutoCategorise()
					}
					triggerWatchers()
				}),
				setCategoryLabelMatchers: whenLoaded(function(category, label, matchers) {
					if (!DATA.categories[category]) {
						return $q.reject("CATEGORY_NOT_FOUND")
					}
					if (!DATA.categories[category][label]) {
						return $q.reject("LABEL_NOT_FOUND")
					}
					if (!Array.isArray(matchers)) {
						return $q.reject("MATCHERS_NOT_ARRAY")
					}
					// todo: add matcher validation
					var needReCategorise = !angular.equals(DATA.categories[category][label].matchers, matchers)
					DATA.categories[category][label].matchers = angular.copy(matchers)
					if (needReCategorise) {
						reAutoCategorise()
					}
					triggerWatchers()
				}),
				setCategoryLabelBudgets: whenLoaded(function(category, label, budgets) {
					if (!DATA.categories[category]) {
						return $q.reject("CATEGORY_NOT_FOUND")
					}
					if (!DATA.categories[category][label]) {
						return $q.reject("LABEL_NOT_FOUND")
					}
					if (!Array.isArray(details.budgets)) {
						return $q.reject("BUDGETS_NOT_ARRAY")
					}
					// todo: add budget validation
					DATA.categories[category][label].budgets = angular.copy(budgets)
					triggerWatchers()
				}),
				setBudget: whenLoaded(function(budget, category, label) {
					// todo: add budget validation
					DATA.budgets[budget.id] = angular.copy(budget)
					triggerWatchers()
				}),
				deleteBudgetById: whenLoaded(function(id) {
					delete DATA.budgets[id]
					triggerWatchers()
				}), 
				getCategoryLabelBudgets: whenLoaded(function(category, label) {
					if (!DATA.categories[category]) {
						return $q.reject("CATEGORY_NOT_FOUND")
					}
					if (!DATA.categories[category][label]) {
						return $q.reject("LABEL_NOT_FOUND")
					}
					return DATA.categories[category][label].budgets
				})
			}
			servicesByYear[theYear] = service
			return servicesByYear[theYear]
		}
	}
])