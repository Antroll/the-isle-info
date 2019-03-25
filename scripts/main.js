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
		// APP.isBrowserFocus()
		// APP.getClipboardText()
		APP.svgIcons();
		document.documentElement.className = document.documentElement.className.replace("no-js", "js");
	},

	init: function init() {
		APP.detectIE();
		APP.lazyload();

		APP.objectFitFallback(document.querySelectorAll('[data-object-fit]'));

		var myMask = new APP.Mask(".js-tel");
		myMask.init();
		APP.buttons();
		APP.closeOnFocusLost();

		APP.setCurrentPosition();
		APP.mapOptions();
		APP.setFixedCoordsForm();
		APP.tooltipsInit();
		APP.mouseOverMap();

		APP.modalGallery();
	},

	initOnLoad: function initOnLoad() {
		APP.truncateText(document.querySelectorAll('.js-dot'));
	},

	getClipboardText: function getClipboardText(cb) {
		navigator.clipboard.readText().then(function (text) {
			cb(text);
		}).catch(function (err) {
			console.warn('Failed to read clipboard contents: ', err);
		});
	},

	parseGameCoords: function parseGameCoords(string) {
		var clearStr = string.replace(/(?:\r\n|\r|\n)/g, ' ');
		var re = /Lat\: (-?\d+).+Long\: (-?\d+)/i;
		return clearStr.match(re);
	},

	buttons: function buttons() {
		Array.prototype.forEach.call(document.querySelectorAll('.menu-trigger'), function (item) {
			item.addEventListener('click', function () {
				document.body.classList.toggle('nav-showed');
			});
		});

		var ctrlV = document.querySelector('.js-ctrl-v');
		if (ctrlV) {
			var latInput = document.getElementById('lat');
			var lngInput = document.getElementById('lng');
			var checkPermission = function checkPermission(cb) {
				navigator.permissions.query({ name: "clipboard-read" }).then(function (result) {
					if (result.state == "granted" || result.state == "prompt") {
						cb();
					} else {
						APP.customAlert("\n\t\t\t\t\t\t\t<div class=\"content-style text-center\">\n\t\t\t\t\t\t\t\t<div class=\"h2 mb-3\">\n\t\t\t\t\t\t\t\t\tThis feature requires allowwed clipboard read permissions.\n\t\t\t\t\t\t\t\t</div>\n\t\t\t\t\t\t\t\t<p>Please grant access or just use the form.</p>\n\t\t\t\t\t\t\t</div>\n\t\t\t\t\t\t");
					}
				});
			};
			ctrlV.addEventListener('click', function (e) {
				e.preventDefault();
				checkPermission(function () {
					APP.getClipboardText(function (text) {
						var coords = APP.parseGameCoords(text);
						if (coords) {
							latInput.value = coords[1];
							lngInput.value = coords[2];
							lngInput.closest('form').querySelector('button[type=submit]').click();
						} else {
							console.log(text);
							APP.customAlert("\n\t\t\t\t\t\t\t\t<div class=\"content-style text-center\">\n\t\t\t\t\t\t\t\t\t<div class=\"h1 mb-4\">Invalid clypboard text</div>\n\t\t\t\t\t\t\t\t\t<p>Youre text is: <b>\"" + text + "\"</b></p>\n\t\t\t\t\t\t\t\t\t<p>Please copy in-game coordinates or use the form</p>\n\t\t\t\t\t\t\t\t</div>\n\t\t\t\t\t\t\t");
						}
					});
				});
			});
		}
	},

	customAlert: function customAlert(content) {
		var tingleModal = new tingle.modal({
			closeMethods: ['overlay', 'button', 'escape'],
			closeLabel: "Close",
			cssClass: ['tingle-modal--alert'],
			beforeOpen: function beforeOpen() {
				document.body.style.marginRight = APP.getScrollbarSize() + 'px';
			},
			onOpen: function onOpen() {
				document.activeElement.blur();
				APP.modalCloseBtn(this);
				APP.modalCloseListener(this);
			},
			beforeClose: function beforeClose() {
				document.body.removeAttribute("style");
				return true;
			},
			onClose: function onClose() {
				tingleModal.destroy();
			}
		});
		tingleModal.setContent("\n\t\t\t<div class =\"modal modal--alert\">\n\t\t\t\t<span class=\"js-modal-close modal__close\">\xD7</span>\n\t\t\t\t" + content + "\n\t\t</div>");
		tingleModal.open();
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

	pos2loc: function pos2loc() {
		var x = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0.01;
		var y = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0.01;
		var mapName = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'thenyaw';

		var percents = 100;
		var mapSize = mapName === 'thenyaw' ? 700 : 1600;
		var lat = parseInt((x - 50) * (mapSize / percents));
		var lng = parseInt((y - 50) * (mapSize / percents));
		return {
			left: lat,
			top: lng
		};
	},

	loc2pos: function loc2pos() {
		var x = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0.01;
		var y = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0.01;
		var mapName = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'thenyaw';

		var mapThenyaw = mapName === 'thenyaw';
		var mapV3 = mapName === 'v3';
		var percentInLat = void 0;
		var percentInLng = void 0;
		if (mapThenyaw) {
			percentInLat = x >= 0 ? 0.149 : 0.138;
			percentInLng = y >= 0 ? 0.146 : 0.157;
		} else if (mapV3) {
			percentInLat = x >= 0 ? 0.08 : 0.06;
			percentInLng = y >= 0 ? 0.05 : 0.08;
			// в точке -509, 1 лнг это 0.074%
			// в точке -345, 1 лнг это 0.079%
			// в точке 280, 1 лнг это 0.0463%
			// в точке 578, 1 лнг это 0.056%
		}
		return {
			left: 50 + x * percentInLat,
			top: 50 + y * percentInLng
		};
	},

	setCurrentPosition: function setCurrentPosition() {
		var form = document.querySelector('.js-coords-form');
		if (!form) {
			return;
		}

		var mapName = document.querySelector('[data-map-name]').getAttribute('data-map-name');

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
			var pos = APP.loc2pos(lat, lng, mapName);

			playerMarker.classList.add('d-none');

			if (pos.left > 100 || pos.top > 100 || pos.top < 0 || pos.left < 0) {
				APP.customAlert("\n\t\t\t\t\t<div class=\"h2 mb-0 text-center\">\n\t\t\t\t\t\t<p>Unfortunately, it is not possible to set a point as it is outside the map.</p>\n\t\t\t\t\t</div>\n\t\t\t\t");
				console.log(pos);
			} else {
				var scroll = new SmoothScroll();
				playerMarker.classList.remove('d-none');
				playerMarker.style.left = pos.left + '%';
				playerMarker.style.top = pos.top + '%';
				updateTooltip(playerMarker, lat, lng);
				scroll.animateScroll(playerMarker, 0, {
					speed: 500,
					offset: function offset(anchor) {
						return window.innerHeight / 2;
					}
				});
			}
		});
	},

	setFixedCoordsForm: function setFixedCoordsForm() {
		var myElement = document.querySelector(".js-coords-form");
		if (myElement) {
			var offsetTop = window.pageYOffset + myElement.getBoundingClientRect().top;
			var headroom = new Headroom(myElement, {
				"offset": offsetTop
			});
			headroom.init();
		}
	},

	mouseOverMap: function mouseOverMap() {
		var mapLayout = document.querySelector('.map__layout');
		if (mapLayout) {
			var mapName = mapLayout.getAttribute('data-map-name');
			var positionField = document.getElementById('position');
			mapLayout.onmousemove = function (e) {
				var posPercent = getPosition(e);
				var posLatLng = APP.pos2loc(posPercent.x, posPercent.y, mapName);

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

	modalCloseBtn: function modalCloseBtn(modalObject) {
		var closeBtn = modalObject.modal.querySelector('.js-modal-close');
		if (!closeBtn) {
			return;
		}
		modalObject.modal.querySelector('.js-modal-close').addEventListener('click', function (e) {
			e.preventDefault();
			modalObject.close();
		});
	},

	modalCloseListener: function modalCloseListener(modalObject) {
		modalObject.modalBoxContent.addEventListener('click', function (e) {
			if (e.target == modalObject.modalBoxContent) {
				modalObject.close();
			}
		});
	},

	modalGallery: function modalGallery() {
		var template = "<div class=\"modal-gallery\">\n\t\t\t<span class=\"js-modal-close modal__close modal__close--pos-gallery\">\xD7</span>\n\t\t\t<div class=\"swiper-container modal-gallery__slider\">\n\t\t\t\t<div class=\"swiper-wrapper\">\n\t\t\t\t\t<div class=\"modal-gallery__slide swiper-slide\" data-for>\n\t\t\t\t\t\t<div class=\"responsive-img modal-gallery__img-wrap\">\n\t\t\t\t\t\t\t<img class=\"swiper-lazy\" alt=\"\" data-object-fit=\"scale-down\">\n\t\t\t\t\t\t\t<div class=\"swiper-lazy-preloader swiper-lazy-preloader-white\"></div>\n\t\t\t\t\t\t</div>\n\t\t\t\t\t</div>\n\t\t\t\t</div>\n\t\t\t\t<div class=\"swiper-button-prev\"></div>\n\t\t\t\t<div class=\"swiper-button-next\"></div>\n\t\t\t</div>\n\t\t\t<div class=\"modal-gallery__footer\">\n\t\t\t\t<div class=\"wrap modal-gallery__footer-inner\">\n\t\t\t\t\t<div class=\"modal-gallery__title\"></div>\n\t\t\t\t\t<div class=\"modal-gallery__paging\"></div>\n\t\t\t\t</div>\n\t\t\t</div>\n\t\t</div>";

		var init = function init() {
			APP.documentOn('click', '.js-gallery-item', function (e) {
				e.preventDefault();
				closeTippy(this);
				var itemsArr = getItems(this);
				var index = itemsArr.indexOf(this) + 1;
				var dataArr = getDataArr(itemsArr);
				var content = parseTemplate(template, dataArr);
				openModal(content, index);
			});
		};

		var closeTippy = function closeTippy(elem) {
			elem.closest('.tippy-popper')._tippy.hide();
		};

		var createSlider = function createSlider(elem) {
			var setTitle = function setTitle(obj) {
				var title = obj.el.querySelector('.swiper-slide-active img').getAttribute('data-title');
				obj.el.closest('.modal-gallery').querySelector('.modal-gallery__title').innerHTML = title;
			};
			var slidesCount = elem.querySelectorAll('.swiper-slide').length;
			var mySwiper = new Swiper(elem, {
				loop: slidesCount > 1 ? true : false,
				allowTouchMove: false,
				lazy: {
					loadPrevNext: true,
					loadOnTransitionStart: true
				},
				effect: 'fade',
				fadeEffect: {
					crossFade: true
				},
				speed: 200,
				navigation: {
					nextEl: '.swiper-button-next',
					prevEl: '.swiper-button-prev'
				},
				keyboard: {
					enabled: true
				},
				pagination: {
					el: '.modal-gallery__paging',
					type: 'fraction'
				},
				init: false
			});
			mySwiper.on('init', function () {
				var _this = this;

				setTimeout(function () {
					setTitle(_this);
				}, 10);
			});
			mySwiper.on('slideChange', function () {
				var _this2 = this;

				setTimeout(function () {
					setTitle(_this2);
				}, 10);
			});
			mySwiper.on('lazyImageReady', function (slideEl, imageEl) {
				var images = this.$el[0].querySelectorAll('[data-object-fit]');
				APP.objectFitFallback(images);
			});
			mySwiper.init();

			Array.prototype.forEach.call(elem.querySelectorAll('img'), function (item) {
				item.addEventListener('click', function (e) {
					mySwiper.slideNext();
				});
			});

			return mySwiper;
		};

		var getItems = function getItems(elem) {
			var gallery = elem.closest('.js-gallery');
			var items = [];
			Array.prototype.forEach.call(gallery.querySelectorAll('.js-gallery-item'), function (item, i) {
				var notCloned = !item.closest('.swiper-slide-duplicate');
				if (notCloned) {
					items.push(item);
				}
			});
			return items;
		};

		var getDataArr = function getDataArr(nodeArr) {
			var dataArr = [];
			for (var i = 0; i < nodeArr.length; i++) {
				var item = nodeArr[i];
				var title = item.getAttribute('data-title') ? item.getAttribute('data-title') : '';
				dataArr.push({
					src: item.getAttribute('href'),
					title: title
				});
			}

			return dataArr;
		};

		var openModal = function openModal(content, index) {
			var tingleModal = new tingle.modal({
				closeMethods: ['overlay', 'button', 'escape'],
				closeLabel: "Close",
				cssClass: ['tingle-modal--gallery'],
				beforeOpen: function beforeOpen() {
					document.body.style.marginRight = APP.getScrollbarSize() + 'px';
				},
				onOpen: function onOpen() {
					document.activeElement.blur();
					APP.modalCloseBtn(this);
					APP.modalCloseListener(this);
					var elem = this.modal.querySelector('.swiper-container');
					var slider = createSlider(elem);
					slider.slideTo(index);
				},
				beforeClose: function beforeClose() {
					document.body.removeAttribute("style");
					return true;
				},
				onClose: function onClose() {
					tingleModal.destroy();
				}
			});
			tingleModal.setContent(content);
			tingleModal.open();
		};

		var createElementFromHTML = function createElementFromHTML(htmlString) {
			var div = document.createElement('div');
			div.innerHTML = htmlString.trim();

			return div.firstChild;
		};

		var getString = function () {
			var DIV = document.createElement("div");

			if ('outerHTML' in DIV) return function (node) {
				return node.outerHTML;
			};

			return function (node) {
				var div = DIV.cloneNode();
				div.appendChild(node.cloneNode(true));
				return div.innerHTML;
			};
		}();

		function parseTemplate(string, array) {
			var template = createElementFromHTML(string);
			var itemTemplate = template.querySelector('[data-for]');
			var list = itemTemplate.parentNode;

			itemTemplate.removeAttribute('data-for');
			list.removeChild(itemTemplate);

			for (var i = 0; i < array.length; i++) {
				var data = array[i];
				var itemStr = getString(itemTemplate);
				// itemStr = itemStr.replace('{{ src }}', data.src)

				var renderedItem = createElementFromHTML(itemStr);
				var img = renderedItem.querySelector('img');
				img.setAttribute('data-src', data.src);
				img.setAttribute('data-title', data.title);
				list.appendChild(renderedItem);
			}
			return template;
		}

		init();
	},

	truncateText: function truncateText(selector) {
		var cutText = function cutText() {
			for (var i = 0; i < selector.length; i++) {
				var text = selector[i];
				var elemMaxHeight = parseInt(getComputedStyle(text).maxHeight, 10);
				var elemHeight = parseInt(text.offsetHeight, 10);
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

	isBrowserFocus: function isBrowserFocus() {
		(function () {
			var hidden = "hidden";

			// Standards:
			if (hidden in document) document.addEventListener("visibilitychange", onchange);else if ((hidden = "mozHidden") in document) document.addEventListener("mozvisibilitychange", onchange);else if ((hidden = "webkitHidden") in document) document.addEventListener("webkitvisibilitychange", onchange);else if ((hidden = "msHidden") in document) document.addEventListener("msvisibilitychange", onchange);
			// IE 9 and lower:
			else if ("onfocusin" in document) document.onfocusin = document.onfocusout = onchange;
				// All others:
				else window.onpageshow = window.onpagehide = window.onfocus = window.onblur = onchange;

			function onchange(evt) {
				var v = "visible",
				    h = "hidden",
				    evtMap = {
					focus: v,
					focusin: v,
					pageshow: v,
					blur: h,
					focusout: h,
					pagehide: h
				};

				evt = evt || window.event;
				if (evt.type in evtMap) document.body.className = evtMap[evt.type];else document.body.className = this[hidden] ? "hidden" : "visible";
			}

			// set the initial state (but only if browser supports the Page Visibility API)
			if (document[hidden] !== undefined) onchange({ type: document[hidden] ? "blur" : "focus" });
		})();
	},

	onBrowserFocus: function onBrowserFocus() {
		console.log('focused');
	},

	documentOn: function documentOn(eventName, selectorStr, callback) {
		var thatElement = function thatElement(element, selector) {
			var className = selector.replace('.', '');
			var closestElem = element.closest(selector);
			if (element.hasClass(className)) {
				return element;
			} else if (closestElem) {
				return closestElem;
			} else {
				return false;
			}
		};

		document.addEventListener(eventName, function (event) {

			var elem = thatElement(event.target, selectorStr);
			if (elem) {
				var cb = callback.bind(elem);
				cb(event, elem);
			}
		});
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

	getScrollbarSize: function getScrollbarSize() {
		var scrollbarSize = void 0;
		if (scrollbarSize === undefined) {
			var scrollDiv = document.createElement('div');
			scrollDiv.style.cssText = 'width: 99px; height: 99px; overflow: scroll; position: absolute; top: -9999px;';
			document.body.appendChild(scrollDiv);
			scrollbarSize = scrollDiv.offsetWidth - scrollDiv.clientWidth;
			document.body.removeChild(scrollDiv);
		}
		return scrollbarSize;
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
