App.controller("transactionsCtrl", [
	"$scope",
	"$q",
	"currencyFilter",
	"year",
	"data",
	"modal",
	"loadFile",
	"qifImport",
	function($scope, $q, CURRENCY, YEAR, DATA, MODAL, LOADFILE, QIFIMPORT) {

		var ORIGINAL_ACCOUNTS = []
		var CATEGORIES = [], SUB_CATEGORIES = {}
		$scope.accounts = []
		$scope.activeAccountIndex = null

		var CURRENT_DATA = null
		var cancelNotifier = null



		$scope.sort = "date"
		$scope.sortDirection = "desc"
		$scope.filters = {
			description:"",
			label:"",
			category:"",
			only_uncategorised:false
		}

		function accountInfo(mode, data, validation) {
			var successLabel = (mode=="add" ? "Add" : "Save")
			var originalShortName = data.shortName
			var formData = {
				title: (mode=="add" ? "Add a New Account" : "Edit Account"),
				message: "Accounts represent things like your current accounts, credit card accounts, savings or even cash in hand.",
				items: [{
					label: "Short name",
					input: {
						name: "shortName",
						type: "TEXTBOX",
						placeholder:"e.g. Natwest Current",
						value: data.shortName
					},
					validation: validation && validation.shortName
				}, {
					label: "Full name",
					input: {
						name: "fullName",
						type: "TEXTBOX",
						placeholder:"e.g. Natwest Current 12345678 / 98-76-54",
						value: data.fullName
					},
					validation: validation && validation.fullName
				}, {
					label: "Opening balance for the year",
					input: {
						name: "openingBalance",
						type: "CURRENCY",
						value: data.openingBalance
					},
					validation: validation && validation.openingBalance
				}, {
					label: "Type of account",
					input: {
						name: "type",
						type: "SELECT",
						value: data.type,
						options: [{value:"debit",label:"Debit Account"},{value:"credit",label:"Credit Account"}]
					},
					validation: validation && validation.type
				}],
				buttons: [{
					type: "red",
					label: "Cancel"
				},{
					type: "green",
					label: successLabel
				}]
			}
			return MODAL.addForm(formData).then(function(outData) {
				if (outData.button == successLabel) {
					var returnedData = {}
					outData.items.forEach(function(item) {
						returnedData[item.input.name] = item.input.value
					})
					var dataPromise;
					if (mode === "add") {
						dataPromise = CURRENT_DATA.addAccount(returnedData)
					} else {
						dataPromise = CURRENT_DATA.editAccount(originalShortName, returnedData)
					}
					return dataPromise.then(
						null,
						function(resValidation) {
							return accountInfo(mode, returnedData, resValidation)
						}
					)
				} else {
					return $q.reject()
				}
			})
		}
		function transactionInfo(mode, data, validation) {
			var successLabel = (mode=="add" ? "Add" : "Save")
			var originalIdentifier = data.id
			var formData = {
				title: (mode=="add" ? "Add Transaction" : "Edit Transaction"),
				items: [{
					label: "Date",
					input: {
						name: "date",
						type: "DATE",
						value: data.date
					},
					validation: validation && validation.date
				}],
				buttons: [{
					type: "red",
					label: "Cancel"
				},{
					type: "green",
					label: successLabel
				}]
			}
			if (data.imported) {
				formData.items.push({
					label: "Bank Description",
					input: {
						type: "LABEL",
						value: data.bankDescription
					}
				})
				formData.items.push({
					label: "Automatic Categorisation",
					input: {
						type: "LABEL",
						value: data.autoCategorisation ? data.autoCategorisation[0] + " - " + data.autoCategorisation[1] : "Uncategorised"
					}
				})
			}
			if (data.entries.length > 1) {
				formData.items.push({
					label: "Original Amount",
					input: {
						type: "LABEL",
						value: CURRENCY(data.originalAmount/100, "£") 
					}
				})
			}
			data.entries.forEach(function(entry, index) {
				formData.items.push({
					label: "Description",
					input: {
						name: "description"+index,
						type: "TEXTBOX",
						value: data.entries[index].description
					},
					validation: validation && validation.entries && validation.entries[index] && validation.entries[index].description
				})
				formData.items.push({
					label: "Amount",
					input: {
						name: "amount"+index,
						type: "CURRENCY",
						value: data.entries[index].amount
					},
					validation: validation && validation.entries && validation.entries[index] && validation.entries[index].amount
				})
				var categorisationIndex = CATEGORIES_FOR_SELECT.findIndex(function(el) { 
					return angular.equals(data.entries[index].categorisation, el.value)
				})
				formData.items.push({
					label: "Category",
					input: {
						name: "categorisation"+index,
						type: "SELECT",
						value: categorisationIndex == -1 ? null : CATEGORIES_FOR_SELECT[categorisationIndex].value,
						options: CATEGORIES_FOR_SELECT
					},
					validation: validation && validation.entries && validation.entries[index] && validation.entries[index].validation
				})
			})

			return MODAL.addForm(formData).then(function(outData) {
				if (outData.button == successLabel) {
					outData.items.forEach(function(item) {
						if (!item.input.name) return
						if (item.input.name == "date") {
							data.date = item.input.value
						} else {
							["description","amount","categorisation"].forEach(function(field) {
								var reggy = new RegExp("^"+field+"([0-9]+)$")
								var matches = item.input.name.match(reggy)
								if (matches) {
									data.entries[matches[1]][field] = item.input.value
								}
							})
						}
					})

					var dataPromise;
					if (mode === "add") {
						dataPromise = CURRENT_DATA.addTransaction($scope.accounts[$scope.activeAccountIndex].shortName, data)
					} else {
						dataPromise = CURRENT_DATA.editTransaction($scope.accounts[$scope.activeAccountIndex].shortName, data)
					}
					return dataPromise.then(
						null,
						function(resValidation) {
							return transactionInfo(mode, data, resValidation)
						}
					)
				} else {
					return $q.reject()
				}
			})
		}

		$scope.addAccount = function() {
			accountInfo("add", {
				shortName: "",
				fullName: "",
				openingBalance: 0,
				type: "debit"
			}).then(function(newAccData) {
				var index = $scope.accounts.findIndex(function(acc) {
					return acc.shortName === newAccData.shortName
				})
				if (index !== -1) {
					$scope.activeAccountIndex = index
					$scope.refreshTransactions()
				}
			})
		}
		$scope.showTransactionPopover = function(ev, id, index) {
			MODAL.addPopoverMenu({
				element: $(ev.target),
				menuitems: [
					"Edit",
					"Split",
					"Delete",
				]
			}).then(function(which) {
				if (which === "Delete") {
					MODAL.addAlert({
						title: "Delete Transaction",
						message: "Are you sure you want to delete this transaction?",
						buttons: [{
							type: "red",
							label: "Cancel"
						}, {
							type: "green",
							label: "Yes"
						}]
					}).then(function(whichDelete) {
						if (whichDelete == "Yes") {
							CURRENT_DATA.deleteTransaction($scope.accounts[$scope.activeAccountIndex].shortName, id)
						}
					})
				} else if (which == "Split") {
					CURRENT_DATA.splitTransaction($scope.accounts[$scope.activeAccountIndex].shortName, id)
				} else if (which == "Edit") {
					transactionInfo("edit", angular.copy($scope.accounts[$scope.activeAccountIndex].transactions[index]))
				}
			})
		}
		$scope.showAccountPopover = function(ev) {
			MODAL.addPopoverMenu({
				element: $(ev.target),
				menuitems: [
					"Edit Details",
					"Add Transactions",
					"Import QIF",
					"Delete"
				]
			}).then(function(which) {
				if (which == "Edit Details") {
					accountInfo("edit", $scope.accounts[$scope.activeAccountIndex])
				} else if (which == "Delete") {
					MODAL.addAlert({
						title: "Delete Account",
						message: "Are you sure you want to delete the "+$scope.accounts[$scope.activeAccountIndex].shortName+" account?",
						buttons: [{
							type: "red",
							label: "Cancel"
						}, {
							type: "green",
							label: "Yes"
						}]
					}).then(function(whichDelete) {
						if (whichDelete == "Yes") {
							CURRENT_DATA.deleteAccount($scope.accounts[$scope.activeAccountIndex].shortName)
							$scope.activeAccountIndex = null;
						}
					})
				} else if (which == "Add Transactions") {
					transactionInfo("add", {
						imported: false,
						reconciled: true,
						dupe: false,
						date: moment().format("x"),
						originalAmount: 0,
						entries: [{
							amount: 0,
							description: "",
							categorisation: null
						}]
					})
				} else if (which == "Import QIF") {
					var qifdata
					LOADFILE.getFile().then(function(fileInfo) {
						var transactions = QIFIMPORT.getTransactionsFromQIFData(fileInfo.data)
						if (transactions.length == 0) {
							MODAL.addAlert({
								title: "QIF Import",
								message: "No transactions were found in the file.",
								buttons: [{
									type: "green",
									label: "OK"
								}]
							})
						} else {
							CURRENT_DATA.addMultipleTransactions($scope.accounts[$scope.activeAccountIndex].shortName, transactions).then(
								function() {
									MODAL.addAlert({
										title: "QIF Import",
										message: transactions.length+" transactions were successfully imported.",
										buttons: [{
											type: "green",
											label: "OK"
										}]
									})
								},
								function(validations) {
									console.log("Failed QIF Import. Validations are: ", validations)
									failedNum = validations.filter(function(v) { return !!v }).length;
									MODAL.addAlert({
										title: "QIF Import",
										message: transactions.length+" transactions were found but "+failedNum+" failed to be imported. The operation has been cancelled. Please see the console for details.",
										buttons: [{
											type: "green",
											label: "OK"
										}]
									})
								}
							)
						}
					})
				}
			})
		}

		$scope.refreshTransactions = function() {
			$scope.accounts = angular.copy(ORIGINAL_ACCOUNTS);
			if ($scope.accounts.length) {
				if ($scope.activeAccountIndex === null || 
					$scope.activeAccountIndex >= $scope.accounts.length) {
					$scope.activeAccountIndex = 0
				}

				if ($scope.filters.description != "") {
					$scope.accounts[$scope.activeAccountIndex].transactions = $scope.accounts[$scope.activeAccountIndex].transactions.filter(function(t) {
						return (t.description.toLowerCase().indexOf($scope.filters.description.toLowerCase()) != -1);
					})
				}
				if ($scope.filters.label != "") {
					$scope.accounts[$scope.activeAccountIndex].transactions = $scope.accounts[$scope.activeAccountIndex].transactions.filter(function(t) {
						return (t.label.toLowerCase().indexOf($scope.filters.label.toLowerCase()) != -1);
					})
				}
				if ($scope.filters.category != "") {
					$scope.accounts[$scope.activeAccountIndex].transactions = $scope.accounts[$scope.activeAccountIndex].transactions.filter(function(t) {
						return (t.category.toLowerCase().indexOf($scope.filters.category.toLowerCase()) != -1);
					})
				}
				if ($scope.filters.only_uncategorised) {
					$scope.accounts[$scope.activeAccountIndex].transactions = $scope.accounts[$scope.activeAccountIndex].transactions.filter(function(t) {
						// see record if it has no auto category and at least one entry is uncategorised
						return !t.autoCategorisation && t.entries.reduce(function(prev, e) { return !e.categorisation || prev; }, false)
					})
				}

				$scope.accounts[$scope.activeAccountIndex].transactions.sort(function(a,b) {
					var val = 0
					if ($scope.sort === "date") {
						val = a.date - b.date
					}
					if (val === 0) {
						val = a.bankDescription.localeCompare(b.bankDescription)
					}
					if ($scope.sortDirection === "desc") {
						val *= -1
					}
					return val;
				})

			} else {
				$scope.activeAccountIndex = null
			}

		}

		$scope.toggleUncategorised = function() {
			$scope.filters.only_uncategorised = !$scope.filters.only_uncategorised
			$scope.refreshTransactions();
		}
		YEAR.nowAndWhenChanged($scope, function() {
			if (cancelNotifier) {
				cancelNotifier()
			}
			CURRENT_DATA = DATA(YEAR.year())
			cancelNotifier = CURRENT_DATA.nowAndWhenChanged($scope, function() {
				CURRENT_DATA.getAllCategoryData().then(function(categories) {

					CATEGORIES = Object.keys(categories).sort(function(A,B) {
						return A.toLowerCase().localeCompare(B.toLowerCase())
					}).map(function(category) {
						return { value:category, label:category }
					})

					SUB_CATEGORIES = {}
					CATEGORIES.forEach(function(category) {
						SUB_CATEGORIES[category.label] = Object.keys(categories[category.label]).sort(function(A,B) {
							return A.toLowerCase().localeCompare(B.toLowerCase())
						}).map(function(subCategory) {
							return { value:subCategory, label:subCategory }
						})
					})

					CATEGORIES_FOR_SELECT = Object.keys(categories).sort(function(A,B) {
						return A.toLowerCase().localeCompare(B.toLowerCase())
					}).map(function(category) {
						var arr = [];
						Object.keys(categories[category]).sort(function(A,B) {
							return A.toLowerCase().localeCompare(B.toLowerCase())
						}).forEach(function(label) {
							arr.push({
								value: [category,label],
								label: category+" - "+label
							})
						})
						return arr
					}).reduce(function(prev, current) {
						Array.prototype.push.apply(prev, current)
						return prev
					}, [])
					CATEGORIES_FOR_SELECT.splice(0, 0, {value:null, label:"Use auto categorisation"})

					CURRENT_DATA.getAllAccountData().then(function(accounts) {
						ORIGINAL_ACCOUNTS = accounts

						// // sum everything
						// var lark = {uncat:{}};
						// accounts[0].transactions.forEach(function(t) {
						// 	if (t.autoCategorisation) {
						// 		if (!(t.autoCategorisation[0] in lark)) {
						// 			lark[t.autoCategorisation[0]] = {
						// 				total: 0,
						// 				labels: {}
						// 			};
						// 		}
						// 		lark[t.autoCategorisation[0]].total += t.originalAmount;
						// 		if (!(t.autoCategorisation[1] in lark[t.autoCategorisation[0]].labels)) {
						// 			lark[t.autoCategorisation[0]].labels[t.autoCategorisation[1]] = 0;
						// 		}
						// 		lark[t.autoCategorisation[0]].labels[t.autoCategorisation[1]] += t.originalAmount
						// 	} else {
						// 		if (!(t.bankDescription in lark.uncat)) {
						// 			lark.uncat[t.bankDescription] = 0;
						// 		}
						// 		lark.uncat[t.bankDescription] += t.originalAmount;
						// 	}
						// })
						// console.log(lark)
						// var csv = "";
						// angular.forEach(lark, function(val, category) {
						// 	// angular.forEach(val.labels, function(labelTotal, label) {
						// 	// 	csv += category + "," + label + "," + labelTotal + "\n";
						// 	// })
						// 	csv += category + "," + val.total + "\n";
						// })
						// alert(csv)
						// csv = ""
						// angular.forEach(lark.uncat, function(descTotal, desc) {
						// 	csv += desc + "," + descTotal + "\n";
						// })
						// alert(csv)

						$scope.refreshTransactions();
					})
				})
			})
		})


	}
])