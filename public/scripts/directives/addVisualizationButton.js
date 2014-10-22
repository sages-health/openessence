'use strict';

var angular = require('angular');

// @ngInject
module.exports = function ($compile, $timeout, $window, $position, debounce) {
  return {
    template: require('../../partials/add-visualization-button.html'),
    restrict: 'E',
    transclude: true,
    scope: {
      menuOpen: '=?',
      menuPosition: '=?',
      buttonClasses: '=?'
    },
    compile: function () {
      return {
        pre: function (scope) {
          scope.menuPosition = scope.menuPosition || 'bottom-right';
        },

        post: function (scope, element) {
          var vizMenuTpl = $compile(require('../../partials/visualization-menu.html'))(scope);
          var button = element.find('button').first();
          var popover = element.find('.popover').first();
          var popoverContent = popover.find('.popover-content').first();

          popover.css('display', 'block');
          popoverContent.append(vizMenuTpl);

          var placeMenu = function () {
            if (!scope.menuOpen) {
              return;
            }

            var position = $position.position(button);
            var ttWidth = popover.prop('offsetWidth');
            var ttHeight = popover.prop('offsetHeight');
            var ttPosition;

            if (scope.menuPosition === 'bottom') {
              ttPosition = {
                top: position.top + position.height,
                left: position.left + position.width / 2 - ttWidth / 2
              };
            } else if (scope.menuPosition === 'bottom-right') {
              ttPosition = {
                top: position.top + position.height,
                left: position.left
              };
            } else if (scope.menuPosition === 'bottom-left') {
              ttPosition = {
                top: position.top + position.height,
                left: position.left - ttWidth + position.width
              };
            } else if (scope.menuPosition === 'top') {
              ttPosition = {
                top: position.top - ttHeight,
                left: position.left + position.width / 2 - ttWidth / 2
              };
            } else {
              throw new Error('Unsupported position ' + scope.menuPosition);
            }

            popover.css(ttPosition);
          };

          scope.$watchCollection('[menuOpen, menuPosition]', placeMenu);
          scope.$watchCollection(function () {
            // Move popover whenever button moves. Note that this will only work if moving the button causes a digest
            // to occur. This is usually the case when the button moves because of user interaction, e.g. clicking the
            // "Add Filter" button, but may not always hold.
            return $position.position(button);
          }, placeMenu);

          var onWindowResize = debounce(placeMenu, 10);
          var windowEl = angular.element($window);
          windowEl.on('resize', onWindowResize);
          scope.$on('$destroy', function () {
            onWindowResize.cancel();
            windowEl.off('resize', onWindowResize);
          });

          scope.toggleMenu = function () {
            scope.menuOpen = !scope.menuOpen;
            button.blur();
          };

          scope.changeView = function (view) {
            scope.menuView = view;
          };

          scope.selectVisualization = function (name, options) {
            scope.menuOpen = false;
            scope.menuView = null;
            scope.$emit('visualizationSelect', name, options);
          };
        }
      };
    }
  };
};
