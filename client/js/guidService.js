App.service("guid", [
	function() {


		var service = {
			generate: function() {
				return moment().format("x")+"-"+Math.floor(10000*Math.random())
			}
		}
		return service
	}
])

