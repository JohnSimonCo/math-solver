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
		return number < 0 ? number : '+' + number;
	}
})
.factory('multiplication', function(number, numberString) {
	return function(expr) {
		return expr.replace(/(?:^|[+\-]+)\d+(?:[*\/](?:[+\-]+)?\d+)+/g, function(expr) {
			var total, regexp = /([*\/])?(^|[\+\-]+)?(\d+)/g, match, nr;

			match = regexp.exec(expr);
			total = number(match[2], match[3]);
			while((match = regexp.exec(expr))) {
				nr = number(match[2], match[3]);
				switch(match[1]) {
					case '*':
						total *= nr;
						continue;
					case '/':
						total /= nr;
						continue;
				}
			}
			return numberString(total);
		});
	}
})
.factory('addition', function(number) {
	return function(expr) {
		var total = 0, regexp = /(^|[+\-]+)(\d+)/g, match;
		while((match = regexp.exec(expr))) {
			total += number(match[1], match[2]);
		}
		return total;
	}
})
.filter('math', function(multiplication, addition) {
	return function(expr) {
		if(expr) {
			expr = multiplication(expr);
			expr = addition(expr);
			return expr;
		}
	}
})
.directive('ig', function() {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      hint: '@',
      model: '@',
      fid: '@'
    },
    template: '<div class="material-input-group">' +
                '<label for="{{fid}}">{{hint}}</label>' +
                '<input id="{{fid}}" type="text" ng-model="expression">' +
              '</div>',
  }
});