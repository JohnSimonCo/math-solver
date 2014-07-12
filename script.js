angular.module('app', ['ngMaterial'])
.factory('number', function() {
	return function(operator, number) {
		if(!operator) return +number;

		while(operator.length > 1) {
			operator = operator
						.replace(/\+\+|\-\-/g, '+')
						.replace(/\+\-|\-\+/g, '-');
		}
		switch(operator) {
			case '+':
				return +number;
			case '-':
				return -number;
		};
	}
})
.factory('numberString', function() {
	return function(number) {
		if(number >= 0) return '+' + number;
	}
})
.factory('multiplication', function(number, numberString) {
	return function(expr) {
		return expr.replace(/(?:^|[+\-]+)\d+(?:[*\/](?:[+\-]+)?\d+)+/g, function(expr) {
			var total = 0, regexp = /(^|[+\-]+)(\d+)/g, match;
			while((match = regexp.exec(expr))) {
			}
		});
	}
})
.filter('math', function(number) {
	return function(expr) {
		var total = 0, regexp = /(^|[+\-]+)(\d+)/g, match;
		while((match = regexp.exec(expr))) {
			total += number(match[1], match[2]);
		}
		return total;
	}
})
.controller('ctrl', function($scope, math) {
	$scope.calculate = math;
})