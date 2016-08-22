App.service("loadFile", [
	"$q",
	"$timeout",
	function($q, $timeout) {


		var service = {
			getFile: function() {
				var deferred = $q.defer()
				var ip = document.createElement("input");
				ip.setAttribute("type", "file");

				$(ip).on("change", function (ev) {
					var file = ip.files[0];
					
					var reader = new FileReader();
					reader.onload = function(e) {
						deferred.resolve({
							name: file.name,
							data: e.target.result
						})
					}
					reader.onerror = function(e) {
						deferred.reject()
					}
					reader.onabort = function(e) {
						deferred.reject()
					}

					reader.readAsText(file);
				})

				$timeout(function() {
					deferred.reject()
				}, 180000)

				ip.click()

				return deferred.promise

			}
		}
		return service
	}
])

