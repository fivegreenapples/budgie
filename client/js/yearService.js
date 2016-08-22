App.service("year", [
	"$http",
	function($http) {

		function currentYear(val) {
			if (val !== undefined) {
				localStorage.setItem("CURRENT_YEAR", ""+val)
			}
			var yr = localStorage.getItem("CURRENT_YEAR");
			if (!yr) {
				return moment().year()
			}
			return parseInt(yr,10)
		}

		var CURRENT_YEAR = currentYear()
		var watchers = []
		function triggerWatchers() {
			watchers.forEach(function(w) {
				if (w) w()
			})
		}

		return {
			getAvailableYears: function() {
				return $http.get("/server/index.php").then(function(response) {
					return response.data.years
				}, function() {
					return []
				})
			},
			createNewYear: function(year) {
				return $http.post("/server/create.php", {year: year}).then(function(response) {
					console.log(response)
					triggerWatchers()
				})
			},
			year: function(year) {
				if (year !== undefined && year != CURRENT_YEAR) {
					CURRENT_YEAR = currentYear(year)
					triggerWatchers()
				}
				return CURRENT_YEAR
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
			}
		}
	}
])

