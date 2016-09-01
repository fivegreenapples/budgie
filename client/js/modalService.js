App.service("modal", [
	"$q",
	function($q) {

	var MODALS = []
	var callbacks = []

	function triggerWatchers() {
		callbacks.forEach(function(cb) {
			if(cb) cb()
		})
	}

	var service = {

		nowAndWhenChanged: function(scope, cb) {
			var currentLength = callbacks.length
			callbacks.push(cb)
			scope.$on("$destroy", function() {
				callbacks[currentLength] = null
			})
			cb()
		},

		getAllModals: function() {
			return MODALS
		},

		pop: function() {
			MODALS.pop()
			triggerWatchers()
		},

		addPopoverMenu: function(menuData) {
			var deferred = $q.defer()
			var elOffset = menuData.element.offset()
			var elWidth = menuData.element.width()
			var elHeight = menuData.element.height()
			var modal = {
				type: "POPOVERMENU",
				onBackgroundClick: function() {
					deferred.reject()
					service.pop()
				},
				onItemClick: function(item) {
					deferred.resolve(item)
					service.pop()
				},
				left: elOffset.left+(elWidth/2),
				top: elOffset.top+(elHeight*0.7),
				menuitems: menuData.menuitems,
				rightEdge:menuData.rightEdge
			}
			MODALS.push(modal)
			triggerWatchers()
			return deferred.promise
		},

		addInPlaceEditor: function(data) {
			var deferred = $q.defer()
			var modal = {
				type: "INPLACEEDIT",
				onBackgroundClick: function() {
					deferred.resolve(modal.value)
					service.pop()
				},
				onKeyPress: function($event) {
					if ($event.keyCode == 13 || $event.keyCode == 10) {
						deferred.resolve(modal.value)
						service.pop()
					}
					if ($event.keyCode == 27) {
						$event.preventDefault()
						deferred.reject("ESCAPE")
						service.pop()
					}
				},
				left: data.left,
				top: data.top,
				width: data.width,
				height: data.height,
				value: data.value,
				class: data.class
			}
			MODALS.push(modal)
			triggerWatchers()
			return deferred.promise
		},

		addAlert: function(data) {
			var deferred = $q.defer()
			var modal = {
				type: "ALERT",
				title: data.title,
				message: data.message,
				buttons: data.buttons,
				onButtonClick: function(button) {
					deferred.resolve(button)
					service.pop()
				}
			}
			MODALS.push(modal)
			triggerWatchers()
			return deferred.promise
		},

		addForm: function(data) {
			var deferred = $q.defer()
			var modal = {
				type: "FORM",
				title: data.title,
				message: data.message,
				items: data.items,
				buttons: data.buttons,
				onButtonClick: function(button) {
					deferred.resolve({button:button,items:data.items})
					service.pop()
				}
			}
			MODALS.push(modal)
			triggerWatchers()
			return deferred.promise
		},

		addBudgetForm: function(budget) {
			var deferred = $q.defer()
			var modal = {
				type: "BUDGETFORM",
				data: budget,
				onSave: function(newBudget) {
					deferred.resolve(newBudget)
					service.pop()
				},
				onCancel: function() {
					deferred.reject()
					service.pop()
				}
			}
			MODALS.push(modal)
			triggerWatchers()
			return deferred.promise
		},
		addMatcherForm: function(matcher) {
			var deferred = $q.defer()
			var modal = {
				type: "MATCHERFORM",
				data: matcher,
				onSave: function(newMatcher) {
					deferred.resolve(newMatcher)
					service.pop()
				},
				onCancel: function() {
					deferred.reject()
					service.pop()
				}
			}
			MODALS.push(modal)
			triggerWatchers()
			return deferred.promise
		}

	}
	return service


}])