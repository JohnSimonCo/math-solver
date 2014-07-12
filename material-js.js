(function () {
  angular.module('angularytics', []).provider('Angularytics', function () {
    var eventHandlersNames = ['Google'];
    this.setEventHandlers = function (handlers) {
      if (angular.isString(handlers)) {
        handlers = [handlers];
      }
      eventHandlersNames = [];
      angular.forEach(handlers, function (handler) {
        eventHandlersNames.push(capitalizeHandler(handler));
      });
    };
    var capitalizeHandler = function (handler) {
      return handler.charAt(0).toUpperCase() + handler.substring(1);
    };
    var pageChangeEvent = '$locationChangeSuccess';
    this.setPageChangeEvent = function (newPageChangeEvent) {
      pageChangeEvent = newPageChangeEvent;
    };
    this.$get = [
      '$injector',
      '$rootScope',
      '$location',
      function ($injector, $rootScope, $location) {
        var eventHandlers = [];
        angular.forEach(eventHandlersNames, function (handler) {
          eventHandlers.push($injector.get('Angularytics' + handler + 'Handler'));
        });
        var forEachHandlerDo = function (action) {
          angular.forEach(eventHandlers, function (handler) {
            action(handler);
          });
        };
        var service = {};
        service.init = function () {
        };
        service.trackEvent = function (category, action, opt_label, opt_value, opt_noninteraction) {
          forEachHandlerDo(function (handler) {
            if (category && action) {
              handler.trackEvent(category, action, opt_label, opt_value, opt_noninteraction);
            }
          });
        };
        service.trackPageView = function (url) {
          forEachHandlerDo(function (handler) {
            if (url) {
              handler.trackPageView(url);
            }
          });
        };
        $rootScope.$on(pageChangeEvent, function () {
          service.trackPageView($location.url());
        });
        return service;
      }
    ];
  });
}());
(function () {
  angular.module('angularytics').factory('AngularyticsConsoleHandler', [
    '$log',
    function ($log) {
      var service = {};
      service.trackPageView = function (url) {
        $log.log('URL visited', url);
      };
      service.trackEvent = function (category, action, opt_label, opt_value, opt_noninteraction) {
        $log.log('Event tracked', category, action, opt_label, opt_value, opt_noninteraction);
      };
      return service;
    }
  ]);
}());
(function () {
  angular.module('angularytics').factory('AngularyticsGoogleHandler', [
    '$log',
    function ($log) {
      var service = {};
      service.trackPageView = function (url) {
        _gaq.push([
          '_set',
          'page',
          url
        ]);
        _gaq.push([
          '_trackPageview',
          url
        ]);
      };
      service.trackEvent = function (category, action, opt_label, opt_value, opt_noninteraction) {
        _gaq.push([
          '_trackEvent',
          category,
          action,
          opt_label,
          opt_value,
          opt_noninteraction
        ]);
      };
      return service;
    }
  ]).factory('AngularyticsGoogleUniversalHandler', function () {
    var service = {};
    service.trackPageView = function (url) {
      ga('set', 'page', url);
      ga('send', 'pageview', url);
    };
    service.trackEvent = function (category, action, opt_label, opt_value, opt_noninteraction) {
      ga('send', 'event', category, action, opt_label, opt_value, { 'nonInteraction': opt_noninteraction });
    };
    return service;
  });
}());
(function () {
  angular.module('angularytics').filter('trackEvent', [
    'Angularytics',
    function (Angularytics) {
      return function (entry, category, action, opt_label, opt_value, opt_noninteraction) {
        Angularytics.trackEvent(category, action, opt_label, opt_value, opt_noninteraction);
        return entry;
      };
    }
  ]);
}());
angular.module('ngAnimateSequence', ['ngAnimate'])

  .factory('$$animateAll', function() {
    return function all(arr, fn) {
      var count = 0;
      for(var i = 0; i < arr.length; i++) {
        arr[i](onChainDone);
      }

      function onChainDone() {
        if(++count == arr.length) fn();
      }
    };
  })

  .provider('$$animateStyler', ['$provide', function($provide) {
    var register = this.register = function(name, factory) {
      $provide.factory(name + 'Styler', factory);
    };

    this.$get = ['$injector', function($injector) {
      register('default', function() {
        return function(element, pre) {
          element.css(pre);
          return function(post, done) {
            element.css(post);
            done();
          }
        };
      });

      return function(name) {
        return $injector.get(name + 'Styler');
      }
    }];
  }])

  .factory('$animateRunner', ['$$animateReflow', '$animate', '$$animateStyler', '$$animateAll', '$timeout',
    function($$animateReflow,   $animate,   $$animateStyler,   $$animateAll,   $timeout) {
      return function(element, options, queue, duration, completeFn) {
        options = options || {};

        var node = element[0];
        var self;
        var index = 0;
        var paused = false;
        var cancelAnimation = angular.noop;

        var styler = angular.isFunction(options.styler)
          ? options.styler
          : angular.isString(options.styler)
          ? $$animateStyler(options.styler)
          : $$animateStyler('default');

        var style = function(element, duration, cssStyles) {
          cssStyles = cssStyles || {};
          var delay = cssStyles.delay;
          delete cssStyles.delay;
          return styler(element, cssStyles, duration, delay);
        };


        completeFn = completeFn || angular.noop;

        function tick(initialTimeout) {
          if (paused) return;

          var step = queue[index++];
          if(!step || !$animate.enabled()) {
            completeFn();
            queue = null;
            return;
          }

          if(angular.isString(step)) {
            self[step].apply(self);
            tick();
            return;
          }

          var time  = step[0];
          var pre   = step[1];
          var post  = step[2];
          var fn    = step[3];

          if(!initialTimeout && index == 1 && time > 0 && time <= 1 && duration > 0) {
            index--;
            $timeout(function() {
              tick(true);
            }, time * duration, false);
            return;
          }

          var animationDuration = time;
          if(duration > 0 && time <= 1) { //Keyframes
            var nextEntry = queue[index];
            var next = angular.isArray(nextEntry) ? nextEntry[0] : 1;
            if(next <= 1) {
              animationDuration = (next - time) * duration;
            }
          }

          var postStyle = style(element, animationDuration, pre);

          accumulatedStyles = angular.extend(accumulatedStyles, pre);
          accumulatedStyles = angular.extend(accumulatedStyles, post);

          $$animateReflow(function() {
            $$animateAll([
              function(done) { postStyle(post || {}, done); },
              function(done) {
                cancelAnimation = fn(element, animationDuration, done) || angular.noop;
              }
            ], tick);
          });

          return self;
        }

        var startingClassName = node.className;
        var accumulatedStyles = {};

        return self = {
          revertStyles : function() {
            angular.forEach(accumulatedStyles, function(_, prop) {
              node.style.removeProperty(prop);
            });
            accumulatedStyles = {};
            return this;
          },

          revertClasses : function() {
            node.className = startingClassName;
            return this;
          },

          next : function() {
            cancelAnimation();
            return tick();
          },

          redo : function() {
            cancelAnimation();
            index--;
            return tick();
          },

          run : function() {
            if (paused) {
              paused = false;
              cancelAnimation();
            }
            return tick();
          },

          pause : function() {
            paused = true;
            cancelAnimation();
            return self;
          },

          restart : function() {
            cancelAnimation();
            index = 0;

            return tick();
          }

        };
      }
    }])

  .factory('$animateSequence', ['$animate', '$animateRunner', '$sniffer',
    function($animate,   $animateRunner,   $sniffer) {
      return function(options) {
        var self, queue = [];

        return self = {
          run : function(element, duration, completeFn) {
            return $animateRunner(element, options, queue, duration, completeFn).next();
          },

          then : function(fn) {
            return addToChain(0, null, null, fn);
          },

          animate : function(preOptions, postOptions, time ) {
            if (arguments.length < 3) {
              postOptions = preOptions;
              preOptions  = {};
            }
            return addToChain(time || postOptions.duration, preOptions, postOptions, function(_, duration, done) {
              done();
            });
          },

          revertStyles : function() {
            queue.push('revertStyles');
            return self;
          },

          revertClasses : function() {
            queue.push('revertClasses');
            return self;
          },

          revertElement : function() {
            return this.revertStyles().revertClasses();
          },

          enter : function(parent, after, preOptions, postOptions, time ) {
            return addToChain(time, preOptions, postOptions, function(element, duration, done) {
              return $animate.enter(element, parent, after, done);
            });
          },

          move : function(parent, after, preOptions, postOptions, time ) {
            return addToChain(time, preOptions, postOptions, function(element, duration, done) {
              return $animate.move(element, parent, after, done);
            });
          },

          leave : function(preOptions, postOptions, time ) {
            return addToChain(time, preOptions, postOptions, function(element, duration, done) {
              return $animate.leave(element, done);
            });
          },

          addClass : function(className, preOptions, postOptions, time ) {
            return addToChain(time, preOptions, postOptions, function(element, duration, done) {
              return $animate.addClass(element, className, done);
            });
          },

          removeClass : function(className, preOptions, postOptions, time ) {
            return addToChain(time, preOptions, postOptions, function(element, duration, done) {
              return $animate.removeClass(element, className, done);
            });
          },

          setClass : function(add, remove, preOptions, postOptions, time ) {
            return addToChain(time, preOptions, postOptions, function(element, duration, done) {
              return $animate.setClass(element, add, remove, done)
            });
          }

        };

        /**
         * Append chain step into queue
         * @returns {*} this
         */
        function addToChain(time, pre, post, fn) {
          queue.push([time || 0, addSuffix(pre), addSuffix(post), fn]);
          queue = queue.sort(function(a,b) {
            return a[0] > b[0];
          });
          return self;
        };

        /**
         * For any positional fields, ensure that a `px` suffix
         * is provided.
         * @param target
         * @returns {*}
         */
        function addSuffix(target) {
          var styles = 'top left right bottom ' +
            'x y width height ' +
            'border-width border-radius ' +
            'margin margin-top margin-bottom margin-left margin-right ' +
            'padding padding-left padding-right padding-top padding-bottom'.split(' ');

          angular.forEach(target, function(val, key) {
            var isPositional = styles.indexOf(key) > -1;
            var hasPx        = String(val).indexOf('px') > -1;

            if (isPositional && !hasPx) {
              target[key] = val + 'px';
            }
          });

          return target;
        }
      };
    }]);

angular.module('ngAnimateStylers', ['ngAnimateSequence'])

  .config(['$$animateStylerProvider', function($$animateStylerProvider)
  {
    //JQUERY
    $$animateStylerProvider.register('jQuery', function() {
      return function(element, pre, duration, delay) {
        delay = delay || 0;
        element.css(pre);
        return function(post, done) {
          element.animate(post, duration, null, done);
        }
      };
    });

    //NOT WORKING
    $$animateStylerProvider.register('webAnimations', function() {
      return function(element, pre, duration, delay) {
        delay = delay || 0;
        duration = duration || 1000;
        element.css(pre);
        return function(post, done) {
          var animation = element[0].animate({ 'border-width' : '100px'}, 5000);
          //player.onfinish = done;
        }
      };
    });

    // Greensock Animation Platform (GSAP)
    $$animateStylerProvider.register('gsap', function() {
      return function(element, pre, duration, delay) {
        var styler = TweenMax || TweenLite;

        if ( !styler) {
          throw new Error("GSAP TweenMax or TweenLite is not defined for use within $$animationStylerProvider.");
        }


        return function(post, done) {
          styler.fromTo(
            element,
            (duration || 0)/1000,
            pre || { },
            angular.extend( post, {onComplete:done, delay: (delay || 0)/1000} )
          );
        }
      };
    });


  }]);

/*!
 * Angular Material Design
 * WIP Banner
 */
(function(){
angular.module('ngMaterial', [ 'ng', 'ngAnimate', 'material.services', "material.components.backdrop","material.components.button","material.components.card","material.components.checkbox","material.components.content","material.components.dialog","material.components.form","material.components.icon","material.components.list","material.components.radioButton","material.components.scrollHeader","material.components.sidenav","material.components.slider","material.components.tabs","material.components.toast","material.components.toolbar","material.components.whiteframe"]);
angular.module('material.animations', ['ngAnimateStylers', 'ngAnimateSequence', 'ngAnimate'])

.service('materialEffects', [
  '$animateSequence', 
  'canvasRenderer', 
  '$position',
  '$$rAF',
function ($animateSequence, canvasRenderer, $position, $$rAF) {

    var styler = angular.isDefined( window.TweenMax || window.TweenLite ) ? 'gsap'   :
                angular.isDefined( window.jQuery ) ? 'jQuery' : 'default';

    // Publish API for effects...
    return {
      ripple : rippleWithJS,   // rippleWithCSS,
      ink : animateInk,
      popIn: popIn,
      popOut: popOut
    };

    // **********************************************************
    // Private API Methods
    // **********************************************************

    /**
     * Use the canvas animator to render the ripple effect(s).
     */
    function rippleWithJS( canvas, options )
    {
      return canvasRenderer.ripple( canvas, options);
    }


    /**
     * Build the `ripple` CSS animation sequence and apply it to the specified
     * target element
     */
    function rippleWithCSS( element, config ) {
      var from = { left: config.x, top: config.y, opacity: config.opacity },
          to   = { 'border-width': config.d, 'margin-top': -config.d, 'margin-left': -config.d };

      var runner = $animateSequence({ styler: styler })
                      .addClass('ripple', from,  to )
                      .animate({ opacity: 0, duration: safeVelocity(config.fadeoutVelocity || 0.75) })
                      .revertElement();

      return runner.run(element, safeDuration(config.duration || 550));
    }

    /**
     * Make instance of a reusable sequence and
     * auto-run the sequence on the element (if defined)
     * @param styles
     * @param element
     * @param duration
     * @returns {*}
     */
    function animateInk(element, styles, duration ) {
      var sequence = $animateSequence({ styler: styler })
        .animate( {}, styles, safeDuration(duration || 350) );

      return angular.isDefined(element) ? sequence.run(element) : sequence;
    }

    function popIn(element, parentElement, clickElement) {
      var startPos;
      var endPos = $position.positionElements(parentElement, element, 'center');
      if (clickElement) {
        var dialogPos = $position.position(element);
        var clickPos = $position.offset(clickElement);
        startPos = {
          left: clickPos.left - dialogPos.width / 2,
          top: clickPos.top - dialogPos.height / 2
        };
      } else {
        startPos = endPos;
      }

      // TODO once ngAnimateSequence bugs are fixed, this can be switched to use that
      element.css({
        '-webkit-transform': translateString(startPos.left, startPos.top, 0) + ' scale(0.2)',
        opacity: 0
      });
      $$rAF(function() {
        element.addClass('dialog-changing');
        $$rAF(function() {
          element.css({
            '-webkit-transform': translateString(endPos.left, endPos.top, 0) + ' scale(1.0)',
            opacity: 1
          });
        });
      });
    }

    function popOut(element, parentElement) {
      var endPos = $position.positionElements(parentElement, element, 'bottom-center');

      endPos.top -= element.prop('offsetHeight') / 2;

      var runner = $animateSequence({ styler: styler })
        .addClass('dialog-changing')
        .then(function() {
          element.css({
            '-webkit-transform': translateString(endPos.left, endPos.top, 0) + ' scale(0.5)',
            opacity: 0
          });
        });

      return runner.run(element);
    }

    // **********************************************************
    // Utility Methods
    // **********************************************************
    
    function translateString(x, y, z) {
      return 'translate3d(' + x + 'px,' + y + 'px,' + z + 'px)';
    }


    /**
     * Support values such as 0.65 secs or 650 msecs
     */
    function safeDuration(value) {
      var duration = isNaN(value) ? 0 : Number(value);
      return (duration < 1.0) ? (duration * 1000) : duration;
    }

    /**
     * Convert all values to decimal;
     * eg 150 msecs -> 0.15sec
     */
    function safeVelocity(value) {
      var duration = isNaN(value) ? 0 : Number(value);
      return (duration > 100) ? (duration / 1000) :
        (duration > 10 ) ? (duration / 100) :
          (duration > 1  ) ? (duration / 10) : duration;
    }

  }])
  .directive('materialRipple', ['materialEffects', '$interpolate', function (materialEffects, $interpolate) {
    return {
      restrict: 'E',
      compile: compileWithCanvas
    };

    /**
     * Use Javascript and Canvas to render ripple effects
     *
     * Note: attribute start="" has two (2) options: `center` || `pointer`; which
     * defines the start of the ripple center.
     *
     * @param element
     * @returns {Function}
     */
    function compileWithCanvas( element, attrs ) {
      var options  = calculateOptions();
      var tag =
        '<canvas ' +
             'class="material-ripple-canvas {{classList}}"' +
             'style="top:{{top}}; left:{{left}}" >' +
        '</canvas>';

      element.replaceWith(
        angular.element( $interpolate(tag)(options) )
      );

      return function( scope, element ){
        var parent = element.parent();
        var rippler = materialEffects.ripple( element[0], options );


        // Configure so ripple wave starts a mouseUp location...
        parent.on('mousedown', onStartRipple);


        // **********************************************************
        // Mouse EventHandlers
        // **********************************************************

        function onStartRipple(e) {

          if ( inkEnabled( element.scope() )) {

            rippler.onMouseDown( options.forceToCenter ? null : localToCanvas(e) );
            parent.on('mouseup', onFinishRipple )
          }
        }

        function onFinishRipple( e ) {
          parent.off('mouseup', onFinishRipple);
          rippler.onMouseUp( e );
        }

        // **********************************************************
        // Utility Methods
        // **********************************************************

        /**
         * Convert the mouse down coordinates from `parent` relative
         * to `canvas` relative; needed since the event listener is on
         * the parent [e.g. tab element]
         */
        function localToCanvas(e)
        {
          var canvas = element[0].getBoundingClientRect();

          return  {
            x : e.clientX - canvas.left,
            y : e.clientY - canvas.top
          };
        }

        /**
         * Check scope chain for `inkEnabled` or `disabled` flags...
         */
        function inkEnabled(scope) {
          return angular.isUndefined(scope) ? true :
              angular.isDefined(scope.disabled) ? !scope.disabled :
              angular.isDefined(scope.inkEnabled) ? scope.inkEnabled : true;
        }

      }

      function calculateOptions()
      {
        return angular.mixin( getBounds(element), {
          forceToCenter : (attrs.start == "center"),
          classList : (attrs.class || ""),
          opacityDecayVelocity : getFloatValue( attrs, "opacityDecayVelocity" ),
          initialOpacity : getFloatValue( attrs, "initialOpacity" )
        });

        function getBounds(element) {
          var node = element[0];
          var styles  =  node.ownerDocument.defaultView.getComputedStyle( node, null ) || { };

          return  {
            left : (styles.left == "auto" || !styles.left) ? "0px" : styles.left,
            top : (styles.top == "auto" || !styles.top) ? "0px" : styles.top,
            width : getValue( styles, "width" ),
            height : getValue( styles, "height" )
          };
        }

        function getFloatValue( map, key, defaultVal )
        {
          return angular.isDefined( map[key] ) ? +map[key] : defaultVal;
        }

        function getValue( map, key, defaultVal )
        {
          var val = map[key];
          return (angular.isDefined( val ) && (val !== ""))  ? map[key] : defaultVal;
        }
      }

    }


    /**
     * Use CSS and Div element to animate a ripple effect
     * @param element
     * @returns {Function}
     */
    function compileWithDiv( element ) {

      element.after(angular.element('<div class="material-ripple-cursor"></div>'));
      element.remove();

      return function( scope, element, attrs ){
        var parent = element.parent();
        var parentNode = parent[0];

        // Configure so ripple wave starts a mouseUp location...
        parent.on('click', function showRipple(e) {
          if ( inkEnabled( element.scope() )) {
            var settings = angular.extend({}, attrs, {
              x: e.offsetX,
              y: e.offsetY,
              d: Math.max(parentNode.offsetWidth - e.offsetX, e.offsetX),
              tl: -Math.max(parentNode.offsetWidth - e.offsetX, e.offsetX),
              opacity: attrs.rippleOpacity || 0.6
            });

            // Perform ripple effect on `elCursor` element
            materialEffects.ripple(element, settings);
          }
        });

        /**
         * Check scope chain for `inkEnabled` or `disabled` flags...
         */
        function inkEnabled( scope ){
          return angular.isUndefined( scope )            ? true             :
            angular.isDefined( scope.inkEnabled )   ? scope.inkEnabled :
              angular.isDefined( scope.disabled     ) ? !scope.disabled  : true;
        }

      }
    }

  }]);

angular.module('material.animations')
    /**
     * Port of the Polymer Paper-Ripple code
     *
     * @group Paper Elements
     * @element paper-ripple
     * @homepage github.io
     */
      .service('canvasRenderer', function() {

           var pow = Math.pow;
           var now = Date.now;
           var Rippler = RipplerClazz();

           if (window.performance && performance.now) {
             now = performance.now.bind(performance);
           }

           angular.mixin = function (dst) {
             angular.forEach(arguments, function(obj) {
               if (obj !== dst) {
                 angular.forEach(obj, function(value, key) {
                   // Only mixin if destination value is undefined
                   if ( angular.isUndefined(dst[key]) )
                   {
                    dst[key] = value;
                   }
                 });
               }
             });
             return dst;
           };



    return {

             /**
              * API to render ripple animations
              */
             ripple : function( canvas, options)
             {
               var animator = new Rippler( canvas,  options );

               // Simple API to start and finish ripples based on mouse/touch events
               return {
                 onMouseDown : angular.bind(animator, animator.onMouseDown),
                 onMouseUp : angular.bind(animator, animator.onMouseUp)
               };
             }

           };

          // **********************************************************
          // Rippler Class
          // **********************************************************

          function RipplerClazz() {

            /**
             *  Rippler creates a `paper-ripple` which is a visual effect that other quantum paper elements can
             *  use to simulate a rippling effect emanating from the point of contact.  The
             *  effect can be visualized as a concentric circle with motion.
             */
            function Rippler( canvas, options ) {


              var defaults = {
                /**
                 * The initial opacity set on the wave.
                 *
                 * @attribute initialOpacity
                 * @type number
                 * @default 0.25
                 */
                initialOpacity : 0.25,

                /**
                 * How fast (opacity per second) the wave fades out.
                 *
                 * @attribute opacityDecayVelocity
                 * @type number
                 * @default 0.8
                 */
                opacityDecayVelocity : 0.8,

                /**
                 *
                 */
                backgroundFill : true,

                /**
                 *
                 */
                pixelDensity : 1
              };



              this.canvas = canvas;
              this.waves  = [];

              return angular.extend(this, angular.mixin(options, defaults));
            };

            /**
             *
             */
            Rippler.prototype.onMouseDown = function ( startAt ) {

              var canvas = this.setupCanvas( this.canvas );
              var wave = createWave(this.canvas);

              var width = canvas.width / this.pixelDensity; // Retina canvas
              var height = canvas.height / this.pixelDensity;

              // Auto center ripple if startAt is not defined...
              startAt = startAt || { x : Math.round(width/2), y:Math.round(height/2) };

              wave.isMouseDown = true;
              wave.tDown = 0.0;
              wave.tUp = 0.0;
              wave.mouseUpStart = 0.0;
              wave.mouseDownStart = now();
              wave.startPosition = startAt;
              wave.containerSize = Math.max(width, height);
              wave.maxRadius = distanceFromPointToFurthestCorner(wave.startPosition, {w: width, h: height});

              if (this.canvas.classList.contains("recenteringTouch")) {
                  wave.endPosition = {x: width / 2,  y: height / 2};
                  wave.slideDistance = dist(wave.startPosition, wave.endPosition);
              }

              this.waves.push(wave);

              this.cancelled = false;

              requestAnimationFrame(this._loop);
            };

            /**
             *
             */
            Rippler.prototype.onMouseUp = function () {
              for (var i = 0; i < this.waves.length; i++) {
                // Declare the next wave that has mouse down to be mouse'ed up.
                var wave = this.waves[i];
                if (wave.isMouseDown) {
                  wave.isMouseDown = false
                  wave.mouseUpStart = now();
                  wave.mouseDownStart = 0;
                  wave.tUp = 0.0;
                  break;
                }
              }
              this._loop && requestAnimationFrame(this._loop);
            };

            /**
             *
             */
            Rippler.prototype.cancel = function () {
              this.cancelled = true;
              return this;
            };

            /**
             *
             */
            Rippler.prototype.animate = function (ctx) {
              // Clear the canvas
              ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

              var deleteTheseWaves = [];
              // The oldest wave's touch down duration
              var longestTouchDownDuration = 0;
              var longestTouchUpDuration = 0;
              // Save the last known wave color
              var lastWaveColor = null;
              // wave animation values
              var anim = {
                initialOpacity: this.initialOpacity,
                opacityDecayVelocity: this.opacityDecayVelocity,
                height: ctx.canvas.height,
                width: ctx.canvas.width
              }

              for (var i = 0; i < this.waves.length; i++) {
                var wave = this.waves[i];

                if (wave.mouseDownStart > 0) {
                  wave.tDown = now() - wave.mouseDownStart;
                }
                if (wave.mouseUpStart > 0) {
                  wave.tUp = now() - wave.mouseUpStart;
                }

                // Determine how long the touch has been up or down.
                var tUp = wave.tUp;
                var tDown = wave.tDown;
                longestTouchDownDuration = Math.max(longestTouchDownDuration, tDown);
                longestTouchUpDuration = Math.max(longestTouchUpDuration, tUp);

                // Obtain the instantenous size and alpha of the ripple.
                var radius = waveRadiusFn(tDown, tUp, anim);
                var waveAlpha =  waveOpacityFn(tDown, tUp, anim);
                var waveColor = cssColorWithAlpha(wave.waveColor, waveAlpha);
                lastWaveColor = wave.waveColor;

                // Position of the ripple.
                var x = wave.startPosition.x;
                var y = wave.startPosition.y;

                // Ripple gravitational pull to the center of the canvas.
                if (wave.endPosition) {

                  var translateFraction = waveGravityToCenterPercentageFn(tDown, tUp, wave.maxRadius);

                  // This translates from the origin to the center of the view  based on the max dimension of
                  var translateFraction = Math.min(1, radius / wave.containerSize * 2 / Math.sqrt(2) );

                  x += translateFraction * (wave.endPosition.x - wave.startPosition.x);
                  y += translateFraction * (wave.endPosition.y - wave.startPosition.y);
                }

                // If we do a background fill fade too, work out the correct color.
                var bgFillColor = null;
                if (this.backgroundFill) {
                  var bgFillAlpha = waveOuterOpacityFn(tDown, tUp, anim);
                  bgFillColor = cssColorWithAlpha(wave.waveColor, bgFillAlpha);
                }

                // Draw the ripple.
                drawRipple(ctx, x, y, radius, waveColor, bgFillColor);

                // Determine whether there is any more rendering to be done.
                var maximumWave = waveAtMaximum(wave, radius, anim);
                var waveDissipated = waveDidFinish(wave, radius, anim);
                var shouldKeepWave = !waveDissipated || maximumWave;
                var shouldRenderWaveAgain = !waveDissipated && !maximumWave;

                if (!shouldKeepWave || this.cancelled) {
                  deleteTheseWaves.push(wave);
                }
              }

              if (shouldRenderWaveAgain) {
                requestAnimationFrame(this._loop);
              }

              for (var i = 0; i < deleteTheseWaves.length; ++i) {
                var wave = deleteTheseWaves[i];
                removeWaveFromScope(this, wave);
              }

              if (!this.waves.length) {
                // If there is nothing to draw, clear any drawn waves now because
                // we're not going to get another requestAnimationFrame any more.
                ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                this._loop = null;
              }

              return this;
            };


            Rippler.prototype.adjustBounds = function( canvas )
            {
              // Default to parent container to define bounds
              var self = this,
                src = canvas.parentNode.getBoundingClientRect(),  // read-only
                bounds = { width : src.width, height: src.height };

              angular.forEach("width height".split(" "), function( style ) {
                var value = (self[style] != "auto") ? self[style] : undefined;

                // Allow CSS to explicitly define bounds (instead of parent container
                if ( angular.isDefined(value ) ) {
                  bounds[style] = sanitizePosition( value );
                  canvas.setAttribute(style, bounds[style] * self.pixelDensity + "px");
                }

              });

              // NOTE: Modified from polymer implementation
              canvas.setAttribute('width', bounds.width * this.pixelDensity + "px");
              canvas.setAttribute('height', bounds.height * this.pixelDensity + "px");


                function sanitizePosition( style )
                {
                  var val = style.replace('px','');
                  return val;
                }

              return canvas;
            }


            /**
             * Resize the canvas to fill the parent's dimensions...
             */
            Rippler.prototype.setupCanvas = function ( canvas ) {

              var ctx = this.adjustBounds(canvas).getContext('2d');
              ctx.scale(this.pixelDensity, this.pixelDensity);
              
              if (!this._loop) {
                this._loop = this.animate.bind(this, ctx);
              }
              return canvas;
            };


            return Rippler;

          };




          // **********************************************************
          // Private Wave Methods
          // **********************************************************



          /**
           *
           */
          function waveRadiusFn(touchDownMs, touchUpMs, anim) {
            // Convert from ms to s.
            var waveMaxRadius = 150;
            var touchDown = touchDownMs / 1000;
            var touchUp = touchUpMs / 1000;
            var totalElapsed = touchDown + touchUp;
            var ww = anim.width, hh = anim.height;
            // use diagonal size of container to avoid floating point math sadness
            var waveRadius = Math.min(Math.sqrt(ww * ww + hh * hh), waveMaxRadius) * 1.1 + 5;
            var duration = 1.1 - .2 * (waveRadius / waveMaxRadius);
            var tt = (totalElapsed / duration);

            var size = waveRadius * (1 - Math.pow(80, -tt));
            return Math.abs(size);
          }

          /**
           *
           */
          function waveOpacityFn(td, tu, anim) {
            // Convert from ms to s.
            var touchDown = td / 1000;
            var touchUp = tu / 1000;
            var totalElapsed = touchDown + touchUp;

            if (tu <= 0) {  // before touch up
              return anim.initialOpacity;
            }
            return Math.max(0, anim.initialOpacity - touchUp * anim.opacityDecayVelocity);
          }

          /**
           *
           */
          function waveOuterOpacityFn(td, tu, anim) {
            // Convert from ms to s.
            var touchDown = td / 1000;
            var touchUp = tu / 1000;

            // Linear increase in background opacity, capped at the opacity
            // of the wavefront (waveOpacity).
            var outerOpacity = touchDown * 0.3;
            var waveOpacity = waveOpacityFn(td, tu, anim);
            return Math.max(0, Math.min(outerOpacity, waveOpacity));
          }

          /**
           *
           */
          function waveGravityToCenterPercentageFn(td, tu, r) {
            // Convert from ms to s.
            var touchDown = td / 1000;
            var touchUp = tu / 1000;
            var totalElapsed = touchDown + touchUp;

            return Math.min(1.0, touchUp * 6);
          }

          /**
           * Determines whether the wave should be completely removed.
           */
          function waveDidFinish(wave, radius, anim) {
            var waveMaxRadius = 150;
            var waveOpacity = waveOpacityFn(wave.tDown, wave.tUp, anim);
            // If the wave opacity is 0 and the radius exceeds the bounds
            // of the element, then this is finished.
            if (waveOpacity < 0.01 && radius >= Math.min(wave.maxRadius, waveMaxRadius)) {
              return true;
            }
            return false;
          };

          /**
           *
           */
          function waveAtMaximum(wave, radius, anim) {
            var waveMaxRadius = 150;
            var waveOpacity = waveOpacityFn(wave.tDown, wave.tUp, anim);
            if (waveOpacity >= anim.initialOpacity && radius >= Math.min(wave.maxRadius, waveMaxRadius)) {
              return true;
            }
            return false;
          }

          /**
           *
           */
          function createWave(elem) {
            var elementStyle = window.getComputedStyle(elem);

            var wave = {
              waveColor: elementStyle.color,
              maxRadius: 0,
              isMouseDown: false,
              mouseDownStart: 0.0,
              mouseUpStart: 0.0,
              tDown: 0,
              tUp: 0
            };
            return wave;
          }

          /**
           *
           */
          function removeWaveFromScope(scope, wave) {
            if (scope.waves) {
              var pos = scope.waves.indexOf(wave);
              scope.waves.splice(pos, 1);
            }
          };

          /**
           *
           */
          function drawRipple(ctx, x, y, radius, innerColor, outerColor) {
            if (outerColor) {
              ctx.fillStyle = outerColor || 'rgba(252, 252, 158, 1.0)';
              ctx.fillRect(0,0,ctx.canvas.width, ctx.canvas.height);
            }
            ctx.beginPath();

            ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
            ctx.fillStyle = innerColor || 'rgba(252, 252, 158, 1.0)';
            ctx.fill();

            //ctx.closePath();
          }


          /**
           *
           */
          function cssColorWithAlpha(cssColor, alpha) {
            var parts = cssColor ? cssColor.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/) : null;
            if (typeof alpha == 'undefined') {
              alpha = 1;
            }
            if (!parts) {
              return 'rgba(255, 255, 255, ' + alpha + ')';
            }
            return 'rgba(' + parts[1] + ', ' + parts[2] + ', ' + parts[3] + ', ' + alpha + ')';
          }

          /**
           *
           */
          function dist(p1, p2) {
            return Math.sqrt(pow(p1.x - p2.x, 2) + pow(p1.y - p2.y, 2));
          }

          /**
           *
           */
          function distanceFromPointToFurthestCorner(point, size) {
            var tl_d = dist(point, {x: 0, y: 0});
            var tr_d = dist(point, {x: size.w, y: 0});
            var bl_d = dist(point, {x: 0, y: size.h});
            var br_d = dist(point, {x: size.w, y: size.h});
            return Math.max(tl_d, tr_d, bl_d, br_d);
          }

        });






angular.module('material.components.backdrop', [])

.service('$materialBackdrop', [
  '$materialPopup',
  '$timeout',
  '$rootElement',
  MaterialBackdropService
]);

function MaterialBackdropService($materialPopup, $timeout, $rootElement) {

  return showBackdrop;

  function showBackdrop(options, clickFn) {
    var appendTo = options.appendTo || $rootElement;
    var opaque = options.opaque;

    return $materialPopup({
      template: '<material-backdrop class="ng-enter">',
      appendTo: options.appendTo
    }).then(function(backdrop) {
      clickFn && backdrop.element.on('click', function(ev) {
        $timeout(function() {
          clickFn(ev);
        });
      });
      opaque && backdrop.element.addClass('opaque');

      return backdrop;
    });
  }
}

/**
 * @ngdoc overview
 * @name material.components.button
 *
 * @description
 * Button components.
 */
angular.module('material.components.button', []);

/**
 * @ngdoc overview
 * @name material.components.card
 *
 * @description
 * Card components.
 */
angular.module('material.components.card', [])
  .directive('materialCard', [ materialCardDirective ]);

function materialCardDirective() {
  return {
    restrict: 'E',
    link: function($scope, $element, $attr) {
    }
  }
}

/**
 * @ngdoc module
 * @name material.components.checkbox
 * @description Checkbox module!
 */
angular.module('material.components.checkbox', [])
  .directive('materialCheckbox', [ materialCheckboxDirective ]);

/**
 * @ngdoc directive
 * @name materialCheckbox
 * @module material.components.checkbox
 * @restrict E
 *
 * @description
 * Checkbox directive!
 *
 * @param {expression=} ngModel An expression to bind this checkbox to.
 */
function materialCheckboxDirective() {

  var CHECKED_CSS = 'material-checked';

  return {
    restrict: 'E',
    scope: true,
    transclude: true,
    template: '<div class="material-container">' +
                '<div class="material-icon"></div>' +
                '<material-ripple start="center" class="circle" material-checked="{{ checked }}"></material-ripple>' +
              '</div>' +
              '<div ng-transclude class="material-label"></div>',
    link: link
  };

  // **********************************************************
  // Private Methods
  // **********************************************************

  function link(scope, element, attr) {
    var input = element.find('input');
    var ngModelCtrl = angular.element(input).controller('ngModel');
    scope.checked = false;

    if(!ngModelCtrl || input[0].type !== 'checkbox') return;

    // watch the ng-model $viewValue
    scope.$watch(
      function () { return ngModelCtrl.$viewValue; },
      function () {
        scope.checked = input[0].checked;

        element.attr('aria-checked', scope.checked);
        if(scope.checked) {
          element.addClass(CHECKED_CSS);
        } else {
          element.removeClass(CHECKED_CSS);
        }
      }
    );

    // add click listener to directive element to manually
    // check the inner input[checkbox] and set $viewValue
    var listener = function(ev) {
      scope.$apply(function() {
        input[0].checked = !input[0].checked;
        ngModelCtrl.$setViewValue(input[0].checked, ev && ev.type);
      });
    };
    element.on('click', listener);

  }

}



/**
 * @ngdoc overview
 * @name material.components.content
 *
 * @description
 * Scrollable content
 */
angular.module('material.components.content', [
  'material.services.registry'
])

.controller('$materialContentController', ['$scope', '$element', '$attrs', '$materialComponentRegistry', materialContentController])
.factory('$materialContent', ['$materialComponentRegistry', materialContentService])
.directive('materialContent', [materialContentDirective])

function materialContentController($scope, $element, $attrs, $materialComponentRegistry) {
  $materialComponentRegistry.register(this, $attrs.componentId || 'content');

  this.getElement = function() {
    return $element;
  };
}

function materialContentService($materialComponentRegistry) {
  return function(handle) {
    var instance = $materialComponentRegistry.get(handle);
    if(!instance) {
      $materialComponentRegistry.notFoundError(handle);
    }
    return instance;
  };
}


function materialContentDirective() {
  return {
    restrict: 'E',
    transclude: true,
    template: '<div class="material-content" ng-transclude></div>',
    controller: '$materialContentController',
    link: function($scope, $element, $attr) {
    }
  }
}

angular.module('material.components.dialog', ['material.services.popup'])
  .directive('materialDialog', [
    MaterialDialogDirective
  ])
  /**
   * @ngdoc service
   * @name $materialDialog
   * @module material.components.dialog
   */
  .factory('$materialDialog', [
    '$timeout',
    '$materialPopup',
    '$rootElement',
    '$materialBackdrop',
    'materialEffects',
    MaterialDialogService
  ]);

function MaterialDialogDirective() {
  return {
    restrict: 'E'
  };
}

function MaterialDialogService($timeout, $materialPopup, $rootElement, $materialBackdrop, materialEffects) {
  var recentDialog;

  return showDialog;

  /**
   * TODO fully document this
   * Supports all options from $materialPopup, in addition to `duration` and `position`
   */
  function showDialog(options) {
    options = angular.extend({
      appendTo: $rootElement,
      hasBackdrop: true, // should have an opaque backdrop
      clickOutsideToClose: true, // should have a clickable backdrop to close
      escapeToClose: true,
      // targetEvent: used to find the location to start the dialog from
      targetEvent: null
      // Also supports all options from $materialPopup
    }, options || {});

    var backdropInstance;

    // Close the old dialog
    recentDialog && recentDialog.then(function(destroyDialog) {
      destroyDialog();
    });

    recentDialog = $materialPopup(options).then(function(dialog) {

      // Controller will be passed a `$hideDialog` function
      dialog.locals.$hideDialog = destroyDialog;
      dialog.enter(function() {
        if (options.escapeToClose) {
          $rootElement.on('keyup', onRootElementKeyup);
        }
        if (options.hasBackdrop || options.clickOutsideToClose) {
          backdropInstance = $materialBackdrop({
            appendTo: options.appendTo,
            opaque: options.hasBackdrop
          }, clickOutsideToClose ? destroyDialog : angular.noop);
          backdropInstance.then(function(drop) {
            drop.enter();
          });
        }
      });

      materialEffects.popIn(
        dialog.element,
        options.appendTo,
        options.targetEvent && options.targetEvent.target && 
          angular.element(options.targetEvent.target)
      );

      return destroyDialog;

      function destroyDialog() {
        if (backdropInstance) {
          backdropInstance.then(function(drop) {
            drop.destroy();
          });
        }
        if (options.escapeToClose) {
          $rootElement.off('keyup', onRootElementKeyup);
        }
        materialEffects.popOut(dialog.element, $rootElement);

        // TODO once the done method from the popOut function & ngAnimateStyler works,
        // remove this timeout
        $timeout(dialog.destroy, 200);
      }
      function onRootElementKeyup(e) {
        if (e.keyCode == 27) {
          $timeout(destroyDialog);
        }
      }
    });

    return recentDialog;
  }
}

angular.module('material.components.form', [])

.directive('materialInputGroup', [materialInputGroupDirective]);

function materialInputGroupDirective() {
  return {
    restrict: 'C',
    link: function($scope, $element, $attr) {
      // Grab the input child, and just do nothing if there is no child
      var input = $element[0].querySelector('input');
      if(!input) { return; }

      input = angular.element(input);
      var ngModelCtrl = input.controller('ngModel');

      // When the input value changes, check if it "has" a value, and 
      // set the appropriate class on the input group
      if (ngModelCtrl) {
        $scope.$watch(
          function() { return ngModelCtrl.$viewValue; },
          onInputChange
        );
      }
      input.on('input', onInputChange);

      // When the input focuses, add the focused class to the group
      input.on('focus', function(e) {
        $element.addClass('material-input-focused');
      });
      // When the input blurs, remove the focused class from the group
      input.on('blur', function(e) {
        $element.removeClass('material-input-focused');
      });

      function onInputChange() {
        $element.toggleClass('material-input-has-value', !!input.val());
      }
    }
  };
}

angular.module('material.components.icon', [])
  .directive('materialIcon', [ materialIconDirective ]);

function materialIconDirective() {
  return {
    restrict: 'E',
    template: '<object class="material-icon"></object>',
    compile: function(element, attr) {
      var object = angular.element(element[0].children[0]);
      if(angular.isDefined(attr.icon)) {
        object.attr('data', attr.icon);
      }
    }
  };
}

angular.module('material.components.list', [])

.directive('materialList', [materialListDirective])
.directive('materialItem', [materialItemDirective]);

/**
 * @ngdoc directive
 * @name material.components.list.directive:material-list
 * @restrict E
 *
 * @description
 * materialList is a list container for material-items
 * @example
 * <material-list>
    <material-item>
      <div class="material-tile-left">
      </div>
      <div class="material-tile-content">
        <h2>Title</h2>
        <h3>Subtitle</h3>
        <p>
          Content
        </p>
      </div>
      <div class="material-tile-right">
      </div>
    </material-item>
 * </material-list>
 */
function materialListDirective() {
  return {
    restrict: 'E',
    link: function($scope, $element, $attr) {
    }
  }
}

/**
 * @ngdoc directive
 * @name material.components.list.directive:material-item
 * @restrict E
 *
 * @description
 * materialItem is a list item
 */
function materialItemDirective() {
  return {
    restrict: 'E',
    link: function($scope, $element, $attr) {
    }
  }
}


/**
 * @ngdoc module
 * @name material.components.radioButton
 * @description radioButton module!
 */
angular.module('material.components.radioButton', [])
  .directive('materialRadioButton', [ materialRadioButtonDirective ])
  .directive('materialRadioGroup', [ materialRadioGroupDirective ]);


/**
 * @ngdoc directive
 * @name materialRadioButton
 * @module material.components.radioButton
 * @restrict E
 *
 * @description
 * radioButton directive!
 *
 * @param {expression=} ngModel An expression to bind this radioButton to.
 */
function materialRadioButtonDirective() {

  var CHECKED_CSS = 'material-checked';

  return {
    restrict: 'E',
    require: '^materialRadioGroup',
    scope: true,
    transclude: true,
    template: '<div class="material-container">' +
                '<material-ripple start="center" class="circle" material-checked="{{ checked }}"></material-ripple>' +
                '<div class="material-off"></div>' +
                '<div class="material-on"></div>' +
              '</div>' +
              '<div ng-transclude class="material-label"></div>',
    link: link
  };

  // **********************************************************
  // Private Methods
  // **********************************************************

  function link(scope, element, attr, rgCtrl) {
    var input = element.find('input');
    var ngModelCtrl = angular.element(input).controller('ngModel');
    scope.checked = false;

    if(!ngModelCtrl || input[0].type !== 'radio') return;

    // the radio group controller decides if this
    // radio button should be checked or not
    scope.check = function(val) {
      // update the directive's DOM/design
      scope.checked = !!val;
      element.attr('aria-checked', scope.checked);
      if(scope.checked) {
        element.addClass(CHECKED_CSS);
      } else {
        element.removeClass(CHECKED_CSS);
      }
    };

    // watch the ng-model $viewValue
    scope.$watch(
      function () { return ngModelCtrl.$viewValue; },
      function (val) {
        // tell the radio group controller that this
        // radio button should be the checked one
        if(input[0].checked) {
          rgCtrl.check(scope);
        }
      }
    );

    // add click listener to directive element to manually
    // check the inner input[radio] and set $viewValue
    var listener = function(ev) {
      scope.$apply(function() {
        ngModelCtrl.$setViewValue(input.val(), ev && ev.type);
        input[0].checked = true;
      });
    };
    element.on('click', listener);

    // register this radio button in its radio group
    rgCtrl.add(scope);

    // on destroy, remove this radio button from its radio group
    scope.$on('$destroy', function(){
      if(input[0].checked) {
        ngModelCtrl.$setViewValue(null);
      }
      rgCtrl.remove(scope);
    });
  }

}


/**
 * @ngdoc directive
 * @name radioGroup
 * @module material.components.radioGroup
 * @restrict E
 *
 * @description
 * radioGroup directive!
 */
function materialRadioGroupDirective() {

  return {
    restrict: 'E',
    controller: controller
  };

  function controller($scope) {
    var radioButtons = [];
    var checkedRadioButton = null;

    this.add = addRadioButton;
    this.remove = removeRadioButton;
    this.check = checkRadioButton;

    function addRadioButton(rbScope) {
      return radioButtons.push(rbScope);
    }

    function removeRadioButton(rbScope) {
      for(var i=0; i<radioButtons.length; i++) {
        if(radioButtons[i] === rbScope) {
          if(rbScope === checkedRadioButton) {
            checkedRadioButton = null;
          }
          return radioButtons.splice(i, 1);
        }
      }
    }

    function checkRadioButton(rbScope) {
      if(checkedRadioButton === rbScope) return;

      checkedRadioButton = rbScope;

      angular.forEach(radioButtons, function(rb) {
        rb.check(rb === checkedRadioButton);
      });
    }

  }

}

/**
 * @ngdoc overview
 * @name material.components.scrollHeader
 *
 * @description
 * Scrollable content
 */
angular.module('material.components.scrollHeader', [
  'material.components.content',
  'material.services.registry'
])

.directive('scrollHeader', [ '$materialContent', '$timeout', materialScrollHeader ]);

function materialScrollHeader($materialContent, $timeout) {

  return {
    restrict: 'A',
    link: function($scope, $element, $attr) {
      var target = $element[0],

        // Full height of the target
        height = target.offsetHeight,

        // Condensed height is set through condensedHeight or defaults to 1/3 the 
        // height of the target
        condensedHeight = $attr.condensedHeight || (height / 3),

        // Calculate the difference between the full height and the condensed height
        margin = height - condensedHeight,

        // Current "y" position of scroll
        y = 0,
      
        // Store the last scroll top position
        prevScrollTop = 0;

      // Perform a simple Y translate
      var translate = function(y) {
        target.style.webkitTransform = target.style.transform = 'translate3d(0, ' + y + 'px, 0)';
      }


      // Transform the header as we scroll
      var transform = function(y) {
        translate(-y);
      }

      // Shrink the given target element based on the scrolling
      // of the scroller element.
      var shrink = function(scroller) {
        var scrollTop = scroller.scrollTop;

        y = Math.min(height, Math.max(0, y + scrollTop - prevScrollTop));

        // If we are scrolling back "up", show the header condensed again
        if (prevScrollTop > scrollTop && scrollTop > margin) {
          y = Math.max(y, margin);
        }

        window.requestAnimationFrame(transform.bind(this, y));
      };

      // Wait for next digest to ensure content has loaded
      $timeout(function() {
        var element = $materialContent('content').getElement();

        element.on('scroll', function(e) {
          shrink(e.target);

          prevScrollTop = e.target.scrollTop;
        });
      });
    }
  };
}

/**
 * @ngdoc overview
 * @name material.components.sidenav
 *
 * @description
 * A Sidenav QP component.
 */
angular.module('material.components.sidenav', [
  'material.services.registry'
])
  .factory('$materialSidenav', [ '$materialComponentRegistry', materialSidenavService ])
  .controller('$materialSidenavController', [
      '$scope',
      '$element',
      '$attrs',
      '$materialSidenav',
      '$materialComponentRegistry',
    materialSidenavController ])
  .directive('materialSidenav', [ materialSidenavDirective ]);
  
/**
 * @ngdoc controller
 * @name material.components.sidenav.controller:$materialSidenavController
 *
 * @description
 * The controller for materialSidenav components.
 */
function materialSidenavController($scope, $element, $attrs, $materialSidenav, $materialComponentRegistry) {
  $materialComponentRegistry.register(this, $attrs.componentId);

  this.isOpen = function() {
    return !!$scope.isOpen;
  };

  /**
   * Toggle the side menu to open or close depending on its current state.
   */
  this.toggle = function() {
    $scope.isOpen = !$scope.isOpen;
  }

  /**
   * Open the side menu
   */
  this.open = function() {
    $scope.isOpen = true;
  }

  /**
   * Close the side menu
   */
  this.close = function() {
    $scope.isOpen = false;
  }
}

/**
 * @ngdoc service
 * @name material.components.sidenav:$materialSidenav
 *
 * @description
 * $materialSidenav makes it easy to interact with multiple sidenavs
 * in an app.
 *
 * @usage
 *
 * ```javascript
 * // Toggle the given sidenav
 * $materialSidenav.toggle(componentId);
 * // Open the given sidenav
 * $materialSidenav.open(componentId);
 * // Close the given sidenav
 * $materialSidenav.close(componentId);
 * ```
 */
function materialSidenavService($materialComponentRegistry) {
  return function(handle) {
    var instance = $materialComponentRegistry.get(handle);
    if(!instance) {
      $materialComponentRegistry.notFoundError(handle);
    }

    return {
      isOpen: function() {
        if (!instance) { return; }
        return instance.isOpen();
      },
      /**
       * Toggle the given sidenav
       * @param handle the specific sidenav to toggle
       */
      toggle: function() {
        if(!instance) { return; }
        instance.toggle();
      },
      /**
       * Open the given sidenav
       * @param handle the specific sidenav to open
       */
      open: function(handle) {
        if(!instance) { return; }
        instance.open();
      },
      /**
       * Close the given sidenav
       * @param handle the specific sidenav to close
       */
      close: function(handle) {
        if(!instance) { return; }
        instance.close();
      }
    }
  }
}

/**
 * @ngdoc directive
 * @name materialSidenav
 * @restrict E
 *
 * @description
 *
 * A Sidenav component that can be opened and closed programatically.
 *
 * @example
 * <material-sidenav>
 * </material-sidenav>
 */
function materialSidenavDirective() {
  return {
    restrict: 'E',
    transclude: true,
    scope: {},
    template: '<div class="material-sidenav-inner" ng-transclude></div>',
    controller: '$materialSidenavController',
    link: function($scope, $element, $attr) {
      $scope.$watch('isOpen', function(v) {
        if(v) {
          $element.addClass('open');
        } else {
          $element.removeClass('open');
        }
      });
    }
  };
}

/**
 * @ngdoc module
 * @name material.components.slider
 * @description Slider module!
 */
angular.module('material.components.slider', [])
  .directive('materialSlider', [ '$window', materialSliderDirective ]);

/**
 * @ngdoc directive
 * @name materialSlider
 * @module material.components.slider
 * @restrict E
 *
 * @description
 * Slider directive!
 *
 */
function materialSliderDirective($window) {

  var MIN_VALUE_CSS = 'material-slider-min';
  var ACTIVE_CSS = 'material-active';

  function rangeSettings(rangeEle) {
    return {
      min: parseInt( rangeEle.min !== "" ? rangeEle.min : 0, 10 ),
      max: parseInt( rangeEle.max !== "" ? rangeEle.max : 100, 10 ),
      step: parseInt( rangeEle.step !== "" ? rangeEle.step : 1, 10 )
    }
  }

  return {
    restrict: 'E',
    scope: true,
    transclude: true,
    template: '<div class="material-track" ng-transclude></div>',
    link: link
  };

  // **********************************************************
  // Private Methods
  // **********************************************************

  function link(scope, element, attr) {
    var input = element.find('input');
    var ngModelCtrl = angular.element(input).controller('ngModel');

    if(!ngModelCtrl || input[0].type !== 'range') return;

    var rangeEle = input[0];
    var trackEle = angular.element( element[0].querySelector('.material-track') );

    trackEle.append('<div class="material-fill"><div class="material-thumb"></div></div>');
    var fillEle = trackEle[0].querySelector('.material-fill');

    if(input.attr('step')) {
      var settings = rangeSettings(rangeEle);
      var tickCount = (settings.max - settings.min) / settings.step;
      var tickMarkersEle = angular.element('<div class="material-tick-markers material-display-flex"></div>');
      for(var i=0; i<tickCount; i++) {
        tickMarkersEle.append('<div class="material-tick material-flex"></div>');
      }
      trackEle.append(tickMarkersEle);
    }

    input.on('mousedown touchstart', function(e){
      trackEle.addClass(ACTIVE_CSS);
    });

    input.on('mouseup touchend', function(e){
      trackEle.removeClass(ACTIVE_CSS);
    });


    function render() {
      var settings = rangeSettings(rangeEle);
      var adjustedValue = parseInt(ngModelCtrl.$viewValue, 10) - settings.min;
      var fillRatio = (adjustedValue / (settings.max - settings.min));

      fillEle.style.width = (fillRatio * 100) + '%';

      if(fillRatio <= 0) {
        element.addClass(MIN_VALUE_CSS);
      } else {
        element.removeClass(MIN_VALUE_CSS);
      }

    }

    scope.$watch( function () { return ngModelCtrl.$viewValue; }, render );

  }

}


angular.module('material.components.tabs', ['material.utils', 'material.animations'])
  .controller('materialTabsController', [ '$iterator', '$scope', NgmTabsController])
  .directive('materialTabs', [ '$compile', 'materialEffects', NgmTabsDirective ])
  .directive('materialTab', [ '$attrBind', NgmTabDirective  ]);

/**
 * @ngdoc directive
 * @name materialTabs
 * @module material.components.tabs
 *
 * @restrict E
 *
 * @description
 * materialTabs is the outer container for the tabs directive
 *
 * @param {integer=} selected Index of the active/selected tab
 * @param {boolean}  noink Flag indicates use of Material ink effects
 * @param {boolean}  nobar Flag indicates use of Material StretchBar effects
 * @param {boolean}  nostretch Flag indicates use of animations for stretchBar width and position changes
 *
 * @example
 <example module="material.components.tabs">
 <file name="index.html">
 <h3>Static Tabs: </h3>
 <p>No ink effect and no sliding bar. Tab #1 is active and #2 is disabled.</p>
 <material-tabs selected="0" noink nobar nostretch>
 <material-tab>ITEM ONE</material-tab>
 <material-tab disabled="true" title="ITEM TWO"></material-tab>
 <material-tab>ITEM THREE</material-tab>
 </material-tabs>
 </file>
 </example>
 *
 */

function NgmTabsDirective($compile, materialEffects) {

  return {
    restrict: 'E',
    replace: false,
    transclude: 'true',

    scope: {
      $selIndex: '=?selected'
    },

    compile: compileTabsFn,
    controller: [ '$iterator', '$scope', '$timeout', NgmTabsController ],

    template:
      '<div class="tabs-header">' +
      '  <div class="tabs-header-items"></div>' +
      '  <shadow></shadow>' +
      '  <material-ink></material-ink>'  +
      '<div class="tabs-content ng-hide"></div>'

  };

  /**
   * Use prelink to configure inherited scope attributes: noink, nostretch, and nobar;
   * do this before the child elements are linked.
   *
   * @param element
   * @param attr
   * @returns {{pre: materialTabsLink}}
   */
  function compileTabsFn() {

    return {
      pre: function tabsPreLink(scope, element, attrs, tabsController) {

        // These attributes do not have values; but their presence defaults to value == true.
        scope.noink = angular.isDefined(attrs.noink);
        scope.nostretch = angular.isDefined(attrs.nostretch);
        scope.nobar = angular.isDefined(attrs.nobar);

        // Publish for access by nested `<material-tab>` elements
        tabsController.noink = scope.noink;

        // Watch for external changes `selected` & auto-select the specified tab
        // Stop watching when the <material-tabs> directive is released
        scope.$on("$destroy", scope.$watch('$selIndex', function (index) {
          tabsController.selectAt(index);
        }));

        // Remove the `stretchBar` element if `nobar` is defined
        var elBar = findNode(".selection-bar",element);
        if ( elBar && scope.nobar ) {
          elBar.remove();
        }

      },
      post: function tabsPostLink(scope, element, attrs, tabsController, $transclude) {

        transcludeHeaderItems();
        transcludeContentItems();

        configureInk();

        // **********************************************************
        // Private Methods
        // **********************************************************

        /**
         * Conditionally configure ink bar animations when the
         * tab selection changes. If `nobar` then do not show the
         * bar nor animate.
         */
        function configureInk() {
          if ( scope.nobar ) return;

          var inkElement = findNode("material-ink", element);

          tabsController.onTabChange = applyStyles;
          angular.element(window).on('resize', function() {
            applyStyles(tabsController.selectedElement(), true);
          });

          // Immediately place the ink bar
          applyStyles(tabsController.selectedElement(), true );

          /**
           * Update the position and size of the ink bar based on the
           * specified tab DOM element
           * @param tab
           * @param skipAnimation
           */
          function applyStyles(tab, skipAnimation) {
            if ( angular.isDefined(tab) && angular.isDefined(inkElement) ) {

              var tabNode = tab[0];
              var width = ( tabsController.$$tabs().length > 1 ) ? tabNode.offsetWidth : 0;
              var styles = {
                left : tabNode.offsetLeft +'px',
                width : width +'px' ,
                display : width > 0 ? 'block' : 'none'
              };

              if( !!skipAnimation ) {
                inkElement.css(styles);
              } else {
                materialEffects.ink(inkElement, styles);
              }
            }

          }

        }

        /**
         * Transclude the materialTab items into the tabsHeaderItems container
         *
         */
        function transcludeHeaderItems() {
          $transclude(function (content) {
            var header = findNode('.tabs-header-items', element);
            var parent = angular.element(element[0]);

            angular.forEach(content, function (node) {
              var intoHeader = isNodeType(node, 'material-tab') || isNgRepeat(node);

              if (intoHeader) {
                header.append(node);
              }
              else {
                parent.prepend(node);
              }
            });
          });
        }

        /**
         * Transclude the materialTab view/body contents into materialView containers; which
         * are stored in the tabsContent area...
         */
        function transcludeContentItems() {
          var cache = {
              length: 0,
              contains: function (tab) {
                return !angular.isUndefined(cache[tab.$id]);
              }
            },
            cntr = findNode('.tabs-content', element),
            materialViewTmpl = '<div class="material-view" ng-show="active"></div>';

          scope.$watch(getTabsHash, function buildContentItems() {
            var tabs = tabsController.$$tabs(notInCache),
              views = tabs.map(extractViews);

            // At least 1 tab must have valid content to build; otherwise
            // we hide/remove the tabs-content container...

            if (views.some(notEmpty)) {
              angular.forEach(views, function (elements, j) {

                var tab = tabs[j++],
                  materialView = $compile(materialViewTmpl)(tab);

                if (elements) {
                  // If transcluded content is not undefined then add all nodes to the materialView
                  angular.forEach(elements, function (node) {
                    materialView.append(node);
                  });
                }

                cntr.append(materialView);
                addToCache(cache, { scope: tab, element: materialView });

              });
            }

            // Hide or Show the container for the materialView(s)
            angular.bind(cntr, cache.length ? cntr.removeClass : cntr.addClass)('ng-hide');

          });

          /**
           * Add tab scope/DOM node to the cache and configure
           * to auto-remove when the scope is destroyed.
           * @param cache
           * @param item
           */
          function addToCache(cache, item) {

            cache[ item.scope.$id ] = item;
            cache.length = cache.length + 1;

            // When the tab is removed, remove its associated material-view Node...
            item.scope.$on("$destroy", function () {
              angular.element(item.element).remove();

              delete cache[ item.scope.$id];
              cache.length = cache.length - 1;
            });
          }

          function getTabsHash() {
            return tabsController.$$hash;
          }

          function extractViews(tab) {
            return hasContent(tab) ? tab.content : undefined;
          }

          function hasContent(tab) {
            return tab.content && tab.content.length;
          }

          function notEmpty(view) {
            return angular.isDefined(view);
          }

          function notInCache(tab) {
            return !cache.contains(tab);
          }
        }

      }
    };

    function findNode(selector, element) {
      var container = element[0];
      return angular.element(container.querySelector(selector));
    }

  }

}

/**
 /**
 * @ngdoc directive
 * @name materialTab
 * @module material.components.tabs
 *
 * @restrict E
 *
 * @param {string=} onSelect A function expression to call when the tab is selected.
 * @param {string=} onDeselect A function expression to call when the tab is deselected.
 * @param {boolean=} active A binding, telling whether or not this tab is selected.
 * @param {boolean=} disabled A binding, telling whether or not this tab is disabled.
 * @param {string=} title The visible heading, or title, of the tab. Set HTML headings with {@link ui.bootstrap.tabs.directive:tabHeading tabHeading}.
 *
 * @description
 * Creates a tab with a heading and (optional) content. Must be placed within a {@link material.components.tabs.directive:materialTabs materialTabs}.
 *
 * @example
 *
 */
function NgmTabDirective($attrBind) {
  var noop = angular.noop;

  return {
    restrict: 'E',
    replace: false,
    require: "^materialTabs",
    transclude: 'true',
    scope: true,
    link: linkTab,
    template:
      '<material-ripple initial-opacity="0.95" opacity-decay-velocity="0.89"> </material-ripple> ' +
      '<material-tab-label ' +
        'ng-class="{ disabled : disabled, active : active }"  >' +
      '</material-tab-label>'

  };

  function linkTab(scope, element, attrs, tabsController, $transclude) {
    var defaults = { active: false, disabled: false, deselected: noop, selected: noop };

    // Since using scope=true for inherited new scope,
    // then manually scan element attributes for forced local mappings...

    $attrBind(scope, attrs, {
      label: '@?',
      active: '=?',
      disabled: '=?',
      deselected: '&onDeselect',
      selected: '&onSelect'
    }, defaults);

    configureEffects();
    configureWatchers();
    updateTabContent(scope);

    // Click support for entire <material-tab /> element
    element.on('click', function onRequestSelect() {
      if (!scope.disabled) {
        scope.$apply(function () {
          tabsController.select(scope);
        })
      }
    });

    tabsController.add(scope, element);

    // **********************************************************
    // Private Methods
    // **********************************************************

    /**
     * If materialTabs `noInk` is true, then remove the materialInk feature
     * By default, the materialInk directive is auto injected; @see line 255
     */
    function configureEffects() {
      if (tabsController.noink) {
        // Note; material-ink directive replaces `<material-ink />` element with `div.material-ripple-cursor` element
        var elRipple = angular.element(element[0].querySelector('.material-ripple-cursor'));
        if (elRipple) {
          elRipple.remove();
        }
      }
    }

    /**
     * Auto select the next tab if the current tab is active and
     * has been disabled.
     */
    function configureWatchers() {
      var unwatch = scope.$watch('disabled', function (isDisabled) {
        if (scope.active && isDisabled) {
          tabsController.next(scope);
        }
      });

      scope.$on("$destroy", function () {
        unwatch();
        tabsController.remove(scope);
      });
    }

    /**
     * Transpose the optional `label` attribute value or materialTabHeader or `content` body
     * into the body of the materialTabButton... all other content is saved in scope.content
     * and used by NgmTabsController to inject into the `tabs-content` container.
     */
    function updateTabContent(scope) {
      var cntr = angular.element(element[0].querySelector('material-tab-label'));

      // Check to override label attribute with the content of the <material-tab-header> node,
      // If a materialTabHeader is not specified, then the node will be considered
      // a <material-view> content element...

      $transclude(function (contents) {
        scope.content = [ ];

        angular.forEach(contents, function (node) {
          if (!isNodeEmpty(node)) {
            if (isNodeType(node, 'material-tab-label')) {
              // Simulate use of `label` attribute
              scope.label = node.childNodes;

            } else {

              // Attach to scope for future transclusion into materialView(s)
              scope.content.push(node);
            }
          }
        });

      });

      // Prepare to assign the materialTabButton content
      // Use the label attribute or fallback to TabHeader content

      if (angular.isDefined(scope.label)) {
        // The `label` attribute is the default source

        cntr.append(scope.label);

      } else {

        // NOTE: If not specified, all markup and content is assumed
        // to be used for the tab label.

        angular.forEach(scope.content, function (node) {
          cntr.append(node);
        });

        delete scope.content;
      }
    }

  }
}

/**
 * @ngdoc controller
 * @name materialTabsController
 * @module material.components.tabs
 *
 * @private
 *
 */
function NgmTabsController($iterator, $scope, $timeout) {

  var list = $iterator([], true),
    elements = { },
    selected = null,
    self = this;

  // Methods used by <material-tab> and children

  this.add = addTab;
  this.remove = removeTab;
  this.select = selectTab;
  this.selectAt = selectTabAt;
  this.next = selectNext;
  this.previous = selectPrevious;

  // Property for child access
  this.noink = !!$scope.noink;
  this.scope = $scope;

  // Special internal accessor to access scopes and tab `content`
  // Used by NgmTabsDirective::buildContentItems()

  this.$$tabs = $onGetTabs;
  this.$$hash = "";

  // used within the link-Phase of materialTabs
  this.onTabChange = angular.noop;
  this.selectedElement = function() {
    return findElementFor( selected );
  }

  /**
   * Find the DOM element associated with the tab/scope
   * @param tab
   * @returns {*}
   */
  function findElementFor(tab) {
    if ( angular.isUndefined(tab) ) {
      tab = selected;
    }
    return tab ? elements[ tab.$id ] : undefined;
  }

  /**
   * Publish array of tab scope items
   * NOTE: Tabs are not required to have `contents` and the
   *       node may be undefined.
   * @returns {*} Array
   */
  function $onGetTabs(filterBy) {
    return list.items().filter(filterBy || angular.identity);
  }

  /**
   * Create unique hashKey representing all available
   * tabs.
   */
  function updateHash() {
    self.$$hash = list.items()
      .map(function (it) {
        return it.$id;
      })
      .join(',');
  }

  /**
   * Select specified tab; deselect all others (if any selected)
   * @param tab
   */
  function selectTab(tab) {
    var activate = makeActivator(true),
      deactivate = makeActivator(false);

    // Turn off all tabs (if current active)
    angular.forEach(list.items(), deactivate);

    // Activate the specified tab (or next available)
    selected = activate(tab.disabled ? list.next(tab) : tab);

    // update external models and trigger databinding watchers
    $scope.$selIndex = String(selected.$index || list.indexOf(selected));

    // update the tabs ink to indicate the selected tab
    self.onTabChange( findElementFor(selected) );

    return selected;
  }

  /**
   * Select tab based on its index position
   * @param index
   */
  function selectTabAt(index) {
    if (list.inRange(index)) {
      var matches = list.findBy("$index", index),
        it = matches ? matches[0] : null;

      if (it != selected) {
        selectTab(it);
      }
    }
  }

  /**
   * If not specified (in parent scope; as part of ng-repeat), create
   * `$index` property as part of current scope.
   * NOTE: This prevents scope variable shadowing...
   * @param tab
   * @param index
   */
  function updateIndex(tab, index) {
    if (angular.isUndefined(tab.$index)) {
      tab.$index = index;
    }
  }

  /**
   * Add tab to list and auto-select; default adds item to end of list
   * @param tab
   */
  function addTab(tab, element) {

    updateIndex(tab, list.count());

    // cache materialTab DOM element; these are not materialView elements
    elements[ tab.$id ] = element;

    if (!list.contains(tab)) {
      var pos = list.add(tab, tab.$index);

      // Should we auto-select it?
      if ($scope.$selIndex == pos) {
        selectTab(tab);
      }
    }


    updateHash();

    return tab.$index;
  }

  /**
   * Remove the specified tab from the list
   * Auto select the next tab or the previous tab (if last)
   * @param tab
   */
  function removeTab(tab) {
    if (list.contains(tab)) {

      selectTab(selected = list.next(tab, isEnabled));
      list.remove(tab);

      // another tab was removed, make sure to update ink bar
      $timeout(function(){
        self.onTabChange( findElementFor(selected), true );
        delete elements[tab.$id];
      },300);

    }

    updateHash();
  }

  /**
   * Select the next tab in the list
   * @returns {*} Tab
   */
  function selectNext() {
    return selectTab(selected = list.next(selected, isEnabled));
  }

  /**
   * Select the previous tab
   * @returns {*} Tab
   */
  function selectPrevious() {
    return selectTab(selected = list.previous(selected, isEnabled));
  }

  /**
   * Validation criteria for list iterator when List::next() or List::previous() is used..:
   * In this case, the list iterator should skip items that are disabled.
   * @param tab
   * @returns {boolean}
   */
  function isEnabled(tab) {
    return tab && !tab.disabled;
  }

  /**
   * Partial application to build function that will
   * mark the specified tab as active or not. This also
   * allows the `updateStatus` function to be used as an iterator.
   *
   * @param active
   */
  function makeActivator(active) {
    return function updateState(tab) {
      if (tab && (active != tab.active)) {
        tab.active = active;

//        Disable ripples when tab is active/selected
//        tab.inkEnabled = !active;

        tab.inkEnabled = true;

        if (active) {
          selected = tab;
          tab.selected();
        } else {
          if (selected == tab) {
            selected = null;
          }
          tab.deselected();
        }
        return tab;
      }
      return null;

    }
  }

}

var trim = (function () {
  function isString(value) {
    return typeof value === 'string';
  }

  // native trim is way faster: http://jsperf.com/angular-trim-test
  // but IE doesn't have it... :-(
  // TODO: we should move this into IE/ES5 polyfill
  if (!String.prototype.trim) {
    return function (value) {
      return isString(value) ? value.replace(/^\s\s*/, '').replace(/\s\s*$/, '') : value;
    };
  }
  return function (value) {
    return isString(value) ? value.trim() : value;
  };
})();

/**
 * Determine if the DOM element is of a certain tag type
 * or has the specified attribute type
 *
 * @param node
 * @returns {*|boolean}
 */
var isNodeType = function (node, type) {
  return node.tagName && (
    node.hasAttribute(type) ||
    node.hasAttribute('data-' + type) ||
    node.tagName.toLowerCase() === type ||
    node.tagName.toLowerCase() === 'data-' + type
    );
};

var isNgRepeat = function (node) {
  var COMMENT_NODE = 8;
  return (node.nodeType == COMMENT_NODE) && (node.nodeValue.indexOf('ngRepeat') > -1);
};

/**
 * Is the an empty text string
 * @param node
 * @returns {boolean}
 */
var isNodeEmpty = function (node) {
  var TEXT_NODE = 3;
  return (node.nodeType == TEXT_NODE) && (trim(node.nodeValue) == "");
};


angular.module('material.components.toast', ['material.services.popup'])
  .directive('materialToast', [
    QpToastDirective
  ])
  /**
   * @ngdoc service
   * @name $materialToast
   * @module material.components.toast
   */
  .factory('$materialToast', [
    '$timeout',
    '$materialPopup',
    QpToastService
  ]);

function QpToastDirective() {
  return {
    restrict: 'E',
    transclude: true,
    template: 
      '<div class="toast-container" ng-transclude>' +
      '</div>'
  };
}

function QpToastService($timeout, $materialPopup) {
  var recentToast;

  return showToast;

  /**
   * TODO fully document this
   * Supports all options from $materialPopup, in addition to `duration` and `position`
   */
  function showToast(options) {
    options = angular.extend({
      // How long to keep the toast up, milliseconds
      duration: 3000,
      // [unimplemented] Whether to disable swiping
      swipeDisabled: false,
      // Supports any combination of these class names: 'bottom top left right fit'. 
      // Default: 'bottom left'
      position: 'bottom left',

      // Also supports all options from $materialPopup
      transformTemplate: function(template) {
        return '<material-toast>' + template + '</material-toast>';
      }
    }, options || {});

    recentToast && recentToast.then(function(destroyToast) {
      destroyToast();
    });

    recentToast = $materialPopup(options).then(function(toast) {
      function destroy() {
        $timeout.cancel(toast.delay);
        toast.destroy();
      }

      // Controller will be passed a `$hideToast` function
      toast.locals.$hideToast = destroy;

      toast.element.addClass(options.position);
      toast.enter(function() {
        if (options.duration) {
          toast.delay = $timeout(destroy, options.duration);
        }
      });

      return destroy;
    });

    return recentToast;
  }
}

angular.module('material.components.toolbar', [
  'material.components.content'
])
  .directive('materialToolbar', [materialToolbarDirective]);

function materialToolbarDirective() {

  return {
    restrict: 'E',
    transclude: true,
    template: '<div class="material-toolbar-inner" ng-transclude></div>'
  }

}

angular.module('material.components.whiteframe', []);

angular.module('material.services', [
  'material.services.registry',
  'material.services.position'
]);

/**
 * @ngdoc overview
 * @name material.services.registry
 *
 * @description
 * A component registry system for accessing various component instances in an app.
 */
angular.module('material.services.registry', [])
  .factory('$materialComponentRegistry', [ '$log', materialComponentRegistry ]);

/**
 * @ngdoc service
 * @name material.services.registry.service:$materialComponentRegistry
 *
 * @description
 * $materialComponentRegistry enables the user to interact with multiple instances of
 * certain complex components in a running app.
 */
function materialComponentRegistry($log) {
  var instances = [];

  return {
    /**
     * Used to print an error when an instance for a handle isn't found.
     */
    notFoundError: function(handle) {
      $log.error('No instance found for handle', handle);
    },
    /**
     * Return all registered instances as an array.
     */
    getInstances: function() {
      return instances;
    },

    /**
     * Get a registered instance.
     * @param handle the String handle to look up for a registered instance.
     */
    get: function(handle) {
      var i, j, instance;
      for(i = 0, j = instances.length; i < j; i++) {
        instance = instances[i];
        if(instance.$$materialHandle === handle) {
          return instance;
        }
      }
      return null;
    },

    /**
     * Register an instance.
     * @param instance the instance to register
     * @param handle the handle to identify the instance under.
     */
    register: function(instance, handle) {
      instance.$$materialHandle = handle;
      instances.push(instance);

      return function deregister() {
        var index = instances.indexOf(instance);
        if (index !== -1) {
          instances.splice(index, 1);
        }
      };
    },
  }
}


angular.module('material.services.compiler', [])
  .service('$materialCompiler', [
    '$q',
    '$http',
    '$injector',
    '$compile',
    '$controller',
    '$templateCache',
    materialCompilerService
  ]);

function materialCompilerService($q, $http, $injector, $compile, $controller, $templateCache) {

  /**
   * @ngdoc service
   * @name $materialCompiler
   * @module material.services.compiler
   *
   * @description
   * The $materialCompiler service is an abstraction of angular's compiler, that allows the developer
   * to easily compile an element with a templateUrl, controller, and locals.
   */

   /**
    * @ngdoc method
    * @name $materialCompiler#compile
    * @param {object} options An options object, with the following properties:
    *
    *    - `controller` Ã¢â‚¬â€œ `{(string=|function()=}` Ã¢â‚¬â€œ Controller fn that should be associated with
    *      newly created scope or the name of a {@link angular.Module#controller registered
    *      controller} if passed as a string.
    *    - `controllerAs` Ã¢â‚¬â€œ `{string=}` Ã¢â‚¬â€œ A controller alias name. If present the controller will be
    *      published to scope under the `controllerAs` name.
    *    - `template` Ã¢â‚¬â€œ `{string=}` Ã¢â‚¬â€œ html template as a string or a function that
    *      returns an html template as a string which should be used by {@link
    *      ngRoute.directive:ngView ngView} or {@link ng.directive:ngInclude ngInclude} directives.
    *      This property takes precedence over `templateUrl`.
    *
    *    - `templateUrl` Ã¢â‚¬â€œ `{string=}` Ã¢â‚¬â€œ path or function that returns a path to an html
    *      template that should be used by {@link ngRoute.directive:ngView ngView}.
    *
    *    - `transformTemplate` Ã¢â‚¬â€œ `{function=} Ã¢â‚¬â€œ a function which can be used to transform
    *      the templateUrl or template provided after it is fetched.  It will be given one
    *      parameter, the template, and should return a transformed template.
    *
    *    - `resolve` - `{Object.<string, function>=}` - An optional map of dependencies which should
    *      be injected into the controller. If any of these dependencies are promises, the compiler
    *      will wait for them all to be resolved or one to be rejected before the controller is
    *      instantiated.
    *
    *      - `key` Ã¢â‚¬â€œ `{string}`: a name of a dependency to be injected into the controller.
    *      - `factory` - `{string|function}`: If `string` then it is an alias for a service.
    *        Otherwise if function, then it is {@link api/AUTO.$injector#invoke injected}
    *        and the return value is treated as the dependency. If the result is a promise, it is
    *        resolved before its value is injected into the controller.
    *
    * @returns {object=} promise A promsie which will be resolved with a `compileData` object,
    * with the following properties:
    *
    *   - `{element}` Ã¢â‚¬â€œ `element` Ã¢â‚¬â€œ an uncompiled angular element compiled using the provided template.
    *   
    *   - `{function(scope)}`  Ã¢â‚¬â€œ `link` Ã¢â‚¬â€œ A link function, which, when called, will compile
    *     the elmeent and instantiate options.controller.
    *
    *   - `{object}` Ã¢â‚¬â€œ `locals` Ã¢â‚¬â€œ The locals which will be passed into the controller once `link` is
    *     called.
    *
    * @usage
    * $materialCompiler.compile({
    *   templateUrl: 'modal.html',
    *   controller: 'ModalCtrl',
    *   locals: {
    *     modal: myModalInstance;
    *   }
    * }).then(function(compileData) {
    *   compileData.element; // modal.html's template in an element
    *   compileData.link(myScope); //attach controller & scope to element
    * });
    */
  this.compile = function(options) {
    var templateUrl = options.templateUrl;
    var template = options.template || '';
    var controller = options.controller;
    var controllerAs = options.controllerAs;
    var resolve = options.resolve || {};
    var locals = options.locals || {};
    var transformTemplate = options.transformTemplate || angular.identity;

    // Take resolve values and invoke them.  
    // Resolves can either be a string (value: 'MyRegisteredAngularConst'),
    // or an invokable 'factory' of sorts: (value: function ValueGetter($dependency) {})
    angular.forEach(resolve, function(value, key) {
      if (angular.isString(value)) {
        resolve[key] = $injector.get(value);
      } else {
        resolve[key] = $injector.invoke(value);
      }
    });
    //Add the locals, which are just straight values to inject
    //eg locals: { three: 3 }, will inject three into the controller
    angular.extend(resolve, locals);

    if (templateUrl) {
      resolve.$template = $http.get(templateUrl, {cache: $templateCache})
        .then(function(response) {
          return response.data;
        });
    } else {
      resolve.$template = $q.when(template);
    }

    // Wait for all the resolves to finish if they are promises
    return $q.all(resolve).then(function(locals) {

      var template = transformTemplate(locals.$template);
      var element = angular.element('<div>').html(template).contents();
      var linkFn = $compile(element);

      //Return a linking function that can be used later whne the element is ready
      return {
        locals: locals,
        element: element,
        link: function link(scope) {
          locals.$scope = scope;

          //Instantiate controller if it exists, because we have scope
          if (controller) {
            var ctrl = $controller(controller, locals);
            //See angular-route source for this logic
            element.data('$ngControllerController', ctrl);
            element.children().data('$ngControllerController', ctrl);

            if (controllerAs) {
              scope[controllerAs] = ctrl;
            }
          }

          return linkFn(scope);
        }
      };
    });
  };
}

angular.module('material.services.popup', ['material.services.compiler'])

  .factory('$materialPopup', [
    '$materialCompiler',
    '$timeout',
    '$document',
    '$animate',
    '$rootScope',
    '$rootElement',
    QpPopupFactory
  ]);

function QpPopupFactory($materialCompiler, $timeout, $document, $animate, $rootScope, $rootElement) {

  return createPopup;

  function createPopup(options) {
    var appendTo = options.appendTo || $rootElement;
    var scope = (options.scope || $rootScope).$new();

    return $materialCompiler.compile(options).then(function(compileData) {
      var self;

      return self = angular.extend({
        enter: enter,
        leave: leave,
        destroy: destroy,
        scope: scope
      }, compileData);

      function enter(done) {
        if (scope.$$destroyed || self.entered) return (done || angular.noop)();

        self.entered = true;
        var after = appendTo[0].lastElementChild;
        $animate.enter(self.element, appendTo, after && angular.element(after), done);

        //On the first enter, compile the element
        if (!self.compiled) {
          compileData.link(scope);
          self.compiled = true;
        }
      }
      function leave(done) {
        self.entered = false;
        $animate.leave(self.element, done);
      }
      function destroy(done) {
        if (scope.$$destroyed) return (done || angular.noop)();
        self.leave(function() {
          scope.$destroy();
          (done || angular.noop)();
        });
      }
    });
  }
}

/**
 * Adapted from ui.bootstrap.position
 * https://github.com/angular-ui/bootstrap/blob/master/src/position/position.js
 * https://github.com/angular-ui/bootstrap/blob/master/LICENSE
 */

angular.module('material.services.position', ['ui.bootstrap.position']);

angular.module('ui.bootstrap.position', [])

/**
 * A set of utility methods that can be use to retrieve position of DOM elements.
 * It is meant to be used where we need to absolute-position DOM elements in
 * relation to other, existing elements (this is the case for tooltips, popovers,
 * typeahead suggestions etc.).
 */
  .factory('$position', ['$document', '$window', function ($document, $window) {

    function getStyle(el, cssprop) {
      if (el.currentStyle) { //IE
        return el.currentStyle[cssprop];
      } else if ($window.getComputedStyle) {
        return $window.getComputedStyle(el)[cssprop];
      }
      // finally try and get inline style
      return el.style[cssprop];
    }

    /**
     * Checks if a given element is statically positioned
     * @param element - raw DOM element
     */
    function isStaticPositioned(element) {
      return (getStyle(element, 'position') || 'static' ) === 'static';
    }

    /**
     * returns the closest, non-statically positioned parentOffset of a given element
     * @param element
     */
    var parentOffsetEl = function (element) {
      var docDomEl = $document[0];
      var offsetParent = element.offsetParent || docDomEl;
      while (offsetParent && offsetParent !== docDomEl && isStaticPositioned(offsetParent) ) {
        offsetParent = offsetParent.offsetParent;
      }
      return offsetParent || docDomEl;
    };

    return {
      /**
       * Provides read-only equivalent of jQuery's position function:
       * http://api.jquery.com/position/
       */
      position: function (element) {
        var elBCR = this.offset(element);
        var offsetParentBCR = { top: 0, left: 0 };
        var offsetParentEl = parentOffsetEl(element[0]);
        if (offsetParentEl != $document[0]) {
          offsetParentBCR = this.offset(angular.element(offsetParentEl));
          offsetParentBCR.top += offsetParentEl.clientTop - offsetParentEl.scrollTop;
          offsetParentBCR.left += offsetParentEl.clientLeft - offsetParentEl.scrollLeft;
        }

        var boundingClientRect = element[0].getBoundingClientRect();
        return {
          width: boundingClientRect.width || element.prop('offsetWidth'),
          height: boundingClientRect.height || element.prop('offsetHeight'),
          top: elBCR.top - offsetParentBCR.top,
          left: elBCR.left - offsetParentBCR.left
        };
      },

      /**
       * Provides read-only equivalent of jQuery's offset function:
       * http://api.jquery.com/offset/
       */
      offset: function (element) {
        var boundingClientRect = element[0].getBoundingClientRect();
        return {
          width: boundingClientRect.width || element.prop('offsetWidth'),
          height: boundingClientRect.height || element.prop('offsetHeight'),
          top: boundingClientRect.top + ($window.pageYOffset || $document[0].documentElement.scrollTop),
          left: boundingClientRect.left + ($window.pageXOffset || $document[0].documentElement.scrollLeft)
        };
      },

      /**
       * Provides coordinates for the targetEl in relation to hostEl
       */
      positionElements: function (hostEl, targetEl, positionStr, appendToBody) {

        var positionStrParts = positionStr.split('-');
        var pos0 = positionStrParts[0], pos1 = positionStrParts[1] || 'center';

        var hostElPos,
          targetElWidth,
          targetElHeight,
          targetElPos;

        hostElPos = appendToBody ? this.offset(hostEl) : this.position(hostEl);

        targetElWidth = targetEl.prop('offsetWidth');
        targetElHeight = targetEl.prop('offsetHeight');

        var shiftWidth = {
          center: function () {
            return hostElPos.left + hostElPos.width / 2 - targetElWidth / 2;
          },
          left: function () {
            return hostElPos.left;
          },
          right: function () {
            return hostElPos.left + hostElPos.width;
          }
        };

        var shiftHeight = {
          center: function () {
            return hostElPos.top + hostElPos.height / 2 - targetElHeight / 2;
          },
          top: function () {
            return hostElPos.top;
          },
          bottom: function () {
            return hostElPos.top + hostElPos.height;
          }
        };

        switch (pos0) {
          case 'right':
            targetElPos = {
              top: shiftHeight[pos1](),
              left: shiftWidth[pos0]()
            };
            break;
          case 'left':
            targetElPos = {
              top: shiftHeight[pos1](),
              left: hostElPos.left - targetElWidth
            };
            break;
          case 'bottom':
            targetElPos = {
              top: shiftHeight[pos0](),
              left: shiftWidth[pos1]()
            };
            break;
          default:
            targetElPos = {
              top: shiftHeight[pos0](),
              left: shiftWidth[pos1]()
            };
            break;
        }

        return targetElPos;
      }
    };
  }]);

angular.module('material.utils', [ ])
  .factory('$attrBind', [ '$parse', '$interpolate', AttrsBinder ]);

/**
 *  This service allows directives to easily databind attributes to private scope properties.
 *
 * @private
 */
function AttrsBinder($parse, $interpolate) {
  var LOCAL_REGEXP = /^\s*([@=&])(\??)\s*(\w*)\s*$/;

  return function (scope, attrs, bindDefinition, bindDefaults) {
    angular.forEach(bindDefinition || {}, function (definition, scopeName) {
      //Adapted from angular.js $compile
      var match = definition.match(LOCAL_REGEXP) || [],
        attrName = match[3] || scopeName,
        mode = match[1], // @, =, or &
        parentGet,
        unWatchFn;

      switch (mode) {
        case '@':   // One-way binding from attribute into scope

          attrs.$observe(attrName, function (value) {
            scope[scopeName] = value;
          });
          attrs.$$observers[attrName].$$scope = scope;

          if (!bypassWithDefaults(attrName, scopeName)) {
            // we trigger an interpolation to ensure
            // the value is there for use immediately
            scope[scopeName] = $interpolate(attrs[attrName])(scope);
          }
          break;

        case '=':   // Two-way binding...

          if (!bypassWithDefaults(attrName, scopeName)) {
            // Immediate evaluation
            scope[scopeName] = scope.$eval(attrs[attrName]);

            // Data-bind attribute to scope (incoming) and
            // auto-release watcher when scope is destroyed

            unWatchFn = scope.$watch(attrs[attrName], function (value) {
              scope[scopeName] = value;
            });
            scope.$on('$destroy', unWatchFn);
          }

          break;

        case '&':   // execute an attribute-defined expression in the context of the parent scope

          if (!bypassWithDefaults(attrName, scopeName, angular.noop)) {
            /* jshint -W044 */
            if (attrs[attrName] && attrs[attrName].match(RegExp(scopeName + '\(.*?\)'))) {
              throw new Error('& expression binding "' + scopeName + '" looks like it will recursively call "' +
                attrs[attrName] + '" and cause a stack overflow! Please choose a different scopeName.');
            }

            parentGet = $parse(attrs[attrName]);
            scope[scopeName] = function (locals) {
              return parentGet(scope, locals);
            };
          }

          break;
      }
    });

    /**
     * Optional fallback value if attribute is not specified on element
     * @param scopeName
     */
    function bypassWithDefaults(attrName, scopeName, defaultVal) {
      if (!angular.isDefined(attrs[attrName])) {
        var hasDefault = bindDefaults && bindDefaults.hasOwnProperty(scopeName);
        scope[scopeName] = hasDefault ? bindDefaults[scopeName] : defaultVal;
        return true;
      }
      return false;
    }

  };
}

angular.module('material.utils')
  .service('$iterator', IteratorFactory);

/**
 * $iterator Service Class
 */

function IteratorFactory() {

  return function (items, loop) {
    return new List(items, loop);
  };

  /**
   * List facade to easily support iteration and accessors
   * @param items Array list which this iterator will enumerate
   * @param loop Boolean enables iterator to consider the list as an endless loop
   * @constructor
   */
  function List(items, loop) {
    loop = !!loop;

    var _items = items || [ ];

    // Published API

    return {

      items: getItems,
      count: count,

      hasNext: hasNext,
      inRange: inRange,
      contains: contains,
      indexOf: indexOf,
      itemAt: itemAt,
      findBy: findBy,

      add: add,
      remove: remove,

      first: first,
      last: last,
      next: next,
      previous: previous

    };

    /**
     * Publish copy of the enumerable set
     * @returns {Array|*}
     */
    function getItems() {
      return [].concat(_items);
    }

    /**
     * Determine length of the list
     * @returns {Array.length|*|number}
     */
    function count() {
      return _items.length;
    }

    /**
     * Is the index specified valid
     * @param index
     * @returns {Array.length|*|number|boolean}
     */
    function inRange(index) {
      return _items.length && ( index > -1 ) && (index < _items.length );
    }

    /**
     * Can the iterator proceed to the next item in the list; relative to
     * the specified item.
     *
     * @param tab
     * @returns {Array.length|*|number|boolean}
     */
    function hasNext(tab) {
      return tab ? inRange(indexOf(tab) + 1) : false;
    }

    /**
     * Get item at specified index/position
     * @param index
     * @returns {*}
     */
    function itemAt(index) {
      return inRange(index) ? _items[index] : null;
    }

    /**
     * Find all elements matching the key/value pair
     * otherwise return null
     *
     * @param val
     * @param key
     *
     * @return array
     */
    function findBy(key, val) {

      /**
       * Implement of e6 Array::find()
       * @param list
       * @param callback
       * @returns {*}
       */
      function find(list, callback) {
        var results = [ ];

        angular.forEach(list, function (it, index) {
          var val = callback.apply(null, [it, index, list]);
          if (val) {
            results.push(val);
          }
        });

        return results.length ? results : undefined;
      }

      // Use iterator callback to matches element key value
      // NOTE: searches full prototype chain

      return find(_items, function (el) {
        return ( el[key] == val ) ? el : null;
      });

    }

    /**
     * Add item to list
     * @param it
     * @param index
     * @returns {*}
     */
    function add(it, index) {
      if (!angular.isDefined(index)) {
        index = _items.length;
      }

      _items.splice(index, 0, it);

      return indexOf(it);
    }

    /**
     * Remove it from list...
     * @param it
     */
    function remove(it) {
      _items.splice(indexOf(it), 1);
    }

    /**
     * Get the zero-based index of the target tab
     * @param it
     * @returns {*}
     */
    function indexOf(it) {
      return _items.indexOf(it);
    }

    /**
     * Boolean existence check
     * @param it
     * @returns {boolean}
     */
    function contains(it) {
      return it && (indexOf(it) > -1);
    }

    /**
     * Find the next item
     * @param tab
     * @returns {*}
     */
    function next(it, validate) {

      if (contains(it)) {
        var index = indexOf(it) + 1,
          found = inRange(index) ? _items[ index ] :
            loop ? first() : null,
          skip = found && validate && !validate(found);

        return skip ? next(found) : found;
      }

      return null;
    }

    /**
     * Find the previous item
     * @param tab
     * @returns {*}
     */
    function previous(it, validate) {

      if (contains(it)) {
        var index = indexOf(it) - 1,
          found = inRange(index) ? _items[ index ] :
            loop ? last() : null,
          skip = found && validate && !validate(found);

        return skip ? previous(found) : found;
      }

      return null;
    }

    /**
     * Return first item in the list
     * @returns {*}
     */
    function first() {
      return _items.length ? _items[0] : null;
    }

    /**
     * Return last item in the list...
     * @returns {*}
     */
    function last() {
      return _items.length ? _items[_items.length - 1] : null;
    }

  }

}




/**
 * @author      Thomas Burleson
 * @date        November, 2013
 * @description
 *
 *  String supplant global utility (similar to but more powerful than sprintf() ).
 *
 *  Usages:
 *
 *      var user = {
 *              first : "Thomas",
 *              last  : "Burleson",
 *              address : {
 *                  city : "West Des Moines",
 *                  state: "Iowa"
 *              },
 *              contact : {
 *                  email : "ThomasBurleson@Gmail.com"
 *                  url   : "http://www.solutionOptimist.com"
 *              }
 *          },
 *          message = "Hello Mr. {first} {last}. How's life in {address.city}, {address.state} ?";
 *
 *     return supplant( message, user );
 *
 */
(function( window ) {
    "use strict";
        var INVALID_DATA = "Undefined template provided";

        // supplant() method from Crockfords `Remedial Javascript`

        var supplant =  function( template, values, pattern ) {
            if(!template)
            {
              throw(new Error(INVALID_DATA));
            }

            pattern = pattern || /\{([^\{\}]*)\}/g;

            return template.replace(pattern, function(a, b) {
                var p = b.split('.'),
                    r = values;

                try {
                    for (var s in p) { r = r[p[s]];  }
                } catch(e){
                    r = a;
                }

                return (typeof r === 'string' || typeof r === 'number' || typeof r === 'boolean') ? r : a;
            });
        };


        // supplant() method from Crockfords `Remedial Javascript`
        Function.prototype.method = function (name, func) {
            this.prototype[name] = func;
            return this;
        };

        String.method("supplant", function( values, pattern ) {
            var self = this;
            return supplant(self, values, pattern);
        });


        // Publish this global function...
        window.supplant = String.supplant = supplant;

}( window ));

})();
var DocsApp = angular.module('docsApp', ['ngMaterial', 'ngRoute', 'angularytics'])

.config([
  'COMPONENTS',
  '$routeProvider',
function(COMPONENTS, $routeProvider) {
  $routeProvider.when('/', {
    templateUrl: 'template/home.tmpl.html'
  });

  angular.forEach(COMPONENTS, function(component) {
    component.url = '/component/' + component.id;
    $routeProvider.when(component.url, {
      templateUrl: component.outputPath,
      resolve: {
        component: function() { return component; }
      },
      controller: 'DocPageCtrl'
    });
  });

  $routeProvider.otherwise('/');

}])

.config(['AngularyticsProvider',
function(AngularyticsProvider) {
  AngularyticsProvider.setEventHandlers(['Console', 'GoogleUniversal']);
}])

.run([
  'Angularytics',
  '$rootScope',
function(Angularytics, $rootScope) {
  Angularytics.init();
}])

.controller('DocsCtrl', [
  '$scope',
  'COMPONENTS',
  '$materialSidenav',
  '$timeout',
  '$location',
  '$rootScope',
  '$materialDialog',
function($scope, COMPONENTS, $materialSidenav, $timeout, $location, $rootScope, $materialDialog) {
  $scope.COMPONENTS = COMPONENTS;

  document.querySelector('.sidenav-content')
  .addEventListener('click', function(e) {
    if ($materialSidenav('left').isOpen()) {
      e.preventDefault();
      e.stopPropagation();
      $timeout(function() {
        $materialSidenav('left').close();
      });
    }
  });

  $scope.setCurrentComponent = function(component) {
    $scope.currentComponent = component;
  };

  $scope.toggleMenu = function() {
    $timeout(function() {
      $materialSidenav('left').toggle();
    });
  };

  $scope.goHome = function($event) {
    $location.path( '/' );
  };

  $scope.goToComponent = function(component) {
    if (component) {
      $location.path( component.url );
      $materialSidenav('left').close();
    }
  };
  $scope.componentIsCurrent = function(component) {
    return component && $location.path() === component.url;
  };

  $scope.viewSource = function(component, $event) {
    $materialDialog({
      targetEvent: $event,
      controller: 'ViewSourceCtrl',
      locals: {
        demo: component.$selectedDemo
      },
      templateUrl: 'template/view-source.tmpl.html'
    });
  };
}])

.controller('HomeCtrl', [
  '$scope',
  '$rootScope',
function($scope, $rootScope) {
  $rootScope.appTitle = 'Material Design';
  $scope.setCurrentComponent(null);
}])

.controller('DocPageCtrl', [
  '$scope',
  'component',
  '$rootScope',
function($scope, component, $rootScope) {
  $rootScope.appTitle = 'Material: ' + component.name;

  $scope.setCurrentComponent(component);
  component.$selectedDemo = component.$selectedDemo || 
    component.demos[ Object.keys(component.demos)[0] ];
}])

.controller('ViewSourceCtrl', [
  '$scope',
  'demo',
  '$hideDialog',
function($scope, demo, $hideDialog) {
  $scope.files = [demo.indexFile].concat(demo.files.sort(sortByJs));
  $scope.$hideDialog = $hideDialog;

  $scope.data = {
    selectedFile: demo.indexFile
  };

  function sortByJs(file) {
    return file.fileType == 'js' ? -1 : 1;
  }
}])

;

DocsApp
.constant('COMPONENTS', [
  {
    "id": "material.components.button",
    "name": "Buttons",
    "demos": {
      "demo1": {
        "name": "Basic Buttons",
        "id": "demo1",
        "files": [
          {
            "template": "demo/template.file",
            "outputPath": "components/material.components.button/demo1/script.js",
            "fileType": "js",
            "file": "src/components/buttons/demo1/script.js",
            "content": "\nangular.module('app', ['ngMaterial'])\n\n.controller('AppCtrl', function($scope) {\n\n});",
            "componentId": "material.components.button",
            "componentName": "Buttons",
            "basePath": "script.js",
            "type": "demo",
            "id": "demo1",
            "name": "Basic Buttons",
            "fileName": "script",
            "relativePath": "script.js/src/components/buttons/demo1/script.js",
            "renderedContent": "\nangular.module('app', ['ngMaterial'])\n\n.controller('AppCtrl', function($scope) {\n\n});\n"
          },
          {
            "template": "demo/template.file",
            "outputPath": "components/material.components.button/demo1/style.css",
            "fileType": "css",
            "file": "src/components/buttons/demo1/style.css",
            "content": "\n/** From vulcanized demo **/\n\nsection {\n  vertical-align: top;\n  display: inline-block;\n  background: #f7f7f7;\n  border-radius: 3px;\n  width: 25%;\n  text-align: center;\n  margin: 1%;\n  padding: 1em;\n}\n.margin .material-button {\n  width: 10em;\n  margin: 1em;\n  line-height: 25px;\n}\n.label {\n  text-align: left;\n  color: #bbb;\n  font-size: 12px;\n  margin-top: 2em;\n}\n\n",
            "componentId": "material.components.button",
            "componentName": "Buttons",
            "basePath": "style.css",
            "type": "demo",
            "id": "demo1",
            "name": "Basic Buttons",
            "fileName": "style",
            "relativePath": "style.css/src/components/buttons/demo1/style.css",
            "renderedContent": "\n/** From vulcanized demo **/\n\nsection {\n  vertical-align: top;\n  display: inline-block;\n  background: #f7f7f7;\n  border-radius: 3px;\n  width: 25%;\n  text-align: center;\n  margin: 1%;\n  padding: 1em;\n}\n.margin .material-button {\n  width: 10em;\n  margin: 1em;\n  line-height: 25px;\n}\n.label {\n  text-align: left;\n  color: #bbb;\n  font-size: 12px;\n  margin-top: 2em;\n}\n\n\n"
          }
        ],
        "indexFile": {
          "template": "demo/template.index.html",
          "outputPath": "components/material.components.button/demo1/index.html",
          "fileType": "html",
          "file": "src/components/buttons/demo1/index.html",
          "content": "\n<div ng-app=\"app\" ng-controller=\"AppCtrl\">\n  <material-content>\n\n    <section class=\"margin\">\n      <button class=\"material-button\">Button</button>\n      <br>\n      <button class=\"material-button material-button-colored\">Button</button>\n      <br>\n      <button disabled class=\"material-button material-button-colored\">Colored</button>\n      <br>\n      <div class=\"label\">flat</div>\n    </section>\n\n    <section class=\"margin\">\n      <button class=\"material-button material-button-raised\">Button</button>\n      <br>\n      <button class=\"material-button material-button-raised material-button-colored\">Colored</button>\n      <br>\n      <button disabled class=\"material-button material-button-raised material-button-colored\">Disabled</button>\n      <br>\n      <div class=\"label\">raised</div>\n    </section>\n\n    <section class=\"margin\">\n      <a class=\"material-button material-button-raised\">Button</a>\n      <br>\n      <a class=\"material-button material-button-raised material-button-colored\">Colored</a>\n      <br>\n      <a disabled class=\"material-button material-button-raised material-button-colored\">Disabled</a>\n      <br>\n      <div class=\"label\">anchors</div>\n    </section>\n\n    <section class=\"margin\">\n      <button class=\"material-button\">Button</button>\n      <br>\n      <button class=\"material-button material-button-colored\">Colored</button>\n      <br>\n      <div class=\"label\">flat + hover state</div>\n    </section>\n\n    <section class=\"margin\">\n      <button class=\"material-button material-button-raised\">Button</button>\n      <br>\n      <button class=\"material-button material-button-raised material-button-colored\">Colored</button>\n      <br>\n      <div class=\"label\">raised + hover state</div>\n    </section>\n\n    <section class=\"margin\">\n      <button class=\"material-button\">Button</button>\n      <br>\n      <button class=\"material-button material-button-colored\">Colored</button>\n      <br>\n      <div class=\"label\">flat + focused</div>\n    </section>\n\n    <section class=\"margin\">\n      <button class=\"material-button material-button-raised\">Button</button>\n      <br>\n      <button class=\"material-button material-button-raised material-button-colored\">Colored</button>\n      <br>\n      <div class=\"label\">raised + focused</div>\n    </section>\n\n    <section>\n      <button class=\"material-button material-button-fab\" style=\"position: static; display: block\">\n        <material-icon icon=\"/img/icons/ic_insert_drive_file_24px.svg\" style=\"width: 24px; height: 24px;\">\n        </material-icon>\n      </button>\n      <br>\n      <div class=\"label\">FAB</div>\n    </section>\n\n    <section>\n      <div class=\"material-button-group\">\n        <button class=\"material-button\">Reset</button>\n        <button class=\"material-button\">RSVP</button>\n      </div>\n      <br>\n      <div class=\"label\">Button Group</div>\n    </section>\n\n    <section class=\"margin\">\n      <button class=\"material-button material-theme-green\">Button</button>\n      <br>\n      <button class=\"material-button material-theme-red\">Button</button>\n      <br>\n      <button class=\"material-button material-theme-light-blue\">Button</button>\n      <br>\n      <button class=\"material-button material-theme-yellow\">Button</button>\n      <br>\n      <div class=\"label\">Themed</div>\n    </section>\n\n  </material-content>\n</div>\n",
          "componentId": "material.components.button",
          "componentName": "Buttons",
          "basePath": "index.html",
          "type": "demo",
          "id": "demo1",
          "name": "Basic Buttons",
          "fileName": "index",
          "relativePath": "index.html/src/components/buttons/demo1/index.html",
          "js": [
            {
              "template": "demo/template.file",
              "outputPath": "components/material.components.button/demo1/script.js",
              "fileType": "js",
              "file": "src/components/buttons/demo1/script.js",
              "content": "\nangular.module('app', ['ngMaterial'])\n\n.controller('AppCtrl', function($scope) {\n\n});",
              "componentId": "material.components.button",
              "componentName": "Buttons",
              "basePath": "script.js",
              "type": "demo",
              "id": "demo1",
              "name": "Basic Buttons",
              "fileName": "script",
              "relativePath": "script.js/src/components/buttons/demo1/script.js",
              "renderedContent": "\nangular.module('app', ['ngMaterial'])\n\n.controller('AppCtrl', function($scope) {\n\n});\n"
            }
          ],
          "css": [
            {
              "template": "demo/template.file",
              "outputPath": "components/material.components.button/demo1/style.css",
              "fileType": "css",
              "file": "src/components/buttons/demo1/style.css",
              "content": "\n/** From vulcanized demo **/\n\nsection {\n  vertical-align: top;\n  display: inline-block;\n  background: #f7f7f7;\n  border-radius: 3px;\n  width: 25%;\n  text-align: center;\n  margin: 1%;\n  padding: 1em;\n}\n.margin .material-button {\n  width: 10em;\n  margin: 1em;\n  line-height: 25px;\n}\n.label {\n  text-align: left;\n  color: #bbb;\n  font-size: 12px;\n  margin-top: 2em;\n}\n\n",
              "componentId": "material.components.button",
              "componentName": "Buttons",
              "basePath": "style.css",
              "type": "demo",
              "id": "demo1",
              "name": "Basic Buttons",
              "fileName": "style",
              "relativePath": "style.css/src/components/buttons/demo1/style.css",
              "renderedContent": "\n/** From vulcanized demo **/\n\nsection {\n  vertical-align: top;\n  display: inline-block;\n  background: #f7f7f7;\n  border-radius: 3px;\n  width: 25%;\n  text-align: center;\n  margin: 1%;\n  padding: 1em;\n}\n.margin .material-button {\n  width: 10em;\n  margin: 1em;\n  line-height: 25px;\n}\n.label {\n  text-align: left;\n  color: #bbb;\n  font-size: 12px;\n  margin-top: 2em;\n}\n\n\n"
            }
          ],
          "renderedContent": "<!doctype html>\n<head>\n  <meta name=\"viewport\" content=\"initial-scale=1, maximum-scale=1\" />\n  <link rel=\"stylesheet\" href=\"../../../demo.css\">\n  <script src=\"//ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js\"></script>\n  <script src=\"//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular.min.js\"></script>\n  <script src=\"//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular-animate.min.js\"></script>\n  <script src=\"//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular-route.min.js\"></script>\n  <script src=\"../../../docs.js\"></script>\n  <script src=\"script.js\"></script>\n  \n  <link rel=\"stylesheet\" href=\"style.css\">\n  \n</head>\n<body>\n\n<div ng-app=\"app\" ng-controller=\"AppCtrl\">\n  <material-content>\n\n    <section class=\"margin\">\n      <button class=\"material-button\">Button</button>\n      <br>\n      <button class=\"material-button material-button-colored\">Button</button>\n      <br>\n      <button disabled class=\"material-button material-button-colored\">Colored</button>\n      <br>\n      <div class=\"label\">flat</div>\n    </section>\n\n    <section class=\"margin\">\n      <button class=\"material-button material-button-raised\">Button</button>\n      <br>\n      <button class=\"material-button material-button-raised material-button-colored\">Colored</button>\n      <br>\n      <button disabled class=\"material-button material-button-raised material-button-colored\">Disabled</button>\n      <br>\n      <div class=\"label\">raised</div>\n    </section>\n\n    <section class=\"margin\">\n      <a class=\"material-button material-button-raised\">Button</a>\n      <br>\n      <a class=\"material-button material-button-raised material-button-colored\">Colored</a>\n      <br>\n      <a disabled class=\"material-button material-button-raised material-button-colored\">Disabled</a>\n      <br>\n      <div class=\"label\">anchors</div>\n    </section>\n\n    <section class=\"margin\">\n      <button class=\"material-button\">Button</button>\n      <br>\n      <button class=\"material-button material-button-colored\">Colored</button>\n      <br>\n      <div class=\"label\">flat + hover state</div>\n    </section>\n\n    <section class=\"margin\">\n      <button class=\"material-button material-button-raised\">Button</button>\n      <br>\n      <button class=\"material-button material-button-raised material-button-colored\">Colored</button>\n      <br>\n      <div class=\"label\">raised + hover state</div>\n    </section>\n\n    <section class=\"margin\">\n      <button class=\"material-button\">Button</button>\n      <br>\n      <button class=\"material-button material-button-colored\">Colored</button>\n      <br>\n      <div class=\"label\">flat + focused</div>\n    </section>\n\n    <section class=\"margin\">\n      <button class=\"material-button material-button-raised\">Button</button>\n      <br>\n      <button class=\"material-button material-button-raised material-button-colored\">Colored</button>\n      <br>\n      <div class=\"label\">raised + focused</div>\n    </section>\n\n    <section>\n      <button class=\"material-button material-button-fab\" style=\"position: static; display: block\">\n        <material-icon icon=\"/img/icons/ic_insert_drive_file_24px.svg\" style=\"width: 24px; height: 24px;\">\n        </material-icon>\n      </button>\n      <br>\n      <div class=\"label\">FAB</div>\n    </section>\n\n    <section>\n      <div class=\"material-button-group\">\n        <button class=\"material-button\">Reset</button>\n        <button class=\"material-button\">RSVP</button>\n      </div>\n      <br>\n      <div class=\"label\">Button Group</div>\n    </section>\n\n    <section class=\"margin\">\n      <button class=\"material-button material-theme-green\">Button</button>\n      <br>\n      <button class=\"material-button material-theme-red\">Button</button>\n      <br>\n      <button class=\"material-button material-theme-light-blue\">Button</button>\n      <br>\n      <button class=\"material-button material-theme-yellow\">Button</button>\n      <br>\n      <div class=\"label\">Themed</div>\n    </section>\n\n  </material-content>\n</div>\n\n</body>\n</html>\n"
        }
      }
    },
    "template": "component.template.html",
    "outputPath": "components/material.components.button/index.html",
    "repositoryUrl": "https://github.com/angular/material/tree/master/src/components/buttons",
    "renderedContent": "<material-tabs class=\"demo-tabs\">\n  <material-tab ng-repeat=\"(_,demo) in currentComponent.demos\"\n           active=\"currentComponent.$selectedDemo === demo\"\n           ng-click=\"currentComponent.$selectedDemo = demo\" \n           label=\"{{demo.name}}\">\n  </material-tab>\n</material-tabs>\n<iframe class=\"demo\"\n        name=\"{{demo.id}}\"\n        ng-repeat=\"demo in currentComponent.demos\" \n        ng-show=\"currentComponent.$selectedDemo === demo\"\n        ng-src=\"{{demo.indexFile.outputPath}}\">\n</iframe>\n\n"
  },
  {
    "id": "material.components.card",
    "name": "Card",
    "demos": {
      "demo1": {
        "name": "Card Basic Usage",
        "id": "demo1",
        "files": [
          {
            "template": "demo/template.file",
            "outputPath": "components/material.components.card/demo1/script.js",
            "fileType": "js",
            "file": "src/components/card/demo1/script.js",
            "content": "\nangular.module('app', ['ngMaterial'])\n\n.controller('AppCtrl', function($scope) {\n\n});",
            "componentId": "material.components.card",
            "componentName": "Card",
            "basePath": "script.js",
            "type": "demo",
            "id": "demo1",
            "name": "Card Basic Usage",
            "fileName": "script",
            "relativePath": "script.js/src/components/card/demo1/script.js",
            "renderedContent": "\nangular.module('app', ['ngMaterial'])\n\n.controller('AppCtrl', function($scope) {\n\n});\n"
          },
          {
            "template": "demo/template.file",
            "outputPath": "components/material.components.card/demo1/style.css",
            "fileType": "css",
            "file": "src/components/card/demo1/style.css",
            "content": "\nmaterial-card {\n  min-height: 150px;\n}",
            "componentId": "material.components.card",
            "componentName": "Card",
            "basePath": "style.css",
            "type": "demo",
            "id": "demo1",
            "name": "Card Basic Usage",
            "fileName": "style",
            "relativePath": "style.css/src/components/card/demo1/style.css",
            "renderedContent": "\nmaterial-card {\n  min-height: 150px;\n}\n"
          }
        ],
        "indexFile": {
          "template": "demo/template.index.html",
          "outputPath": "components/material.components.card/demo1/index.html",
          "fileType": "html",
          "file": "src/components/card/demo1/index.html",
          "content": "\n<div ng-app=\"app\" ng-controller=\"AppCtrl\">\n\n  <material-content>\n\n    <material-card>\n      <img src=\"/img/washedout.png\" class=\"material-card-image\">\n      <h2>Paracosm</h2>\n      <p>\n        The titles of Washed Out's breakthrough song and the first single from Paracosm share the\n        two most important words in Ernest Greene's musical language: feel it. It's a simple request, as well...\n      </p>\n    </material-card>\n\n    <material-card>\n      <img src=\"/img/washedout.png\" class=\"material-card-image\">\n      <h2>Paracosm</h2>\n      <p>\n        The titles of Washed Out's breakthrough song and the first single from Paracosm share the\n        two most important words in Ernest Greene's musical language: feel it. It's a simple request, as well...\n      </p>\n    </material-card>\n\n    <material-card>\n      <img src=\"/img/washedout.png\" class=\"material-card-image\">\n      <h2>Paracosm</h2>\n      <p>\n        The titles of Washed Out's breakthrough song and the first single from Paracosm share the\n        two most important words in Ernest Greene's musical language: feel it. It's a simple request, as well...\n      </p>\n    </material-card>\n\n  </material-content>\n</div>\n",
          "componentId": "material.components.card",
          "componentName": "Card",
          "basePath": "index.html",
          "type": "demo",
          "id": "demo1",
          "name": "Card Basic Usage",
          "fileName": "index",
          "relativePath": "index.html/src/components/card/demo1/index.html",
          "js": [
            {
              "template": "demo/template.file",
              "outputPath": "components/material.components.card/demo1/script.js",
              "fileType": "js",
              "file": "src/components/card/demo1/script.js",
              "content": "\nangular.module('app', ['ngMaterial'])\n\n.controller('AppCtrl', function($scope) {\n\n});",
              "componentId": "material.components.card",
              "componentName": "Card",
              "basePath": "script.js",
              "type": "demo",
              "id": "demo1",
              "name": "Card Basic Usage",
              "fileName": "script",
              "relativePath": "script.js/src/components/card/demo1/script.js",
              "renderedContent": "\nangular.module('app', ['ngMaterial'])\n\n.controller('AppCtrl', function($scope) {\n\n});\n"
            }
          ],
          "css": [
            {
              "template": "demo/template.file",
              "outputPath": "components/material.components.card/demo1/style.css",
              "fileType": "css",
              "file": "src/components/card/demo1/style.css",
              "content": "\nmaterial-card {\n  min-height: 150px;\n}",
              "componentId": "material.components.card",
              "componentName": "Card",
              "basePath": "style.css",
              "type": "demo",
              "id": "demo1",
              "name": "Card Basic Usage",
              "fileName": "style",
              "relativePath": "style.css/src/components/card/demo1/style.css",
              "renderedContent": "\nmaterial-card {\n  min-height: 150px;\n}\n"
            }
          ],
          "renderedContent": "<!doctype html>\n<head>\n  <meta name=\"viewport\" content=\"initial-scale=1, maximum-scale=1\" />\n  <link rel=\"stylesheet\" href=\"../../../demo.css\">\n  <script src=\"//ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js\"></script>\n  <script src=\"//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular.min.js\"></script>\n  <script src=\"//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular-animate.min.js\"></script>\n  <script src=\"//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular-route.min.js\"></script>\n  <script src=\"../../../docs.js\"></script>\n  <script src=\"script.js\"></script>\n  \n  <link rel=\"stylesheet\" href=\"style.css\">\n  \n</head>\n<body>\n\n<div ng-app=\"app\" ng-controller=\"AppCtrl\">\n\n  <material-content>\n\n    <material-card>\n      <img src=\"/img/washedout.png\" class=\"material-card-image\">\n      <h2>Paracosm</h2>\n      <p>\n        The titles of Washed Out's breakthrough song and the first single from Paracosm share the\n        two most important words in Ernest Greene's musical language: feel it. It's a simple request, as well...\n      </p>\n    </material-card>\n\n    <material-card>\n      <img src=\"/img/washedout.png\" class=\"material-card-image\">\n      <h2>Paracosm</h2>\n      <p>\n        The titles of Washed Out's breakthrough song and the first single from Paracosm share the\n        two most important words in Ernest Greene's musical language: feel it. It's a simple request, as well...\n      </p>\n    </material-card>\n\n    <material-card>\n      <img src=\"/img/washedout.png\" class=\"material-card-image\">\n      <h2>Paracosm</h2>\n      <p>\n        The titles of Washed Out's breakthrough song and the first single from Paracosm share the\n        two most important words in Ernest Greene's musical language: feel it. It's a simple request, as well...\n      </p>\n    </material-card>\n\n  </material-content>\n</div>\n\n</body>\n</html>\n"
        }
      }
    },
    "template": "component.template.html",
    "outputPath": "components/material.components.card/index.html",
    "repositoryUrl": "https://github.com/angular/material/tree/master/src/components/card",
    "renderedContent": "<material-tabs class=\"demo-tabs\">\n  <material-tab ng-repeat=\"(_,demo) in currentComponent.demos\"\n           active=\"currentComponent.$selectedDemo === demo\"\n           ng-click=\"currentComponent.$selectedDemo = demo\" \n           label=\"{{demo.name}}\">\n  </material-tab>\n</material-tabs>\n<iframe class=\"demo\"\n        name=\"{{demo.id}}\"\n        ng-repeat=\"demo in currentComponent.demos\" \n        ng-show=\"currentComponent.$selectedDemo === demo\"\n        ng-src=\"{{demo.indexFile.outputPath}}\">\n</iframe>\n\n"
  },
  {
    "id": "material.components.checkbox",
    "name": "Checkbox",
    "demos": {
      "demo1": {
        "name": "Checkbox Basic Usage",
        "id": "demo1",
        "files": [
          {
            "template": "demo/template.file",
            "outputPath": "components/material.components.checkbox/demo1/script.js",
            "fileType": "js",
            "file": "src/components/checkbox/demo1/script.js",
            "content": "\nangular.module('app', ['ngMaterial'])\n\n.controller('AppCtrl', function($scope) {\n\n  $scope.data = {};\n  $scope.data.cb1 = true;\n  $scope.data.cb2 = false;\n\n});",
            "componentId": "material.components.checkbox",
            "componentName": "Checkbox",
            "basePath": "script.js",
            "type": "demo",
            "id": "demo1",
            "name": "Checkbox Basic Usage",
            "fileName": "script",
            "relativePath": "script.js/src/components/checkbox/demo1/script.js",
            "renderedContent": "\nangular.module('app', ['ngMaterial'])\n\n.controller('AppCtrl', function($scope) {\n\n  $scope.data = {};\n  $scope.data.cb1 = true;\n  $scope.data.cb2 = false;\n\n});\n"
          },
          {
            "template": "demo/template.file",
            "outputPath": "components/material.components.checkbox/demo1/style.css",
            "fileType": "css",
            "file": "src/components/checkbox/demo1/style.css",
            "content": "\nbody {\n  padding: 20px;\n}\n",
            "componentId": "material.components.checkbox",
            "componentName": "Checkbox",
            "basePath": "style.css",
            "type": "demo",
            "id": "demo1",
            "name": "Checkbox Basic Usage",
            "fileName": "style",
            "relativePath": "style.css/src/components/checkbox/demo1/style.css",
            "renderedContent": "\nbody {\n  padding: 20px;\n}\n\n"
          }
        ],
        "indexFile": {
          "template": "demo/template.index.html",
          "outputPath": "components/material.components.checkbox/demo1/index.html",
          "fileType": "html",
          "file": "src/components/checkbox/demo1/index.html",
          "content": "\n<div ng-app=\"app\" ng-controller=\"AppCtrl\">\n\n  <material-checkbox>\n    <input type=\"checkbox\" ng-model=\"data.cb1\">\n    Checkbox 1: {{ data.cb1 }}\n  </material-checkbox>\n\n  <material-checkbox>\n    <input type=\"checkbox\" ng-model=\"data.cb2\" ng-true-value=\"yup\" ng-false-value=\"nope\">\n    Checkbox 2: {{ data.cb2 }}\n  </material-checkbox>\n\n</div>\n",
          "componentId": "material.components.checkbox",
          "componentName": "Checkbox",
          "basePath": "index.html",
          "type": "demo",
          "id": "demo1",
          "name": "Checkbox Basic Usage",
          "fileName": "index",
          "relativePath": "index.html/src/components/checkbox/demo1/index.html",
          "js": [
            {
              "template": "demo/template.file",
              "outputPath": "components/material.components.checkbox/demo1/script.js",
              "fileType": "js",
              "file": "src/components/checkbox/demo1/script.js",
              "content": "\nangular.module('app', ['ngMaterial'])\n\n.controller('AppCtrl', function($scope) {\n\n  $scope.data = {};\n  $scope.data.cb1 = true;\n  $scope.data.cb2 = false;\n\n});",
              "componentId": "material.components.checkbox",
              "componentName": "Checkbox",
              "basePath": "script.js",
              "type": "demo",
              "id": "demo1",
              "name": "Checkbox Basic Usage",
              "fileName": "script",
              "relativePath": "script.js/src/components/checkbox/demo1/script.js",
              "renderedContent": "\nangular.module('app', ['ngMaterial'])\n\n.controller('AppCtrl', function($scope) {\n\n  $scope.data = {};\n  $scope.data.cb1 = true;\n  $scope.data.cb2 = false;\n\n});\n"
            }
          ],
          "css": [
            {
              "template": "demo/template.file",
              "outputPath": "components/material.components.checkbox/demo1/style.css",
              "fileType": "css",
              "file": "src/components/checkbox/demo1/style.css",
              "content": "\nbody {\n  padding: 20px;\n}\n",
              "componentId": "material.components.checkbox",
              "componentName": "Checkbox",
              "basePath": "style.css",
              "type": "demo",
              "id": "demo1",
              "name": "Checkbox Basic Usage",
              "fileName": "style",
              "relativePath": "style.css/src/components/checkbox/demo1/style.css",
              "renderedContent": "\nbody {\n  padding: 20px;\n}\n\n"
            }
          ],
          "renderedContent": "<!doctype html>\n<head>\n  <meta name=\"viewport\" content=\"initial-scale=1, maximum-scale=1\" />\n  <link rel=\"stylesheet\" href=\"../../../demo.css\">\n  <script src=\"//ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js\"></script>\n  <script src=\"//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular.min.js\"></script>\n  <script src=\"//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular-animate.min.js\"></script>\n  <script src=\"//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular-route.min.js\"></script>\n  <script src=\"../../../docs.js\"></script>\n  <script src=\"script.js\"></script>\n  \n  <link rel=\"stylesheet\" href=\"style.css\">\n  \n</head>\n<body>\n\n<div ng-app=\"app\" ng-controller=\"AppCtrl\">\n\n  <material-checkbox>\n    <input type=\"checkbox\" ng-model=\"data.cb1\">\n    Checkbox 1: {{ data.cb1 }}\n  </material-checkbox>\n\n  <material-checkbox>\n    <input type=\"checkbox\" ng-model=\"data.cb2\" ng-true-value=\"yup\" ng-false-value=\"nope\">\n    Checkbox 2: {{ data.cb2 }}\n  </material-checkbox>\n\n</div>\n\n</body>\n</html>\n"
        }
      }
    },
    "template": "component.template.html",
    "outputPath": "components/material.components.checkbox/index.html",
    "repositoryUrl": "https://github.com/angular/material/tree/master/src/components/checkbox",
    "renderedContent": "<material-tabs class=\"demo-tabs\">\n  <material-tab ng-repeat=\"(_,demo) in currentComponent.demos\"\n           active=\"currentComponent.$selectedDemo === demo\"\n           ng-click=\"currentComponent.$selectedDemo = demo\" \n           label=\"{{demo.name}}\">\n  </material-tab>\n</material-tabs>\n<iframe class=\"demo\"\n        name=\"{{demo.id}}\"\n        ng-repeat=\"demo in currentComponent.demos\" \n        ng-show=\"currentComponent.$selectedDemo === demo\"\n        ng-src=\"{{demo.indexFile.outputPath}}\">\n</iframe>\n\n"
  },
  {
    "id": "material.components.content",
    "name": "Content",
    "demos": {
      "demo1": {
        "name": "Content Basic Usage",
        "id": "demo1",
        "files": [
          {
            "template": "demo/template.file",
            "outputPath": "components/material.components.content/demo1/script.js",
            "fileType": "js",
            "file": "src/components/content/demo1/script.js",
            "content": "\nangular.module('app', ['ngMaterial'])\n\n.controller('AppCtrl', function($scope) {\n\n})\n",
            "componentId": "material.components.content",
            "componentName": "Content",
            "basePath": "script.js",
            "type": "demo",
            "id": "demo1",
            "name": "Content Basic Usage",
            "fileName": "script",
            "relativePath": "script.js/src/components/content/demo1/script.js",
            "renderedContent": "\nangular.module('app', ['ngMaterial'])\n\n.controller('AppCtrl', function($scope) {\n\n})\n\n"
          }
        ],
        "indexFile": {
          "template": "demo/template.index.html",
          "outputPath": "components/material.components.content/demo1/index.html",
          "fileType": "html",
          "file": "src/components/content/demo1/index.html",
          "content": "\n<div ng-app=\"app\" ng-controller=\"AppCtrl\">\n  <style>\n    material-content {\n      top: 64px;\n    }\n  </style>\n\n  <material-toolbar class=\"material-theme-dark\">\n    <div class=\"material-toolbar-tools\">\n      <span class=\"material-flex\">Toolbar: dark-theme</span>\n    </div>\n  </material-toolbar>\n\n  <material-content>\n    Lorem ipsum dolor sit amet, ne quod novum mei. Sea omnium invenire mediocrem at, in lobortis conclusionemque nam. Ne deleniti appetere reprimique pro, inani labitur disputationi te sed. At vix sale omnesque, id pro labitur reformidans accommodare, cum labores honestatis eu. Nec quem lucilius in, eam praesent reformidans no. Sed laudem aliquam ne.\n\n    <p>\nFacete delenit argumentum cum at. Pro rebum nostrum contentiones ad. Mel exerci tritani maiorum at, mea te audire phaedrum, mel et nibh aliquam. Malis causae equidem vel eu. Noster melius vis ea, duis alterum oporteat ea sea. Per cu vide munere fierent.\n\n    <p>\nAd sea dolor accusata consequuntur. Sit facete convenire reprehendunt et. Usu cu nonumy dissentiet, mei choro omnes fuisset ad. Te qui docendi accusam efficiantur, doming noster prodesset eam ei. In vel posse movet, ut convenire referrentur eum, ceteros singulis intellegam eu sit.\n    <p>\n\nSit saepe quaestio reprimique id, duo no congue nominati, cum id nobis facilisi. No est laoreet dissentias, idque consectetuer eam id. Clita possim assueverit cu his, solum virtute recteque et cum. Vel cu luptatum signiferumque, mel eu brute nostro senserit. Blandit euripidis consequat ex mei, atqui torquatos id cum, meliore luptatum ut usu. Cu zril perpetua gubergren pri. Accusamus rationibus instructior ei pro, eu nullam principes qui, reque justo omnes et quo.\n    <p>\n\nSint unum eam id. At sit fastidii theophrastus, mutat senserit repudiare et has. Atqui appareat repudiare ad nam, et ius alii incorrupte. Alii nullam libris his ei, meis aeterno at eum. Ne aeque tincidunt duo. In audire malorum mel, tamquam efficiantur has te.\n    <p>\n\nQui utamur tacimates quaestio ad, quod graece omnium ius ut. Pri ut vero debitis interpretaris, qui cu mentitum adipiscing disputationi. Voluptatum mediocritatem quo ut. Fabulas dolorem ei has, quem molestie persequeris et sit.\n    <p>\n\nEst in vivendum comprehensam conclusionemque, alia cetero iriure no usu, te cibo deterruisset pro. Ludus epicurei quo id, ex cum iudicabit intellegebat. Ex modo deseruisse quo, mel noster menandri sententiae ea, duo et tritani malorum recteque. Nullam suscipit partiendo nec id, indoctum vulputate per ex. Et has enim habemus tibique. Cu latine electram cum, ridens propriae intellegat eu mea.\n    <p>\n\nDuo at aliquid mnesarchum, nec ne impetus hendrerit. Ius id aeterno debitis atomorum, et sed feugait voluptua, brute tibique no vix. Eos modo esse ex, ei omittam imperdiet pro. Vel assum albucius incorrupte no. Vim viris prompta repudiare ne, vel ut viderer scripserit, dicant appetere argumentum mel ea. Eripuit feugait tincidunt pri ne, cu facilisi molestiae usu.\n    <p>\n\nSolet propriae duo in, ne suas molestiae reprehendunt nam. Assum nobis id est, eam vituperata definitiones ex. Te quem admodum voluptua eos, ex affert voluptatibus ius, ad paulo oblique has. Ea quodsi disputando sit, vel ex adhuc simul, quot graeci constituam an eos. Vidit explicari forensibus eu sit, ei mel meliore prodesset. Clita ubique eu sit, errem voluptatibus usu ut, libris nominavi ei mei. Est prima disputando no, te liber possit laoreet vel, pri ut tota consul populo.\n    <p>\n\nEu everti nominati usu. No sea dicunt suscipit intellegebat, ea eum movet putent maiorum. Mei admodum periculis at, inani essent his eu. Cum cu altera dictas, sit ei novum appetere. Ne viris melius eos, eu illud velit decore vix, eos recteque disputationi et.\n    <p>\n\nMea tritani commune id, habeo audiam at per. Vim no duis aliquip deleniti. Iuvaret menandri definiebas ne est. Te platonem adolescens duo, mentitum recteque referrentur est ne, pri viris aeterno accusata ea. Erat aeque ancillae mei et, eu qui dicit latine probatus, eum in sint docendi alienum.\n    <p>\n\nEx dicit malorum maiestatis quo, corpora scriptorem ea vel. Per choro eripuit repudiare cu, eum summo elitr postulant ex. Per ut veri maiestatis, eruditi propriae contentiones ei est, pri in option eleifend. Duo hinc temporibus ut, fugit dolor pri an. Exerci postea volumus his ex.\n    <p>\n\nVis decore mandamus interpretaris ad, ferri mandamus consequuntur nec id. Habeo solet voluptatibus nec an. Dico vocibus has at, pro possim nonumes forensibus ut. Ubique docendi neglegentur an eum, omnium commodo eu his. Eam eligendi dissentiunt at, ne eam commodo interesset.\n    <p>\n\nEt vocibus repudiandae eum. Id eripuit incorrupte dissentiet cum, cu has tractatos intellegat scribentur. Probo ipsum ea vim, ei eos eros utamur, sea eu dolore populo praesent. Vis magna vituperata et, vide dictas labores vis cu.\n    <p>\n\nSummo tractatos eu has, et his ipsum erant explicari. Ne vim causae facilisis laboramus, pro an soleat semper consectetuer, posse dicant usu cu. Populo oporteat ut vix, nam simul offendit gloriatur at. Delicata salutandi facilisis no mel, ius lorem nusquam ea. Et mea simul labores, in persius debitis cum.\n    <p>\n\nEum et cibo iuvaret nostrum. Cu nec altera definiebas. Mei quod novum movet an, mel ad meis graece. Iriure graecis nominavi id vel. Qui falli everti cotidieque cu, zril evertitur quo no. Sed tollit invenire id. Nisl meliore tacimates cu vix, hinc consequat nec ex, usu lorem latine an.\n    <p>\n\nNam splendide consectetuer no, laudem perfecto eum at. His pericula vulputate ei, commune intellegebat at mei. Ad tation fierent liberavisse mel, ut his denique accommodare contentiones, sea at consequat sententiae. Alia insolens vituperata ex nec, quo virtute delicatissimi ex, saperet accusata ut nec. Quis ancillae eu sed. Sea eu prompta verterem expetendis, et nam etiam vivendo disputationi, no has soleat eirmod.\n    <p>\n\nFastidii efficiendi no vis, autem aeterno malorum an quo. Per et meis necessitatibus, ex eam option bonorum dissentiet. Usu ei nobis partem constituto, sensibus mediocrem in est. Eu illum efficiantur his. Ex tota erant aperiri vis, altera nominati an sea, sed et tota nostro.\n    <p>\n\nId utinam nullam voluptaria cum, meis novum doming no eum, mei ex nusquam eligendi offendit. Eu sit movet praesent persequeris, dolores lobortis ullamcorper eu vel, ea vis possit feugiat. Quo ut dictas suscipit contentiones, an quis quodsi sanctus qui. Duis iudicabit an est, te quot nonumy putant mei. Quo insolens interpretaris et, per ex illud albucius mentitum.\n    <p>\n\nEu labores invidunt eloquentiam vis. Usu vitae fastidii expetendis id. Modus soleat prompta eos ad, ea mea dolore ubique definitiones, pri no lorem audire. Vivendo lucilius pro ut, at sumo quidam legimus cum. Mentitum incorrupte ex vis.\n  </material-content>\n\n</div>\n",
          "componentId": "material.components.content",
          "componentName": "Content",
          "basePath": "index.html",
          "type": "demo",
          "id": "demo1",
          "name": "Content Basic Usage",
          "fileName": "index",
          "relativePath": "index.html/src/components/content/demo1/index.html",
          "js": [
            {
              "template": "demo/template.file",
              "outputPath": "components/material.components.content/demo1/script.js",
              "fileType": "js",
              "file": "src/components/content/demo1/script.js",
              "content": "\nangular.module('app', ['ngMaterial'])\n\n.controller('AppCtrl', function($scope) {\n\n})\n",
              "componentId": "material.components.content",
              "componentName": "Content",
              "basePath": "script.js",
              "type": "demo",
              "id": "demo1",
              "name": "Content Basic Usage",
              "fileName": "script",
              "relativePath": "script.js/src/components/content/demo1/script.js",
              "renderedContent": "\nangular.module('app', ['ngMaterial'])\n\n.controller('AppCtrl', function($scope) {\n\n})\n\n"
            }
          ],
          "css": [],
          "renderedContent": "<!doctype html>\n<head>\n  <meta name=\"viewport\" content=\"initial-scale=1, maximum-scale=1\" />\n  <link rel=\"stylesheet\" href=\"../../../demo.css\">\n  <script src=\"//ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js\"></script>\n  <script src=\"//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular.min.js\"></script>\n  <script src=\"//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular-animate.min.js\"></script>\n  <script src=\"//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular-route.min.js\"></script>\n  <script src=\"../../../docs.js\"></script>\n  <script src=\"script.js\"></script>\n  \n  \n</head>\n<body>\n\n<div ng-app=\"app\" ng-controller=\"AppCtrl\">\n  <style>\n    material-content {\n      top: 64px;\n    }\n  </style>\n\n  <material-toolbar class=\"material-theme-dark\">\n    <div class=\"material-toolbar-tools\">\n      <span class=\"material-flex\">Toolbar: dark-theme</span>\n    </div>\n  </material-toolbar>\n\n  <material-content>\n    Lorem ipsum dolor sit amet, ne quod novum mei. Sea omnium invenire mediocrem at, in lobortis conclusionemque nam. Ne deleniti appetere reprimique pro, inani labitur disputationi te sed. At vix sale omnesque, id pro labitur reformidans accommodare, cum labores honestatis eu. Nec quem lucilius in, eam praesent reformidans no. Sed laudem aliquam ne.\n\n    <p>\nFacete delenit argumentum cum at. Pro rebum nostrum contentiones ad. Mel exerci tritani maiorum at, mea te audire phaedrum, mel et nibh aliquam. Malis causae equidem vel eu. Noster melius vis ea, duis alterum oporteat ea sea. Per cu vide munere fierent.\n\n    <p>\nAd sea dolor accusata consequuntur. Sit facete convenire reprehendunt et. Usu cu nonumy dissentiet, mei choro omnes fuisset ad. Te qui docendi accusam efficiantur, doming noster prodesset eam ei. In vel posse movet, ut convenire referrentur eum, ceteros singulis intellegam eu sit.\n    <p>\n\nSit saepe quaestio reprimique id, duo no congue nominati, cum id nobis facilisi. No est laoreet dissentias, idque consectetuer eam id. Clita possim assueverit cu his, solum virtute recteque et cum. Vel cu luptatum signiferumque, mel eu brute nostro senserit. Blandit euripidis consequat ex mei, atqui torquatos id cum, meliore luptatum ut usu. Cu zril perpetua gubergren pri. Accusamus rationibus instructior ei pro, eu nullam principes qui, reque justo omnes et quo.\n    <p>\n\nSint unum eam id. At sit fastidii theophrastus, mutat senserit repudiare et has. Atqui appareat repudiare ad nam, et ius alii incorrupte. Alii nullam libris his ei, meis aeterno at eum. Ne aeque tincidunt duo. In audire malorum mel, tamquam efficiantur has te.\n    <p>\n\nQui utamur tacimates quaestio ad, quod graece omnium ius ut. Pri ut vero debitis interpretaris, qui cu mentitum adipiscing disputationi. Voluptatum mediocritatem quo ut. Fabulas dolorem ei has, quem molestie persequeris et sit.\n    <p>\n\nEst in vivendum comprehensam conclusionemque, alia cetero iriure no usu, te cibo deterruisset pro. Ludus epicurei quo id, ex cum iudicabit intellegebat. Ex modo deseruisse quo, mel noster menandri sententiae ea, duo et tritani malorum recteque. Nullam suscipit partiendo nec id, indoctum vulputate per ex. Et has enim habemus tibique. Cu latine electram cum, ridens propriae intellegat eu mea.\n    <p>\n\nDuo at aliquid mnesarchum, nec ne impetus hendrerit. Ius id aeterno debitis atomorum, et sed feugait voluptua, brute tibique no vix. Eos modo esse ex, ei omittam imperdiet pro. Vel assum albucius incorrupte no. Vim viris prompta repudiare ne, vel ut viderer scripserit, dicant appetere argumentum mel ea. Eripuit feugait tincidunt pri ne, cu facilisi molestiae usu.\n    <p>\n\nSolet propriae duo in, ne suas molestiae reprehendunt nam. Assum nobis id est, eam vituperata definitiones ex. Te quem admodum voluptua eos, ex affert voluptatibus ius, ad paulo oblique has. Ea quodsi disputando sit, vel ex adhuc simul, quot graeci constituam an eos. Vidit explicari forensibus eu sit, ei mel meliore prodesset. Clita ubique eu sit, errem voluptatibus usu ut, libris nominavi ei mei. Est prima disputando no, te liber possit laoreet vel, pri ut tota consul populo.\n    <p>\n\nEu everti nominati usu. No sea dicunt suscipit intellegebat, ea eum movet putent maiorum. Mei admodum periculis at, inani essent his eu. Cum cu altera dictas, sit ei novum appetere. Ne viris melius eos, eu illud velit decore vix, eos recteque disputationi et.\n    <p>\n\nMea tritani commune id, habeo audiam at per. Vim no duis aliquip deleniti. Iuvaret menandri definiebas ne est. Te platonem adolescens duo, mentitum recteque referrentur est ne, pri viris aeterno accusata ea. Erat aeque ancillae mei et, eu qui dicit latine probatus, eum in sint docendi alienum.\n    <p>\n\nEx dicit malorum maiestatis quo, corpora scriptorem ea vel. Per choro eripuit repudiare cu, eum summo elitr postulant ex. Per ut veri maiestatis, eruditi propriae contentiones ei est, pri in option eleifend. Duo hinc temporibus ut, fugit dolor pri an. Exerci postea volumus his ex.\n    <p>\n\nVis decore mandamus interpretaris ad, ferri mandamus consequuntur nec id. Habeo solet voluptatibus nec an. Dico vocibus has at, pro possim nonumes forensibus ut. Ubique docendi neglegentur an eum, omnium commodo eu his. Eam eligendi dissentiunt at, ne eam commodo interesset.\n    <p>\n\nEt vocibus repudiandae eum. Id eripuit incorrupte dissentiet cum, cu has tractatos intellegat scribentur. Probo ipsum ea vim, ei eos eros utamur, sea eu dolore populo praesent. Vis magna vituperata et, vide dictas labores vis cu.\n    <p>\n\nSummo tractatos eu has, et his ipsum erant explicari. Ne vim causae facilisis laboramus, pro an soleat semper consectetuer, posse dicant usu cu. Populo oporteat ut vix, nam simul offendit gloriatur at. Delicata salutandi facilisis no mel, ius lorem nusquam ea. Et mea simul labores, in persius debitis cum.\n    <p>\n\nEum et cibo iuvaret nostrum. Cu nec altera definiebas. Mei quod novum movet an, mel ad meis graece. Iriure graecis nominavi id vel. Qui falli everti cotidieque cu, zril evertitur quo no. Sed tollit invenire id. Nisl meliore tacimates cu vix, hinc consequat nec ex, usu lorem latine an.\n    <p>\n\nNam splendide consectetuer no, laudem perfecto eum at. His pericula vulputate ei, commune intellegebat at mei. Ad tation fierent liberavisse mel, ut his denique accommodare contentiones, sea at consequat sententiae. Alia insolens vituperata ex nec, quo virtute delicatissimi ex, saperet accusata ut nec. Quis ancillae eu sed. Sea eu prompta verterem expetendis, et nam etiam vivendo disputationi, no has soleat eirmod.\n    <p>\n\nFastidii efficiendi no vis, autem aeterno malorum an quo. Per et meis necessitatibus, ex eam option bonorum dissentiet. Usu ei nobis partem constituto, sensibus mediocrem in est. Eu illum efficiantur his. Ex tota erant aperiri vis, altera nominati an sea, sed et tota nostro.\n    <p>\n\nId utinam nullam voluptaria cum, meis novum doming no eum, mei ex nusquam eligendi offendit. Eu sit movet praesent persequeris, dolores lobortis ullamcorper eu vel, ea vis possit feugiat. Quo ut dictas suscipit contentiones, an quis quodsi sanctus qui. Duis iudicabit an est, te quot nonumy putant mei. Quo insolens interpretaris et, per ex illud albucius mentitum.\n    <p>\n\nEu labores invidunt eloquentiam vis. Usu vitae fastidii expetendis id. Modus soleat prompta eos ad, ea mea dolore ubique definitiones, pri no lorem audire. Vivendo lucilius pro ut, at sumo quidam legimus cum. Mentitum incorrupte ex vis.\n  </material-content>\n\n</div>\n\n</body>\n</html>\n"
        }
      }
    },
    "template": "component.template.html",
    "outputPath": "components/material.components.content/index.html",
    "repositoryUrl": "https://github.com/angular/material/tree/master/src/components/content",
    "renderedContent": "<material-tabs class=\"demo-tabs\">\n  <material-tab ng-repeat=\"(_,demo) in currentComponent.demos\"\n           active=\"currentComponent.$selectedDemo === demo\"\n           ng-click=\"currentComponent.$selectedDemo = demo\" \n           label=\"{{demo.name}}\">\n  </material-tab>\n</material-tabs>\n<iframe class=\"demo\"\n        name=\"{{demo.id}}\"\n        ng-repeat=\"demo in currentComponent.demos\" \n        ng-show=\"currentComponent.$selectedDemo === demo\"\n        ng-src=\"{{demo.indexFile.outputPath}}\">\n</iframe>\n\n"
  },
  {
    "id": "material.components.dialog",
    "name": "Dialog",
    "demos": {
      "demo1": {
        "name": "Dialog Basic Usage",
        "id": "demo1",
        "files": [
          {
            "template": "demo/template.file",
            "outputPath": "components/material.components.dialog/demo1/my-dialog.html",
            "fileType": "html",
            "file": "src/components/dialog/demo1/my-dialog.html",
            "content": "<material-dialog>\n  <div class=\"dialog-content\">\n    <p>A banana is an edible fruit produced by several kinds of large herbaceous flowering plants in the genus Musa. (In some countries, bananas used for cooking may be called plantains.) The fruit is variable in size, color and firmness, but is usually elongated and curved, with soft flesh rich in starch covered with a rind which may be green, yellow, red, purple, or brown when ripe. The fruits grow in clusters hanging from the top of the plant. Almost all modern edible parthenocarpic (seedless) bananas come from two wild species - acuminata and Musa balbisiana. The scientific names of most cultivated bananas are Musa acuminata + Musa balbisiana, and Musa + paradisiaca for the hybrid Musa acuminata balbisiana, depending on their genomic constitution. The old scientific name Musa sapientum is no longer used.\n\n      <p>Musa species are native to tropical Indomalaya and Australia, and are likely to have been first domesticated in Papua New Guinea. They are grown in at least 107 countries, primarily for their fruit, and to a lesser extent to make fiber, banana wine and banana beer and as ornamental plants.</p>\n  </div>\n  <div class=\"dialog-actions\">\n    <button class=\"material-button\" style=\"float:right;\" ng-click=\"close()\">Okay</button>\n  </div>\n</material-dialog>\n",
            "componentId": "material.components.dialog",
            "componentName": "Dialog",
            "basePath": "my-dialog.html",
            "type": "demo",
            "id": "demo1",
            "name": "Dialog Basic Usage",
            "fileName": "my-dialog",
            "relativePath": "my-dialog.html/src/components/dialog/demo1/my-dialog.html",
            "renderedContent": "<material-dialog>\n  <div class=\"dialog-content\">\n    <p>A banana is an edible fruit produced by several kinds of large herbaceous flowering plants in the genus Musa. (In some countries, bananas used for cooking may be called plantains.) The fruit is variable in size, color and firmness, but is usually elongated and curved, with soft flesh rich in starch covered with a rind which may be green, yellow, red, purple, or brown when ripe. The fruits grow in clusters hanging from the top of the plant. Almost all modern edible parthenocarpic (seedless) bananas come from two wild species - acuminata and Musa balbisiana. The scientific names of most cultivated bananas are Musa acuminata + Musa balbisiana, and Musa + paradisiaca for the hybrid Musa acuminata balbisiana, depending on their genomic constitution. The old scientific name Musa sapientum is no longer used.\n\n      <p>Musa species are native to tropical Indomalaya and Australia, and are likely to have been first domesticated in Papua New Guinea. They are grown in at least 107 countries, primarily for their fruit, and to a lesser extent to make fiber, banana wine and banana beer and as ornamental plants.</p>\n  </div>\n  <div class=\"dialog-actions\">\n    <button class=\"material-button\" style=\"float:right;\" ng-click=\"close()\">Okay</button>\n  </div>\n</material-dialog>\n\n"
          },
          {
            "template": "demo/template.file",
            "outputPath": "components/material.components.dialog/demo1/script.js",
            "fileType": "js",
            "file": "src/components/dialog/demo1/script.js",
            "content": "angular.module('app', ['ngMaterial'])\n\n.controller('AppCtrl', function($scope, $materialDialog) {\n\n  $scope.dialog = function(e) {\n    $materialDialog({\n      templateUrl: 'my-dialog.html',\n      targetEvent: e,\n      controller: ['$scope', '$hideDialog', function($scope, $hideDialog) {\n        $scope.close = function() {\n          $hideDialog();\n        };\n      }]\n    });\n  };\n\n});\n",
            "componentId": "material.components.dialog",
            "componentName": "Dialog",
            "basePath": "script.js",
            "type": "demo",
            "id": "demo1",
            "name": "Dialog Basic Usage",
            "fileName": "script",
            "relativePath": "script.js/src/components/dialog/demo1/script.js",
            "renderedContent": "angular.module('app', ['ngMaterial'])\n\n.controller('AppCtrl', function($scope, $materialDialog) {\n\n  $scope.dialog = function(e) {\n    $materialDialog({\n      templateUrl: 'my-dialog.html',\n      targetEvent: e,\n      controller: ['$scope', '$hideDialog', function($scope, $hideDialog) {\n        $scope.close = function() {\n          $hideDialog();\n        };\n      }]\n    });\n  };\n\n});\n\n"
          },
          {
            "template": "demo/template.file",
            "outputPath": "components/material.components.dialog/demo1/style.css",
            "fileType": "css",
            "file": "src/components/dialog/demo1/style.css",
            "content": ".full {\n  width: 100%;\n  height: 100%;\n}\n",
            "componentId": "material.components.dialog",
            "componentName": "Dialog",
            "basePath": "style.css",
            "type": "demo",
            "id": "demo1",
            "name": "Dialog Basic Usage",
            "fileName": "style",
            "relativePath": "style.css/src/components/dialog/demo1/style.css",
            "renderedContent": ".full {\n  width: 100%;\n  height: 100%;\n}\n\n"
          }
        ],
        "indexFile": {
          "template": "demo/template.index.html",
          "outputPath": "components/material.components.dialog/demo1/index.html",
          "fileType": "html",
          "file": "src/components/dialog/demo1/index.html",
          "content": "<div ng-app=\"app\" ng-controller=\"AppCtrl\" class=\"inset full\">\n  <button class=\"material-button material-button-colored\" ng-click=\"dialog($event)\">\n    Open a Dialog\n  </button>\n</div>\n",
          "componentId": "material.components.dialog",
          "componentName": "Dialog",
          "basePath": "index.html",
          "type": "demo",
          "id": "demo1",
          "name": "Dialog Basic Usage",
          "fileName": "index",
          "relativePath": "index.html/src/components/dialog/demo1/index.html",
          "js": [
            {
              "template": "demo/template.file",
              "outputPath": "components/material.components.dialog/demo1/script.js",
              "fileType": "js",
              "file": "src/components/dialog/demo1/script.js",
              "content": "angular.module('app', ['ngMaterial'])\n\n.controller('AppCtrl', function($scope, $materialDialog) {\n\n  $scope.dialog = function(e) {\n    $materialDialog({\n      templateUrl: 'my-dialog.html',\n      targetEvent: e,\n      controller: ['$scope', '$hideDialog', function($scope, $hideDialog) {\n        $scope.close = function() {\n          $hideDialog();\n        };\n      }]\n    });\n  };\n\n});\n",
              "componentId": "material.components.dialog",
              "componentName": "Dialog",
              "basePath": "script.js",
              "type": "demo",
              "id": "demo1",
              "name": "Dialog Basic Usage",
              "fileName": "script",
              "relativePath": "script.js/src/components/dialog/demo1/script.js",
              "renderedContent": "angular.module('app', ['ngMaterial'])\n\n.controller('AppCtrl', function($scope, $materialDialog) {\n\n  $scope.dialog = function(e) {\n    $materialDialog({\n      templateUrl: 'my-dialog.html',\n      targetEvent: e,\n      controller: ['$scope', '$hideDialog', function($scope, $hideDialog) {\n        $scope.close = function() {\n          $hideDialog();\n        };\n      }]\n    });\n  };\n\n});\n\n"
            }
          ],
          "css": [
            {
              "template": "demo/template.file",
              "outputPath": "components/material.components.dialog/demo1/style.css",
              "fileType": "css",
              "file": "src/components/dialog/demo1/style.css",
              "content": ".full {\n  width: 100%;\n  height: 100%;\n}\n",
              "componentId": "material.components.dialog",
              "componentName": "Dialog",
              "basePath": "style.css",
              "type": "demo",
              "id": "demo1",
              "name": "Dialog Basic Usage",
              "fileName": "style",
              "relativePath": "style.css/src/components/dialog/demo1/style.css",
              "renderedContent": ".full {\n  width: 100%;\n  height: 100%;\n}\n\n"
            }
          ],
          "renderedContent": "<!doctype html>\n<head>\n  <meta name=\"viewport\" content=\"initial-scale=1, maximum-scale=1\" />\n  <link rel=\"stylesheet\" href=\"../../../demo.css\">\n  <script src=\"//ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js\"></script>\n  <script src=\"//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular.min.js\"></script>\n  <script src=\"//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular-animate.min.js\"></script>\n  <script src=\"//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular-route.min.js\"></script>\n  <script src=\"../../../docs.js\"></script>\n  <script src=\"script.js\"></script>\n  \n  <link rel=\"stylesheet\" href=\"style.css\">\n  \n</head>\n<body>\n<div ng-app=\"app\" ng-controller=\"AppCtrl\" class=\"inset full\">\n  <button class=\"material-button material-button-colored\" ng-click=\"dialog($event)\">\n    Open a Dialog\n  </button>\n</div>\n\n</body>\n</html>\n"
        }
      }
    },
    "template": "component.template.html",
    "outputPath": "components/material.components.dialog/index.html",
    "repositoryUrl": "https://github.com/angular/material/tree/master/src/components/dialog",
    "renderedContent": "<material-tabs class=\"demo-tabs\">\n  <material-tab ng-repeat=\"(_,demo) in currentComponent.demos\"\n           active=\"currentComponent.$selectedDemo === demo\"\n           ng-click=\"currentComponent.$selectedDemo = demo\" \n           label=\"{{demo.name}}\">\n  </material-tab>\n</material-tabs>\n<iframe class=\"demo\"\n        name=\"{{demo.id}}\"\n        ng-repeat=\"demo in currentComponent.demos\" \n        ng-show=\"currentComponent.$selectedDemo === demo\"\n        ng-src=\"{{demo.indexFile.outputPath}}\">\n</iframe>\n\n"
  },
  {
    "id": "material.components.form",
    "name": "Form",
    "demos": {
      "demo1": {
        "name": "Form Basic Usage",
        "id": "demo1",
        "files": [
          {
            "template": "demo/template.file",
            "outputPath": "components/material.components.form/demo1/script.js",
            "fileType": "js",
            "file": "src/components/form/demo1/script.js",
            "content": "\nangular.module('app', ['ngMaterial'])\n\n.controller('AppCtrl', function($scope) {\n  $scope.data = {};\n})\n\n.directive('ig', function() {\n  return {\n    restrict: 'E',\n    replace: true,\n    scope: {\n      fid: '@'\n    },\n    template: '<div class=\"material-input-group\">' +\n                '<label for=\"{{fid}}\">Description</label>' +\n                '<input id=\"{{fid}}\" type=\"text\" ng-model=\"data.description\">' +\n              '</div>',\n  }\n});",
            "componentId": "material.components.form",
            "componentName": "Form",
            "basePath": "script.js",
            "type": "demo",
            "id": "demo1",
            "name": "Form Basic Usage",
            "fileName": "script",
            "relativePath": "script.js/src/components/form/demo1/script.js",
            "renderedContent": "\nangular.module('app', ['ngMaterial'])\n\n.controller('AppCtrl', function($scope) {\n  $scope.data = {};\n})\n\n.directive('ig', function() {\n  return {\n    restrict: 'E',\n    replace: true,\n    scope: {\n      fid: '@'\n    },\n    template: '<div class=\"material-input-group\">' +\n                '<label for=\"{{fid}}\">Description</label>' +\n                '<input id=\"{{fid}}\" type=\"text\" ng-model=\"data.description\">' +\n              '</div>',\n  }\n});\n"
          }
        ],
        "indexFile": {
          "template": "demo/template.index.html",
          "outputPath": "components/material.components.form/demo1/index.html",
          "fileType": "html",
          "file": "src/components/form/demo1/index.html",
          "content": "\n<div ng-app=\"app\" ng-controller=\"AppCtrl\">\n  <style>\n    material-content {\n      top: 192px;\n    }\n    .material-toolbar-tools {\n      padding-top: 80px;\n    }\n  </style>\n\n  </style>\n  <material-toolbar class=\"material-theme-dark material-tall\">\n    <div class=\"material-toolbar-tools\">\n      <div class=\"material-flex\">\n        <ig fid=\"t1\" class=\"material-input-group-theme-light material-input-group-inverted\"></ig>\n        <ig fid=\"t2\" class=\"material-input-group-theme-light-blue material-input-group-inverted\"></ig>\n      </div>\n    </div>\n  </material-toolbar>\n\n  <material-content>\n    <form>\n      <ig fid=\"i1\" class=\"material-input-group-theme-light\"></ig>\n      <ig fid=\"i2\" class=\"material-input-group-theme-light-blue\"></ig>\n      <ig fid=\"i3\" class=\"material-input-group-theme-dark\"></ig>\n      <ig fid=\"i4\" class=\"material-input-group-theme-green\"></ig>\n      <ig fid=\"i5\" class=\"material-input-group-theme-yellow\"></ig>\n      <ig fid=\"i6\" class=\"material-input-group-theme-orange\"></ig>\n      <ig fid=\"i7\" class=\"material-input-group-theme-purple\"></ig>\n      <ig fid=\"i8\" class=\"material-input-group-theme-red\"></ig>\n    </form>\n  </material-content>\n\n</div>\n",
          "componentId": "material.components.form",
          "componentName": "Form",
          "basePath": "index.html",
          "type": "demo",
          "id": "demo1",
          "name": "Form Basic Usage",
          "fileName": "index",
          "relativePath": "index.html/src/components/form/demo1/index.html",
          "js": [
            {
              "template": "demo/template.file",
              "outputPath": "components/material.components.form/demo1/script.js",
              "fileType": "js",
              "file": "src/components/form/demo1/script.js",
              "content": "\nangular.module('app', ['ngMaterial'])\n\n.controller('AppCtrl', function($scope) {\n  $scope.data = {};\n})\n\n.directive('ig', function() {\n  return {\n    restrict: 'E',\n    replace: true,\n    scope: {\n      fid: '@'\n    },\n    template: '<div class=\"material-input-group\">' +\n                '<label for=\"{{fid}}\">Description</label>' +\n                '<input id=\"{{fid}}\" type=\"text\" ng-model=\"data.description\">' +\n              '</div>',\n  }\n});",
              "componentId": "material.components.form",
              "componentName": "Form",
              "basePath": "script.js",
              "type": "demo",
              "id": "demo1",
              "name": "Form Basic Usage",
              "fileName": "script",
              "relativePath": "script.js/src/components/form/demo1/script.js",
              "renderedContent": "\nangular.module('app', ['ngMaterial'])\n\n.controller('AppCtrl', function($scope) {\n  $scope.data = {};\n})\n\n.directive('ig', function() {\n  return {\n    restrict: 'E',\n    replace: true,\n    scope: {\n      fid: '@'\n    },\n    template: '<div class=\"material-input-group\">' +\n                '<label for=\"{{fid}}\">Description</label>' +\n                '<input id=\"{{fid}}\" type=\"text\" ng-model=\"data.description\">' +\n              '</div>',\n  }\n});\n"
            }
          ],
          "css": [],
          "renderedContent": "<!doctype html>\n<head>\n  <meta name=\"viewport\" content=\"initial-scale=1, maximum-scale=1\" />\n  <link rel=\"stylesheet\" href=\"../../../demo.css\">\n  <script src=\"//ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js\"></script>\n  <script src=\"//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular.min.js\"></script>\n  <script src=\"//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular-animate.min.js\"></script>\n  <script src=\"//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular-route.min.js\"></script>\n  <script src=\"../../../docs.js\"></script>\n  <script src=\"script.js\"></script>\n  \n  \n</head>\n<body>\n\n<div ng-app=\"app\" ng-controller=\"AppCtrl\">\n  <style>\n    material-content {\n      top: 192px;\n    }\n    .material-toolbar-tools {\n      padding-top: 80px;\n    }\n  </style>\n\n  </style>\n  <material-toolbar class=\"material-theme-dark material-tall\">\n    <div class=\"material-toolbar-tools\">\n      <div class=\"material-flex\">\n        <ig fid=\"t1\" class=\"material-input-group-theme-light material-input-group-inverted\"></ig>\n        <ig fid=\"t2\" class=\"material-input-group-theme-light-blue material-input-group-inverted\"></ig>\n      </div>\n    </div>\n  </material-toolbar>\n\n  <material-content>\n    <form>\n      <ig fid=\"i1\" class=\"material-input-group-theme-light\"></ig>\n      <ig fid=\"i2\" class=\"material-input-group-theme-light-blue\"></ig>\n      <ig fid=\"i3\" class=\"material-input-group-theme-dark\"></ig>\n      <ig fid=\"i4\" class=\"material-input-group-theme-green\"></ig>\n      <ig fid=\"i5\" class=\"material-input-group-theme-yellow\"></ig>\n      <ig fid=\"i6\" class=\"material-input-group-theme-orange\"></ig>\n      <ig fid=\"i7\" class=\"material-input-group-theme-purple\"></ig>\n      <ig fid=\"i8\" class=\"material-input-group-theme-red\"></ig>\n    </form>\n  </material-content>\n\n</div>\n\n</body>\n</html>\n"
        }
      }
    },
    "template": "component.template.html",
    "outputPath": "components/material.components.form/index.html",
    "repositoryUrl": "https://github.com/angular/material/tree/master/src/components/form",
    "renderedContent": "<material-tabs class=\"demo-tabs\">\n  <material-tab ng-repeat=\"(_,demo) in currentComponent.demos\"\n           active=\"currentComponent.$selectedDemo === demo\"\n           ng-click=\"currentComponent.$selectedDemo = demo\" \n           label=\"{{demo.name}}\">\n  </material-tab>\n</material-tabs>\n<iframe class=\"demo\"\n        name=\"{{demo.id}}\"\n        ng-repeat=\"demo in currentComponent.demos\" \n        ng-show=\"currentComponent.$selectedDemo === demo\"\n        ng-src=\"{{demo.indexFile.outputPath}}\">\n</iframe>\n\n"
  },
  {
    "id": "material.components.icon",
    "name": "Icon",
    "demos": {
      "demo1": {
        "name": "Basic Icon Usage",
        "id": "demo1",
        "files": [
          {
            "template": "demo/template.file",
            "outputPath": "components/material.components.icon/demo1/script.js",
            "fileType": "js",
            "file": "src/components/icon/demo1/script.js",
            "content": "angular.module('app', ['ngMaterial'])\n\n.controller('AppCtrl', ['$scope', function($scope) {\n}]);\n",
            "componentId": "material.components.icon",
            "componentName": "Icon",
            "basePath": "script.js",
            "type": "demo",
            "id": "demo1",
            "name": "Basic Icon Usage",
            "fileName": "script",
            "relativePath": "script.js/src/components/icon/demo1/script.js",
            "renderedContent": "angular.module('app', ['ngMaterial'])\n\n.controller('AppCtrl', ['$scope', function($scope) {\n}]);\n\n"
          }
        ],
        "indexFile": {
          "template": "demo/template.index.html",
          "outputPath": "components/material.components.icon/demo1/index.html",
          "fileType": "html",
          "file": "src/components/icon/demo1/index.html",
          "content": "\n\n<div ng-app=\"app\" ng-controller=\"AppCtrl\" class=\"inset\">\n  <material-icon icon=\"/img/icons/ic_access_time_24px.svg\"></material-icon>\n  <material-icon icon=\"/img/icons/ic_arrow_back_24px.svg\"></material-icon>\n  <material-icon icon=\"/img/icons/ic_comment_24px.svg\"></material-icon>\n  <material-icon icon=\"/img/icons/ic_insert_drive_file_24px.svg\"></material-icon>\n  <material-icon icon=\"/img/icons/ic_label_24px.svg\"></material-icon>\n  <material-icon icon=\"/img/icons/ic_menu_24px.svg\"></material-icon>\n  <material-icon icon=\"/img/icons/ic_more_vert_24px.svg\"></material-icon>\n  <material-icon icon=\"/img/icons/ic_people_24px.svg\"></material-icon>\n  <material-icon icon=\"/img/icons/ic_refresh_24px.svg\"></material-icon>\n</div>\n",
          "componentId": "material.components.icon",
          "componentName": "Icon",
          "basePath": "index.html",
          "type": "demo",
          "id": "demo1",
          "name": "Basic Icon Usage",
          "fileName": "index",
          "relativePath": "index.html/src/components/icon/demo1/index.html",
          "js": [
            {
              "template": "demo/template.file",
              "outputPath": "components/material.components.icon/demo1/script.js",
              "fileType": "js",
              "file": "src/components/icon/demo1/script.js",
              "content": "angular.module('app', ['ngMaterial'])\n\n.controller('AppCtrl', ['$scope', function($scope) {\n}]);\n",
              "componentId": "material.components.icon",
              "componentName": "Icon",
              "basePath": "script.js",
              "type": "demo",
              "id": "demo1",
              "name": "Basic Icon Usage",
              "fileName": "script",
              "relativePath": "script.js/src/components/icon/demo1/script.js",
              "renderedContent": "angular.module('app', ['ngMaterial'])\n\n.controller('AppCtrl', ['$scope', function($scope) {\n}]);\n\n"
            }
          ],
          "css": [],
          "renderedContent": "<!doctype html>\n<head>\n  <meta name=\"viewport\" content=\"initial-scale=1, maximum-scale=1\" />\n  <link rel=\"stylesheet\" href=\"../../../demo.css\">\n  <script src=\"//ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js\"></script>\n  <script src=\"//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular.min.js\"></script>\n  <script src=\"//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular-animate.min.js\"></script>\n  <script src=\"//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular-route.min.js\"></script>\n  <script src=\"../../../docs.js\"></script>\n  <script src=\"script.js\"></script>\n  \n  \n</head>\n<body>\n\n\n<div ng-app=\"app\" ng-controller=\"AppCtrl\" class=\"inset\">\n  <material-icon icon=\"/img/icons/ic_access_time_24px.svg\"></material-icon>\n  <material-icon icon=\"/img/icons/ic_arrow_back_24px.svg\"></material-icon>\n  <material-icon icon=\"/img/icons/ic_comment_24px.svg\"></material-icon>\n  <material-icon icon=\"/img/icons/ic_insert_drive_file_24px.svg\"></material-icon>\n  <material-icon icon=\"/img/icons/ic_label_24px.svg\"></material-icon>\n  <material-icon icon=\"/img/icons/ic_menu_24px.svg\"></material-icon>\n  <material-icon icon=\"/img/icons/ic_more_vert_24px.svg\"></material-icon>\n  <material-icon icon=\"/img/icons/ic_people_24px.svg\"></material-icon>\n  <material-icon icon=\"/img/icons/ic_refresh_24px.svg\"></material-icon>\n</div>\n\n</body>\n</html>\n"
        }
      }
    },
    "template": "component.template.html",
    "outputPath": "components/material.components.icon/index.html",
    "repositoryUrl": "https://github.com/angular/material/tree/master/src/components/icon",
    "renderedContent": "<material-tabs class=\"demo-tabs\">\n  <material-tab ng-repeat=\"(_,demo) in currentComponent.demos\"\n           active=\"currentComponent.$selectedDemo === demo\"\n           ng-click=\"currentComponent.$selectedDemo = demo\" \n           label=\"{{demo.name}}\">\n  </material-tab>\n</material-tabs>\n<iframe class=\"demo\"\n        name=\"{{demo.id}}\"\n        ng-repeat=\"demo in currentComponent.demos\" \n        ng-show=\"currentComponent.$selectedDemo === demo\"\n        ng-src=\"{{demo.indexFile.outputPath}}\">\n</iframe>\n\n"
  },
  {
    "id": "material.components.list",
    "name": "Lists",
    "demos": {
      "demo1": {
        "name": "List Basic Usage",
        "id": "demo1",
        "files": [
          {
            "template": "demo/template.file",
            "outputPath": "components/material.components.list/demo1/script.js",
            "fileType": "js",
            "file": "src/components/list/demo1/script.js",
            "content": "\nangular.module('app', ['ngMaterial'])\n\n.controller('AppCtrl', function($scope) {\n\n})\n\n.directive('face', function() {\n  return {\n    restrict: 'E',\n    template: '<img ng-src=\"{{face}}\">',\n    scope: true,\n    link: function($scope, $element, $attr) {\n      $scope.face = 'http://placekitten.com/40/40';\n    }\n  }\n});\n",
            "componentId": "material.components.list",
            "componentName": "Lists",
            "basePath": "script.js",
            "type": "demo",
            "id": "demo1",
            "name": "List Basic Usage",
            "fileName": "script",
            "relativePath": "script.js/src/components/list/demo1/script.js",
            "renderedContent": "\nangular.module('app', ['ngMaterial'])\n\n.controller('AppCtrl', function($scope) {\n\n})\n\n.directive('face', function() {\n  return {\n    restrict: 'E',\n    template: '<img ng-src=\"{{face}}\">',\n    scope: true,\n    link: function($scope, $element, $attr) {\n      $scope.face = 'http://placekitten.com/40/40';\n    }\n  }\n});\n\n"
          },
          {
            "template": "demo/template.file",
            "outputPath": "components/material.components.list/demo1/style.css",
            "fileType": "css",
            "file": "src/components/list/demo1/style.css",
            "content": "\nface img {\n  border-radius: 32px;\n}",
            "componentId": "material.components.list",
            "componentName": "Lists",
            "basePath": "style.css",
            "type": "demo",
            "id": "demo1",
            "name": "List Basic Usage",
            "fileName": "style",
            "relativePath": "style.css/src/components/list/demo1/style.css",
            "renderedContent": "\nface img {\n  border-radius: 32px;\n}\n"
          }
        ],
        "indexFile": {
          "template": "demo/template.index.html",
          "outputPath": "components/material.components.list/demo1/index.html",
          "fileType": "html",
          "file": "src/components/list/demo1/index.html",
          "content": "\n<div ng-app=\"app\" ng-controller=\"AppCtrl\">\n  <material-content>\n\n    <material-list>\n\n      <material-item>\n        <div class=\"material-tile-left\">\n          <face></face>\n        </div>\n        <div class=\"material-tile-content\">\n          <h2>Brunch this weekend?</h2>\n          <h3>Min Li Chan</h3>\n          <p>\n            I'll be in your neighborhood doing errands\n          </p>\n        </div>\n        <div class=\"material-tile-right\">\n          3:08PM\n        </div>\n      </material-item>\n\n      <material-item>\n        <div class=\"material-tile-left\">\n          <face></face>\n        </div>\n        <div class=\"material-tile-content\">\n          <h2>Brunch this weekend?</h2>\n          <h3>Min Li Chan</h3>\n          <p>\n            I'll be in your neighborhood doing errands\n          </p>\n        </div>\n        <div class=\"material-tile-right\">\n          3:08PM\n        </div>\n      </material-item>\n\n      <material-item>\n        <div class=\"material-tile-left\">\n          <face></face>\n        </div>\n        <div class=\"material-tile-content\">\n          <h2>Brunch this weekend?</h2>\n          <h3>Min Li Chan</h3>\n          <p>\n            I'll be in your neighborhood doing errands\n          </p>\n        </div>\n        <div class=\"material-tile-right\">\n          3:08PM\n        </div>\n      </material-item>\n\n      <material-item>\n        <div class=\"material-tile-left\">\n          <face></face>\n        </div>\n        <div class=\"material-tile-content\">\n          <h2>Brunch this weekend?</h2>\n          <h3>Min Li Chan</h3>\n          <p>\n            I'll be in your neighborhood doing errands\n          </p>\n        </div>\n        <div class=\"material-tile-right\">\n          3:08PM\n        </div>\n      </material-item>\n\n    </material-list>\n\n  </material-content>\n</div>\n",
          "componentId": "material.components.list",
          "componentName": "Lists",
          "basePath": "index.html",
          "type": "demo",
          "id": "demo1",
          "name": "List Basic Usage",
          "fileName": "index",
          "relativePath": "index.html/src/components/list/demo1/index.html",
          "js": [
            {
              "template": "demo/template.file",
              "outputPath": "components/material.components.list/demo1/script.js",
              "fileType": "js",
              "file": "src/components/list/demo1/script.js",
              "content": "\nangular.module('app', ['ngMaterial'])\n\n.controller('AppCtrl', function($scope) {\n\n})\n\n.directive('face', function() {\n  return {\n    restrict: 'E',\n    template: '<img ng-src=\"{{face}}\">',\n    scope: true,\n    link: function($scope, $element, $attr) {\n      $scope.face = 'http://placekitten.com/40/40';\n    }\n  }\n});\n",
              "componentId": "material.components.list",
              "componentName": "Lists",
              "basePath": "script.js",
              "type": "demo",
              "id": "demo1",
              "name": "List Basic Usage",
              "fileName": "script",
              "relativePath": "script.js/src/components/list/demo1/script.js",
              "renderedContent": "\nangular.module('app', ['ngMaterial'])\n\n.controller('AppCtrl', function($scope) {\n\n})\n\n.directive('face', function() {\n  return {\n    restrict: 'E',\n    template: '<img ng-src=\"{{face}}\">',\n    scope: true,\n    link: function($scope, $element, $attr) {\n      $scope.face = 'http://placekitten.com/40/40';\n    }\n  }\n});\n\n"
            }
          ],
          "css": [
            {
              "template": "demo/template.file",
              "outputPath": "components/material.components.list/demo1/style.css",
              "fileType": "css",
              "file": "src/components/list/demo1/style.css",
              "content": "\nface img {\n  border-radius: 32px;\n}",
              "componentId": "material.components.list",
              "componentName": "Lists",
              "basePath": "style.css",
              "type": "demo",
              "id": "demo1",
              "name": "List Basic Usage",
              "fileName": "style",
              "relativePath": "style.css/src/components/list/demo1/style.css",
              "renderedContent": "\nface img {\n  border-radius: 32px;\n}\n"
            }
          ],
          "renderedContent": "<!doctype html>\n<head>\n  <meta name=\"viewport\" content=\"initial-scale=1, maximum-scale=1\" />\n  <link rel=\"stylesheet\" href=\"../../../demo.css\">\n  <script src=\"//ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js\"></script>\n  <script src=\"//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular.min.js\"></script>\n  <script src=\"//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular-animate.min.js\"></script>\n  <script src=\"//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular-route.min.js\"></script>\n  <script src=\"../../../docs.js\"></script>\n  <script src=\"script.js\"></script>\n  \n  <link rel=\"stylesheet\" href=\"style.css\">\n  \n</head>\n<body>\n\n<div ng-app=\"app\" ng-controller=\"AppCtrl\">\n  <material-content>\n\n    <material-list>\n\n      <material-item>\n        <div class=\"material-tile-left\">\n          <face></face>\n        </div>\n        <div class=\"material-tile-content\">\n          <h2>Brunch this weekend?</h2>\n          <h3>Min Li Chan</h3>\n          <p>\n            I'll be in your neighborhood doing errands\n          </p>\n        </div>\n        <div class=\"material-tile-right\">\n          3:08PM\n        </div>\n      </material-item>\n\n      <material-item>\n        <div class=\"material-tile-left\">\n          <face></face>\n        </div>\n        <div class=\"material-tile-content\">\n          <h2>Brunch this weekend?</h2>\n          <h3>Min Li Chan</h3>\n          <p>\n            I'll be in your neighborhood doing errands\n          </p>\n        </div>\n        <div class=\"material-tile-right\">\n          3:08PM\n        </div>\n      </material-item>\n\n      <material-item>\n        <div class=\"material-tile-left\">\n          <face></face>\n        </div>\n        <div class=\"material-tile-content\">\n          <h2>Brunch this weekend?</h2>\n          <h3>Min Li Chan</h3>\n          <p>\n            I'll be in your neighborhood doing errands\n          </p>\n        </div>\n        <div class=\"material-tile-right\">\n          3:08PM\n        </div>\n      </material-item>\n\n      <material-item>\n        <div class=\"material-tile-left\">\n          <face></face>\n        </div>\n        <div class=\"material-tile-content\">\n          <h2>Brunch this weekend?</h2>\n          <h3>Min Li Chan</h3>\n          <p>\n            I'll be in your neighborhood doing errands\n          </p>\n        </div>\n        <div class=\"material-tile-right\">\n          3:08PM\n        </div>\n      </material-item>\n\n    </material-list>\n\n  </material-content>\n</div>\n\n</body>\n</html>\n"
        }
      }
    },
    "template": "component.template.html",
    "outputPath": "components/material.components.list/index.html",
    "repositoryUrl": "https://github.com/angular/material/tree/master/src/components/list",
    "renderedContent": "<material-tabs class=\"demo-tabs\">\n  <material-tab ng-repeat=\"(_,demo) in currentComponent.demos\"\n           active=\"currentComponent.$selectedDemo === demo\"\n           ng-click=\"currentComponent.$selectedDemo = demo\" \n           label=\"{{demo.name}}\">\n  </material-tab>\n</material-tabs>\n<iframe class=\"demo\"\n        name=\"{{demo.id}}\"\n        ng-repeat=\"demo in currentComponent.demos\" \n        ng-show=\"currentComponent.$selectedDemo === demo\"\n        ng-src=\"{{demo.indexFile.outputPath}}\">\n</iframe>\n\n"
  },
  {
    "id": "material.components.radioButton",
    "name": "Radio Button",
    "demos": {
      "demo1": {
        "name": "Radio Button Basic Usage",
        "id": "demo1",
        "files": [
          {
            "template": "demo/template.file",
            "outputPath": "components/material.components.radioButton/demo1/script.js",
            "fileType": "js",
            "file": "src/components/radioButton/demo1/script.js",
            "content": "\nangular.module('app', ['ngMaterial'])\n\n.controller('AppCtrl', function($scope) {\n\n  $scope.data = {\n    group2 : '6',\n    group1 : '2'\n  };\n\n  $scope.radioData = [\n    { label: 'Label 4', value: '4' },\n    { label: 'Label 5', value: '5' },\n    { label: 'Label 6', value: '6' }\n  ];\n\n  $scope.addItem = function() {\n    var r = Math.ceil(Math.random() * 1000);\n    $scope.radioData.push({ label: 'Label ' + r, value: r });\n  };\n\n  $scope.removeItem = function() {\n    $scope.radioData.pop();\n  };\n\n});\n",
            "componentId": "material.components.radioButton",
            "componentName": "Radio Button",
            "basePath": "script.js",
            "type": "demo",
            "id": "demo1",
            "name": "Radio Button Basic Usage",
            "fileName": "script",
            "relativePath": "script.js/src/components/radioButton/demo1/script.js",
            "renderedContent": "\nangular.module('app', ['ngMaterial'])\n\n.controller('AppCtrl', function($scope) {\n\n  $scope.data = {\n    group2 : '6',\n    group1 : '2'\n  };\n\n  $scope.radioData = [\n    { label: 'Label 4', value: '4' },\n    { label: 'Label 5', value: '5' },\n    { label: 'Label 6', value: '6' }\n  ];\n\n  $scope.addItem = function() {\n    var r = Math.ceil(Math.random() * 1000);\n    $scope.radioData.push({ label: 'Label ' + r, value: r });\n  };\n\n  $scope.removeItem = function() {\n    $scope.radioData.pop();\n  };\n\n});\n\n"
          },
          {
            "template": "demo/template.file",
            "outputPath": "components/material.components.radioButton/demo1/style.css",
            "fileType": "css",
            "file": "src/components/radioButton/demo1/style.css",
            "content": "\nbody {\n  padding: 20px;\n}\n",
            "componentId": "material.components.radioButton",
            "componentName": "Radio Button",
            "basePath": "style.css",
            "type": "demo",
            "id": "demo1",
            "name": "Radio Button Basic Usage",
            "fileName": "style",
            "relativePath": "style.css/src/components/radioButton/demo1/style.css",
            "renderedContent": "\nbody {\n  padding: 20px;\n}\n\n"
          }
        ],
        "indexFile": {
          "template": "demo/template.index.html",
          "outputPath": "components/material.components.radioButton/demo1/index.html",
          "fileType": "html",
          "file": "src/components/radioButton/demo1/index.html",
          "content": "\n<div ng-app=\"app\" ng-controller=\"AppCtrl\">\n\n  <p>\n    <button class=\"material-button\" ng-click=\"addItem()\">Add</button>\n    <button class=\"material-button\" ng-click=\"removeItem()\">Remove</button>\n  </p>\n\n  <material-radio-group>\n\n    <material-radio-button>\n      <input type=\"radio\" name=\"group2\" value=\"1\" ng-model=\"data.group2\">\n      Label 1\n    </material-radio-button>\n\n    <material-radio-button>\n      <input type=\"radio\" name=\"group2\" value=\"2\" ng-model=\"data.group2\">\n      Label 2\n    </material-radio-button>\n\n    <material-radio-button>\n      <input type=\"radio\" name=\"group2\" value=\"3\" ng-model=\"data.group2\">\n      Label 3\n    </material-radio-button>\n\n  </material-radio-group>\n\n  <p>Group 1 Selected: {{ data.group2 }}</p>\n\n    <material-radio-group>\n\n        <material-radio-button ng-repeat=\"d in radioData\">\n            <input type=\"radio\" ng-value=\"d.value\" ng-model=\"data.group1\">\n            {{ d.label }}\n        </material-radio-button>\n\n    </material-radio-group>\n\n    <p style=\"margin-bottom:50px\">Group 2 Selected: {{ data.group1 }}</p>\n\n\n\n</div>\n",
          "componentId": "material.components.radioButton",
          "componentName": "Radio Button",
          "basePath": "index.html",
          "type": "demo",
          "id": "demo1",
          "name": "Radio Button Basic Usage",
          "fileName": "index",
          "relativePath": "index.html/src/components/radioButton/demo1/index.html",
          "js": [
            {
              "template": "demo/template.file",
              "outputPath": "components/material.components.radioButton/demo1/script.js",
              "fileType": "js",
              "file": "src/components/radioButton/demo1/script.js",
              "content": "\nangular.module('app', ['ngMaterial'])\n\n.controller('AppCtrl', function($scope) {\n\n  $scope.data = {\n    group2 : '6',\n    group1 : '2'\n  };\n\n  $scope.radioData = [\n    { label: 'Label 4', value: '4' },\n    { label: 'Label 5', value: '5' },\n    { label: 'Label 6', value: '6' }\n  ];\n\n  $scope.addItem = function() {\n    var r = Math.ceil(Math.random() * 1000);\n    $scope.radioData.push({ label: 'Label ' + r, value: r });\n  };\n\n  $scope.removeItem = function() {\n    $scope.radioData.pop();\n  };\n\n});\n",
              "componentId": "material.components.radioButton",
              "componentName": "Radio Button",
              "basePath": "script.js",
              "type": "demo",
              "id": "demo1",
              "name": "Radio Button Basic Usage",
              "fileName": "script",
              "relativePath": "script.js/src/components/radioButton/demo1/script.js",
              "renderedContent": "\nangular.module('app', ['ngMaterial'])\n\n.controller('AppCtrl', function($scope) {\n\n  $scope.data = {\n    group2 : '6',\n    group1 : '2'\n  };\n\n  $scope.radioData = [\n    { label: 'Label 4', value: '4' },\n    { label: 'Label 5', value: '5' },\n    { label: 'Label 6', value: '6' }\n  ];\n\n  $scope.addItem = function() {\n    var r = Math.ceil(Math.random() * 1000);\n    $scope.radioData.push({ label: 'Label ' + r, value: r });\n  };\n\n  $scope.removeItem = function() {\n    $scope.radioData.pop();\n  };\n\n});\n\n"
            }
          ],
          "css": [
            {
              "template": "demo/template.file",
              "outputPath": "components/material.components.radioButton/demo1/style.css",
              "fileType": "css",
              "file": "src/components/radioButton/demo1/style.css",
              "content": "\nbody {\n  padding: 20px;\n}\n",
              "componentId": "material.components.radioButton",
              "componentName": "Radio Button",
              "basePath": "style.css",
              "type": "demo",
              "id": "demo1",
              "name": "Radio Button Basic Usage",
              "fileName": "style",
              "relativePath": "style.css/src/components/radioButton/demo1/style.css",
              "renderedContent": "\nbody {\n  padding: 20px;\n}\n\n"
            }
          ],
          "renderedContent": "<!doctype html>\n<head>\n  <meta name=\"viewport\" content=\"initial-scale=1, maximum-scale=1\" />\n  <link rel=\"stylesheet\" href=\"../../../demo.css\">\n  <script src=\"//ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js\"></script>\n  <script src=\"//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular.min.js\"></script>\n  <script src=\"//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular-animate.min.js\"></script>\n  <script src=\"//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular-route.min.js\"></script>\n  <script src=\"../../../docs.js\"></script>\n  <script src=\"script.js\"></script>\n  \n  <link rel=\"stylesheet\" href=\"style.css\">\n  \n</head>\n<body>\n\n<div ng-app=\"app\" ng-controller=\"AppCtrl\">\n\n  <p>\n    <button class=\"material-button\" ng-click=\"addItem()\">Add</button>\n    <button class=\"material-button\" ng-click=\"removeItem()\">Remove</button>\n  </p>\n\n  <material-radio-group>\n\n    <material-radio-button>\n      <input type=\"radio\" name=\"group2\" value=\"1\" ng-model=\"data.group2\">\n      Label 1\n    </material-radio-button>\n\n    <material-radio-button>\n      <input type=\"radio\" name=\"group2\" value=\"2\" ng-model=\"data.group2\">\n      Label 2\n    </material-radio-button>\n\n    <material-radio-button>\n      <input type=\"radio\" name=\"group2\" value=\"3\" ng-model=\"data.group2\">\n      Label 3\n    </material-radio-button>\n\n  </material-radio-group>\n\n  <p>Group 1 Selected: {{ data.group2 }}</p>\n\n    <material-radio-group>\n\n        <material-radio-button ng-repeat=\"d in radioData\">\n            <input type=\"radio\" ng-value=\"d.value\" ng-model=\"data.group1\">\n            {{ d.label }}\n        </material-radio-button>\n\n    </material-radio-group>\n\n    <p style=\"margin-bottom:50px\">Group 2 Selected: {{ data.group1 }}</p>\n\n\n\n</div>\n\n</body>\n</html>\n"
        }
      }
    },
    "template": "component.template.html",
    "outputPath": "components/material.components.radioButton/index.html",
    "repositoryUrl": "https://github.com/angular/material/tree/master/src/components/radioButton",
    "renderedContent": "<material-tabs class=\"demo-tabs\">\n  <material-tab ng-repeat=\"(_,demo) in currentComponent.demos\"\n           active=\"currentComponent.$selectedDemo === demo\"\n           ng-click=\"currentComponent.$selectedDemo = demo\" \n           label=\"{{demo.name}}\">\n  </material-tab>\n</material-tabs>\n<iframe class=\"demo\"\n        name=\"{{demo.id}}\"\n        ng-repeat=\"demo in currentComponent.demos\" \n        ng-show=\"currentComponent.$selectedDemo === demo\"\n        ng-src=\"{{demo.indexFile.outputPath}}\">\n</iframe>\n\n"
  },
  {
    "id": "material.components.scrollHeader",
    "name": "Scroll Header",
    "demos": {
      "demo1": {
        "name": "Scroll Header Basic Usage",
        "id": "demo1",
        "files": [
          {
            "template": "demo/template.file",
            "outputPath": "components/material.components.scrollHeader/demo1/script.js",
            "fileType": "js",
            "file": "src/components/scrollHeader/demo1/script.js",
            "content": "angular.module('app', ['ngMaterial'])\n\n.controller('AppCtrl', function($scope, $timeout, $materialSidenav) {\n  $scope.toggleLeft = function() {\n    $materialSidenav('left').toggle();\n  }\n})\n\n.controller('LeftCtrl', function($scope, $materialSidenav) {\n  $scope.close = function() {\n    $materialSidenav('left').close();\n  }\n})\n\n.controller('ListCtrl', function($scope, $materialSidenav) {\n  $scope.toggleLeft = function() {\n    $materialSidenav('left').toggle();\n  }\n})\n\n.directive('driveItem', function() {\n  return {\n    restrict: 'E',\n    templateUrl: 'drive-item.html'\n  }\n})\n\n.directive('iconFill', function() {\n  return {\n    restrict: 'E',\n    templateUrl: 'icon.html'\n  }\n})\n",
            "componentId": "material.components.scrollHeader",
            "componentName": "Scroll Header",
            "basePath": "script.js",
            "type": "demo",
            "id": "demo1",
            "name": "Scroll Header Basic Usage",
            "fileName": "script",
            "relativePath": "script.js/src/components/scrollHeader/demo1/script.js",
            "renderedContent": "angular.module('app', ['ngMaterial'])\n\n.controller('AppCtrl', function($scope, $timeout, $materialSidenav) {\n  $scope.toggleLeft = function() {\n    $materialSidenav('left').toggle();\n  }\n})\n\n.controller('LeftCtrl', function($scope, $materialSidenav) {\n  $scope.close = function() {\n    $materialSidenav('left').close();\n  }\n})\n\n.controller('ListCtrl', function($scope, $materialSidenav) {\n  $scope.toggleLeft = function() {\n    $materialSidenav('left').toggle();\n  }\n})\n\n.directive('driveItem', function() {\n  return {\n    restrict: 'E',\n    templateUrl: 'drive-item.html'\n  }\n})\n\n.directive('iconFill', function() {\n  return {\n    restrict: 'E',\n    templateUrl: 'icon.html'\n  }\n})\n\n"
          }
        ],
        "indexFile": {
          "template": "demo/template.index.html",
          "outputPath": "components/material.components.scrollHeader/demo1/index.html",
          "fileType": "html",
          "file": "src/components/scrollHeader/demo1/index.html",
          "content": "\n<div ng-app=\"app\" ng-controller=\"AppCtrl\">\n  <style>\n    .circle {\n      width: 40px;\n      height: 40px;\n      background-color: #555;\n      border-radius: 40px;\n    }\n    #header-bar {\n      background-size: cover;\n      background-image: url('/img/bg9.jpg');\n    }\n    material-content {\n      padding-top: 138px;\n    }\n  </style>\n  <material-toolbar id=\"header-bar\" class=\"material-theme-light-blue material-medium-tall\" scroll-header condensed-height=\"60\">\n    <div class=\"material-toolbar-tools material-toolbar-tools-top\">\n      <span class=\"material-flex\"></span>\n    </div>\n    <div class=\"material-toolbar-tools material-toolbar-tools-bottom\">\n      <span class=\"material-flex material-indent\">My Drive</span>\n    </div>\n\n    <button class=\"material-button material-button-fab material-button-fab-bottom-right material-theme-red\">\n      <material-icon icon=\"/img/icons/ic_photo_24px.svg\"></material-icon>\n    </button>\n  </material-toolbar>\n\n  <material-content>\n    <material-list ng-controller=\"ListCtrl\">\n      <drive-item></drive-item>\n      <drive-item></drive-item>\n      <drive-item></drive-item>\n      <drive-item></drive-item>\n      <drive-item></drive-item>\n      <drive-item></drive-item>\n      <drive-item></drive-item>\n      <drive-item></drive-item>\n      <drive-item></drive-item>\n      <drive-item></drive-item>\n      <drive-item></drive-item>\n      <drive-item></drive-item>\n      <drive-item></drive-item>\n      <drive-item></drive-item>\n      <drive-item></drive-item>\n      <drive-item></drive-item>\n      <drive-item></drive-item>\n    </material-list>\n  </material-content>\n\n  <script id=\"icon.html\" type=\"text/ng-template\">\n    <material-icon style=\"width: 24px; height: 24px;\">\n      <svg viewBox=\"0 0 24 24\" style=\"pointer-events: none;\"><g><g><rect fill=\"none\" width=\"24\" height=\"24\"></rect><path d=\"M3,18h18v-2H3V18z M3,13h18v-2H3V13z M3,6v2h18V6H3z\"></path></g></g></svg>\n    </material-icon>\n  </script>\n\n  <script id=\"drive-item.html\" type=\"text/ng-template\">\n    <material-item>\n      <div class=\"material-tile-left\">\n        <div class=\"circle\"></div>\n      </div>\n      <div class=\"material-tile-content\">\n        <h2>Caro's birthday party planning</h2>\n        <p>\n          Jan 31, 2014\n        </p>\n      </div>\n      <div class=\"material-tile-right\">\n        <material-icon style=\"width: 24px; height: 24px;\">\n          <svg viewBox=\"0 0 24 24\" style=\"pointer-events: none; width: 24px; height: 24px; vertical-align: middle;\"><g id=\"camera-alt\"><circle cx=\"12\" cy=\"12\" r=\"3.2\"></circle><path d=\"M9,2L7.2,4H4C2.9,4,2,4.9,2,6v12c0,1.1,0.9,2,2,2h16c1.1,0,2-0.9,2-2V6c0-1.1-0.9-2-2-2h-3.2L15,2H9z M12,17c-2.8,0-5-2.2-5-5s2.2-5,5-5s5,2.2,5,5S14.8,17,12,17z\"></path></g></svg>\n        </material-icon>\n      </div>\n    </material-item>\n  </script>\n</div>\n",
          "componentId": "material.components.scrollHeader",
          "componentName": "Scroll Header",
          "basePath": "index.html",
          "type": "demo",
          "id": "demo1",
          "name": "Scroll Header Basic Usage",
          "fileName": "index",
          "relativePath": "index.html/src/components/scrollHeader/demo1/index.html",
          "js": [
            {
              "template": "demo/template.file",
              "outputPath": "components/material.components.scrollHeader/demo1/script.js",
              "fileType": "js",
              "file": "src/components/scrollHeader/demo1/script.js",
              "content": "angular.module('app', ['ngMaterial'])\n\n.controller('AppCtrl', function($scope, $timeout, $materialSidenav) {\n  $scope.toggleLeft = function() {\n    $materialSidenav('left').toggle();\n  }\n})\n\n.controller('LeftCtrl', function($scope, $materialSidenav) {\n  $scope.close = function() {\n    $materialSidenav('left').close();\n  }\n})\n\n.controller('ListCtrl', function($scope, $materialSidenav) {\n  $scope.toggleLeft = function() {\n    $materialSidenav('left').toggle();\n  }\n})\n\n.directive('driveItem', function() {\n  return {\n    restrict: 'E',\n    templateUrl: 'drive-item.html'\n  }\n})\n\n.directive('iconFill', function() {\n  return {\n    restrict: 'E',\n    templateUrl: 'icon.html'\n  }\n})\n",
              "componentId": "material.components.scrollHeader",
              "componentName": "Scroll Header",
              "basePath": "script.js",
              "type": "demo",
              "id": "demo1",
              "name": "Scroll Header Basic Usage",
              "fileName": "script",
              "relativePath": "script.js/src/components/scrollHeader/demo1/script.js",
              "renderedContent": "angular.module('app', ['ngMaterial'])\n\n.controller('AppCtrl', function($scope, $timeout, $materialSidenav) {\n  $scope.toggleLeft = function() {\n    $materialSidenav('left').toggle();\n  }\n})\n\n.controller('LeftCtrl', function($scope, $materialSidenav) {\n  $scope.close = function() {\n    $materialSidenav('left').close();\n  }\n})\n\n.controller('ListCtrl', function($scope, $materialSidenav) {\n  $scope.toggleLeft = function() {\n    $materialSidenav('left').toggle();\n  }\n})\n\n.directive('driveItem', function() {\n  return {\n    restrict: 'E',\n    templateUrl: 'drive-item.html'\n  }\n})\n\n.directive('iconFill', function() {\n  return {\n    restrict: 'E',\n    templateUrl: 'icon.html'\n  }\n})\n\n"
            }
          ],
          "css": [],
          "renderedContent": "<!doctype html>\n<head>\n  <meta name=\"viewport\" content=\"initial-scale=1, maximum-scale=1\" />\n  <link rel=\"stylesheet\" href=\"../../../demo.css\">\n  <script src=\"//ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js\"></script>\n  <script src=\"//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular.min.js\"></script>\n  <script src=\"//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular-animate.min.js\"></script>\n  <script src=\"//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular-route.min.js\"></script>\n  <script src=\"../../../docs.js\"></script>\n  <script src=\"script.js\"></script>\n  \n  \n</head>\n<body>\n\n<div ng-app=\"app\" ng-controller=\"AppCtrl\">\n  <style>\n    .circle {\n      width: 40px;\n      height: 40px;\n      background-color: #555;\n      border-radius: 40px;\n    }\n    #header-bar {\n      background-size: cover;\n      background-image: url('/img/bg9.jpg');\n    }\n    material-content {\n      padding-top: 138px;\n    }\n  </style>\n  <material-toolbar id=\"header-bar\" class=\"material-theme-light-blue material-medium-tall\" scroll-header condensed-height=\"60\">\n    <div class=\"material-toolbar-tools material-toolbar-tools-top\">\n      <span class=\"material-flex\"></span>\n    </div>\n    <div class=\"material-toolbar-tools material-toolbar-tools-bottom\">\n      <span class=\"material-flex material-indent\">My Drive</span>\n    </div>\n\n    <button class=\"material-button material-button-fab material-button-fab-bottom-right material-theme-red\">\n      <material-icon icon=\"/img/icons/ic_photo_24px.svg\"></material-icon>\n    </button>\n  </material-toolbar>\n\n  <material-content>\n    <material-list ng-controller=\"ListCtrl\">\n      <drive-item></drive-item>\n      <drive-item></drive-item>\n      <drive-item></drive-item>\n      <drive-item></drive-item>\n      <drive-item></drive-item>\n      <drive-item></drive-item>\n      <drive-item></drive-item>\n      <drive-item></drive-item>\n      <drive-item></drive-item>\n      <drive-item></drive-item>\n      <drive-item></drive-item>\n      <drive-item></drive-item>\n      <drive-item></drive-item>\n      <drive-item></drive-item>\n      <drive-item></drive-item>\n      <drive-item></drive-item>\n      <drive-item></drive-item>\n    </material-list>\n  </material-content>\n\n  <script id=\"icon.html\" type=\"text/ng-template\">\n    <material-icon style=\"width: 24px; height: 24px;\">\n      <svg viewBox=\"0 0 24 24\" style=\"pointer-events: none;\"><g><g><rect fill=\"none\" width=\"24\" height=\"24\"></rect><path d=\"M3,18h18v-2H3V18z M3,13h18v-2H3V13z M3,6v2h18V6H3z\"></path></g></g></svg>\n    </material-icon>\n  </script>\n\n  <script id=\"drive-item.html\" type=\"text/ng-template\">\n    <material-item>\n      <div class=\"material-tile-left\">\n        <div class=\"circle\"></div>\n      </div>\n      <div class=\"material-tile-content\">\n        <h2>Caro's birthday party planning</h2>\n        <p>\n          Jan 31, 2014\n        </p>\n      </div>\n      <div class=\"material-tile-right\">\n        <material-icon style=\"width: 24px; height: 24px;\">\n          <svg viewBox=\"0 0 24 24\" style=\"pointer-events: none; width: 24px; height: 24px; vertical-align: middle;\"><g id=\"camera-alt\"><circle cx=\"12\" cy=\"12\" r=\"3.2\"></circle><path d=\"M9,2L7.2,4H4C2.9,4,2,4.9,2,6v12c0,1.1,0.9,2,2,2h16c1.1,0,2-0.9,2-2V6c0-1.1-0.9-2-2-2h-3.2L15,2H9z M12,17c-2.8,0-5-2.2-5-5s2.2-5,5-5s5,2.2,5,5S14.8,17,12,17z\"></path></g></svg>\n        </material-icon>\n      </div>\n    </material-item>\n  </script>\n</div>\n\n</body>\n</html>\n"
        }
      }
    },
    "template": "component.template.html",
    "outputPath": "components/material.components.scrollHeader/index.html",
    "repositoryUrl": "https://github.com/angular/material/tree/master/src/components/scrollHeader",
    "renderedContent": "<material-tabs class=\"demo-tabs\">\n  <material-tab ng-repeat=\"(_,demo) in currentComponent.demos\"\n           active=\"currentComponent.$selectedDemo === demo\"\n           ng-click=\"currentComponent.$selectedDemo = demo\" \n           label=\"{{demo.name}}\">\n  </material-tab>\n</material-tabs>\n<iframe class=\"demo\"\n        name=\"{{demo.id}}\"\n        ng-repeat=\"demo in currentComponent.demos\" \n        ng-show=\"currentComponent.$selectedDemo === demo\"\n        ng-src=\"{{demo.indexFile.outputPath}}\">\n</iframe>\n\n"
  },
  {
    "id": "material.components.sidenav",
    "name": "Side Navigation",
    "demos": {
      "demo1": {
        "name": "Side Navigation Basic Usage",
        "id": "demo1",
        "files": [
          {
            "template": "demo/template.file",
            "outputPath": "components/material.components.sidenav/demo1/script.js",
            "fileType": "js",
            "file": "src/components/sidenav/demo1/script.js",
            "content": "\nangular.module('app', ['ngMaterial'])\n\n.controller('AppCtrl', function($scope, $timeout, $materialSidenav) {\n  var leftNav;\n  $timeout(function() {\n    leftNav = $materialSidenav('left');\n  });\n  var rightNav;\n  $timeout(function() {\n    rightNav = $materialSidenav('right');\n  });\n  $scope.toggleLeft = function() {\n    leftNav.toggle();\n  };\n  $scope.toggleRight = function() {\n    rightNav.toggle();\n  };\n})\n\n.controller('LeftCtrl', function($scope, $timeout, $materialSidenav) {\n  var nav;\n  $timeout(function() {\n    nav = $materialSidenav('left');\n  });\n  $scope.close = function() {\n    nav.close();\n  };\n})\n\n.controller('RightCtrl', function($scope, $timeout, $materialSidenav) {\n  var nav;\n  $timeout(function() {\n    nav = $materialSidenav('right');\n  });\n  $scope.close = function() {\n    nav.close();\n  };\n});",
            "componentId": "material.components.sidenav",
            "componentName": "Side Navigation",
            "basePath": "script.js",
            "type": "demo",
            "id": "demo1",
            "name": "Side Navigation Basic Usage",
            "fileName": "script",
            "relativePath": "script.js/src/components/sidenav/demo1/script.js",
            "renderedContent": "\nangular.module('app', ['ngMaterial'])\n\n.controller('AppCtrl', function($scope, $timeout, $materialSidenav) {\n  var leftNav;\n  $timeout(function() {\n    leftNav = $materialSidenav('left');\n  });\n  var rightNav;\n  $timeout(function() {\n    rightNav = $materialSidenav('right');\n  });\n  $scope.toggleLeft = function() {\n    leftNav.toggle();\n  };\n  $scope.toggleRight = function() {\n    rightNav.toggle();\n  };\n})\n\n.controller('LeftCtrl', function($scope, $timeout, $materialSidenav) {\n  var nav;\n  $timeout(function() {\n    nav = $materialSidenav('left');\n  });\n  $scope.close = function() {\n    nav.close();\n  };\n})\n\n.controller('RightCtrl', function($scope, $timeout, $materialSidenav) {\n  var nav;\n  $timeout(function() {\n    nav = $materialSidenav('right');\n  });\n  $scope.close = function() {\n    nav.close();\n  };\n});\n"
          }
        ],
        "indexFile": {
          "template": "demo/template.index.html",
          "outputPath": "components/material.components.sidenav/demo1/index.html",
          "fileType": "html",
          "file": "src/components/sidenav/demo1/index.html",
          "content": "\n<div ng-app=\"app\" ng-controller=\"AppCtrl\">\n\n  <material-sidenav class=\"material-sidenav-left material-whiteframe-z2\" component-id=\"left\">\n    <div ng-controller=\"LeftCtrl\">\n      <h2>Sidenav left</h2>\n      <button class=\"material-button\" ng-click=\"close()\">Close</button>\n    </div>\n  </material-sidenav>\n\n  <material-sidenav class=\"material-sidenav-right material-whiteframe-z2 material-theme-light\" component-id=\"right\">\n    <div ng-controller=\"RightCtrl\">\n      <h2>Sidenav right</h2>\n      <button class=\"material-button\" ng-click=\"close()\">Close</button>\n    </div>\n  </material-sidenav>\n\n  <button class=\"material-button\" ng-click=\"toggleLeft()\">Toggle left</button>\n\n  <button class=\"material-button\" ng-click=\"toggleRight()\">Toggle right</button>\n\n</div>\n",
          "componentId": "material.components.sidenav",
          "componentName": "Side Navigation",
          "basePath": "index.html",
          "type": "demo",
          "id": "demo1",
          "name": "Side Navigation Basic Usage",
          "fileName": "index",
          "relativePath": "index.html/src/components/sidenav/demo1/index.html",
          "js": [
            {
              "template": "demo/template.file",
              "outputPath": "components/material.components.sidenav/demo1/script.js",
              "fileType": "js",
              "file": "src/components/sidenav/demo1/script.js",
              "content": "\nangular.module('app', ['ngMaterial'])\n\n.controller('AppCtrl', function($scope, $timeout, $materialSidenav) {\n  var leftNav;\n  $timeout(function() {\n    leftNav = $materialSidenav('left');\n  });\n  var rightNav;\n  $timeout(function() {\n    rightNav = $materialSidenav('right');\n  });\n  $scope.toggleLeft = function() {\n    leftNav.toggle();\n  };\n  $scope.toggleRight = function() {\n    rightNav.toggle();\n  };\n})\n\n.controller('LeftCtrl', function($scope, $timeout, $materialSidenav) {\n  var nav;\n  $timeout(function() {\n    nav = $materialSidenav('left');\n  });\n  $scope.close = function() {\n    nav.close();\n  };\n})\n\n.controller('RightCtrl', function($scope, $timeout, $materialSidenav) {\n  var nav;\n  $timeout(function() {\n    nav = $materialSidenav('right');\n  });\n  $scope.close = function() {\n    nav.close();\n  };\n});",
              "componentId": "material.components.sidenav",
              "componentName": "Side Navigation",
              "basePath": "script.js",
              "type": "demo",
              "id": "demo1",
              "name": "Side Navigation Basic Usage",
              "fileName": "script",
              "relativePath": "script.js/src/components/sidenav/demo1/script.js",
              "renderedContent": "\nangular.module('app', ['ngMaterial'])\n\n.controller('AppCtrl', function($scope, $timeout, $materialSidenav) {\n  var leftNav;\n  $timeout(function() {\n    leftNav = $materialSidenav('left');\n  });\n  var rightNav;\n  $timeout(function() {\n    rightNav = $materialSidenav('right');\n  });\n  $scope.toggleLeft = function() {\n    leftNav.toggle();\n  };\n  $scope.toggleRight = function() {\n    rightNav.toggle();\n  };\n})\n\n.controller('LeftCtrl', function($scope, $timeout, $materialSidenav) {\n  var nav;\n  $timeout(function() {\n    nav = $materialSidenav('left');\n  });\n  $scope.close = function() {\n    nav.close();\n  };\n})\n\n.controller('RightCtrl', function($scope, $timeout, $materialSidenav) {\n  var nav;\n  $timeout(function() {\n    nav = $materialSidenav('right');\n  });\n  $scope.close = function() {\n    nav.close();\n  };\n});\n"
            }
          ],
          "css": [],
          "renderedContent": "<!doctype html>\n<head>\n  <meta name=\"viewport\" content=\"initial-scale=1, maximum-scale=1\" />\n  <link rel=\"stylesheet\" href=\"../../../demo.css\">\n  <script src=\"//ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js\"></script>\n  <script src=\"//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular.min.js\"></script>\n  <script src=\"//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular-animate.min.js\"></script>\n  <script src=\"//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular-route.min.js\"></script>\n  <script src=\"../../../docs.js\"></script>\n  <script src=\"script.js\"></script>\n  \n  \n</head>\n<body>\n\n<div ng-app=\"app\" ng-controller=\"AppCtrl\">\n\n  <material-sidenav class=\"material-sidenav-left material-whiteframe-z2\" component-id=\"left\">\n    <div ng-controller=\"LeftCtrl\">\n      <h2>Sidenav left</h2>\n      <button class=\"material-button\" ng-click=\"close()\">Close</button>\n    </div>\n  </material-sidenav>\n\n  <material-sidenav class=\"material-sidenav-right material-whiteframe-z2 material-theme-light\" component-id=\"right\">\n    <div ng-controller=\"RightCtrl\">\n      <h2>Sidenav right</h2>\n      <button class=\"material-button\" ng-click=\"close()\">Close</button>\n    </div>\n  </material-sidenav>\n\n  <button class=\"material-button\" ng-click=\"toggleLeft()\">Toggle left</button>\n\n  <button class=\"material-button\" ng-click=\"toggleRight()\">Toggle right</button>\n\n</div>\n\n</body>\n</html>\n"
        }
      }
    },
    "template": "component.template.html",
    "outputPath": "components/material.components.sidenav/index.html",
    "repositoryUrl": "https://github.com/angular/material/tree/master/src/components/sidenav",
    "renderedContent": "<material-tabs class=\"demo-tabs\">\n  <material-tab ng-repeat=\"(_,demo) in currentComponent.demos\"\n           active=\"currentComponent.$selectedDemo === demo\"\n           ng-click=\"currentComponent.$selectedDemo = demo\" \n           label=\"{{demo.name}}\">\n  </material-tab>\n</material-tabs>\n<iframe class=\"demo\"\n        name=\"{{demo.id}}\"\n        ng-repeat=\"demo in currentComponent.demos\" \n        ng-show=\"currentComponent.$selectedDemo === demo\"\n        ng-src=\"{{demo.indexFile.outputPath}}\">\n</iframe>\n\n"
  },
  {
    "id": "material.components.slider",
    "name": "Slider",
    "demos": {
      "demo1": {
        "name": "Slider Basic Usage",
        "id": "demo1",
        "files": [
          {
            "template": "demo/template.file",
            "outputPath": "components/material.components.slider/demo1/script.js",
            "fileType": "js",
            "file": "src/components/slider/demo1/script.js",
            "content": "\nangular.module('app', ['ngMaterial'])\n\n.controller('AppCtrl', function($scope) {\n\n  $scope.data = {\n    slider1: 0,\n    slider2: 50,\n    slider3: 8,\n  }\n\n});\n",
            "componentId": "material.components.slider",
            "componentName": "Slider",
            "basePath": "script.js",
            "type": "demo",
            "id": "demo1",
            "name": "Slider Basic Usage",
            "fileName": "script",
            "relativePath": "script.js/src/components/slider/demo1/script.js",
            "renderedContent": "\nangular.module('app', ['ngMaterial'])\n\n.controller('AppCtrl', function($scope) {\n\n  $scope.data = {\n    slider1: 0,\n    slider2: 50,\n    slider3: 8,\n  }\n\n});\n\n"
          },
          {
            "template": "demo/template.file",
            "outputPath": "components/material.components.slider/demo1/style.css",
            "fileType": "css",
            "file": "src/components/slider/demo1/style.css",
            "content": "\nbody {\n  padding: 20px;\n}\n",
            "componentId": "material.components.slider",
            "componentName": "Slider",
            "basePath": "style.css",
            "type": "demo",
            "id": "demo1",
            "name": "Slider Basic Usage",
            "fileName": "style",
            "relativePath": "style.css/src/components/slider/demo1/style.css",
            "renderedContent": "\nbody {\n  padding: 20px;\n}\n\n"
          }
        ],
        "indexFile": {
          "template": "demo/template.index.html",
          "outputPath": "components/material.components.slider/demo1/index.html",
          "fileType": "html",
          "file": "src/components/slider/demo1/index.html",
          "content": "\n<div ng-app=\"app\" ng-controller=\"AppCtrl\">\n\n  <material-slider>\n    <input type=\"range\" ng-model=\"data.slider1\">\n  </material-slider>\n\n  <material-slider>\n    <input type=\"range\" ng-model=\"data.slider2\" min=\"33\" max=\"67\">\n  </material-slider>\n\n  <material-slider>\n    <input type=\"range\" ng-model=\"data.slider3\" min=\"-10\" max=\"10\" step=\"2\">\n  </material-slider>\n\n  <p>Slider 1: {{ data.slider1 }}</p>\n  <p>Slider 2: {{ data.slider2 }}</p>\n  <p>Slider 3: {{ data.slider3 }}</p>\n\n</div>\n",
          "componentId": "material.components.slider",
          "componentName": "Slider",
          "basePath": "index.html",
          "type": "demo",
          "id": "demo1",
          "name": "Slider Basic Usage",
          "fileName": "index",
          "relativePath": "index.html/src/components/slider/demo1/index.html",
          "js": [
            {
              "template": "demo/template.file",
              "outputPath": "components/material.components.slider/demo1/script.js",
              "fileType": "js",
              "file": "src/components/slider/demo1/script.js",
              "content": "\nangular.module('app', ['ngMaterial'])\n\n.controller('AppCtrl', function($scope) {\n\n  $scope.data = {\n    slider1: 0,\n    slider2: 50,\n    slider3: 8,\n  }\n\n});\n",
              "componentId": "material.components.slider",
              "componentName": "Slider",
              "basePath": "script.js",
              "type": "demo",
              "id": "demo1",
              "name": "Slider Basic Usage",
              "fileName": "script",
              "relativePath": "script.js/src/components/slider/demo1/script.js",
              "renderedContent": "\nangular.module('app', ['ngMaterial'])\n\n.controller('AppCtrl', function($scope) {\n\n  $scope.data = {\n    slider1: 0,\n    slider2: 50,\n    slider3: 8,\n  }\n\n});\n\n"
            }
          ],
          "css": [
            {
              "template": "demo/template.file",
              "outputPath": "components/material.components.slider/demo1/style.css",
              "fileType": "css",
              "file": "src/components/slider/demo1/style.css",
              "content": "\nbody {\n  padding: 20px;\n}\n",
              "componentId": "material.components.slider",
              "componentName": "Slider",
              "basePath": "style.css",
              "type": "demo",
              "id": "demo1",
              "name": "Slider Basic Usage",
              "fileName": "style",
              "relativePath": "style.css/src/components/slider/demo1/style.css",
              "renderedContent": "\nbody {\n  padding: 20px;\n}\n\n"
            }
          ],
          "renderedContent": "<!doctype html>\n<head>\n  <meta name=\"viewport\" content=\"initial-scale=1, maximum-scale=1\" />\n  <link rel=\"stylesheet\" href=\"../../../demo.css\">\n  <script src=\"//ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js\"></script>\n  <script src=\"//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular.min.js\"></script>\n  <script src=\"//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular-animate.min.js\"></script>\n  <script src=\"//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular-route.min.js\"></script>\n  <script src=\"../../../docs.js\"></script>\n  <script src=\"script.js\"></script>\n  \n  <link rel=\"stylesheet\" href=\"style.css\">\n  \n</head>\n<body>\n\n<div ng-app=\"app\" ng-controller=\"AppCtrl\">\n\n  <material-slider>\n    <input type=\"range\" ng-model=\"data.slider1\">\n  </material-slider>\n\n  <material-slider>\n    <input type=\"range\" ng-model=\"data.slider2\" min=\"33\" max=\"67\">\n  </material-slider>\n\n  <material-slider>\n    <input type=\"range\" ng-model=\"data.slider3\" min=\"-10\" max=\"10\" step=\"2\">\n  </material-slider>\n\n  <p>Slider 1: {{ data.slider1 }}</p>\n  <p>Slider 2: {{ data.slider2 }}</p>\n  <p>Slider 3: {{ data.slider3 }}</p>\n\n</div>\n\n</body>\n</html>\n"
        }
      }
    },
    "template": "component.template.html",
    "outputPath": "components/material.components.slider/index.html",
    "repositoryUrl": "https://github.com/angular/material/tree/master/src/components/slider",
    "renderedContent": "<material-tabs class=\"demo-tabs\">\n  <material-tab ng-repeat=\"(_,demo) in currentComponent.demos\"\n           active=\"currentComponent.$selectedDemo === demo\"\n           ng-click=\"currentComponent.$selectedDemo = demo\" \n           label=\"{{demo.name}}\">\n  </material-tab>\n</material-tabs>\n<iframe class=\"demo\"\n        name=\"{{demo.id}}\"\n        ng-repeat=\"demo in currentComponent.demos\" \n        ng-show=\"currentComponent.$selectedDemo === demo\"\n        ng-src=\"{{demo.indexFile.outputPath}}\">\n</iframe>\n\n"
  },
  {
    "id": "material.components.tabs",
    "name": "Tabs",
    "demos": {
      "demo1": {
        "name": "1",
        "id": "demo1",
        "files": [
          {
            "template": "demo/template.file",
            "outputPath": "components/material.components.tabs/demo1/script.js",
            "fileType": "js",
            "file": "src/components/tabs/demos/demo1/script.js",
            "content": "\nangular.module('app', ['ngMaterial'] )\n.controller('AppCtrl', function( $scope ) {\n    var tabs = [\n      { title: 'Polymer', active: true,  disabled: false, content:\"Polymer practices are great!\" },\n      { title: 'Material', active: false, disabled: true , content:\"Material Design practices are better!\" },\n      { title: 'Angular', active: false, disabled: true , content:\"AngularJS practices are the best!\" },\n      { title: 'NodeJS' , active: false, disabled: false, content:\"NodeJS practices are amazing!\" }\n    ];\n\n    $scope.activeIndex = 1;\n    $scope.tabs = [].concat(tabs);\n\n});\n",
            "componentId": "material.components.tabs",
            "componentName": "Tabs",
            "basePath": "script.js",
            "type": "demo",
            "id": "demo1",
            "name": "1",
            "fileName": "script",
            "relativePath": "script.js/src/components/tabs/demos/demo1/script.js",
            "renderedContent": "\nangular.module('app', ['ngMaterial'] )\n.controller('AppCtrl', function( $scope ) {\n    var tabs = [\n      { title: 'Polymer', active: true,  disabled: false, content:\"Polymer practices are great!\" },\n      { title: 'Material', active: false, disabled: true , content:\"Material Design practices are better!\" },\n      { title: 'Angular', active: false, disabled: true , content:\"AngularJS practices are the best!\" },\n      { title: 'NodeJS' , active: false, disabled: false, content:\"NodeJS practices are amazing!\" }\n    ];\n\n    $scope.activeIndex = 1;\n    $scope.tabs = [].concat(tabs);\n\n});\n\n"
          },
          {
            "template": "demo/template.file",
            "outputPath": "components/material.components.tabs/demo1/style.css",
            "fileType": "css",
            "file": "src/components/tabs/demos/demo1/style.css",
            "content": ".logo {\n    padding: 10px;\n    height: 36px;\n    width: 100%;\n}\n\n.centered {\n    margin-top: -5px;\n    padding-left: 48%\n}\n",
            "componentId": "material.components.tabs",
            "componentName": "Tabs",
            "basePath": "style.css",
            "type": "demo",
            "id": "demo1",
            "name": "1",
            "fileName": "style",
            "relativePath": "style.css/src/components/tabs/demos/demo1/style.css",
            "renderedContent": ".logo {\n    padding: 10px;\n    height: 36px;\n    width: 100%;\n}\n\n.centered {\n    margin-top: -5px;\n    padding-left: 48%\n}\n\n"
          }
        ],
        "indexFile": {
          "template": "demo/template.index.html",
          "outputPath": "components/material.components.tabs/demo1/index.html",
          "fileType": "html",
          "file": "src/components/tabs/demos/demo1/index.html",
          "content": "<link rel=\"stylesheet\" href=\"/css/tab_demos.css\">\n<div ng-app=\"app\" ng-controller=\"AppCtrl\" class=\"sample\">\n\n    <h3>Simple Static Tabs (logo in header)</h3>\n\n    <material-tabs selected=\"activeIndex\">\n        <div class=\"logo\">\n            <div class=\"centered\">\n                <img ng-src=\"/img/angular.png\" style=\"width:30px;height: 30px;\">\n            </div>\n        </div>\n        <material-tab>ITEM ONE</material-tab>\n        <material-tab>ITEM TWO</material-tab>\n        <material-tab>ITEM THREE</material-tab>\n    </material-tabs>\n</div>\n",
          "componentId": "material.components.tabs",
          "componentName": "Tabs",
          "basePath": "index.html",
          "type": "demo",
          "id": "demo1",
          "name": "1",
          "fileName": "index",
          "relativePath": "index.html/src/components/tabs/demos/demo1/index.html",
          "js": [
            {
              "template": "demo/template.file",
              "outputPath": "components/material.components.tabs/demo1/script.js",
              "fileType": "js",
              "file": "src/components/tabs/demos/demo1/script.js",
              "content": "\nangular.module('app', ['ngMaterial'] )\n.controller('AppCtrl', function( $scope ) {\n    var tabs = [\n      { title: 'Polymer', active: true,  disabled: false, content:\"Polymer practices are great!\" },\n      { title: 'Material', active: false, disabled: true , content:\"Material Design practices are better!\" },\n      { title: 'Angular', active: false, disabled: true , content:\"AngularJS practices are the best!\" },\n      { title: 'NodeJS' , active: false, disabled: false, content:\"NodeJS practices are amazing!\" }\n    ];\n\n    $scope.activeIndex = 1;\n    $scope.tabs = [].concat(tabs);\n\n});\n",
              "componentId": "material.components.tabs",
              "componentName": "Tabs",
              "basePath": "script.js",
              "type": "demo",
              "id": "demo1",
              "name": "1",
              "fileName": "script",
              "relativePath": "script.js/src/components/tabs/demos/demo1/script.js",
              "renderedContent": "\nangular.module('app', ['ngMaterial'] )\n.controller('AppCtrl', function( $scope ) {\n    var tabs = [\n      { title: 'Polymer', active: true,  disabled: false, content:\"Polymer practices are great!\" },\n      { title: 'Material', active: false, disabled: true , content:\"Material Design practices are better!\" },\n      { title: 'Angular', active: false, disabled: true , content:\"AngularJS practices are the best!\" },\n      { title: 'NodeJS' , active: false, disabled: false, content:\"NodeJS practices are amazing!\" }\n    ];\n\n    $scope.activeIndex = 1;\n    $scope.tabs = [].concat(tabs);\n\n});\n\n"
            }
          ],
          "css": [
            {
              "template": "demo/template.file",
              "outputPath": "components/material.components.tabs/demo1/style.css",
              "fileType": "css",
              "file": "src/components/tabs/demos/demo1/style.css",
              "content": ".logo {\n    padding: 10px;\n    height: 36px;\n    width: 100%;\n}\n\n.centered {\n    margin-top: -5px;\n    padding-left: 48%\n}\n",
              "componentId": "material.components.tabs",
              "componentName": "Tabs",
              "basePath": "style.css",
              "type": "demo",
              "id": "demo1",
              "name": "1",
              "fileName": "style",
              "relativePath": "style.css/src/components/tabs/demos/demo1/style.css",
              "renderedContent": ".logo {\n    padding: 10px;\n    height: 36px;\n    width: 100%;\n}\n\n.centered {\n    margin-top: -5px;\n    padding-left: 48%\n}\n\n"
            }
          ],
          "renderedContent": "<!doctype html>\n<head>\n  <meta name=\"viewport\" content=\"initial-scale=1, maximum-scale=1\" />\n  <link rel=\"stylesheet\" href=\"../../../demo.css\">\n  <script src=\"//ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js\"></script>\n  <script src=\"//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular.min.js\"></script>\n  <script src=\"//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular-animate.min.js\"></script>\n  <script src=\"//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular-route.min.js\"></script>\n  <script src=\"../../../docs.js\"></script>\n  <script src=\"script.js\"></script>\n  \n  <link rel=\"stylesheet\" href=\"style.css\">\n  \n</head>\n<body>\n<link rel=\"stylesheet\" href=\"/css/tab_demos.css\">\n<div ng-app=\"app\" ng-controller=\"AppCtrl\" class=\"sample\">\n\n    <h3>Simple Static Tabs (logo in header)</h3>\n\n    <material-tabs selected=\"activeIndex\">\n        <div class=\"logo\">\n            <div class=\"centered\">\n                <img ng-src=\"/img/angular.png\" style=\"width:30px;height: 30px;\">\n            </div>\n        </div>\n        <material-tab>ITEM ONE</material-tab>\n        <material-tab>ITEM TWO</material-tab>\n        <material-tab>ITEM THREE</material-tab>\n    </material-tabs>\n</div>\n\n</body>\n</html>\n"
        }
      },
      "demo2": {
        "name": "2",
        "id": "demo2",
        "files": [
          {
            "template": "demo/template.file",
            "outputPath": "components/material.components.tabs/demo2/script.js",
            "fileType": "js",
            "file": "src/components/tabs/demos/demo2/script.js",
            "content": "\nangular.module('app', ['ngMaterial'] )\n  .controller('AppCtrl', function( $scope ) {\n    var tabs = [\n      { title: 'Polymer', active: true,  disabled: false, content:\"Polymer practices are great!\" },\n      { title: 'Material', active: false, disabled: true , content:\"Material Design practices are better!\" },\n      { title: 'Angular', active: false, disabled: true , content:\"AngularJS practices are the best!\" },\n      { title: 'NodeJS' , active: false, disabled: false, content:\"NodeJS practices are amazing!\" }\n    ];\n\n    $scope.activeIndex = 1;\n    $scope.tabs = [].concat(tabs);\n\n  });\n",
            "componentId": "material.components.tabs",
            "componentName": "Tabs",
            "basePath": "script.js",
            "type": "demo",
            "id": "demo2",
            "name": "2",
            "fileName": "script",
            "relativePath": "script.js/src/components/tabs/demos/demo2/script.js",
            "renderedContent": "\nangular.module('app', ['ngMaterial'] )\n  .controller('AppCtrl', function( $scope ) {\n    var tabs = [\n      { title: 'Polymer', active: true,  disabled: false, content:\"Polymer practices are great!\" },\n      { title: 'Material', active: false, disabled: true , content:\"Material Design practices are better!\" },\n      { title: 'Angular', active: false, disabled: true , content:\"AngularJS practices are the best!\" },\n      { title: 'NodeJS' , active: false, disabled: false, content:\"NodeJS practices are amazing!\" }\n    ];\n\n    $scope.activeIndex = 1;\n    $scope.tabs = [].concat(tabs);\n\n  });\n\n"
          }
        ],
        "indexFile": {
          "template": "demo/template.index.html",
          "outputPath": "components/material.components.tabs/demo2/index.html",
          "fileType": "html",
          "file": "src/components/tabs/demos/demo2/index.html",
          "content": "<link rel=\"stylesheet\" href=\"/css/tab_demos.css\">\n<div ng-app=\"app\" ng-controller=\"AppCtrl\" class=\"sample\">\n\n    <h3>Simple Dynamic Tabs (no views)</h3>\n\n    <material-tabs selected=\"activeIndex\">\n        <material-tab ng-repeat=\"tab in tabs\">\n            {{tab.title}}\n        </material-tab>\n    </material-tabs>\n\n</div>\n",
          "componentId": "material.components.tabs",
          "componentName": "Tabs",
          "basePath": "index.html",
          "type": "demo",
          "id": "demo2",
          "name": "2",
          "fileName": "index",
          "relativePath": "index.html/src/components/tabs/demos/demo2/index.html",
          "js": [
            {
              "template": "demo/template.file",
              "outputPath": "components/material.components.tabs/demo2/script.js",
              "fileType": "js",
              "file": "src/components/tabs/demos/demo2/script.js",
              "content": "\nangular.module('app', ['ngMaterial'] )\n  .controller('AppCtrl', function( $scope ) {\n    var tabs = [\n      { title: 'Polymer', active: true,  disabled: false, content:\"Polymer practices are great!\" },\n      { title: 'Material', active: false, disabled: true , content:\"Material Design practices are better!\" },\n      { title: 'Angular', active: false, disabled: true , content:\"AngularJS practices are the best!\" },\n      { title: 'NodeJS' , active: false, disabled: false, content:\"NodeJS practices are amazing!\" }\n    ];\n\n    $scope.activeIndex = 1;\n    $scope.tabs = [].concat(tabs);\n\n  });\n",
              "componentId": "material.components.tabs",
              "componentName": "Tabs",
              "basePath": "script.js",
              "type": "demo",
              "id": "demo2",
              "name": "2",
              "fileName": "script",
              "relativePath": "script.js/src/components/tabs/demos/demo2/script.js",
              "renderedContent": "\nangular.module('app', ['ngMaterial'] )\n  .controller('AppCtrl', function( $scope ) {\n    var tabs = [\n      { title: 'Polymer', active: true,  disabled: false, content:\"Polymer practices are great!\" },\n      { title: 'Material', active: false, disabled: true , content:\"Material Design practices are better!\" },\n      { title: 'Angular', active: false, disabled: true , content:\"AngularJS practices are the best!\" },\n      { title: 'NodeJS' , active: false, disabled: false, content:\"NodeJS practices are amazing!\" }\n    ];\n\n    $scope.activeIndex = 1;\n    $scope.tabs = [].concat(tabs);\n\n  });\n\n"
            }
          ],
          "css": [],
          "renderedContent": "<!doctype html>\n<head>\n  <meta name=\"viewport\" content=\"initial-scale=1, maximum-scale=1\" />\n  <link rel=\"stylesheet\" href=\"../../../demo.css\">\n  <script src=\"//ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js\"></script>\n  <script src=\"//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular.min.js\"></script>\n  <script src=\"//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular-animate.min.js\"></script>\n  <script src=\"//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular-route.min.js\"></script>\n  <script src=\"../../../docs.js\"></script>\n  <script src=\"script.js\"></script>\n  \n  \n</head>\n<body>\n<link rel=\"stylesheet\" href=\"/css/tab_demos.css\">\n<div ng-app=\"app\" ng-controller=\"AppCtrl\" class=\"sample\">\n\n    <h3>Simple Dynamic Tabs (no views)</h3>\n\n    <material-tabs selected=\"activeIndex\">\n        <material-tab ng-repeat=\"tab in tabs\">\n            {{tab.title}}\n        </material-tab>\n    </material-tabs>\n\n</div>\n\n</body>\n</html>\n"
        }
      },
      "demo3": {
        "name": "3",
        "id": "demo3",
        "files": [
          {
            "template": "demo/template.file",
            "outputPath": "components/material.components.tabs/demo3/script.js",
            "fileType": "js",
            "file": "src/components/tabs/demos/demo3/script.js",
            "content": "angular.module('app', ['ngMaterial'])\n  .controller('AppCtrl', function ($scope) {\n    var tabs = [\n      { title: 'Polymer', active: true, disabled: false, content: \"Polymer practices are great!\" },\n      { title: 'Material', active: false, disabled: true, content: \"Material Design practices are better!\" },\n      { title: 'Angular', active: false, disabled: true, content: \"AngularJS practices are the best!\" },\n      { title: 'NodeJS', active: false, disabled: false, content: \"NodeJS practices are amazing!\" }\n    ];\n\n    $scope.which = 0;\n\n  });\n",
            "componentId": "material.components.tabs",
            "componentName": "Tabs",
            "basePath": "script.js",
            "type": "demo",
            "id": "demo3",
            "name": "3",
            "fileName": "script",
            "relativePath": "script.js/src/components/tabs/demos/demo3/script.js",
            "renderedContent": "angular.module('app', ['ngMaterial'])\n  .controller('AppCtrl', function ($scope) {\n    var tabs = [\n      { title: 'Polymer', active: true, disabled: false, content: \"Polymer practices are great!\" },\n      { title: 'Material', active: false, disabled: true, content: \"Material Design practices are better!\" },\n      { title: 'Angular', active: false, disabled: true, content: \"AngularJS practices are the best!\" },\n      { title: 'NodeJS', active: false, disabled: false, content: \"NodeJS practices are amazing!\" }\n    ];\n\n    $scope.which = 0;\n\n  });\n\n"
          }
        ],
        "indexFile": {
          "template": "demo/template.index.html",
          "outputPath": "components/material.components.tabs/demo3/index.html",
          "fileType": "html",
          "file": "src/components/tabs/demos/demo3/index.html",
          "content": "<link rel=\"stylesheet\" href=\"/css/tab_demos.css\">\n<div ng-app=\"app\" ng-controller=\"AppCtrl\" class=\"sample\">\n\n    <h3>Static Tabs internal content: </h3>\n    <p>Tab #1 is active and #2, #5 are disabled > No bar</p>\n\n    <material-tabs selected=\"which\" nobar nostretch class=\"special\">\n\n        <material-tab >\n            <material-tab-label>ITEM A1</material-tab-label>\n            <div class=\"blueArea\">Tab Content #A1</div>\n        </material-tab>\n\n        <material-tab disabled=\"true\" >ITEM B2</material-tab>\n\n        <material-tab >\n            <material-tab-label>\n                <span class=\"redArea\"> ITEM C3</span>\n            </material-tab-label>\n            <div class=\"redArea\">Tab Content #C3</div>\n        </material-tab>\n\n        <material-tab><material-tab-label>Item D4</material-tab-label><div class=\"greenArea\">Tab Content #D4</div></material-tab>\n\n        <material-tab disabled=\"true\" >\n            <material-tab-label>ITEM E5</material-tab-label>\n            <div class=\"greenArea\">Tab Content #E5</div>\n        </material-tab>\n\n    </material-tabs>\n\n</div>\n",
          "componentId": "material.components.tabs",
          "componentName": "Tabs",
          "basePath": "index.html",
          "type": "demo",
          "id": "demo3",
          "name": "3",
          "fileName": "index",
          "relativePath": "index.html/src/components/tabs/demos/demo3/index.html",
          "js": [
            {
              "template": "demo/template.file",
              "outputPath": "components/material.components.tabs/demo3/script.js",
              "fileType": "js",
              "file": "src/components/tabs/demos/demo3/script.js",
              "content": "angular.module('app', ['ngMaterial'])\n  .controller('AppCtrl', function ($scope) {\n    var tabs = [\n      { title: 'Polymer', active: true, disabled: false, content: \"Polymer practices are great!\" },\n      { title: 'Material', active: false, disabled: true, content: \"Material Design practices are better!\" },\n      { title: 'Angular', active: false, disabled: true, content: \"AngularJS practices are the best!\" },\n      { title: 'NodeJS', active: false, disabled: false, content: \"NodeJS practices are amazing!\" }\n    ];\n\n    $scope.which = 0;\n\n  });\n",
              "componentId": "material.components.tabs",
              "componentName": "Tabs",
              "basePath": "script.js",
              "type": "demo",
              "id": "demo3",
              "name": "3",
              "fileName": "script",
              "relativePath": "script.js/src/components/tabs/demos/demo3/script.js",
              "renderedContent": "angular.module('app', ['ngMaterial'])\n  .controller('AppCtrl', function ($scope) {\n    var tabs = [\n      { title: 'Polymer', active: true, disabled: false, content: \"Polymer practices are great!\" },\n      { title: 'Material', active: false, disabled: true, content: \"Material Design practices are better!\" },\n      { title: 'Angular', active: false, disabled: true, content: \"AngularJS practices are the best!\" },\n      { title: 'NodeJS', active: false, disabled: false, content: \"NodeJS practices are amazing!\" }\n    ];\n\n    $scope.which = 0;\n\n  });\n\n"
            }
          ],
          "css": [],
          "renderedContent": "<!doctype html>\n<head>\n  <meta name=\"viewport\" content=\"initial-scale=1, maximum-scale=1\" />\n  <link rel=\"stylesheet\" href=\"../../../demo.css\">\n  <script src=\"//ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js\"></script>\n  <script src=\"//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular.min.js\"></script>\n  <script src=\"//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular-animate.min.js\"></script>\n  <script src=\"//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular-route.min.js\"></script>\n  <script src=\"../../../docs.js\"></script>\n  <script src=\"script.js\"></script>\n  \n  \n</head>\n<body>\n<link rel=\"stylesheet\" href=\"/css/tab_demos.css\">\n<div ng-app=\"app\" ng-controller=\"AppCtrl\" class=\"sample\">\n\n    <h3>Static Tabs internal content: </h3>\n    <p>Tab #1 is active and #2, #5 are disabled > No bar</p>\n\n    <material-tabs selected=\"which\" nobar nostretch class=\"special\">\n\n        <material-tab >\n            <material-tab-label>ITEM A1</material-tab-label>\n            <div class=\"blueArea\">Tab Content #A1</div>\n        </material-tab>\n\n        <material-tab disabled=\"true\" >ITEM B2</material-tab>\n\n        <material-tab >\n            <material-tab-label>\n                <span class=\"redArea\"> ITEM C3</span>\n            </material-tab-label>\n            <div class=\"redArea\">Tab Content #C3</div>\n        </material-tab>\n\n        <material-tab><material-tab-label>Item D4</material-tab-label><div class=\"greenArea\">Tab Content #D4</div></material-tab>\n\n        <material-tab disabled=\"true\" >\n            <material-tab-label>ITEM E5</material-tab-label>\n            <div class=\"greenArea\">Tab Content #E5</div>\n        </material-tab>\n\n    </material-tabs>\n\n</div>\n\n</body>\n</html>\n"
        }
      },
      "demo4": {
        "name": "4",
        "id": "demo4",
        "files": [
          {
            "template": "demo/template.file",
            "outputPath": "components/material.components.tabs/demo4/script.js",
            "fileType": "js",
            "file": "src/components/tabs/demos/demo4/script.js",
            "content": "angular.module('app', ['ngMaterial'])\n  .controller('AppCtrl', function ($scope) {\n    var tabs = [\n      { title: 'Polymer', active: true, disabled: false, content: \"Polymer practices are great!\" },\n      { title: 'Material', active: false, disabled: true, content: \"Material Design practices are better!\" },\n      { title: 'Angular', active: false, disabled: true, content: \"AngularJS practices are the best!\" },\n      { title: 'NodeJS', active: false, disabled: false, content: \"NodeJS practices are amazing!\" }\n    ];\n\n    $scope.tabs = tabs;\n    $scope.predicate = \"title\";\n    $scope.reversed = true;\n    $scope.selectedIndex = 2;\n    $scope.allowDisable = true;\n\n    $scope.onTabSelected = onTabSelected;\n    $scope.announceSelected = announceSelected;\n    $scope.announceDeselected = announceDeselected;\n\n    $scope.addTab = function (title, view) {\n      view = view || title + \" Content View\";\n      tabs.push({ title: title, content: view, active: false, disabled: false});\n    };\n\n    $scope.removeTab = function (tab) {\n      for (var j = 0; j < tabs.length; j++) {\n        if (tab.title == tabs[j].title) {\n          $scope.tabs.splice(j, 1);\n          break;\n        }\n      }\n    }\n\n    $scope.submit = function ($event) {\n      if ($event.which !== 13) return;\n      if ($scope.tTitle != \"\") {\n        $scope.addTab($scope.tTitle, $scope.tContent);\n      }\n    }\n\n    // **********************************************************\n    // Private Methods\n    // **********************************************************\n\n    function onTabSelected(tab) {\n      $scope.selectedIndex = this.$index;\n\n      $scope.announceSelected(tab);\n    }\n\n    function announceDeselected(tab) {\n      $scope.farewell = supplant(\"Goodbye {title}!\", tab);\n    }\n\n    function announceSelected(tab) {\n      $scope.greeting = supplant(\"Hello {title}!\", tab);\n    }\n\n  });\n",
            "componentId": "material.components.tabs",
            "componentName": "Tabs",
            "basePath": "script.js",
            "type": "demo",
            "id": "demo4",
            "name": "4",
            "fileName": "script",
            "relativePath": "script.js/src/components/tabs/demos/demo4/script.js",
            "renderedContent": "angular.module('app', ['ngMaterial'])\n  .controller('AppCtrl', function ($scope) {\n    var tabs = [\n      { title: 'Polymer', active: true, disabled: false, content: \"Polymer practices are great!\" },\n      { title: 'Material', active: false, disabled: true, content: \"Material Design practices are better!\" },\n      { title: 'Angular', active: false, disabled: true, content: \"AngularJS practices are the best!\" },\n      { title: 'NodeJS', active: false, disabled: false, content: \"NodeJS practices are amazing!\" }\n    ];\n\n    $scope.tabs = tabs;\n    $scope.predicate = \"title\";\n    $scope.reversed = true;\n    $scope.selectedIndex = 2;\n    $scope.allowDisable = true;\n\n    $scope.onTabSelected = onTabSelected;\n    $scope.announceSelected = announceSelected;\n    $scope.announceDeselected = announceDeselected;\n\n    $scope.addTab = function (title, view) {\n      view = view || title + \" Content View\";\n      tabs.push({ title: title, content: view, active: false, disabled: false});\n    };\n\n    $scope.removeTab = function (tab) {\n      for (var j = 0; j < tabs.length; j++) {\n        if (tab.title == tabs[j].title) {\n          $scope.tabs.splice(j, 1);\n          break;\n        }\n      }\n    }\n\n    $scope.submit = function ($event) {\n      if ($event.which !== 13) return;\n      if ($scope.tTitle != \"\") {\n        $scope.addTab($scope.tTitle, $scope.tContent);\n      }\n    }\n\n    // **********************************************************\n    // Private Methods\n    // **********************************************************\n\n    function onTabSelected(tab) {\n      $scope.selectedIndex = this.$index;\n\n      $scope.announceSelected(tab);\n    }\n\n    function announceDeselected(tab) {\n      $scope.farewell = supplant(\"Goodbye {title}!\", tab);\n    }\n\n    function announceSelected(tab) {\n      $scope.greeting = supplant(\"Hello {title}!\", tab);\n    }\n\n  });\n\n"
          }
        ],
        "indexFile": {
          "template": "demo/template.index.html",
          "outputPath": "components/material.components.tabs/demo4/index.html",
          "fileType": "html",
          "file": "src/components/tabs/demos/demo4/index.html",
          "content": "<link rel=\"stylesheet\" href=\"/css/tab_demos.css\">\n<div ng-app=\"app\" ng-controller=\"AppCtrl\" class=\"sample\">\n\n    <h3>Dynamic Tabs internal content:</h3>\n\n    <div class=\"options\" ng-keypress=\"submit($event)\">\n        <span style=\"display:block;padding-bottom:5px;\">Add another tab.</span>\n        Title: <input type=\"text\" ng-model=\"tTitle\" placeholder=\"tab label\">\n        Content:<input type=\"text\" ng-model=\"tContent\" placeholder=\"tab content\" style=\"width:250px;\">\n        <button ng-disabled=\"!tTitle\" ng-click=\"addTab(tTitle,tContent)\" class=\"addTabBtn\" >Add another tab</button>\n    </div>\n\n    <br/><br/>\n\n\n    <material-tabs selected=\"selectedIndex\" style=\"background-color: #00bcd6\">\n        <img ng-src=\"/img/angular.png\" style=\"position:absolute; width:30px;height: 30px; padding-top:5px; padding-left: 5px;\">\n\n        <material-tab ng-repeat=\"tab in tabs | orderBy:predicate:reversed\"\n                 on-select=\"onTabSelected(tab)\"\n                 on-deselect=\"announceDeselected(tab)\"\n                 disabled=\"tab.disabled && allowDisable && tab.title=='Material'\">\n            <material-tab-label>\n                {{tab.title}}\n                <button ng-click=\"removeTab( tab )\" style=\"margin-left: 5px;\">X</button>\n            </material-tab-label>\n            {{tab.content}}\n        </material-tab>\n\n    </material-tabs>\n\n    <br/>\n    <div class=\"infoBar\">\n        <div class=\"left\">\n          Tab <span class=\"highlight\">#{{ selectedIndex }}</span>is active.\n\n          <span class=\"left-spacer\">Tab #2</span> is\n          <span class=\"highlight\"><input type=\"checkbox\" ng-model=\"allowDisable\"> Disabled</span>\n          (will auto-deselect if active)\n\n          <span style=\"padding-left: 30px;\">\n              Show in <span class=\"highlight\"><input type=\"checkbox\" ng-model=\"reversed\" ng-value=\"reversed\"> Reversed Order</span>\n          </span>\n        </div>\n\n        <div class=\"right\">\n          onSelected: <span class=\"highlight hello\">{{greeting}}</span>\n\n          <span class=\"left-spacer\" ng-show=\"farewell.length\">\n            onDeselected: <span class=\"highlight bye\">{{farewell}}</span>\n          </span>\n        </div>\n    </div>\n\n\n</div>\n",
          "componentId": "material.components.tabs",
          "componentName": "Tabs",
          "basePath": "index.html",
          "type": "demo",
          "id": "demo4",
          "name": "4",
          "fileName": "index",
          "relativePath": "index.html/src/components/tabs/demos/demo4/index.html",
          "js": [
            {
              "template": "demo/template.file",
              "outputPath": "components/material.components.tabs/demo4/script.js",
              "fileType": "js",
              "file": "src/components/tabs/demos/demo4/script.js",
              "content": "angular.module('app', ['ngMaterial'])\n  .controller('AppCtrl', function ($scope) {\n    var tabs = [\n      { title: 'Polymer', active: true, disabled: false, content: \"Polymer practices are great!\" },\n      { title: 'Material', active: false, disabled: true, content: \"Material Design practices are better!\" },\n      { title: 'Angular', active: false, disabled: true, content: \"AngularJS practices are the best!\" },\n      { title: 'NodeJS', active: false, disabled: false, content: \"NodeJS practices are amazing!\" }\n    ];\n\n    $scope.tabs = tabs;\n    $scope.predicate = \"title\";\n    $scope.reversed = true;\n    $scope.selectedIndex = 2;\n    $scope.allowDisable = true;\n\n    $scope.onTabSelected = onTabSelected;\n    $scope.announceSelected = announceSelected;\n    $scope.announceDeselected = announceDeselected;\n\n    $scope.addTab = function (title, view) {\n      view = view || title + \" Content View\";\n      tabs.push({ title: title, content: view, active: false, disabled: false});\n    };\n\n    $scope.removeTab = function (tab) {\n      for (var j = 0; j < tabs.length; j++) {\n        if (tab.title == tabs[j].title) {\n          $scope.tabs.splice(j, 1);\n          break;\n        }\n      }\n    }\n\n    $scope.submit = function ($event) {\n      if ($event.which !== 13) return;\n      if ($scope.tTitle != \"\") {\n        $scope.addTab($scope.tTitle, $scope.tContent);\n      }\n    }\n\n    // **********************************************************\n    // Private Methods\n    // **********************************************************\n\n    function onTabSelected(tab) {\n      $scope.selectedIndex = this.$index;\n\n      $scope.announceSelected(tab);\n    }\n\n    function announceDeselected(tab) {\n      $scope.farewell = supplant(\"Goodbye {title}!\", tab);\n    }\n\n    function announceSelected(tab) {\n      $scope.greeting = supplant(\"Hello {title}!\", tab);\n    }\n\n  });\n",
              "componentId": "material.components.tabs",
              "componentName": "Tabs",
              "basePath": "script.js",
              "type": "demo",
              "id": "demo4",
              "name": "4",
              "fileName": "script",
              "relativePath": "script.js/src/components/tabs/demos/demo4/script.js",
              "renderedContent": "angular.module('app', ['ngMaterial'])\n  .controller('AppCtrl', function ($scope) {\n    var tabs = [\n      { title: 'Polymer', active: true, disabled: false, content: \"Polymer practices are great!\" },\n      { title: 'Material', active: false, disabled: true, content: \"Material Design practices are better!\" },\n      { title: 'Angular', active: false, disabled: true, content: \"AngularJS practices are the best!\" },\n      { title: 'NodeJS', active: false, disabled: false, content: \"NodeJS practices are amazing!\" }\n    ];\n\n    $scope.tabs = tabs;\n    $scope.predicate = \"title\";\n    $scope.reversed = true;\n    $scope.selectedIndex = 2;\n    $scope.allowDisable = true;\n\n    $scope.onTabSelected = onTabSelected;\n    $scope.announceSelected = announceSelected;\n    $scope.announceDeselected = announceDeselected;\n\n    $scope.addTab = function (title, view) {\n      view = view || title + \" Content View\";\n      tabs.push({ title: title, content: view, active: false, disabled: false});\n    };\n\n    $scope.removeTab = function (tab) {\n      for (var j = 0; j < tabs.length; j++) {\n        if (tab.title == tabs[j].title) {\n          $scope.tabs.splice(j, 1);\n          break;\n        }\n      }\n    }\n\n    $scope.submit = function ($event) {\n      if ($event.which !== 13) return;\n      if ($scope.tTitle != \"\") {\n        $scope.addTab($scope.tTitle, $scope.tContent);\n      }\n    }\n\n    // **********************************************************\n    // Private Methods\n    // **********************************************************\n\n    function onTabSelected(tab) {\n      $scope.selectedIndex = this.$index;\n\n      $scope.announceSelected(tab);\n    }\n\n    function announceDeselected(tab) {\n      $scope.farewell = supplant(\"Goodbye {title}!\", tab);\n    }\n\n    function announceSelected(tab) {\n      $scope.greeting = supplant(\"Hello {title}!\", tab);\n    }\n\n  });\n\n"
            }
          ],
          "css": [],
          "renderedContent": "<!doctype html>\n<head>\n  <meta name=\"viewport\" content=\"initial-scale=1, maximum-scale=1\" />\n  <link rel=\"stylesheet\" href=\"../../../demo.css\">\n  <script src=\"//ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js\"></script>\n  <script src=\"//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular.min.js\"></script>\n  <script src=\"//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular-animate.min.js\"></script>\n  <script src=\"//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular-route.min.js\"></script>\n  <script src=\"../../../docs.js\"></script>\n  <script src=\"script.js\"></script>\n  \n  \n</head>\n<body>\n<link rel=\"stylesheet\" href=\"/css/tab_demos.css\">\n<div ng-app=\"app\" ng-controller=\"AppCtrl\" class=\"sample\">\n\n    <h3>Dynamic Tabs internal content:</h3>\n\n    <div class=\"options\" ng-keypress=\"submit($event)\">\n        <span style=\"display:block;padding-bottom:5px;\">Add another tab.</span>\n        Title: <input type=\"text\" ng-model=\"tTitle\" placeholder=\"tab label\">\n        Content:<input type=\"text\" ng-model=\"tContent\" placeholder=\"tab content\" style=\"width:250px;\">\n        <button ng-disabled=\"!tTitle\" ng-click=\"addTab(tTitle,tContent)\" class=\"addTabBtn\" >Add another tab</button>\n    </div>\n\n    <br/><br/>\n\n\n    <material-tabs selected=\"selectedIndex\" style=\"background-color: #00bcd6\">\n        <img ng-src=\"/img/angular.png\" style=\"position:absolute; width:30px;height: 30px; padding-top:5px; padding-left: 5px;\">\n\n        <material-tab ng-repeat=\"tab in tabs | orderBy:predicate:reversed\"\n                 on-select=\"onTabSelected(tab)\"\n                 on-deselect=\"announceDeselected(tab)\"\n                 disabled=\"tab.disabled && allowDisable && tab.title=='Material'\">\n            <material-tab-label>\n                {{tab.title}}\n                <button ng-click=\"removeTab( tab )\" style=\"margin-left: 5px;\">X</button>\n            </material-tab-label>\n            {{tab.content}}\n        </material-tab>\n\n    </material-tabs>\n\n    <br/>\n    <div class=\"infoBar\">\n        <div class=\"left\">\n          Tab <span class=\"highlight\">#{{ selectedIndex }}</span>is active.\n\n          <span class=\"left-spacer\">Tab #2</span> is\n          <span class=\"highlight\"><input type=\"checkbox\" ng-model=\"allowDisable\"> Disabled</span>\n          (will auto-deselect if active)\n\n          <span style=\"padding-left: 30px;\">\n              Show in <span class=\"highlight\"><input type=\"checkbox\" ng-model=\"reversed\" ng-value=\"reversed\"> Reversed Order</span>\n          </span>\n        </div>\n\n        <div class=\"right\">\n          onSelected: <span class=\"highlight hello\">{{greeting}}</span>\n\n          <span class=\"left-spacer\" ng-show=\"farewell.length\">\n            onDeselected: <span class=\"highlight bye\">{{farewell}}</span>\n          </span>\n        </div>\n    </div>\n\n\n</div>\n\n</body>\n</html>\n"
        }
      },
      "demo5": {
        "name": "5",
        "id": "demo5",
        "files": [
          {
            "template": "demo/template.file",
            "outputPath": "components/material.components.tabs/demo5/script.js",
            "fileType": "js",
            "file": "src/components/tabs/demos/demo5/script.js",
            "content": "\nangular.module('app', ['ngMaterial'] )\n  .controller('AppCtrl', function( $scope ) {\n    var tabs = [\n      { title: 'Polymer', active: true,  disabled: false, content:\"Polymer practices are great!\" },\n      { title: 'Material', active: false, disabled: true , content:\"Material Design practices are better!\" },\n      { title: 'Angular', active: false, disabled: true , content:\"AngularJS practices are the best!\" },\n      { title: 'NodeJS' , active: false, disabled: false, content:\"NodeJS practices are amazing!\" }\n    ];\n\n    $scope.selectedIndex = 0;\n    $scope.twoDisabled = true;\n\n  });\n",
            "componentId": "material.components.tabs",
            "componentName": "Tabs",
            "basePath": "script.js",
            "type": "demo",
            "id": "demo5",
            "name": "5",
            "fileName": "script",
            "relativePath": "script.js/src/components/tabs/demos/demo5/script.js",
            "renderedContent": "\nangular.module('app', ['ngMaterial'] )\n  .controller('AppCtrl', function( $scope ) {\n    var tabs = [\n      { title: 'Polymer', active: true,  disabled: false, content:\"Polymer practices are great!\" },\n      { title: 'Material', active: false, disabled: true , content:\"Material Design practices are better!\" },\n      { title: 'Angular', active: false, disabled: true , content:\"AngularJS practices are the best!\" },\n      { title: 'NodeJS' , active: false, disabled: false, content:\"NodeJS practices are amazing!\" }\n    ];\n\n    $scope.selectedIndex = 0;\n    $scope.twoDisabled = true;\n\n  });\n\n"
          }
        ],
        "indexFile": {
          "template": "demo/template.index.html",
          "outputPath": "components/material.components.tabs/demo5/index.html",
          "fileType": "html",
          "file": "src/components/tabs/demos/demo5/index.html",
          "content": "<link rel=\"stylesheet\" href=\"/css/tab_demos.css\">\n<div ng-app=\"app\" ng-controller=\"AppCtrl\" class=\"sample\">\n\n\n    <h3>Static Tabs linked external content (ng-Switch):</h3>\n    <p>Tabs with view panes and the bar slides to the selected tab; with no `material` ink effects</p>\n\n    <p>\n        Your selection:\n        <input type=\"number\" ng-model=\"selectedIndex\">Tab #2 is\n              <span class=\"highlight\">\n                <input type=\"checkbox\" ng-model=\"twoDisabled\">Disabled\n              </span>\n        (will auto-deselect if active)\n    </p>\n    <br/>\n\n    <material-tabs selected=\"selectedIndex\" noink>\n        <material-tab label=\"ITEM ONE\"></material-tab>\n        <material-tab label=\"ITEM TWO\" disabled=\"twoDisabled\"></material-tab>\n        <material-tab label=\"ITEM THREE\"></material-tab>\n        <material-tab label=\"ITEM FOUR\"></material-tab>\n    </material-tabs>\n\n    <div class=\"animate-switch-container\" ng-switch on=\"selectedIndex\">\n        <div class=\"animate-switch blueArea\" ng-switch-when=\"0\">\n            View for Item #1<br/>\n            Selection index = 0\n        </div>\n        <div class=\"animate-switch redArea\" ng-switch-when=\"1\">\n            View for Item #2<br/>\n            Selection index = 1\n        </div>\n        <div class=\"animate-switch greenArea\" ng-switch-when=\"2\">\n            View for Item #3<br/>\n            Selection index = 2\n        </div>\n        <div class=\"animate-switch grayArea\" ng-switch-when=\"3\">\n            View for Item #4<br/>\n            Selection index = 3\n        </div>\n    </div>\n\n</div>\n",
          "componentId": "material.components.tabs",
          "componentName": "Tabs",
          "basePath": "index.html",
          "type": "demo",
          "id": "demo5",
          "name": "5",
          "fileName": "index",
          "relativePath": "index.html/src/components/tabs/demos/demo5/index.html",
          "js": [
            {
              "template": "demo/template.file",
              "outputPath": "components/material.components.tabs/demo5/script.js",
              "fileType": "js",
              "file": "src/components/tabs/demos/demo5/script.js",
              "content": "\nangular.module('app', ['ngMaterial'] )\n  .controller('AppCtrl', function( $scope ) {\n    var tabs = [\n      { title: 'Polymer', active: true,  disabled: false, content:\"Polymer practices are great!\" },\n      { title: 'Material', active: false, disabled: true , content:\"Material Design practices are better!\" },\n      { title: 'Angular', active: false, disabled: true , content:\"AngularJS practices are the best!\" },\n      { title: 'NodeJS' , active: false, disabled: false, content:\"NodeJS practices are amazing!\" }\n    ];\n\n    $scope.selectedIndex = 0;\n    $scope.twoDisabled = true;\n\n  });\n",
              "componentId": "material.components.tabs",
              "componentName": "Tabs",
              "basePath": "script.js",
              "type": "demo",
              "id": "demo5",
              "name": "5",
              "fileName": "script",
              "relativePath": "script.js/src/components/tabs/demos/demo5/script.js",
              "renderedContent": "\nangular.module('app', ['ngMaterial'] )\n  .controller('AppCtrl', function( $scope ) {\n    var tabs = [\n      { title: 'Polymer', active: true,  disabled: false, content:\"Polymer practices are great!\" },\n      { title: 'Material', active: false, disabled: true , content:\"Material Design practices are better!\" },\n      { title: 'Angular', active: false, disabled: true , content:\"AngularJS practices are the best!\" },\n      { title: 'NodeJS' , active: false, disabled: false, content:\"NodeJS practices are amazing!\" }\n    ];\n\n    $scope.selectedIndex = 0;\n    $scope.twoDisabled = true;\n\n  });\n\n"
            }
          ],
          "css": [],
          "renderedContent": "<!doctype html>\n<head>\n  <meta name=\"viewport\" content=\"initial-scale=1, maximum-scale=1\" />\n  <link rel=\"stylesheet\" href=\"../../../demo.css\">\n  <script src=\"//ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js\"></script>\n  <script src=\"//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular.min.js\"></script>\n  <script src=\"//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular-animate.min.js\"></script>\n  <script src=\"//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular-route.min.js\"></script>\n  <script src=\"../../../docs.js\"></script>\n  <script src=\"script.js\"></script>\n  \n  \n</head>\n<body>\n<link rel=\"stylesheet\" href=\"/css/tab_demos.css\">\n<div ng-app=\"app\" ng-controller=\"AppCtrl\" class=\"sample\">\n\n\n    <h3>Static Tabs linked external content (ng-Switch):</h3>\n    <p>Tabs with view panes and the bar slides to the selected tab; with no `material` ink effects</p>\n\n    <p>\n        Your selection:\n        <input type=\"number\" ng-model=\"selectedIndex\">Tab #2 is\n              <span class=\"highlight\">\n                <input type=\"checkbox\" ng-model=\"twoDisabled\">Disabled\n              </span>\n        (will auto-deselect if active)\n    </p>\n    <br/>\n\n    <material-tabs selected=\"selectedIndex\" noink>\n        <material-tab label=\"ITEM ONE\"></material-tab>\n        <material-tab label=\"ITEM TWO\" disabled=\"twoDisabled\"></material-tab>\n        <material-tab label=\"ITEM THREE\"></material-tab>\n        <material-tab label=\"ITEM FOUR\"></material-tab>\n    </material-tabs>\n\n    <div class=\"animate-switch-container\" ng-switch on=\"selectedIndex\">\n        <div class=\"animate-switch blueArea\" ng-switch-when=\"0\">\n            View for Item #1<br/>\n            Selection index = 0\n        </div>\n        <div class=\"animate-switch redArea\" ng-switch-when=\"1\">\n            View for Item #2<br/>\n            Selection index = 1\n        </div>\n        <div class=\"animate-switch greenArea\" ng-switch-when=\"2\">\n            View for Item #3<br/>\n            Selection index = 2\n        </div>\n        <div class=\"animate-switch grayArea\" ng-switch-when=\"3\">\n            View for Item #4<br/>\n            Selection index = 3\n        </div>\n    </div>\n\n</div>\n\n</body>\n</html>\n"
        }
      },
      "demo6": {
        "name": "6",
        "id": "demo6",
        "files": [
          {
            "template": "demo/template.file",
            "outputPath": "components/material.components.tabs/demo6/angular.html",
            "fileType": "html",
            "file": "src/components/tabs/demos/demo6/angular.html",
            "content": "<h1>Angular</h1>\n",
            "componentId": "material.components.tabs",
            "componentName": "Tabs",
            "basePath": "angular.html",
            "type": "demo",
            "id": "demo6",
            "name": "6",
            "fileName": "angular",
            "relativePath": "angular.html/src/components/tabs/demos/demo6/angular.html",
            "renderedContent": "<h1>Angular</h1>\n\n"
          },
          {
            "template": "demo/template.file",
            "outputPath": "components/material.components.tabs/demo6/material.html",
            "fileType": "html",
            "file": "src/components/tabs/demos/demo6/material.html",
            "content": "<h1>Material</h1>\n",
            "componentId": "material.components.tabs",
            "componentName": "Tabs",
            "basePath": "material.html",
            "type": "demo",
            "id": "demo6",
            "name": "6",
            "fileName": "material",
            "relativePath": "material.html/src/components/tabs/demos/demo6/material.html",
            "renderedContent": "<h1>Material</h1>\n\n"
          },
          {
            "template": "demo/template.file",
            "outputPath": "components/material.components.tabs/demo6/polymer.html",
            "fileType": "html",
            "file": "src/components/tabs/demos/demo6/polymer.html",
            "content": "<h1>Polymer</h1>\n",
            "componentId": "material.components.tabs",
            "componentName": "Tabs",
            "basePath": "polymer.html",
            "type": "demo",
            "id": "demo6",
            "name": "6",
            "fileName": "polymer",
            "relativePath": "polymer.html/src/components/tabs/demos/demo6/polymer.html",
            "renderedContent": "<h1>Polymer</h1>\n\n"
          },
          {
            "template": "demo/template.file",
            "outputPath": "components/material.components.tabs/demo6/script.js",
            "fileType": "js",
            "file": "src/components/tabs/demos/demo6/script.js",
            "content": "\nangular.module('app', ['ngMaterial', 'ngRoute'])\n\n.config(function($routeProvider) {\n  $routeProvider\n    .when('/material', {\n      templateUrl: 'material.html',\n      controller: 'MaterialTabCtrl'\n    })\n    .when('/angular', {\n      templateUrl: 'angular.html',\n      controller: 'AngularTabCtrl'\n    })\n    .when('/polymer', {\n      templateUrl: 'polymer.html',\n      controller: 'PolymerTabCtrl'\n    })\n    .otherwise({\n      redirectTo: '/material'\n    });\n})\n\n.controller('AppCtrl', function($scope, $location) {\n  var tabs = $scope.tabs = [\n    { path: '/material', label: 'Material Design' },\n    { path: '/angular', label: 'Use Angular' },\n    { path: '/polymer', label: 'Use Polymer' },\n  ];\n\n  $scope.selectedTabIndex = 0;\n  $scope.$watch('selectedTabIndex', watchSelectedTab);\n  \n  function watchSelectedTab(index, oldIndex) {\n    console.log('selecting from', oldIndex, 'to', index);\n    $scope.reverse = index < oldIndex;\n    $location.path(tabs[index].path);\n  }\n\n})\n\n.controller('MaterialTabCtrl', function($scope) {\n})\n\n.controller('AngularTabCtrl', function($scope) {\n})\n\n.controller('PolymerTabCtrl', function($scope) {\n});\n",
            "componentId": "material.components.tabs",
            "componentName": "Tabs",
            "basePath": "script.js",
            "type": "demo",
            "id": "demo6",
            "name": "6",
            "fileName": "script",
            "relativePath": "script.js/src/components/tabs/demos/demo6/script.js",
            "renderedContent": "\nangular.module('app', ['ngMaterial', 'ngRoute'])\n\n.config(function($routeProvider) {\n  $routeProvider\n    .when('/material', {\n      templateUrl: 'material.html',\n      controller: 'MaterialTabCtrl'\n    })\n    .when('/angular', {\n      templateUrl: 'angular.html',\n      controller: 'AngularTabCtrl'\n    })\n    .when('/polymer', {\n      templateUrl: 'polymer.html',\n      controller: 'PolymerTabCtrl'\n    })\n    .otherwise({\n      redirectTo: '/material'\n    });\n})\n\n.controller('AppCtrl', function($scope, $location) {\n  var tabs = $scope.tabs = [\n    { path: '/material', label: 'Material Design' },\n    { path: '/angular', label: 'Use Angular' },\n    { path: '/polymer', label: 'Use Polymer' },\n  ];\n\n  $scope.selectedTabIndex = 0;\n  $scope.$watch('selectedTabIndex', watchSelectedTab);\n  \n  function watchSelectedTab(index, oldIndex) {\n    console.log('selecting from', oldIndex, 'to', index);\n    $scope.reverse = index < oldIndex;\n    $location.path(tabs[index].path);\n  }\n\n})\n\n.controller('MaterialTabCtrl', function($scope) {\n})\n\n.controller('AngularTabCtrl', function($scope) {\n})\n\n.controller('PolymerTabCtrl', function($scope) {\n});\n\n"
          },
          {
            "template": "demo/template.file",
            "outputPath": "components/material.components.tabs/demo6/style.css",
            "fileType": "css",
            "file": "src/components/tabs/demos/demo6/style.css",
            "content": ".tabs-view {\n  position: absolute;\n  top: 149px;\n  bottom: 0;\n  right: 0;\n  left: 0;\n  animation-duration: 0.35s;\n  animation-timing-function: ease-in-out;\n  -webkit-animation-duration: 0.35s;\n  -webkit-animation-timing-function: ease-in-out;\n}\n\n.tabs-view.ng-enter {\n  animation-name: slideFromRight;\n  -webkit-animation-name: slideFromRight;\n}\n.tabs-view.reverse.ng-enter {\n  animation-name: slideFromLeft;\n  -webkit-animation-name: slideFromLeft;\n}\n.tabs-view.ng-leave {\n  animation-name: slideToLeft;\n  -webkit-animation-name: slideToLeft;\n}\n.tabs-view.reverse.ng-leave {\n  animation-name: slideToRight;\n  -webkit-animation-name: slideToRight;\n}\n\n@keyframes slideFromRight {\n  0% { transform: translateX(100%); }\n  100% { transform: translateX(0); }\n}\n@keyframes slideFromLeft {\n  0% { transform: translateX(-100%); }\n  100% { transform: translateX(0); }\n}\n@keyframes slideToRight {\n  0% { transform: translateX(0); }\n  100% { transform: translateX(100%); }\n}\n@keyframes slideToLeft {\n  0% { transform: translateX(0); }\n  100% { transform: translateX(-100%); }\n}\n\n@-webkit-keyframes slideFromRight {\n  0% { -webkit-transform: translateX(100%); }\n  100% { -webkit-transform: translateX(0); }\n}\n@-webkit-keyframes slideFromLeft {\n  0% { -webkit-transform: translateX(-100%); }\n  100% { -webkit-transform: translateX(0); }\n}\n@-webkit-keyframes slideToRight {\n  0% { -webkit-transform: translateX(0); }\n  100% { -webkit-transform: translateX(100%); }\n}\n@-webkit-keyframes slideToLeft {\n  0% { -webkit-transform: translateX(0); }\n  100% { -webkit-transform: translateX(-100%); }\n}\n\n\nng-view {\n    padding-left: 40px;\n}\n",
            "componentId": "material.components.tabs",
            "componentName": "Tabs",
            "basePath": "style.css",
            "type": "demo",
            "id": "demo6",
            "name": "6",
            "fileName": "style",
            "relativePath": "style.css/src/components/tabs/demos/demo6/style.css",
            "renderedContent": ".tabs-view {\n  position: absolute;\n  top: 149px;\n  bottom: 0;\n  right: 0;\n  left: 0;\n  animation-duration: 0.35s;\n  animation-timing-function: ease-in-out;\n  -webkit-animation-duration: 0.35s;\n  -webkit-animation-timing-function: ease-in-out;\n}\n\n.tabs-view.ng-enter {\n  animation-name: slideFromRight;\n  -webkit-animation-name: slideFromRight;\n}\n.tabs-view.reverse.ng-enter {\n  animation-name: slideFromLeft;\n  -webkit-animation-name: slideFromLeft;\n}\n.tabs-view.ng-leave {\n  animation-name: slideToLeft;\n  -webkit-animation-name: slideToLeft;\n}\n.tabs-view.reverse.ng-leave {\n  animation-name: slideToRight;\n  -webkit-animation-name: slideToRight;\n}\n\n@keyframes slideFromRight {\n  0% { transform: translateX(100%); }\n  100% { transform: translateX(0); }\n}\n@keyframes slideFromLeft {\n  0% { transform: translateX(-100%); }\n  100% { transform: translateX(0); }\n}\n@keyframes slideToRight {\n  0% { transform: translateX(0); }\n  100% { transform: translateX(100%); }\n}\n@keyframes slideToLeft {\n  0% { transform: translateX(0); }\n  100% { transform: translateX(-100%); }\n}\n\n@-webkit-keyframes slideFromRight {\n  0% { -webkit-transform: translateX(100%); }\n  100% { -webkit-transform: translateX(0); }\n}\n@-webkit-keyframes slideFromLeft {\n  0% { -webkit-transform: translateX(-100%); }\n  100% { -webkit-transform: translateX(0); }\n}\n@-webkit-keyframes slideToRight {\n  0% { -webkit-transform: translateX(0); }\n  100% { -webkit-transform: translateX(100%); }\n}\n@-webkit-keyframes slideToLeft {\n  0% { -webkit-transform: translateX(0); }\n  100% { -webkit-transform: translateX(-100%); }\n}\n\n\nng-view {\n    padding-left: 40px;\n}\n\n"
          }
        ],
        "indexFile": {
          "template": "demo/template.index.html",
          "outputPath": "components/material.components.tabs/demo6/index.html",
          "fileType": "html",
          "file": "src/components/tabs/demos/demo6/index.html",
          "content": "<link rel=\"stylesheet\" href=\"/css/tab_demos.css\">\n\n<div class=\"sample\">\n\n    <h3>Dynamic Tabs (ng-repeat) with view routing:</h3>\n    <p>Tab selection changes the $location.path and ng-view routing triggers...</p>\n\n\n    <div ng-app=\"app\" ng-controller=\"AppCtrl\" >\n\n      <material-tabs selected=\"selectedTabIndex\">\n        <material-tab ng-repeat=\"tab in tabs\"\n                label=\"{{tab.label}}\">\n        </material-tab>\n      </material-tabs>\n\n      <ng-view class=\"tabs-view\" ng-class=\"{reverse: reverse}\"></ng-view>\n\n    </div>\n\n</div>\n",
          "componentId": "material.components.tabs",
          "componentName": "Tabs",
          "basePath": "index.html",
          "type": "demo",
          "id": "demo6",
          "name": "6",
          "fileName": "index",
          "relativePath": "index.html/src/components/tabs/demos/demo6/index.html",
          "js": [
            {
              "template": "demo/template.file",
              "outputPath": "components/material.components.tabs/demo6/script.js",
              "fileType": "js",
              "file": "src/components/tabs/demos/demo6/script.js",
              "content": "\nangular.module('app', ['ngMaterial', 'ngRoute'])\n\n.config(function($routeProvider) {\n  $routeProvider\n    .when('/material', {\n      templateUrl: 'material.html',\n      controller: 'MaterialTabCtrl'\n    })\n    .when('/angular', {\n      templateUrl: 'angular.html',\n      controller: 'AngularTabCtrl'\n    })\n    .when('/polymer', {\n      templateUrl: 'polymer.html',\n      controller: 'PolymerTabCtrl'\n    })\n    .otherwise({\n      redirectTo: '/material'\n    });\n})\n\n.controller('AppCtrl', function($scope, $location) {\n  var tabs = $scope.tabs = [\n    { path: '/material', label: 'Material Design' },\n    { path: '/angular', label: 'Use Angular' },\n    { path: '/polymer', label: 'Use Polymer' },\n  ];\n\n  $scope.selectedTabIndex = 0;\n  $scope.$watch('selectedTabIndex', watchSelectedTab);\n  \n  function watchSelectedTab(index, oldIndex) {\n    console.log('selecting from', oldIndex, 'to', index);\n    $scope.reverse = index < oldIndex;\n    $location.path(tabs[index].path);\n  }\n\n})\n\n.controller('MaterialTabCtrl', function($scope) {\n})\n\n.controller('AngularTabCtrl', function($scope) {\n})\n\n.controller('PolymerTabCtrl', function($scope) {\n});\n",
              "componentId": "material.components.tabs",
              "componentName": "Tabs",
              "basePath": "script.js",
              "type": "demo",
              "id": "demo6",
              "name": "6",
              "fileName": "script",
              "relativePath": "script.js/src/components/tabs/demos/demo6/script.js",
              "renderedContent": "\nangular.module('app', ['ngMaterial', 'ngRoute'])\n\n.config(function($routeProvider) {\n  $routeProvider\n    .when('/material', {\n      templateUrl: 'material.html',\n      controller: 'MaterialTabCtrl'\n    })\n    .when('/angular', {\n      templateUrl: 'angular.html',\n      controller: 'AngularTabCtrl'\n    })\n    .when('/polymer', {\n      templateUrl: 'polymer.html',\n      controller: 'PolymerTabCtrl'\n    })\n    .otherwise({\n      redirectTo: '/material'\n    });\n})\n\n.controller('AppCtrl', function($scope, $location) {\n  var tabs = $scope.tabs = [\n    { path: '/material', label: 'Material Design' },\n    { path: '/angular', label: 'Use Angular' },\n    { path: '/polymer', label: 'Use Polymer' },\n  ];\n\n  $scope.selectedTabIndex = 0;\n  $scope.$watch('selectedTabIndex', watchSelectedTab);\n  \n  function watchSelectedTab(index, oldIndex) {\n    console.log('selecting from', oldIndex, 'to', index);\n    $scope.reverse = index < oldIndex;\n    $location.path(tabs[index].path);\n  }\n\n})\n\n.controller('MaterialTabCtrl', function($scope) {\n})\n\n.controller('AngularTabCtrl', function($scope) {\n})\n\n.controller('PolymerTabCtrl', function($scope) {\n});\n\n"
            }
          ],
          "css": [
            {
              "template": "demo/template.file",
              "outputPath": "components/material.components.tabs/demo6/style.css",
              "fileType": "css",
              "file": "src/components/tabs/demos/demo6/style.css",
              "content": ".tabs-view {\n  position: absolute;\n  top: 149px;\n  bottom: 0;\n  right: 0;\n  left: 0;\n  animation-duration: 0.35s;\n  animation-timing-function: ease-in-out;\n  -webkit-animation-duration: 0.35s;\n  -webkit-animation-timing-function: ease-in-out;\n}\n\n.tabs-view.ng-enter {\n  animation-name: slideFromRight;\n  -webkit-animation-name: slideFromRight;\n}\n.tabs-view.reverse.ng-enter {\n  animation-name: slideFromLeft;\n  -webkit-animation-name: slideFromLeft;\n}\n.tabs-view.ng-leave {\n  animation-name: slideToLeft;\n  -webkit-animation-name: slideToLeft;\n}\n.tabs-view.reverse.ng-leave {\n  animation-name: slideToRight;\n  -webkit-animation-name: slideToRight;\n}\n\n@keyframes slideFromRight {\n  0% { transform: translateX(100%); }\n  100% { transform: translateX(0); }\n}\n@keyframes slideFromLeft {\n  0% { transform: translateX(-100%); }\n  100% { transform: translateX(0); }\n}\n@keyframes slideToRight {\n  0% { transform: translateX(0); }\n  100% { transform: translateX(100%); }\n}\n@keyframes slideToLeft {\n  0% { transform: translateX(0); }\n  100% { transform: translateX(-100%); }\n}\n\n@-webkit-keyframes slideFromRight {\n  0% { -webkit-transform: translateX(100%); }\n  100% { -webkit-transform: translateX(0); }\n}\n@-webkit-keyframes slideFromLeft {\n  0% { -webkit-transform: translateX(-100%); }\n  100% { -webkit-transform: translateX(0); }\n}\n@-webkit-keyframes slideToRight {\n  0% { -webkit-transform: translateX(0); }\n  100% { -webkit-transform: translateX(100%); }\n}\n@-webkit-keyframes slideToLeft {\n  0% { -webkit-transform: translateX(0); }\n  100% { -webkit-transform: translateX(-100%); }\n}\n\n\nng-view {\n    padding-left: 40px;\n}\n",
              "componentId": "material.components.tabs",
              "componentName": "Tabs",
              "basePath": "style.css",
              "type": "demo",
              "id": "demo6",
              "name": "6",
              "fileName": "style",
              "relativePath": "style.css/src/components/tabs/demos/demo6/style.css",
              "renderedContent": ".tabs-view {\n  position: absolute;\n  top: 149px;\n  bottom: 0;\n  right: 0;\n  left: 0;\n  animation-duration: 0.35s;\n  animation-timing-function: ease-in-out;\n  -webkit-animation-duration: 0.35s;\n  -webkit-animation-timing-function: ease-in-out;\n}\n\n.tabs-view.ng-enter {\n  animation-name: slideFromRight;\n  -webkit-animation-name: slideFromRight;\n}\n.tabs-view.reverse.ng-enter {\n  animation-name: slideFromLeft;\n  -webkit-animation-name: slideFromLeft;\n}\n.tabs-view.ng-leave {\n  animation-name: slideToLeft;\n  -webkit-animation-name: slideToLeft;\n}\n.tabs-view.reverse.ng-leave {\n  animation-name: slideToRight;\n  -webkit-animation-name: slideToRight;\n}\n\n@keyframes slideFromRight {\n  0% { transform: translateX(100%); }\n  100% { transform: translateX(0); }\n}\n@keyframes slideFromLeft {\n  0% { transform: translateX(-100%); }\n  100% { transform: translateX(0); }\n}\n@keyframes slideToRight {\n  0% { transform: translateX(0); }\n  100% { transform: translateX(100%); }\n}\n@keyframes slideToLeft {\n  0% { transform: translateX(0); }\n  100% { transform: translateX(-100%); }\n}\n\n@-webkit-keyframes slideFromRight {\n  0% { -webkit-transform: translateX(100%); }\n  100% { -webkit-transform: translateX(0); }\n}\n@-webkit-keyframes slideFromLeft {\n  0% { -webkit-transform: translateX(-100%); }\n  100% { -webkit-transform: translateX(0); }\n}\n@-webkit-keyframes slideToRight {\n  0% { -webkit-transform: translateX(0); }\n  100% { -webkit-transform: translateX(100%); }\n}\n@-webkit-keyframes slideToLeft {\n  0% { -webkit-transform: translateX(0); }\n  100% { -webkit-transform: translateX(-100%); }\n}\n\n\nng-view {\n    padding-left: 40px;\n}\n\n"
            }
          ],
          "renderedContent": "<!doctype html>\n<head>\n  <meta name=\"viewport\" content=\"initial-scale=1, maximum-scale=1\" />\n  <link rel=\"stylesheet\" href=\"../../../demo.css\">\n  <script src=\"//ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js\"></script>\n  <script src=\"//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular.min.js\"></script>\n  <script src=\"//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular-animate.min.js\"></script>\n  <script src=\"//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular-route.min.js\"></script>\n  <script src=\"../../../docs.js\"></script>\n  <script src=\"script.js\"></script>\n  \n  <link rel=\"stylesheet\" href=\"style.css\">\n  \n</head>\n<body>\n<link rel=\"stylesheet\" href=\"/css/tab_demos.css\">\n\n<div class=\"sample\">\n\n    <h3>Dynamic Tabs (ng-repeat) with view routing:</h3>\n    <p>Tab selection changes the $location.path and ng-view routing triggers...</p>\n\n\n    <div ng-app=\"app\" ng-controller=\"AppCtrl\" >\n\n      <material-tabs selected=\"selectedTabIndex\">\n        <material-tab ng-repeat=\"tab in tabs\"\n                label=\"{{tab.label}}\">\n        </material-tab>\n      </material-tabs>\n\n      <ng-view class=\"tabs-view\" ng-class=\"{reverse: reverse}\"></ng-view>\n\n    </div>\n\n</div>\n\n</body>\n</html>\n"
        }
      }
    },
    "template": "component.template.html",
    "outputPath": "components/material.components.tabs/index.html",
    "repositoryUrl": "https://github.com/angular/material/tree/master/src/components/tabs",
    "renderedContent": "<material-tabs class=\"demo-tabs\">\n  <material-tab ng-repeat=\"(_,demo) in currentComponent.demos\"\n           active=\"currentComponent.$selectedDemo === demo\"\n           ng-click=\"currentComponent.$selectedDemo = demo\" \n           label=\"{{demo.name}}\">\n  </material-tab>\n</material-tabs>\n<iframe class=\"demo\"\n        name=\"{{demo.id}}\"\n        ng-repeat=\"demo in currentComponent.demos\" \n        ng-show=\"currentComponent.$selectedDemo === demo\"\n        ng-src=\"{{demo.indexFile.outputPath}}\">\n</iframe>\n\n"
  },
  {
    "id": "material.components.toast",
    "name": "Toast",
    "demos": {
      "demo1": {
        "name": "Toast Basic Usage",
        "id": "demo1",
        "files": [
          {
            "template": "demo/template.file",
            "outputPath": "components/material.components.toast/demo1/script.js",
            "fileType": "js",
            "file": "src/components/toast/demo1/script.js",
            "content": "\nangular.module('app', ['ngMaterial'])\n\n.controller('AppCtrl', function($scope, $materialToast, $animate) {\n  \n  $scope.toastPosition = {\n    bottom: true,\n    top: false,\n    left: true,\n    right: false,\n    fit: false\n  };\n\n  $scope.getToastPosition = function() {\n    return Object.keys($scope.toastPosition)\n      .filter(function(pos) { return $scope.toastPosition[pos]; })\n      .join(' ');\n  };\n\n  $scope.complexToastIt = function() {\n    $materialToast({\n      controller: 'ToastCtrl',\n      templateUrl: 'toast-template.html',\n      duration: 5000,\n      position: $scope.getToastPosition()\n    });\n  };\n\n  $scope.toastIt = function() {\n    $materialToast({\n      template: 'Hello, ' + Math.random(),\n      duration: 2000,\n      position: $scope.getToastPosition()\n    });\n  };\n\n})\n\n.controller('ToastCtrl', function($scope, $hideToast) {\n  $scope.closeToast = function() {\n    $hideToast();\n  };\n});\n",
            "componentId": "material.components.toast",
            "componentName": "Toast",
            "basePath": "script.js",
            "type": "demo",
            "id": "demo1",
            "name": "Toast Basic Usage",
            "fileName": "script",
            "relativePath": "script.js/src/components/toast/demo1/script.js",
            "renderedContent": "\nangular.module('app', ['ngMaterial'])\n\n.controller('AppCtrl', function($scope, $materialToast, $animate) {\n  \n  $scope.toastPosition = {\n    bottom: true,\n    top: false,\n    left: true,\n    right: false,\n    fit: false\n  };\n\n  $scope.getToastPosition = function() {\n    return Object.keys($scope.toastPosition)\n      .filter(function(pos) { return $scope.toastPosition[pos]; })\n      .join(' ');\n  };\n\n  $scope.complexToastIt = function() {\n    $materialToast({\n      controller: 'ToastCtrl',\n      templateUrl: 'toast-template.html',\n      duration: 5000,\n      position: $scope.getToastPosition()\n    });\n  };\n\n  $scope.toastIt = function() {\n    $materialToast({\n      template: 'Hello, ' + Math.random(),\n      duration: 2000,\n      position: $scope.getToastPosition()\n    });\n  };\n\n})\n\n.controller('ToastCtrl', function($scope, $hideToast) {\n  $scope.closeToast = function() {\n    $hideToast();\n  };\n});\n\n"
          },
          {
            "template": "demo/template.file",
            "outputPath": "components/material.components.toast/demo1/toast-template.html",
            "fileType": "html",
            "file": "src/components/toast/demo1/toast-template.html",
            "content": "<div>\n  Hello there!\n  <div class=\"toast-action\" ng-click=\"closeToast()\">\n    Close\n  </div>\n</div>\n",
            "componentId": "material.components.toast",
            "componentName": "Toast",
            "basePath": "toast-template.html",
            "type": "demo",
            "id": "demo1",
            "name": "Toast Basic Usage",
            "fileName": "toast-template",
            "relativePath": "toast-template.html/src/components/toast/demo1/toast-template.html",
            "renderedContent": "<div>\n  Hello there!\n  <div class=\"toast-action\" ng-click=\"closeToast()\">\n    Close\n  </div>\n</div>\n\n"
          }
        ],
        "indexFile": {
          "template": "demo/template.index.html",
          "outputPath": "components/material.components.toast/demo1/index.html",
          "fileType": "html",
          "file": "src/components/toast/demo1/index.html",
          "content": "\n<div ng-app=\"app\" ng-controller=\"AppCtrl\">\n  <div class=\"inset\">\n    <button class=\"material-button\" ng-click=\"toastIt()\">\n      Simple Toast\n    </button>\n    <button class=\"material-button-raised material-button\" \n            ng-click=\"complexToastIt()\">\n      Advanced Toast\n    </button>\n  </div>\n  <material-card>\n    <div>\n      <b>Toast Position: \"{{getToastPosition()}}\"</b>\n    </div>\n    <material-checkbox ng-repeat=\"(name, isSelected) in toastPosition\"> \n      <input type=\"checkbox\" ng-model=\"toastPosition[name]\"> \n      {{name}}\n    </material-checkbox>\n  </material-card>\n</div>\n",
          "componentId": "material.components.toast",
          "componentName": "Toast",
          "basePath": "index.html",
          "type": "demo",
          "id": "demo1",
          "name": "Toast Basic Usage",
          "fileName": "index",
          "relativePath": "index.html/src/components/toast/demo1/index.html",
          "js": [
            {
              "template": "demo/template.file",
              "outputPath": "components/material.components.toast/demo1/script.js",
              "fileType": "js",
              "file": "src/components/toast/demo1/script.js",
              "content": "\nangular.module('app', ['ngMaterial'])\n\n.controller('AppCtrl', function($scope, $materialToast, $animate) {\n  \n  $scope.toastPosition = {\n    bottom: true,\n    top: false,\n    left: true,\n    right: false,\n    fit: false\n  };\n\n  $scope.getToastPosition = function() {\n    return Object.keys($scope.toastPosition)\n      .filter(function(pos) { return $scope.toastPosition[pos]; })\n      .join(' ');\n  };\n\n  $scope.complexToastIt = function() {\n    $materialToast({\n      controller: 'ToastCtrl',\n      templateUrl: 'toast-template.html',\n      duration: 5000,\n      position: $scope.getToastPosition()\n    });\n  };\n\n  $scope.toastIt = function() {\n    $materialToast({\n      template: 'Hello, ' + Math.random(),\n      duration: 2000,\n      position: $scope.getToastPosition()\n    });\n  };\n\n})\n\n.controller('ToastCtrl', function($scope, $hideToast) {\n  $scope.closeToast = function() {\n    $hideToast();\n  };\n});\n",
              "componentId": "material.components.toast",
              "componentName": "Toast",
              "basePath": "script.js",
              "type": "demo",
              "id": "demo1",
              "name": "Toast Basic Usage",
              "fileName": "script",
              "relativePath": "script.js/src/components/toast/demo1/script.js",
              "renderedContent": "\nangular.module('app', ['ngMaterial'])\n\n.controller('AppCtrl', function($scope, $materialToast, $animate) {\n  \n  $scope.toastPosition = {\n    bottom: true,\n    top: false,\n    left: true,\n    right: false,\n    fit: false\n  };\n\n  $scope.getToastPosition = function() {\n    return Object.keys($scope.toastPosition)\n      .filter(function(pos) { return $scope.toastPosition[pos]; })\n      .join(' ');\n  };\n\n  $scope.complexToastIt = function() {\n    $materialToast({\n      controller: 'ToastCtrl',\n      templateUrl: 'toast-template.html',\n      duration: 5000,\n      position: $scope.getToastPosition()\n    });\n  };\n\n  $scope.toastIt = function() {\n    $materialToast({\n      template: 'Hello, ' + Math.random(),\n      duration: 2000,\n      position: $scope.getToastPosition()\n    });\n  };\n\n})\n\n.controller('ToastCtrl', function($scope, $hideToast) {\n  $scope.closeToast = function() {\n    $hideToast();\n  };\n});\n\n"
            }
          ],
          "css": [],
          "renderedContent": "<!doctype html>\n<head>\n  <meta name=\"viewport\" content=\"initial-scale=1, maximum-scale=1\" />\n  <link rel=\"stylesheet\" href=\"../../../demo.css\">\n  <script src=\"//ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js\"></script>\n  <script src=\"//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular.min.js\"></script>\n  <script src=\"//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular-animate.min.js\"></script>\n  <script src=\"//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular-route.min.js\"></script>\n  <script src=\"../../../docs.js\"></script>\n  <script src=\"script.js\"></script>\n  \n  \n</head>\n<body>\n\n<div ng-app=\"app\" ng-controller=\"AppCtrl\">\n  <div class=\"inset\">\n    <button class=\"material-button\" ng-click=\"toastIt()\">\n      Simple Toast\n    </button>\n    <button class=\"material-button-raised material-button\" \n            ng-click=\"complexToastIt()\">\n      Advanced Toast\n    </button>\n  </div>\n  <material-card>\n    <div>\n      <b>Toast Position: \"{{getToastPosition()}}\"</b>\n    </div>\n    <material-checkbox ng-repeat=\"(name, isSelected) in toastPosition\"> \n      <input type=\"checkbox\" ng-model=\"toastPosition[name]\"> \n      {{name}}\n    </material-checkbox>\n  </material-card>\n</div>\n\n</body>\n</html>\n"
        }
      }
    },
    "template": "component.template.html",
    "outputPath": "components/material.components.toast/index.html",
    "repositoryUrl": "https://github.com/angular/material/tree/master/src/components/toast",
    "renderedContent": "<material-tabs class=\"demo-tabs\">\n  <material-tab ng-repeat=\"(_,demo) in currentComponent.demos\"\n           active=\"currentComponent.$selectedDemo === demo\"\n           ng-click=\"currentComponent.$selectedDemo = demo\" \n           label=\"{{demo.name}}\">\n  </material-tab>\n</material-tabs>\n<iframe class=\"demo\"\n        name=\"{{demo.id}}\"\n        ng-repeat=\"demo in currentComponent.demos\" \n        ng-show=\"currentComponent.$selectedDemo === demo\"\n        ng-src=\"{{demo.indexFile.outputPath}}\">\n</iframe>\n\n"
  },
  {
    "id": "material.components.toolbar",
    "name": "Toolbar",
    "demos": {
      "demo1": {
        "name": "Toolbar Basic Usage",
        "id": "demo1",
        "files": [
          {
            "template": "demo/template.file",
            "outputPath": "components/material.components.toolbar/demo1/script.js",
            "fileType": "js",
            "file": "src/components/toolbar/demo1/script.js",
            "content": "\nangular.module('app', ['ngMaterial'])\n\n.controller('AppCtrl', function($scope) {\n\n})\n\n.directive('svgIcon', function() {\n  return {\n    restrict: 'E',\n    replace: true,\n    template: '<svg viewBox=\"0 0 24 24\" style=\"pointer-events: none;\"><g><g><rect fill=\"none\" width=\"24\" height=\"24\"></rect><path d=\"M3,18h18v-2H3V18z M3,13h18v-2H3V13z M3,6v2h18V6H3z\"></path></g></g></svg>'\n  }\n});",
            "componentId": "material.components.toolbar",
            "componentName": "Toolbar",
            "basePath": "script.js",
            "type": "demo",
            "id": "demo1",
            "name": "Toolbar Basic Usage",
            "fileName": "script",
            "relativePath": "script.js/src/components/toolbar/demo1/script.js",
            "renderedContent": "\nangular.module('app', ['ngMaterial'])\n\n.controller('AppCtrl', function($scope) {\n\n})\n\n.directive('svgIcon', function() {\n  return {\n    restrict: 'E',\n    replace: true,\n    template: '<svg viewBox=\"0 0 24 24\" style=\"pointer-events: none;\"><g><g><rect fill=\"none\" width=\"24\" height=\"24\"></rect><path d=\"M3,18h18v-2H3V18z M3,13h18v-2H3V13z M3,6v2h18V6H3z\"></path></g></g></svg>'\n  }\n});\n"
          }
        ],
        "indexFile": {
          "template": "demo/template.index.html",
          "outputPath": "components/material.components.toolbar/demo1/index.html",
          "fileType": "html",
          "file": "src/components/toolbar/demo1/index.html",
          "content": "\n<div ng-app=\"app\" ng-controller=\"AppCtrl\">\n\n  <material-content>\n\n    <material-toolbar class=\"material-theme-light\">\n      <div class=\"material-toolbar-tools\">\n        <material-icon style=\"width: 24px; height: 24px;\">\n          <svg-icon></svg-icon>\n        </material-icon>\n        <span class=\"material-flex\">Toolbar: light-theme (default)</span>\n        <material-icon style=\"width: 24px; height: 24px;\">\n          <svg-icon></svg-icon>\n        </material-icon>\n        <material-icon style=\"width: 24px; height: 24px;\">\n          <svg-icon></svg-icon>\n        </material-icon>\n      </div>\n    </material-toolbar>\n\n    <br>\n\n    <material-toolbar class=\"material-theme-dark\">\n      <div class=\"material-toolbar-tools\">\n        <span class=\"material-flex\">Toolbar: dark-theme</span>\n      </div>\n    </material-toolbar>\n\n    <br>\n\n    <material-toolbar class=\"material-theme-green material-tall\">\n      <div class=\"material-toolbar-tools\">\n        <span class=\"material-flex\">Toolbar: tall</span>\n      </div>\n    </material-toolbar>\n\n    <br>\n\n    <material-toolbar class=\"material-theme-yellow material-tall\">\n      <div class=\"material-toolbar-tools material-toolbar-tools-bottom\">\n        <span class=\"material-flex\">Toolbar: tall with actions pin to the bottom</span>\n      </div>\n    </material-toolbar>\n\n    <br>\n\n    <material-toolbar class=\"material-theme-orange material-medium-tall\">\n      <div class=\"material-toolbar-tools material-toolbar-tools-top\">\n        <material-icon style=\"width: 24px; height: 24px;\">\n          <svg-icon></svg-icon>\n        </material-icon>\n        <span class=\"material-flex\"></span>\n      </div>\n      <div class=\"material-toolbar-tools material-toolbar-tools-bottom\">\n        <span class=\"material-flex material-indent\">Toolbar: medium tall with label aligns to the bottom</span>\n      </div>\n    </material-toolbar>\n\n    <br>\n\n    <material-toolbar class=\"material-theme-purple material-tall\">\n      <div class=\"material-toolbar-tools material-toolbar-tools-bottom\">\n        <div class=\"material-flex material-indent\" style=\"font-size: 18px\">Some stuff aligns to the bottom</div>\n      </div>\n      <div class=\"material-toolbar-tools material-toolbar-tools-middle\">\n        <span class=\"material-flex material-indent\">Toolbar: label aligns to the middle</span>\n      </div>\n      <div class=\"material-toolbar-tools material-toolbar-tools-top\">\n        <material-icon style=\"width: 24px; height: 24px;\">\n          <svg-icon></svg-icon>\n        </material-icon>\n        <span class=\"material-flex\"></span>\n      </div>\n    </material-toolbar>\n\n  </material-content>\n</div>\n",
          "componentId": "material.components.toolbar",
          "componentName": "Toolbar",
          "basePath": "index.html",
          "type": "demo",
          "id": "demo1",
          "name": "Toolbar Basic Usage",
          "fileName": "index",
          "relativePath": "index.html/src/components/toolbar/demo1/index.html",
          "js": [
            {
              "template": "demo/template.file",
              "outputPath": "components/material.components.toolbar/demo1/script.js",
              "fileType": "js",
              "file": "src/components/toolbar/demo1/script.js",
              "content": "\nangular.module('app', ['ngMaterial'])\n\n.controller('AppCtrl', function($scope) {\n\n})\n\n.directive('svgIcon', function() {\n  return {\n    restrict: 'E',\n    replace: true,\n    template: '<svg viewBox=\"0 0 24 24\" style=\"pointer-events: none;\"><g><g><rect fill=\"none\" width=\"24\" height=\"24\"></rect><path d=\"M3,18h18v-2H3V18z M3,13h18v-2H3V13z M3,6v2h18V6H3z\"></path></g></g></svg>'\n  }\n});",
              "componentId": "material.components.toolbar",
              "componentName": "Toolbar",
              "basePath": "script.js",
              "type": "demo",
              "id": "demo1",
              "name": "Toolbar Basic Usage",
              "fileName": "script",
              "relativePath": "script.js/src/components/toolbar/demo1/script.js",
              "renderedContent": "\nangular.module('app', ['ngMaterial'])\n\n.controller('AppCtrl', function($scope) {\n\n})\n\n.directive('svgIcon', function() {\n  return {\n    restrict: 'E',\n    replace: true,\n    template: '<svg viewBox=\"0 0 24 24\" style=\"pointer-events: none;\"><g><g><rect fill=\"none\" width=\"24\" height=\"24\"></rect><path d=\"M3,18h18v-2H3V18z M3,13h18v-2H3V13z M3,6v2h18V6H3z\"></path></g></g></svg>'\n  }\n});\n"
            }
          ],
          "css": [],
          "renderedContent": "<!doctype html>\n<head>\n  <meta name=\"viewport\" content=\"initial-scale=1, maximum-scale=1\" />\n  <link rel=\"stylesheet\" href=\"../../../demo.css\">\n  <script src=\"//ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js\"></script>\n  <script src=\"//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular.min.js\"></script>\n  <script src=\"//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular-animate.min.js\"></script>\n  <script src=\"//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular-route.min.js\"></script>\n  <script src=\"../../../docs.js\"></script>\n  <script src=\"script.js\"></script>\n  \n  \n</head>\n<body>\n\n<div ng-app=\"app\" ng-controller=\"AppCtrl\">\n\n  <material-content>\n\n    <material-toolbar class=\"material-theme-light\">\n      <div class=\"material-toolbar-tools\">\n        <material-icon style=\"width: 24px; height: 24px;\">\n          <svg-icon></svg-icon>\n        </material-icon>\n        <span class=\"material-flex\">Toolbar: light-theme (default)</span>\n        <material-icon style=\"width: 24px; height: 24px;\">\n          <svg-icon></svg-icon>\n        </material-icon>\n        <material-icon style=\"width: 24px; height: 24px;\">\n          <svg-icon></svg-icon>\n        </material-icon>\n      </div>\n    </material-toolbar>\n\n    <br>\n\n    <material-toolbar class=\"material-theme-dark\">\n      <div class=\"material-toolbar-tools\">\n        <span class=\"material-flex\">Toolbar: dark-theme</span>\n      </div>\n    </material-toolbar>\n\n    <br>\n\n    <material-toolbar class=\"material-theme-green material-tall\">\n      <div class=\"material-toolbar-tools\">\n        <span class=\"material-flex\">Toolbar: tall</span>\n      </div>\n    </material-toolbar>\n\n    <br>\n\n    <material-toolbar class=\"material-theme-yellow material-tall\">\n      <div class=\"material-toolbar-tools material-toolbar-tools-bottom\">\n        <span class=\"material-flex\">Toolbar: tall with actions pin to the bottom</span>\n      </div>\n    </material-toolbar>\n\n    <br>\n\n    <material-toolbar class=\"material-theme-orange material-medium-tall\">\n      <div class=\"material-toolbar-tools material-toolbar-tools-top\">\n        <material-icon style=\"width: 24px; height: 24px;\">\n          <svg-icon></svg-icon>\n        </material-icon>\n        <span class=\"material-flex\"></span>\n      </div>\n      <div class=\"material-toolbar-tools material-toolbar-tools-bottom\">\n        <span class=\"material-flex material-indent\">Toolbar: medium tall with label aligns to the bottom</span>\n      </div>\n    </material-toolbar>\n\n    <br>\n\n    <material-toolbar class=\"material-theme-purple material-tall\">\n      <div class=\"material-toolbar-tools material-toolbar-tools-bottom\">\n        <div class=\"material-flex material-indent\" style=\"font-size: 18px\">Some stuff aligns to the bottom</div>\n      </div>\n      <div class=\"material-toolbar-tools material-toolbar-tools-middle\">\n        <span class=\"material-flex material-indent\">Toolbar: label aligns to the middle</span>\n      </div>\n      <div class=\"material-toolbar-tools material-toolbar-tools-top\">\n        <material-icon style=\"width: 24px; height: 24px;\">\n          <svg-icon></svg-icon>\n        </material-icon>\n        <span class=\"material-flex\"></span>\n      </div>\n    </material-toolbar>\n\n  </material-content>\n</div>\n\n</body>\n</html>\n"
        }
      }
    },
    "template": "component.template.html",
    "outputPath": "components/material.components.toolbar/index.html",
    "repositoryUrl": "https://github.com/angular/material/tree/master/src/components/toolbar",
    "renderedContent": "<material-tabs class=\"demo-tabs\">\n  <material-tab ng-repeat=\"(_,demo) in currentComponent.demos\"\n           active=\"currentComponent.$selectedDemo === demo\"\n           ng-click=\"currentComponent.$selectedDemo = demo\" \n           label=\"{{demo.name}}\">\n  </material-tab>\n</material-tabs>\n<iframe class=\"demo\"\n        name=\"{{demo.id}}\"\n        ng-repeat=\"demo in currentComponent.demos\" \n        ng-show=\"currentComponent.$selectedDemo === demo\"\n        ng-src=\"{{demo.indexFile.outputPath}}\">\n</iframe>\n\n"
  },
  {
    "id": "material.components.whiteframe",
    "name": "Whiteframe",
    "demos": {
      "demo1": {
        "name": "Whiteframe Basic Usage",
        "id": "demo1",
        "files": [
          {
            "template": "demo/template.file",
            "outputPath": "components/material.components.whiteframe/demo1/script.js",
            "fileType": "js",
            "file": "src/components/whiteframe/demo1/script.js",
            "content": "\nangular.module('app', ['ngMaterial'])\n\n.controller('AppCtrl', function($scope) {\n\n});",
            "componentId": "material.components.whiteframe",
            "componentName": "Whiteframe",
            "basePath": "script.js",
            "type": "demo",
            "id": "demo1",
            "name": "Whiteframe Basic Usage",
            "fileName": "script",
            "relativePath": "script.js/src/components/whiteframe/demo1/script.js",
            "renderedContent": "\nangular.module('app', ['ngMaterial'])\n\n.controller('AppCtrl', function($scope) {\n\n});\n"
          },
          {
            "template": "demo/template.file",
            "outputPath": "components/material.components.whiteframe/demo1/style.css",
            "fileType": "css",
            "file": "src/components/whiteframe/demo1/style.css",
            "content": "material-whiteframe {\n  background: #fff;\n  margin: 25px;\n}\nmaterial-whiteframe div {\n  text-align: center;\n  padding: 25px;\n}\n",
            "componentId": "material.components.whiteframe",
            "componentName": "Whiteframe",
            "basePath": "style.css",
            "type": "demo",
            "id": "demo1",
            "name": "Whiteframe Basic Usage",
            "fileName": "style",
            "relativePath": "style.css/src/components/whiteframe/demo1/style.css",
            "renderedContent": "material-whiteframe {\n  background: #fff;\n  margin: 25px;\n}\nmaterial-whiteframe div {\n  text-align: center;\n  padding: 25px;\n}\n\n"
          }
        ],
        "indexFile": {
          "template": "demo/template.index.html",
          "outputPath": "components/material.components.whiteframe/demo1/index.html",
          "fileType": "html",
          "file": "src/components/whiteframe/demo1/index.html",
          "content": "\n<div ng-app=\"app\" ng-controller=\"AppCtrl\">\n  <div class=\"material-display-flex material-flex-h\">\n    <material-whiteframe class=\"material-flex material-display-flex material-flex-center material-whiteframe-z1\">\n      <div class=\"material-flex\">\n        z1\n      </div>\n    </material-whiteframe>\n    <material-whiteframe class=\"material-flex material-display-flex material-flex-center material-whiteframe-z2\">\n      <div class=\"material-flex\">\n        z2\n      </div>\n    </material-whiteframe>\n    <material-whiteframe class=\"material-flex material-display-flex material-flex-center material-whiteframe-z3\">\n      <div class=\"material-flex\">\n        z3\n      </div>\n    </material-whiteframe>\n  </div>\n  <div class=\"material-display-flex material-flex-h\">\n    <material-whiteframe class=\"material-flex material-display-flex material-flex-center material-whiteframe-z4\">\n      <div class=\"material-flex\">\n        z4\n      </div>\n    </material-whiteframe>\n    <material-whiteframe class=\"material-flex material-display-flex material-flex-center material-whiteframe-z5\">\n      <div class=\"material-flex\">\n        z5\n      </div>\n    </material-whiteframe>\n  </div>\n</div>",
          "componentId": "material.components.whiteframe",
          "componentName": "Whiteframe",
          "basePath": "index.html",
          "type": "demo",
          "id": "demo1",
          "name": "Whiteframe Basic Usage",
          "fileName": "index",
          "relativePath": "index.html/src/components/whiteframe/demo1/index.html",
          "js": [
            {
              "template": "demo/template.file",
              "outputPath": "components/material.components.whiteframe/demo1/script.js",
              "fileType": "js",
              "file": "src/components/whiteframe/demo1/script.js",
              "content": "\nangular.module('app', ['ngMaterial'])\n\n.controller('AppCtrl', function($scope) {\n\n});",
              "componentId": "material.components.whiteframe",
              "componentName": "Whiteframe",
              "basePath": "script.js",
              "type": "demo",
              "id": "demo1",
              "name": "Whiteframe Basic Usage",
              "fileName": "script",
              "relativePath": "script.js/src/components/whiteframe/demo1/script.js",
              "renderedContent": "\nangular.module('app', ['ngMaterial'])\n\n.controller('AppCtrl', function($scope) {\n\n});\n"
            }
          ],
          "css": [
            {
              "template": "demo/template.file",
              "outputPath": "components/material.components.whiteframe/demo1/style.css",
              "fileType": "css",
              "file": "src/components/whiteframe/demo1/style.css",
              "content": "material-whiteframe {\n  background: #fff;\n  margin: 25px;\n}\nmaterial-whiteframe div {\n  text-align: center;\n  padding: 25px;\n}\n",
              "componentId": "material.components.whiteframe",
              "componentName": "Whiteframe",
              "basePath": "style.css",
              "type": "demo",
              "id": "demo1",
              "name": "Whiteframe Basic Usage",
              "fileName": "style",
              "relativePath": "style.css/src/components/whiteframe/demo1/style.css",
              "renderedContent": "material-whiteframe {\n  background: #fff;\n  margin: 25px;\n}\nmaterial-whiteframe div {\n  text-align: center;\n  padding: 25px;\n}\n\n"
            }
          ],
          "renderedContent": "<!doctype html>\n<head>\n  <meta name=\"viewport\" content=\"initial-scale=1, maximum-scale=1\" />\n  <link rel=\"stylesheet\" href=\"../../../demo.css\">\n  <script src=\"//ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js\"></script>\n  <script src=\"//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular.min.js\"></script>\n  <script src=\"//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular-animate.min.js\"></script>\n  <script src=\"//ajax.googleapis.com/ajax/libs/angularjs/1.2.19/angular-route.min.js\"></script>\n  <script src=\"../../../docs.js\"></script>\n  <script src=\"script.js\"></script>\n  \n  <link rel=\"stylesheet\" href=\"style.css\">\n  \n</head>\n<body>\n\n<div ng-app=\"app\" ng-controller=\"AppCtrl\">\n  <div class=\"material-display-flex material-flex-h\">\n    <material-whiteframe class=\"material-flex material-display-flex material-flex-center material-whiteframe-z1\">\n      <div class=\"material-flex\">\n        z1\n      </div>\n    </material-whiteframe>\n    <material-whiteframe class=\"material-flex material-display-flex material-flex-center material-whiteframe-z2\">\n      <div class=\"material-flex\">\n        z2\n      </div>\n    </material-whiteframe>\n    <material-whiteframe class=\"material-flex material-display-flex material-flex-center material-whiteframe-z3\">\n      <div class=\"material-flex\">\n        z3\n      </div>\n    </material-whiteframe>\n  </div>\n  <div class=\"material-display-flex material-flex-h\">\n    <material-whiteframe class=\"material-flex material-display-flex material-flex-center material-whiteframe-z4\">\n      <div class=\"material-flex\">\n        z4\n      </div>\n    </material-whiteframe>\n    <material-whiteframe class=\"material-flex material-display-flex material-flex-center material-whiteframe-z5\">\n      <div class=\"material-flex\">\n        z5\n      </div>\n    </material-whiteframe>\n  </div>\n</div>\n</body>\n</html>\n"
        }
      }
    },
    "template": "component.template.html",
    "outputPath": "components/material.components.whiteframe/index.html",
    "repositoryUrl": "https://github.com/angular/material/tree/master/src/components/whiteframe",
    "renderedContent": "<material-tabs class=\"demo-tabs\">\n  <material-tab ng-repeat=\"(_,demo) in currentComponent.demos\"\n           active=\"currentComponent.$selectedDemo === demo\"\n           ng-click=\"currentComponent.$selectedDemo = demo\" \n           label=\"{{demo.name}}\">\n  </material-tab>\n</material-tabs>\n<iframe class=\"demo\"\n        name=\"{{demo.id}}\"\n        ng-repeat=\"demo in currentComponent.demos\" \n        ng-show=\"currentComponent.$selectedDemo === demo\"\n        ng-src=\"{{demo.indexFile.outputPath}}\">\n</iframe>\n\n"
  }
])

DocsApp.directive('highlight', function() {
  return {
    restrict: 'A',
    link: function(scope, element, attrs) {
      scope.$watch(attrs.highlight, highlight);
      scope.$watch(attrs.highlightLanguage, highlight);

      function highlight() {
        //Always add a newline at the start - stops a weird spacing bug
        var code = '\n' + (''+scope.$eval(attrs.highlight)).trim();
        var language = scope.$eval(attrs.highlightLanguage);
        if (code && language) {
          var highlightedCode = hljs.highlight(language, code);
          element.html(highlightedCode.value);
        }
      }
    }
  };
});

var hljs=new function(){function k(v){return v.replace(/&/gm,"&amp;").replace(/</gm,"&lt;").replace(/>/gm,"&gt;")}function t(v){return v.nodeName.toLowerCase()}function i(w,x){var v=w&&w.exec(x);return v&&v.index==0}function d(v){return Array.prototype.map.call(v.childNodes,function(w){if(w.nodeType==3){return b.useBR?w.nodeValue.replace(/\n/g,""):w.nodeValue}if(t(w)=="br"){return"\n"}return d(w)}).join("")}function r(w){var v=(w.className+" "+(w.parentNode?w.parentNode.className:"")).split(/\s+/);v=v.map(function(x){return x.replace(/^language-/,"")});return v.filter(function(x){return j(x)||x=="no-highlight"})[0]}function o(x,y){var v={};for(var w in x){v[w]=x[w]}if(y){for(var w in y){v[w]=y[w]}}return v}function u(x){var v=[];(function w(y,z){for(var A=y.firstChild;A;A=A.nextSibling){if(A.nodeType==3){z+=A.nodeValue.length}else{if(t(A)=="br"){z+=1}else{if(A.nodeType==1){v.push({event:"start",offset:z,node:A});z=w(A,z);v.push({event:"stop",offset:z,node:A})}}}}return z})(x,0);return v}function q(w,y,C){var x=0;var F="";var z=[];function B(){if(!w.length||!y.length){return w.length?w:y}if(w[0].offset!=y[0].offset){return(w[0].offset<y[0].offset)?w:y}return y[0].event=="start"?w:y}function A(H){function G(I){return" "+I.nodeName+'="'+k(I.value)+'"'}F+="<"+t(H)+Array.prototype.map.call(H.attributes,G).join("")+">"}function E(G){F+="</"+t(G)+">"}function v(G){(G.event=="start"?A:E)(G.node)}while(w.length||y.length){var D=B();F+=k(C.substr(x,D[0].offset-x));x=D[0].offset;if(D==w){z.reverse().forEach(E);do{v(D.splice(0,1)[0]);D=B()}while(D==w&&D.length&&D[0].offset==x);z.reverse().forEach(A)}else{if(D[0].event=="start"){z.push(D[0].node)}else{z.pop()}v(D.splice(0,1)[0])}}return F+k(C.substr(x))}function m(y){function v(z){return(z&&z.source)||z}function w(A,z){return RegExp(v(A),"m"+(y.cI?"i":"")+(z?"g":""))}function x(D,C){if(D.compiled){return}D.compiled=true;D.k=D.k||D.bK;if(D.k){var z={};function E(G,F){if(y.cI){F=F.toLowerCase()}F.split(" ").forEach(function(H){var I=H.split("|");z[I[0]]=[G,I[1]?Number(I[1]):1]})}if(typeof D.k=="string"){E("keyword",D.k)}else{Object.keys(D.k).forEach(function(F){E(F,D.k[F])})}D.k=z}D.lR=w(D.l||/\b[A-Za-z0-9_]+\b/,true);if(C){if(D.bK){D.b=D.bK.split(" ").join("|")}if(!D.b){D.b=/\B|\b/}D.bR=w(D.b);if(!D.e&&!D.eW){D.e=/\B|\b/}if(D.e){D.eR=w(D.e)}D.tE=v(D.e)||"";if(D.eW&&C.tE){D.tE+=(D.e?"|":"")+C.tE}}if(D.i){D.iR=w(D.i)}if(D.r===undefined){D.r=1}if(!D.c){D.c=[]}var B=[];D.c.forEach(function(F){if(F.v){F.v.forEach(function(G){B.push(o(F,G))})}else{B.push(F=="self"?D:F)}});D.c=B;D.c.forEach(function(F){x(F,D)});if(D.starts){x(D.starts,C)}var A=D.c.map(function(F){return F.bK?"\\.?\\b("+F.b+")\\b\\.?":F.b}).concat([D.tE]).concat([D.i]).map(v).filter(Boolean);D.t=A.length?w(A.join("|"),true):{exec:function(F){return null}};D.continuation={}}x(y)}function c(S,L,J,R){function v(U,V){for(var T=0;T<V.c.length;T++){if(i(V.c[T].bR,U)){return V.c[T]}}}function z(U,T){if(i(U.eR,T)){return U}if(U.eW){return z(U.parent,T)}}function A(T,U){return !J&&i(U.iR,T)}function E(V,T){var U=M.cI?T[0].toLowerCase():T[0];return V.k.hasOwnProperty(U)&&V.k[U]}function w(Z,X,W,V){var T=V?"":b.classPrefix,U='<span class="'+T,Y=W?"":"</span>";U+=Z+'">';return U+X+Y}function N(){var U=k(C);if(!I.k){return U}var T="";var X=0;I.lR.lastIndex=0;var V=I.lR.exec(U);while(V){T+=U.substr(X,V.index-X);var W=E(I,V);if(W){H+=W[1];T+=w(W[0],V[0])}else{T+=V[0]}X=I.lR.lastIndex;V=I.lR.exec(U)}return T+U.substr(X)}function F(){if(I.sL&&!f[I.sL]){return k(C)}var T=I.sL?c(I.sL,C,true,I.continuation.top):g(C);if(I.r>0){H+=T.r}if(I.subLanguageMode=="continuous"){I.continuation.top=T.top}return w(T.language,T.value,false,true)}function Q(){return I.sL!==undefined?F():N()}function P(V,U){var T=V.cN?w(V.cN,"",true):"";if(V.rB){D+=T;C=""}else{if(V.eB){D+=k(U)+T;C=""}else{D+=T;C=U}}I=Object.create(V,{parent:{value:I}})}function G(T,X){C+=T;if(X===undefined){D+=Q();return 0}var V=v(X,I);if(V){D+=Q();P(V,X);return V.rB?0:X.length}var W=z(I,X);if(W){var U=I;if(!(U.rE||U.eE)){C+=X}D+=Q();do{if(I.cN){D+="</span>"}H+=I.r;I=I.parent}while(I!=W.parent);if(U.eE){D+=k(X)}C="";if(W.starts){P(W.starts,"")}return U.rE?0:X.length}if(A(X,I)){throw new Error('Illegal lexeme "'+X+'" for mode "'+(I.cN||"<unnamed>")+'"')}C+=X;return X.length||1}var M=j(S);if(!M){throw new Error('Unknown language: "'+S+'"')}m(M);var I=R||M;var D="";for(var K=I;K!=M;K=K.parent){if(K.cN){D=w(K.cN,D,true)}}var C="";var H=0;try{var B,y,x=0;while(true){I.t.lastIndex=x;B=I.t.exec(L);if(!B){break}y=G(L.substr(x,B.index-x),B[0]);x=B.index+y}G(L.substr(x));for(var K=I;K.parent;K=K.parent){if(K.cN){D+="</span>"}}return{r:H,value:D,language:S,top:I}}catch(O){if(O.message.indexOf("Illegal")!=-1){return{r:0,value:k(L)}}else{throw O}}}function g(y,x){x=x||b.languages||Object.keys(f);var v={r:0,value:k(y)};var w=v;x.forEach(function(z){if(!j(z)){return}var A=c(z,y,false);A.language=z;if(A.r>w.r){w=A}if(A.r>v.r){w=v;v=A}});if(w.language){v.second_best=w}return v}function h(v){if(b.tabReplace){v=v.replace(/^((<[^>]+>|\t)+)/gm,function(w,z,y,x){return z.replace(/\t/g,b.tabReplace)})}if(b.useBR){v=v.replace(/\n/g,"<br>")}return v}function p(z){var y=d(z);var A=r(z);if(A=="no-highlight"){return}var v=A?c(A,y,true):g(y);var w=u(z);if(w.length){var x=document.createElementNS("http://www.w3.org/1999/xhtml","pre");x.innerHTML=v.value;v.value=q(w,u(x),y)}v.value=h(v.value);z.innerHTML=v.value;z.className+=" hljs "+(!A&&v.language||"");z.result={language:v.language,re:v.r};if(v.second_best){z.second_best={language:v.second_best.language,re:v.second_best.r}}}var b={classPrefix:"hljs-",tabReplace:null,useBR:false,languages:undefined};function s(v){b=o(b,v)}function l(){if(l.called){return}l.called=true;var v=document.querySelectorAll("pre code");Array.prototype.forEach.call(v,p)}function a(){addEventListener("DOMContentLoaded",l,false);addEventListener("load",l,false)}var f={};var n={};function e(v,x){var w=f[v]=x(this);if(w.aliases){w.aliases.forEach(function(y){n[y]=v})}}function j(v){return f[v]||f[n[v]]}this.highlight=c;this.highlightAuto=g;this.fixMarkup=h;this.highlightBlock=p;this.configure=s;this.initHighlighting=l;this.initHighlightingOnLoad=a;this.registerLanguage=e;this.getLanguage=j;this.inherit=o;this.IR="[a-zA-Z][a-zA-Z0-9_]*";this.UIR="[a-zA-Z_][a-zA-Z0-9_]*";this.NR="\\b\\d+(\\.\\d+)?";this.CNR="(\\b0[xX][a-fA-F0-9]+|(\\b\\d+(\\.\\d*)?|\\.\\d+)([eE][-+]?\\d+)?)";this.BNR="\\b(0b[01]+)";this.RSR="!|!=|!==|%|%=|&|&&|&=|\\*|\\*=|\\+|\\+=|,|-|-=|/=|/|:|;|<<|<<=|<=|<|===|==|=|>>>=|>>=|>=|>>>|>>|>|\\?|\\[|\\{|\\(|\\^|\\^=|\\||\\|=|\\|\\||~";this.BE={b:"\\\\[\\s\\S]",r:0};this.ASM={cN:"string",b:"'",e:"'",i:"\\n",c:[this.BE]};this.QSM={cN:"string",b:'"',e:'"',i:"\\n",c:[this.BE]};this.CLCM={cN:"comment",b:"//",e:"$"};this.CBLCLM={cN:"comment",b:"/\\*",e:"\\*/"};this.HCM={cN:"comment",b:"#",e:"$"};this.NM={cN:"number",b:this.NR,r:0};this.CNM={cN:"number",b:this.CNR,r:0};this.BNM={cN:"number",b:this.BNR,r:0};this.REGEXP_MODE={cN:"regexp",b:/\//,e:/\/[gim]*/,i:/\n/,c:[this.BE,{b:/\[/,e:/\]/,r:0,c:[this.BE]}]};this.TM={cN:"title",b:this.IR,r:0};this.UTM={cN:"title",b:this.UIR,r:0}}();hljs.registerLanguage("javascript",function(a){return{aliases:["js"],k:{keyword:"in if for while finally var new function do return void else break catch instanceof with throw case default try this switch continue typeof delete let yield const class",literal:"true false null undefined NaN Infinity",built_in:"eval isFinite isNaN parseFloat parseInt decodeURI decodeURIComponent encodeURI encodeURIComponent escape unescape Object Function Boolean Error EvalError InternalError RangeError ReferenceError StopIteration SyntaxError TypeError URIError Number Math Date String RegExp Array Float32Array Float64Array Int16Array Int32Array Int8Array Uint16Array Uint32Array Uint8Array Uint8ClampedArray ArrayBuffer DataView JSON Intl arguments require"},c:[{cN:"pi",b:/^\s*('|")use strict('|")/,r:10},a.ASM,a.QSM,a.CLCM,a.CBLCLM,a.CNM,{b:"("+a.RSR+"|\\b(case|return|throw)\\b)\\s*",k:"return throw case",c:[a.CLCM,a.CBLCLM,a.REGEXP_MODE,{b:/</,e:/>;/,r:0,sL:"xml"}],r:0},{cN:"function",bK:"function",e:/\{/,c:[a.inherit(a.TM,{b:/[A-Za-z$_][0-9A-Za-z$_]*/}),{cN:"params",b:/\(/,e:/\)/,c:[a.CLCM,a.CBLCLM],i:/["'\(]/}],i:/\[|%/},{b:/\$[(.]/},{b:"\\."+a.IR,r:0}]}});hljs.registerLanguage("css",function(a){var b="[a-zA-Z-][a-zA-Z0-9_-]*";var c={cN:"function",b:b+"\\(",e:"\\)",c:["self",a.NM,a.ASM,a.QSM]};return{cI:true,i:"[=/|']",c:[a.CBLCLM,{cN:"id",b:"\\#[A-Za-z0-9_-]+"},{cN:"class",b:"\\.[A-Za-z0-9_-]+",r:0},{cN:"attr_selector",b:"\\[",e:"\\]",i:"$"},{cN:"pseudo",b:":(:)?[a-zA-Z0-9\\_\\-\\+\\(\\)\\\"\\']+"},{cN:"at_rule",b:"@(font-face|page)",l:"[a-z-]+",k:"font-face page"},{cN:"at_rule",b:"@",e:"[{;]",c:[{cN:"keyword",b:/\S+/},{b:/\s/,eW:true,eE:true,r:0,c:[c,a.ASM,a.QSM,a.NM]}]},{cN:"tag",b:b,r:0},{cN:"rules",b:"{",e:"}",i:"[^\\s]",r:0,c:[a.CBLCLM,{cN:"rule",b:"[^\\s]",rB:true,e:";",eW:true,c:[{cN:"attribute",b:"[A-Z\\_\\.\\-]+",e:":",eE:true,i:"[^\\s]",starts:{cN:"value",eW:true,eE:true,c:[c,a.NM,a.QSM,a.ASM,a.CBLCLM,{cN:"hexcolor",b:"#[0-9A-Fa-f]+"},{cN:"important",b:"!important"}]}}]}]}]}});hljs.registerLanguage("xml",function(a){var c="[A-Za-z0-9\\._:-]+";var d={b:/<\?(php)?(?!\w)/,e:/\?>/,sL:"php",subLanguageMode:"continuous"};var b={eW:true,i:/</,r:0,c:[d,{cN:"attribute",b:c,r:0},{b:"=",r:0,c:[{cN:"value",v:[{b:/"/,e:/"/},{b:/'/,e:/'/},{b:/[^\s\/>]+/}]}]}]};return{aliases:["html"],cI:true,c:[{cN:"doctype",b:"<!DOCTYPE",e:">",r:10,c:[{b:"\\[",e:"\\]"}]},{cN:"comment",b:"<!--",e:"-->",r:10},{cN:"cdata",b:"<\\!\\[CDATA\\[",e:"\\]\\]>",r:10},{cN:"tag",b:"<style(?=\\s|>|$)",e:">",k:{title:"style"},c:[b],starts:{e:"</style>",rE:true,sL:"css"}},{cN:"tag",b:"<script(?=\\s|>|$)",e:">",k:{title:"script"},c:[b],starts:{e:"<\/script>",rE:true,sL:"javascript"}},{b:"<%",e:"%>",sL:"vbscript"},d,{cN:"pi",b:/<\?\w+/,e:/\?>/,r:10},{cN:"tag",b:"</?",e:"/?>",c:[{cN:"title",b:"[^ /><]+",r:0},b]}]}});