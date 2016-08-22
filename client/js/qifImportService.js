App.service("qifImport", [
	"$q",
	function($q) {


		var service = {

			getTransactionsFromQIFData: function(qifData) {
				if (typeof qifData !== "string") {
					return transactions
				}

				var currentIndex = 0
				function getLine(){
					if (currentIndex === qifData.length) {
						return null
					}
					var returnVal = ""
					var newLineIndex = qifData.indexOf("\n", currentIndex)
					var carriageReturnIndex = qifData.indexOf("\r", currentIndex)
					if (newLineIndex !== -1 && carriageReturnIndex !== -1) {
						newLineIndex = Math.min(newLineIndex, carriageReturnIndex)
					} else {
						newLineIndex = Math.max(newLineIndex, carriageReturnIndex)
					}

					if (newLineIndex === -1) {
						returnVal = qifData.substr(currentIndex).trim()
						currentIndex = qifData.length
					} else if (newLineIndex === currentIndex) {
						currentIndex += 1
					} else {
						returnVal = qifData.substr(currentIndex, newLineIndex - currentIndex).trim()
						currentIndex = newLineIndex
					}
					if (returnVal === "") {
						return getLine()
					}
					return returnVal
				}
				
				var transactions = [], typeFound = false, newTransaction = {}, entryType = ""
				var qifLine = getLine()
				while (qifLine !== null)
				{
					// console.log(qifLine)
					if (!typeFound) {
						var typeBits = qifLine.split(":")
						if (typeBits.length != 2 || typeBits[0] != "!Type" || typeBits[1] != "Bank") {
							// unrecognised qif data
							break
						}
						typeFound = true
					} else {

						if (qifLine === "^") {
							if (!angular.equals(newTransaction, {})) {
								newTransaction.imported = true
								newTransaction.entries = [{
									amount: newTransaction.originalAmount,
									description: null,
									categorisation: null
								}]
								transactions.push(newTransaction)
							}
							newTransaction = {}
						} else {
							entryType = qifLine.substr(0, 1)
							if (entryType === "D") {
								newTransaction.date = Number(moment(qifLine.substr(1)+" 00:00:00", "DD/MM/YYYY HH:mm:ss").format("x"))
							} else if (entryType === "P") {
								newTransaction.bankDescription = qifLine.substr(1).trim()
							} else if (entryType === "T") {
								var amount = parseFloat(qifLine.substr(1))
								if (!isNaN(amount)) {
									newTransaction.originalAmount = Math.round(amount*100)
								}
							}

						}
					}


					qifLine = getLine()
				} 

				return transactions
			}

		}
		return service


	}
])