App.directive("fileUpload", function() {


	return {
		restrict: 'E',
		templateUrl: 'partials/fileUpload.html',
		scope: {
			model: "="
		},
		controller: [ 
			"$scope",
			function($scope) {

				$scope.currentFile = ""

				$scope.onclick = function() {
					var ip = document.createElement("input");
					ip.setAttribute("type", "file");

					$(ip).on("change", function (ev) {
						var file = ip.files[0];
						
						var reader = new FileReader();
						reader.onload = function(e) {
							$scope.$apply(function() {
								$scope.model = e.target.result
								$scope.currentFile = file.name
							})
						}

						reader.readAsText(file);
					})
					ip.click()
				}

			}
		]

	}

})