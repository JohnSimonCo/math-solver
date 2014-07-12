angular.module('app', [])
.filter('math', function() {
	return function(expression) {
		var total = 0, regexp = /(^|[+\-]+)(\d+)/g, match, operator, term;
		while((match = regexp.exec(expression))) {
			operator = match[1] || '+';
			term = +match[2];

			switch(operator) {
				case '+':
					total += term;
					break;
				case '-':
					total -= term;
					break;
			}
		}
		return total;
	}
})
.controller('ctrl', function($scope, math) {
	$scope.calculate = math;
})