App.service("budget", [
	"currencyFilter",
	function(CURRENCY) {

		function daysInYear(year) {
			return moment().year(year).month(11).date(31).dayOfYear()
		}
		function zeroesForYear(year) {
			return Array(daysInYear(year)).fill(0)
		}

		var service = {
			descriptionForBudget: function(budgetItem) {
				var desc,
				    amount = CURRENCY(budgetItem.value/100, "£"),
				    dateFormat = "MMMM Do"
				if (budgetItem.type === "date") {
					desc = amount+" on "
					desc += moment()
					        .month(budgetItem.month-1)
					        .date(budgetItem.day)
					        .format(dateFormat)
				}
				if (budgetItem.type === "daily") {
					desc = amount+" every "
					if (budgetItem.every == 1) {
						desc += "day, "
					} else {
						desc += budgetItem.every+" days, "
					}
					desc += "starting on "
					desc += moment()
					        .month(budgetItem.startmonth-1)
					        .date(budgetItem.startday)
					        .format(dateFormat)
					desc += ", and ending on "
					desc += moment()
					        .month(budgetItem.endmonth-1)
					        .date(budgetItem.endday)
					        .format(dateFormat)
				}
				if (budgetItem.type === "weekly") {
					desc = amount+" every "
					if (budgetItem.every == 1) {
						desc += "week "
					} else {
						desc += budgetItem.every+" weeks "
					}
					desc += "on "
					desc += budgetItem.days
					                  .map(function(val, i) { if (val>0) { return ["Mon","Tues","Wednes","Thurs","Fri","Satur","Sun"][i]+"day" } return 0 })
					                  .filter(function(val) { return !!val })
					                  .reduce(function(prev, current, i, arr) { 
					                      if (prev == "") return current
					                      if (i == arr.length-1) return prev+" and "+current
					                      return prev+", "+current
					                  },"")
					desc += ", starting on "
					desc += moment()
					        .month(budgetItem.startmonth-1)
					        .date(budgetItem.startday)
					        .format(dateFormat)
					desc += ", and ending on "
					desc += moment()
					        .month(budgetItem.endmonth-1)
					        .date(budgetItem.endday)
					        .format(dateFormat)
				}
				if (budgetItem.type === "monthly") {
					desc = amount+" on the "
					if (budgetItem.subtype === "each") {
						desc += budgetItem.days
						                  .map(function(val, i) { if (val>0) { return moment().month(0).date(i+1).format("Do") } return 0 })
						                  .filter(function(val) { return !!val })
						                  .reduce(function(prev, current, i, arr) { 
						                      if (prev == "") return current
						                      if (i == arr.length-1) return prev+" and "+current
						                      return prev+", "+current
						                  },"")
					} else {
						desc += budgetItem.subtype+" "
						desc += {
							day: "day",
							weekday: "weekday",
							weekendday: "weekend day",
							monday: "Monday",
							tuesday: "Tuesday",
							wednesday: "Wednesday",
							thursday: "Thursday",
							friday: "Friday",
							saturday: "Saturday",
							sunday: "Sunday",
						}[budgetItem.what]
					}
					if (budgetItem.every == 1) {
						desc += " of every month"
					} else {
						desc += " every "+budgetItem.every+" months"
					}
					desc += ", starting on "
					desc += moment()
					        .month(budgetItem.startmonth-1)
					        .date(budgetItem.startday)
					        .format(dateFormat)
					desc += ", and ending on "
					desc += moment()
					        .month(budgetItem.endmonth-1)
					        .date(budgetItem.endday)
					        .format(dateFormat)
				}
				if (budgetItem.type === "yearly") {
					return "yearly not yet supported"
					// var theMoment = moment().year(year).month(0).date(1)

					// for (var m=0; m<12; ++m) {
					// 	if (budgetItem.months[m] == 0) continue
					// 	theMoment.month(m)

					// 	var daysInMonth = theMoment.daysInMonth()
					// 	var nTimesSeen = 0, bSeen = false, onthisday = null;
					// 	for(var d=1; d<=daysInMonth; ++d) {
					// 		theMoment.date(d)
					// 		var dd = theMoment.dayOfYear()-1

					// 		bSeen = (budgetItem.subtype === "ontheday") ||
					// 		        (budgetItem.subtype === "ontheparticularday" && 
					// 		         budgetItem.which === theMoment.isoWeekday()) ||
					// 		        (budgetItem.subtype === "ontheweekday" && 
					// 		         theMoment.isoWeekday() <= 5) ||
					// 		        (budgetItem.subtype === "ontheweekendday" && 
					// 		         theMoment.isoWeekday() >= 6)
					// 		if (bSeen) {
					// 			if (budgetItem.when === "last") {
					// 				onthisday = dd
					// 			}
					// 			else {
					// 				nTimesSeen += 1
					// 				if (
					// 				    (budgetItem.when === "first" && nTimesSeen === 1) ||
					// 				    (budgetItem.when === "second" && nTimesSeen === 2) ||
					// 				    (budgetItem.when === "third" && nTimesSeen === 3) ||
					// 				    (budgetItem.when === "fourth" && nTimesSeen === 4) ||
					// 				    (budgetItem.when === "fifth" && nTimesSeen === 5))
					// 				{
					// 					onthisday = dd
					// 					break
					// 				}

					// 			}
					// 		}
					// 	}
					// 	if (onthisday !== null) {
					// 		amounts[ onthisday ] += (budgetItem.value * budgetItem.months[m])
					// 	}
					// }
				}
				return desc

			},
			totalSpendForYear: function(budgets, year) {
				return service.totalDailyAmountsForYear(budgets, year).reduce(function(prev, current) {
					return prev + current
				}, 0)
			},

			totalDailyAmountsForYear: function(budgets, year) {
				return budgets.map(function(budgetItem) {
					return service.dailyAmountsForBudgetItemForYear(budgetItem, year)
				}).reduce(function(prev, current) {
					current.forEach(function(val, i) {
						prev[i] += val
					})
					return prev
				}, zeroesForYear(year))
			},
			dailyAmountsForBudgetItemForYear: function(budgetItem, year) {
				var amounts = zeroesForYear(year)
				var lastDay = amounts.length-1
				if (budgetItem.type === "date") {
					amounts[moment().year(year).month(budgetItem.month-1).date(budgetItem.day).dayOfYear()-1] += budgetItem.value
				}
				if (budgetItem.type === "daily") {
					var start = moment().year(year).month(budgetItem.startmonth-1).date(budgetItem.startday).dayOfYear()-1
					var end = moment().date(budgetItem.endday).month(budgetItem.endmonth-1).year(year).dayOfYear()-1
					for (var d=start; d<=lastDay && d<=end; d+=budgetItem.every ) {
						amounts[d] += budgetItem.value
					}
				}
				if (budgetItem.type === "weekly") {
					var startMoment = moment().year(year).month(budgetItem.startmonth-1).date(budgetItem.startday)
					var startDayOfWeek = startMoment.isoWeekday()-1 // monday==0
					var start = startMoment.dayOfYear()-1
					var end = moment().year(year).month(budgetItem.endmonth-1).date(budgetItem.endday).dayOfYear()-1

					if (startDayOfWeek > 0) {
						for (var d=0; d<=(6-startDayOfWeek); d+=1 ) {
							amounts[start+d] += budgetItem.days[startDayOfWeek+d] * budgetItem.value
						}
						start += ((7-startDayOfWeek) + ((budgetItem.every-1)*7))
					}
					for (var d=start; d<=lastDay && d<=end; d+=(budgetItem.every*7) ) {
						for (var dd=0; dd<=6 && (d+dd)<=lastDay && (d+dd)<=end; dd++) {
							amounts[d+dd] += budgetItem.days[dd] * budgetItem.value
						}
					}
				}
				if (budgetItem.type === "monthly") {
					var startMoment = moment().year(year).month(budgetItem.startmonth-1).date(budgetItem.startday)
					var start = startMoment.dayOfYear()-1
					var end = moment().year(year).month(budgetItem.endmonth-1).date(budgetItem.endday).dayOfYear()-1


					for (var m=budgetItem.startmonth; m<=budgetItem.endmonth; m+=budgetItem.every) {
						startMoment.month(m-1)
						var daysInMonth = startMoment.daysInMonth()
						var nTimesSeen = 0, bSeen = false, onthisday = null;
						for(var d=1; d<=daysInMonth; ++d) {
							startMoment.date(d)
							var dd = startMoment.dayOfYear()-1

							if (budgetItem.subtype === "each") {
								if (dd < start) continue
								if (dd > end) break
								amounts[ dd ] += budgetItem.days[d-1] * budgetItem.value
							}
							else {
								bSeen = (budgetItem.what === "day") ||
								        (budgetItem.what === "monday"     && startMoment.isoWeekday() == 1) ||
								        (budgetItem.what === "tuesday"    && startMoment.isoWeekday() == 2) ||
								        (budgetItem.what === "wednesday"  && startMoment.isoWeekday() == 3) ||
								        (budgetItem.what === "thursday"   && startMoment.isoWeekday() == 4) ||
								        (budgetItem.what === "friday"     && startMoment.isoWeekday() == 5) ||
								        (budgetItem.what === "saturday"   && startMoment.isoWeekday() == 6) ||
								        (budgetItem.what === "sunday"     && startMoment.isoWeekday() == 7) ||
								        (budgetItem.what === "weekday"    && startMoment.isoWeekday() <= 5) ||
								        (budgetItem.what === "weekendday" && startMoment.isoWeekday() >= 6)
								if (bSeen) {
									if (budgetItem.subtype === "last") {
										onthisday = dd
									}
									else {
										nTimesSeen += 1
										if (
										    (budgetItem.subtype === "first" && nTimesSeen === 1) ||
										    (budgetItem.subtype === "second" && nTimesSeen === 2) ||
										    (budgetItem.subtype === "third" && nTimesSeen === 3) ||
										    (budgetItem.subtype === "fourth" && nTimesSeen === 4) ||
										    (budgetItem.subtype === "fifth" && nTimesSeen === 5))
										{
											onthisday = dd
											break
										}

									}
								}
							}
						}
						if (onthisday !== null && onthisday >= start && onthisday <= end) {
							amounts[ onthisday ] += budgetItem.value
						}
					}
				}
				if (budgetItem.type === "yearly") {
					// var theMoment = moment().year(year).month(0).date(1)

					// for (var m=0; m<12; ++m) {
					// 	if (budgetItem.months[m] == 0) continue
					// 	theMoment.month(m)

					// 	var daysInMonth = theMoment.daysInMonth()
					// 	var nTimesSeen = 0, bSeen = false, onthisday = null;
					// 	for(var d=1; d<=daysInMonth; ++d) {
					// 		theMoment.date(d)
					// 		var dd = theMoment.dayOfYear()-1

					// 		bSeen = (budgetItem.subtype === "ontheday") ||
					// 		        (budgetItem.subtype === "ontheparticularday" && 
					// 		         budgetItem.which === theMoment.isoWeekday()) ||
					// 		        (budgetItem.subtype === "ontheweekday" && 
					// 		         theMoment.isoWeekday() <= 5) ||
					// 		        (budgetItem.subtype === "ontheweekendday" && 
					// 		         theMoment.isoWeekday() >= 6)
					// 		if (bSeen) {
					// 			if (budgetItem.when === "last") {
					// 				onthisday = dd
					// 			}
					// 			else {
					// 				nTimesSeen += 1
					// 				if (
					// 				    (budgetItem.when === "first" && nTimesSeen === 1) ||
					// 				    (budgetItem.when === "second" && nTimesSeen === 2) ||
					// 				    (budgetItem.when === "third" && nTimesSeen === 3) ||
					// 				    (budgetItem.when === "fourth" && nTimesSeen === 4) ||
					// 				    (budgetItem.when === "fifth" && nTimesSeen === 5))
					// 				{
					// 					onthisday = dd
					// 					break
					// 				}

					// 			}
					// 		}
					// 	}
					// 	if (onthisday !== null) {
					// 		amounts[ onthisday ] += (budgetItem.value * budgetItem.months[m])
					// 	}
					// }
				}

				return amounts
			}
		}

		return service
	}
])
App.filter("budgetDescription", [
	"budget",
	function(BUDGET) {
		return function(budget) {
			return BUDGET.descriptionForBudget(budget)
		}
	}
])