"use strict";

var APP = {
	// сет брейкпоинтов для js
	// должны совпадать с теми что в body:after
	mediaBreakpoint: {
		sm: 576,
		md: 768,
		lg: 992,
		xl: 1200
	},
	cache: {},
	initBefore: function initBefore() {
		APP.polyfills();
		APP.svgIcons();
		document.documentElement.className = document.documentElement.className.replace("no-js", "js");
	},

	init: function init() {
		APP.detectIE();
		APP.lazyload();

		APP.objectFitFallback(document.querySelectorAll('[data-object-fit]'));

		var myMask = new APP.Mask(".js-tel");
		myMask.init();

		APP.setCurrentPosition();
		APP.mapOptions();
		APP.tooltipsInit();
		APP.mouseOverMap();

		APP.buttons();
		APP.closeOnFocusLost();
	},

	initOnLoad: function initOnLoad() {
		APP.truncateText(document.querySelectorAll('.js-dot'));
	},

	buttons: function buttons() {
		Array.prototype.forEach.call(document.querySelectorAll('.menu-trigger'), function (item) {
			item.addEventListener('click', function () {
				document.body.classList.toggle('nav-showed');
			});
		});
	},

	closeOnFocusLost: function closeOnFocusLost() {
		document.addEventListener('click', function (e) {
			var trg = e.target;
			if (!trg.closest(".header")) {
				document.body.classList.remove('nav-showed');
			}
		});
	},

	tooltipsInit: function tooltipsInit() {
		tippy('[data-tippy-content]', {
			animation: 'fade',
			arrow: true,
			arrowType: 'round'
		});

		var initTippy = function initTippy(item) {
			var template = item.querySelector('.js-tooltip-content');
			tippy(item, {
				content: template,
				theme: 'light-border',
				interactive: true,
				arrow: true,
				trigger: 'click',
				arrowType: 'round'
			});
			template.classList.remove('d-none');
		};

		Array.prototype.forEach.call(document.querySelectorAll('.js-tooltip'), initTippy);
	},

	mapOptions: function mapOptions() {
		var form = document.querySelector('.map-settings form');
		var map = document.querySelector('.map');
		var state = {
			MAP_HIDE_MARKERS: 'map--hide-markers',
			MAP_INVISIBLE_MARKERS: 'map--invisible-markers'
		};

		var hideMarkers = function hideMarkers(input) {
			if (input.checked) {
				map.classList.add(state.MAP_HIDE_MARKERS);
			} else {
				map.classList.remove(state.MAP_HIDE_MARKERS);
			}
		};

		var invisibleMarkers = function invisibleMarkers(input) {
			if (input.checked) {
				map.classList.add(state.MAP_INVISIBLE_MARKERS);
			} else {
				map.classList.remove(state.MAP_INVISIBLE_MARKERS);
			}
		};

		if (!form) {
			return;
		}
		Array.prototype.forEach.call(form.querySelectorAll('input'), function (input) {
			input.addEventListener('change', function (e) {
				var name = input.getAttribute('name');

				switch (name) {
					case 'hidden-markers':
						hideMarkers(input);
						break;
					case 'invisible-markers':
						invisibleMarkers(input);
						break;
					default:
						console.log('options switched');
						break;
				}
			});
		});
	},

	calcCoordinates: function calcCoordinates() {
		var x = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0.01;
		var y = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0.01;
		var getLatLng = arguments[2];

		var latOfPercent = 0.149;
		var lngOfPercent = 0.146;
		if (getLatLng) {
			var lat = parseInt((x - 50) * 7);
			var lng = parseInt((y - 50) * 7);
			return {
				top: lng,
				left: lat
			};
		} else {
			var mapX = 50 + x * latOfPercent;
			var mapY = 50 + y * lngOfPercent;
			return {
				top: mapY,
				left: mapX
			};
		}
	},

	setCurrentPosition: function setCurrentPosition() {
		var form = document.querySelector('.js-coords-form');
		if (!form) {
			return;
		}

		var updateTooltip = function updateTooltip(elem, lat, lng) {
			var title = elem.getAttribute('data-tippy-content');
			var newTitle = title.replace('{{ lat }}', lat);
			newTitle = newTitle.replace('{{ lng }}', lng);
			elem._tippy.setContent(newTitle);
		};

		form.addEventListener('submit', function (e) {
			e.preventDefault();
			var playerMarker = document.querySelector('.js-player-marker');
			var lat = form.querySelector('input[name="lat"]').value * 1;
			var lng = form.querySelector('input[name="lng"]').value * 1;
			var pos = APP.calcCoordinates(lat, lng);

			if (pos.left > 100 || pos.top > 100 || pos.top < 0 || pos.left < 0) {
				alert('Неверные координаты');
			} else {
				playerMarker.classList.remove('d-none');
				playerMarker.style.left = pos.left + '%';
				playerMarker.style.top = pos.top + '%';
				updateTooltip(playerMarker, lat, lng);
			}
		});
	},

	mouseOverMap: function mouseOverMap() {
		var mapLayout = document.querySelector('.map__layout');
		var positionField = document.getElementById('position');
		if (mapLayout) {
			mapLayout.onmousemove = function (e) {
				var posPercent = getPosition(e);
				var posLatLng = APP.calcCoordinates(posPercent.x, posPercent.y, true);

				positionField.innerHTML = 'lat: ' + posLatLng.left + ', long: ' + posLatLng.top;
				positionField.style.display = 'block';
				positionField.style.top = posPercent.y + '%';
				positionField.style.left = posPercent.x + '%';
			};
			mapLayout.onmouseleave = function () {
				positionField.style.top = 0;
				positionField.style.left = 0;
				positionField.style.display = 'none';
			};
		}

		function getPosition(e) {
			var rect = e.target.getBoundingClientRect();
			var x = e.clientX - rect.left;
			var y = e.clientY - rect.top;
			var sizeX = e.target.offsetWidth;
			var sizeY = e.target.offsetHeight;
			var percentX = parseInt(x / sizeX * 100 * 10) / 10;
			var percentY = parseInt(y / sizeY * 100 * 10) / 10;
			return {
				x: percentX,
				y: percentY
			};
		}
	},

	Mask: function Mask(selector) {
		var regExpString = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "+7 (___) ___-__-__";

		this.elements = document.querySelectorAll(selector);
		this.init = function () {
			listeners(this.elements);
		};

		var listeners = function listeners(selector) {
			for (var i = 0; i < selector.length; i++) {
				var input = selector[i];
				input.addEventListener("input", mask, false);
				input.addEventListener("focus", mask, false);
				input.addEventListener("blur", mask, false);
			}
		};

		var setCursorPosition = function setCursorPosition(pos, elem) {
			elem.focus();
			if (elem.setSelectionRange) elem.setSelectionRange(pos, pos);else if (elem.createTextRange) {
				var range = elem.createTextRange();
				range.collapse(true);
				range.moveEnd("character", pos);
				range.moveStart("character", pos);
				range.select();
			}
		};

		var mask = function mask(event) {
			var matrix = regExpString,
			    i = 0,
			    def = matrix.replace(/\D/g, ""),
			    val = this.value.replace(/\D/g, "");
			if (def.length >= val.length) val = def;
			this.value = matrix.replace(/./g, function (a) {
				return (/[_\d]/.test(a) && i < val.length ? val.charAt(i++) : i >= val.length ? "" : a
				);
			});
			if (event.type == "blur") {
				if (this.value.length == 2) this.value = "";
			} else {
				setCursorPosition(this.value.length, this);
			}
		};
	},

	truncateText: function truncateText(selector) {
		var cutText = function cutText() {
			for (var i = 0; i < selector.length; i++) {
				var text = selector[i];
				var elemMaxHeight = parseInt(getComputedStyle(text).maxHeight, 10);
				var elemHeight = parseInt(getComputedStyle(text).height, 10);
				var maxHeight = elemMaxHeight ? elemMaxHeight : elemHeight;
				shave(text, maxHeight);
			}
		};

		APP.cache.cutTextListener = APP.throttle(cutText, 100);

		cutText();

		window.addEventListener('resize', APP.cache.cutTextListener);
	},

	lazyload: function lazyload() {
		if (typeof APP.myLazyLoad == 'undefined') {
			_regularInit();
		} else {
			_update();
		}

		function _update() {
			// console.log('LazyLoad update');
			APP.myLazyLoad.update();
			APP.objectFitFallback(document.querySelectorAll('[data-object-fit]'));
		}

		function _regularInit() {
			// console.log('LazyLoad first init');
			APP.myLazyLoad = new LazyLoad({
				elements_selector: ".lazyload",
				callback_error: function callback_error(el) {
					el.parentElement.classList.add('lazyload-error');
				}
			});
			APP.objectFitFallback(document.querySelectorAll('[data-object-fit]'));
		}
	},

	objectFitFallback: function objectFitFallback(selector) {
		if ('objectFit' in document.documentElement.style === false) {
			console.log('objectFit Fallback');
			for (var i = 0; i < selector.length; i++) {
				var that = selector[i];
				var imgUrl = that.getAttribute('src');
				var dataFit = that.getAttribute('data-object-fit');
				var fitStyle = void 0;
				if (dataFit === 'contain') {
					fitStyle = 'contain';
				} else if (dataFit === 'cover') {
					fitStyle = 'cover';
				} else {
					fitStyle = 'auto';
				}
				var parent = that.parentElement;
				if (imgUrl) {
					parent.style.backgroundImage = 'url(' + imgUrl + ')';
					parent.style.backgroundSize = fitStyle;
					parent.classList.add('fit-img');
				}
			};
		}
	},

	svgIcons: function svgIcons() {
		var container = document.querySelector('[data-svg-path]');
		var path = container.getAttribute('data-svg-path');
		var xhr = new XMLHttpRequest();
		xhr.onload = function () {
			container.innerHTML = this.responseText;
		};
		xhr.open('get', path, true);
		xhr.send();
	},

	polyfills: function polyfills() {
		/**
   * polyfill for .closest
   */
		(function (ELEMENT) {
			ELEMENT.matches = ELEMENT.matches || ELEMENT.mozMatchesSelector || ELEMENT.msMatchesSelector || ELEMENT.oMatchesSelector || ELEMENT.webkitMatchesSelector;
			ELEMENT.closest = ELEMENT.closest || function closest(selector) {
				if (!this) return null;
				if (this.matches(selector)) return this;
				if (!this.parentElement) {
					return null;
				} else return this.parentElement.closest(selector);
			};
		})(Element.prototype);

		Element.prototype.hasClass = function (className) {
			return this.className && new RegExp("(^|\\s)" + className + "(\\s|$)").test(this.className);
		};
	},

	detectIE: function detectIE() {
		/**
   * detect IE
   * returns version of IE or false, if browser is not Internet Explorer
   */

		(function detectIE() {
			var ua = window.navigator.userAgent;

			var msie = ua.indexOf('MSIE ');
			if (msie > 0) {
				// IE 10 or older => return version number
				var ieV = parseInt(ua.substring(msie + 5, ua.indexOf('.', msie)), 10);
				document.querySelector('body').className += ' IE';
			}

			var trident = ua.indexOf('Trident/');
			if (trident > 0) {
				// IE 11 => return version number
				var rv = ua.indexOf('rv:');
				var ieV = parseInt(ua.substring(rv + 3, ua.indexOf('.', rv)), 10);
				document.querySelector('body').className += ' IE';
			}

			var edge = ua.indexOf('Edge/');
			if (edge > 0) {
				// IE 12 (aka Edge) => return version number
				var ieV = parseInt(ua.substring(edge + 5, ua.indexOf('.', edge)), 10);
				document.querySelector('body').className += ' IE';
			}

			// other browser
			return false;
		})();
	},

	throttle: function throttle(callback, limit) {
		var wait = false;
		return function () {
			if (!wait) {
				callback.call();
				wait = true;
				setTimeout(function () {
					wait = false;
				}, limit);
			}
		};
	},

	getScreenSize: function getScreenSize() {
		var screenSize = window.getComputedStyle(document.querySelector('body'), ':after').getPropertyValue('content');
		screenSize = parseInt(screenSize.match(/\d+/));
		return screenSize;
	}
};

APP.initBefore();

document.addEventListener('DOMContentLoaded', function () {
	APP.init();
});

window.onload = function () {
	APP.initOnLoad();
};
//# sourceMappingURL=main.js.map
