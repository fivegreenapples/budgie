App.factory("data", [
	"$http",
	"$q",
	function($http, $q) {

		var servicesByYear = {}
		function daysInYear(year) {
			return moment().year(year).month(11).date(31).dayOfYear()
		}
		function zeroesForYear(year) {
			return Array(daysInYear(year)).fill(0)
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
			}

			var DATA = null
			var DATAp = null
			var ORIGINAL_DATA = null

			function loadData() {
				if (!DATAp) {
					DATAp = $http.get("/server/data/"+CURRENT_YEAR+".json").then(function(response) {
						DATA = angular.copy(response.data)
						ORIGINAL_DATA = angular.copy(response.data)
					}, function() {
						DATA = { accounts:[], categories:{} }
						ORIGINAL_DATA = { accounts:[], categories:{} }
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


			var service = {
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
							id: moment().format("x")+"-"+Math.floor(10000*Math.random()),
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

				getAmountsByDayForCategoryLabel: whenLoaded(function(category, label) {
					if (!DATA.categories[category]) {
						return $q.reject("CATEGORY_NOT_FOUND")
					}
					if (!DATA.categories[category][label]) {
						return $q.reject("LABEL_NOT_FOUND")
					}

					var amounts = zeroesForYear(CURRENT_YEAR)
					console.log("amounts", amounts)
					DATA.accounts.forEach(function(account) {
						account.transactions.forEach(function(transaction) {
							var transactionDayOfYear = moment(transaction.date).dayOfYear()
							transaction.entries.forEach(function(entry) {
								if ((entry.categorisation && 
								      entry.categorisation[0] === category &&
								      entry.categorisation[1] === label) ||
								    (!entry.categorisation && 
								      transaction.autoCategorisation && 
								      transaction.autoCategorisation[0] === category &&
								      transaction.autoCategorisation[1] === label))
								{
									amounts[transactionDayOfYear-1] += entry.amount
								}
							})
						})
					})
					return amounts
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
					triggerWatchers()
				}),
				setCategoryLabelDetails: whenLoaded(function(category, label, details) {
					if (!DATA.categories[category]) {
						return $q.reject("CATEGORY_NOT_FOUND")
					}
					if (!DATA.categories[category][label]) {
						return $q.reject("LABEL_NOT_FOUND")
					}
					DATA.categories[category][label] = details
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