const APP = {
	cache: {},
	initBefore: function() {
		svg4everybody();
		APP.polyfills()
		document.documentElement.className =
			document.documentElement.className.replace("no-js", "js");
	},

	init: function() {
		APP.detectIE();
		APP.lazyload();

		APP.buttons();
		APP.modalCloseBtn()
		APP.closeOnFocusLost();

		APP.initCoordsForm();
		APP.setMapMarkerFromUrl();
		APP.initMapOptions();
		APP.initFixedCoordsForm();
		APP.tooltipsInit();
		APP.mouseOverMap();
		APP.ctrlVInit();
		APP.rssParser();
		APP.tableSort();
		APP.gameModSwitcher();
		APP.tableVerticalHighlight();

		APP.modalGallery();

	},

	getClipboardText: function (cb) {
		navigator.clipboard.readText()
		.then(text => {
			cb(text)
		})
		.catch(err => {
			console.warn('Failed to read clipboard contents: ', err);
		});
	},

	parseGameCoords: function (string) {
		const clearStr = string.replace(/(?:\r\n|\r|\n)/g, ' ')
		const re = /Lat\: (-?\d+).+Long\: (-?\d+)/i;
		return clearStr.match(re)
	},

	buttons: function() {
		Array.prototype.forEach.call(
			document.querySelectorAll('.menu-trigger'), function(item) {
				item.addEventListener('click', function() {
					document.body.classList.toggle('nav-showed')
				})
			})
	},

	rssParser: function () {
		const init = () => {
			const list = document.getElementById('feed-list')
			if (list) {
				getFeed()
				moreArticlesListener()
			}
		}

		const getFeed = () => {
			// Note: some RSS feeds can't be loaded in the browser due to CORS security.
			// To get around this, you can use a proxy.
			const CORS_PROXY = "https://cors.bridged.cc/"
			const URL = `${CORS_PROXY}https://store.steampowered.com/feeds/news/app/376210?url=https%3A%2F%2Fstore.steampowered.com%2Ffeeds%2Fnews%2Fapp%2F376210`

			const parser = new RSSParser();
			parser.parseURL(URL, function(err, feed) {

				if (err) {
					const loader = document.querySelector('.news-feed__loader')
					loader.innerHTML = `
						<div>Sorry, RSS does not want to work 😥</div>
						<div class="mb-3">${err}</div>
						<div>
							<a class="btn btn--blue" href="https://steamcommunity.com/app/376210/allnews/" target="_blank">Official news source</a>
						</div>
					`
				} else {
					APP.cache.feedItems = feed.items

					feed.items.forEach(function(entry, i) {
						if (i < 3) {
							addItem(entry)
						}
					})

					itemsAppended()
				}
			})
		}

		const addItem = (data) => {
			const itemData = {
				creator: data.creator || '',
				title: data.title || '',
				link: data.link || '',
				pubDate: data.pubDate || '',
				author: data.author || '',
				content: data.content || '',
				contentSnippet: data.contentSnippet || '',
				guid: data.guid || '',
				isoDate: data.isoDate || '',
			}

			const formatedDate = formatDate(data.isoDate);
			const tmpl = document.getElementById('feed-item').innerHTML
			const html = _.template(tmpl)(itemData);
			const container = document.getElementById('feed-list')
			const itemElem = APP.createElementFromHTML(html)

			itemElem.querySelector('[data-content]').innerHTML = data.content
			itemElem.querySelector('[data-date]').innerHTML = formatedDate
			container.appendChild(itemElem)
			fullArticleListener(itemElem)

			setTimeout(function() {
				itemElem.classList.add('animated')
			}, 10);
		}

		const formatDate = (date) => {
			const d = new Date(date)
			const curr_date = d.getDate()
			const curr_month = d.getMonth() + 1
			const curr_year = d.getFullYear()

			const formatedDate = `${curr_date < 10 ? '0'+curr_date : curr_date}.${curr_month < 10 ? '0'+curr_month : curr_month}.${curr_year}`;

			return formatedDate
		}

		const itemsAppended = () => {
			APP.tooltipsInit()
			listLoaded()
		}

		const listLoaded = () => {
			const newsFeed = document.querySelector('.news-feed')
			newsFeed.classList.add('news-feed--loaded')
		}

		const fullArticleListener = (article) => {
			const btn = article.querySelector('.item-feed__btn-more')
			btn.addEventListener('click', function (e) {
				const itemFeed = this.closest('.item-feed')
				const STATE_ACTIVE = 'item-feed--full-view'
				if (itemFeed.hasClass(STATE_ACTIVE)) {
					itemFeed.classList.remove(STATE_ACTIVE)

					var scroll = new SmoothScroll();
					scroll.animateScroll(itemFeed, 0, {
						speed: 300,
					})

				} else {
					itemFeed.classList.add(STATE_ACTIVE)
				}

			})
		}

		const moreArticlesListener = () => {
			const btn = document.querySelector('.news-feed__btn-more')
			const newItemsCount = 3

			const listener = function (e) {
				const showedItemsCount = document.querySelectorAll('.news-feed__item').length
				const itemsArr = APP.cache.feedItems
				const slicedItemsArr = _.drop(itemsArr, showedItemsCount)

				if (slicedItemsArr.length) {
					slicedItemsArr.forEach(function(entry, i) {
						if (i < newItemsCount) {
							addItem(entry)
						}
					})

					itemsAppended()
				}

				if (slicedItemsArr.length < newItemsCount ) {
					btn.style.display = 'none';
				}
			}

			btn.addEventListener('click', listener)

		}

		init()
	},

	createElementFromHTML: function (htmlString) {
		var div = document.createElement('div');
		div.innerHTML = htmlString.trim();

		return div.firstChild;
	},

	ctrlVInit: function () {
		const ctrlV = document.querySelector('.js-ctrl-v')
		if (!ctrlV) return

		const latInput = document.getElementById('lat')
		const lngInput = document.getElementById('lng')
		const modalContent = `
				<form id="pasted-coords">
					<div class="row">
						<div class="col form-group">
							<input type="text" class="form-control form-control--light-bg" name="in-game-coords" placeholder="Paste in-game coords" required="">
						</div>
						<div class="col-auto form-group">
							<button class="btn btn--narrow btn--blue" type="submit">Set</button>
						</div>
					</div>
				</form>
				<div class="content-style text-center">
					<p>Please grant access clipboard read permissions for faster setting points or just use the form.</p>
				</div>
			`;
		const onOpenNoPermissions = function () {
			APP.customAlert(modalContent, function (modalObj) {
				const modal = modalObj.modal
				const input = modal.querySelector('input[name=in-game-coords]')
				input.focus()
				document.getElementById('pasted-coords').addEventListener('submit', function (e) {
					e.preventDefault()
					const value = input.value
					setThePointByPaste(value)
				})
			})
		}
		const setThePointByPaste = function (text) {
			const coords = APP.parseGameCoords(text)
			if (coords) {
				if (APP.cache.tingleModal) { APP.cache.tingleModal.close() }
				latInput.value = coords[1]
				lngInput.value = coords[2]
				lngInput.closest('form').querySelector('button[type=submit]').click()
			} else {
				APP.customAlert(`
					<div class="content-style text-center">
						<div class="h1 mb-4">Invalid clypboard text</div>
						<p>Youre text is: <b>"${text}"</b></p>
						<p>Please copy in-game coordinates or use the form</p>
					</div>
				`)
			}
		}
		const checkPermission = function (cb) {
			navigator.permissions.query({name: "clipboard-read"})
				.then(
					result => {
						if (result.state == "granted" || result.state == "prompt") {
							cb()
						} else {
							onOpenNoPermissions()
						}
					},
					error => {
						onOpenNoPermissions()
					}
				);
		}

		ctrlV.addEventListener('click', function (e) {
			e.preventDefault();
			checkPermission(function () {
				APP.getClipboardText(setThePointByPaste)
			})
		})
	},

	customAlert: function (content, onOpen, onClose) {
		const createModal = () => {
			const tingleModal = new tingle.modal({
				closeMethods: ['overlay', 'button', 'escape'],
				closeLabel: "Close",
				cssClass: ['tingle-modal--alert'],
				beforeOpen: function () {
					document.body.style.marginRight = APP.getScrollbarSize() + 'px';
				},
				onOpen: function() {
					document.activeElement.blur()
					APP.modalCloseListener(this);
					if (onOpen) { onOpen(this) }
				},
				beforeClose: function () {
					document.body.removeAttribute("style");
					return true;
				},
				onClose: function() {
					tingleModal.destroy();
					delete APP.cache.tingleModal;
					if (onClose) { onClose(this) }
				}
			});
			return tingleModal
		}

		const setContent = (modal, text) => {
			modal.setContent(`<div class ="modal modal--alert">
				<span class="js-modal-close modal__close">×</span>
				${text}
			</div>`)
		}

		if (!APP.cache.tingleModal) {
			APP.cache.tingleModal = createModal()
			setContent(APP.cache.tingleModal, content)
			APP.cache.tingleModal.open();
		} else {
			setContent(APP.cache.tingleModal, content)
		}

	},

	closeOnFocusLost: function() {
		document.addEventListener('click', function(e) {
			const trg = e.target;
			if (!trg.closest(".header")) {
				document.body.classList.remove('nav-showed');
			}
		});
	},

	tooltipsInit: function () {
		tippy('[data-tippy-content]', {
			animation: 'fade',
			theme: 'light-border',
			arrow: true,
			arrowType: 'round',
		})

		const initTippy = (item) => {
			const template = item.querySelector('.js-tooltip-content')
			tippy(item, {
				content: template,
				theme: 'light-border',
				interactive: true,
				arrow: true,
				trigger: 'click',
				arrowType: 'round',
			})
			template.classList.remove('d-none')
		}

		Array.prototype.forEach.call(
			document.querySelectorAll('.js-tooltip'), initTippy);
	},

	initMapOptions: function () {
		const form = document.querySelector('.map-settings form')
		const map = document.querySelector('.map')
		const state = {
			MAP_HIDE_MARKERS: 'map--hide-markers',
			MAP_INVISIBLE_MARKERS: 'map--invisible-markers',
		}

		const hideMarkers = function (input) {
			if (input.checked) {
				map.classList.add(state.MAP_HIDE_MARKERS)
			} else {
				map.classList.remove(state.MAP_HIDE_MARKERS)
			}
		}

		const invisibleMarkers = function (input) {
			if (input.checked) {
				map.classList.add(state.MAP_INVISIBLE_MARKERS)
			} else {
				map.classList.remove(state.MAP_INVISIBLE_MARKERS)
			}
		}

		if (!form) { return }
		Array.prototype.forEach.call(
			form.querySelectorAll('input'), function (input) {
				input.addEventListener('change', function (e) {
					const name = input.getAttribute('name')

					switch (name) {
						case 'hidden-markers':
							hideMarkers(input)
							break;
						case 'invisible-markers':
							invisibleMarkers(input)
							break;
						default:
							console.log('options switched');
							break;
					}
				})
			});
	},

	getMapSize: function (mapName = 'thenyaw') {
		switch (mapName) {
			case 'thenyaw':
				return {x: 745, y: 675}
				break;

			case 'v3':
				return {x: 1600, y: 1600}
				break;

			default:
				return {x: 1000, y: 1000}
				break;
		}
	},

	getMapCenter: function (mapName = 'thenyaw') {
		switch (mapName) {
			case 'thenyaw':
				return {x: 52.3, y: 50}
				break;

			case 'v3':
				return {x: 52.8, y: 45.3}
				break;

			default:
				return {x: 50, y: 50}
				break;
		}
	},

	pos2loc: function (x = 0.01, y = 0.01, mapName = 'thenyaw') {
		const { getMapSize, getMapCenter } = this
		const mapSize = getMapSize(mapName)
		const center = getMapCenter(mapName)

		const lat = parseInt( (x - center.x) * (mapSize.x / 100) )
		const lng = parseInt( (y - center.y) * (mapSize.y / 100) )

		return {
			left: lat,
			top: lng,
		}
	},

	loc2pos: function (x = 0.01, y = 0.01, mapName = 'thenyaw') {
		const { getMapSize, getMapCenter } = this
		const mapSize = getMapSize(mapName)
		const center = getMapCenter(mapName)

		const posX = center.x + x * (100 / mapSize.x)
		const posY = center.y + y * (100 / mapSize.y)

		return {
			left: posX,
			top: posY,
		}
	},

	initCoordsForm: function () {
		const selectors = {
			FORM: '.js-coords-form',
			INPUT_LAT: '#lat',
			INPUT_LNG: '#lng',
			MAP: '[data-map-name]',
			PLAYER_MARKER: '.js-player-marker',
			BTN_SUBMIT: '.js-coords-submit',
			BTN_SHARE: '.js-coords-share',
		}

		const selectorsState = {
			DISABLED: 'd-none'
		}

		const that = this
		const { copyCurrentUrl } = that

		const form = document.querySelector(selectors.FORM)
		const latInput = document.querySelector(selectors.INPUT_LAT)
		const lngInput = document.querySelector(selectors.INPUT_LNG)
		const playerMarker = document.querySelector(selectors.PLAYER_MARKER)
		const shareBtn = document.querySelector(selectors.BTN_SHARE)

		let notificationTimeout

		if (!form || !latInput || !lngInput) {
			return
		}

		const init = () => {
			form.addEventListener('submit', onFormSubmit)
			form.addEventListener("reset", onFormReset)
			latInput.addEventListener("change", onCoordInputChange)
			lngInput.addEventListener("change", onCoordInputChange)
			shareBtn.addEventListener("click", onShareClick)

			tippy(shareBtn, {
				content: '🛎️ Point URL copied to clipboard.',
				theme: 'light-border',
				placement: 'bottom',
				trigger: 'click',
				onShown(myTooltip) {
					clearTimeout(notificationTimeout)
					notificationTimeout = setTimeout(() => {
						myTooltip.hide()
					}, 2000)
				}
			});
		}

		const { mapName } = document.querySelector(selectors.MAP).dataset

		const onFormSubmit = e => {
			e.preventDefault();
			const lat = +latInput.value
			const lng = +lngInput.value
			const pos = that.loc2pos(lat, lng, mapName)
			const outOfMap = pos.left > 100 || pos.top > 100 || pos.top < 0 || pos.left < 0


			if (outOfMap) {
				const alertContent = `
					<div class="h2 mb-0 text-center">
						<p>Unfortunately, it is not possible to set a point as it is outside the map.</p>
					</div>
				`;
				that.customAlert(alertContent)
				playerMarker.classList.add(selectorsState.DISABLED)
				console.warn(pos);
			} else {
				// update get params
				history.replaceState('', '', `?lat=${lat}&lng=${lng}`);

				var scroll = new SmoothScroll();
				playerMarker.classList.remove(selectorsState.DISABLED)
				playerMarker.style.left = pos.left+'%'
				playerMarker.style.top = pos.top+'%'

				scroll.animateScroll(playerMarker, 0, {
					speed: 500,
					offset: function (anchor) {
						return (window.innerHeight / 2)
					}
				})

				toggleShareButton(true)
			}
		}

		const onCoordInputChange = function (e) {
			toggleShareButton(false)
		}

		const onFormReset = e => {
			playerMarker.classList.add(selectorsState.DISABLED)
			history.replaceState('', '', location.pathname);
			toggleShareButton(false)
		}

		const toggleShareButton = (isShowed = false) => {
			const submitBtn = document.querySelector(selectors.BTN_SUBMIT)

			if (isShowed) {
				submitBtn.classList.add(selectorsState.DISABLED)
				shareBtn.classList.remove(selectorsState.DISABLED)
			} else {
				submitBtn.classList.remove(selectorsState.DISABLED)
				shareBtn.classList.add(selectorsState.DISABLED)
			}
		}

		const onShareClick = function (e) {
			copyCurrentUrl()
		}


		init()
	},

	/**
	 * copy the current URL to the clipboard
	 */
	copyCurrentUrl: function () {
		const dummy = document.createElement('input')
		const text = window.location.href

		document.body.appendChild(dummy);
		dummy.value = text;
		dummy.select();
		document.execCommand('copy');
		document.body.removeChild(dummy);
	},

	setMapMarkerFromUrl: function () {
		const searchParams = new URLSearchParams(location.search);
		const urlLat = searchParams.get('lat')
		const urlLng = searchParams.get('lng')
		const latInput = document.getElementById('lat')
		const lngInput = document.getElementById('lng')

		if (!urlLat || !urlLng || !lngInput || !latInput) {
			return
		}

		latInput.value = urlLat
		lngInput.value = urlLng
		lngInput.closest('form').querySelector('button[type=submit]').click()
	},

	initFixedCoordsForm: function  () {
		const myElement = document.querySelector(".js-coords-form");
		if (myElement) {
			const offsetTop = window.pageYOffset + myElement.getBoundingClientRect().top
			const headroom  = new Headroom(myElement, {
				"offset": offsetTop,
			});
			headroom.init();
		}
	},

	mouseOverMap: function () {
		const mapLayout = document.querySelector('.map__layout')
		if (mapLayout) {
			const mapName = mapLayout.getAttribute('data-map-name')
			const positionField = document.getElementById('position')
			mapLayout.onmousemove = function (e) {
				const posPercent = getPosition(e);
				const posLatLng = APP.pos2loc(posPercent.x, posPercent.y, mapName)

				positionField.innerHTML = 'lat: ' + posLatLng.left + ', long: ' + posLatLng.top;
				positionField.style.display = 'block'
				positionField.style.top = posPercent.y+'%'
				positionField.style.left = posPercent.x+'%'
			};
			mapLayout.onmouseleave = function () {
				positionField.style.top = 0
				positionField.style.left = 0
				positionField.style.display = 'none'
			}
		}

		function getPosition(e) {
			var rect = e.target.getBoundingClientRect();
			var x = e.clientX - rect.left;
			var y = e.clientY - rect.top;
			const sizeX = e.target.offsetWidth
			const sizeY = e.target.offsetHeight
			const percentX = parseInt(x / sizeX * 100 * 10) / 10
			const percentY = parseInt(y / sizeY * 100 * 10) / 10
			return {
				x: percentX,
				y: percentY
			}
		}
	},

	modalCloseBtn: function(modalObject) {
		APP.documentOn('click', '.js-modal-close', function (e) {
			e.preventDefault()
			if (APP.cache.tingleModal) {
				APP.cache.tingleModal.close();
			}
		})
	},

	modalCloseListener: function(modalObject) {
		modalObject.modalBoxContent.addEventListener('click', function (e) {
			if (e.target == modalObject.modalBoxContent) {
				modalObject.close();
			}
		})
	},

	modalGallery: function () {
		var template = `<div class="modal-gallery">
			<span class="js-modal-close modal__close modal__close--pos-gallery">×</span>
			<div class="swiper-container modal-gallery__slider">
				<div class="swiper-wrapper">
					<div class="modal-gallery__slide swiper-slide" data-for>
						<div class="responsive-img modal-gallery__img-wrap">
							<img class="swiper-lazy" alt="" data-object-fit="scale-down">
							<div class="swiper-lazy-preloader swiper-lazy-preloader-white"></div>
						</div>
					</div>
				</div>
				<div class="swiper-button-prev"></div>
				<div class="swiper-button-next"></div>
			</div>
			<div class="modal-gallery__footer">
				<div class="wrap modal-gallery__footer-inner">
					<div class="modal-gallery__title"></div>
					<div class="modal-gallery__paging"></div>
				</div>
			</div>
		</div>`;

		var init = function init() {
			APP.documentOn('click', '.js-gallery-item', function (e) {
				e.preventDefault();
				closeTippy(this)
				var itemsArr = getItems(this);
				var index = itemsArr.indexOf(this) + 1;
				var dataArr = getDataArr(itemsArr);
				var content = parseTemplate(template, dataArr);
				openModal(content, index);
			});
		};

		const closeTippy = function  (elem) {
			elem.closest('.tippy-popper')._tippy.hide()
		};

		var createSlider = function (elem) {
			const setTitle = function (obj) {
				var title = obj.el.querySelector('.swiper-slide-active img').getAttribute('data-title');
				obj.el.closest('.modal-gallery').querySelector('.modal-gallery__title').innerHTML = title
			}
			const slidesCount = elem.querySelectorAll('.swiper-slide').length
			const mySwiper = new Swiper(elem, {
				loop: slidesCount > 1 ? true : false,
				allowTouchMove: false,
				lazy: {
					loadPrevNext: true,
					loadOnTransitionStart: true,
				},
				effect: 'fade',
				fadeEffect: {
					crossFade: true,
				},
				speed: 200,
				navigation: {
					nextEl: '.swiper-button-next',
					prevEl: '.swiper-button-prev',
				},
				keyboard: {
					enabled: true,
				},
				pagination: {
					el: '.modal-gallery__paging',
					type: 'fraction',
				},
				init: false,
			})
			mySwiper.on('init', function() {
				setTimeout(() => { setTitle(this) }, 10);
			});
			mySwiper.on('slideChange', function() {
				setTimeout(() => { setTitle(this) }, 10);
			})
			mySwiper.on('lazyImageReady', function(slideEl, imageEl) {
				const images = this.$el[0].querySelectorAll('[data-object-fit]')
				APP.objectFitFallback(images);
			})
			mySwiper.init()

			Array.prototype.forEach.call(
				elem.querySelectorAll('img'), function (item) {
				item.addEventListener('click', function (e) {
					mySwiper.slideNext();
				})
			})

			return mySwiper;
		};

		var getItems = function getItems(elem) {
			var gallery = elem.closest('.js-gallery');
			var items = [];
			Array.prototype.forEach.call(
				gallery.querySelectorAll('.js-gallery-item'), function (item, i) {
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
				const item = nodeArr[i]
				var title = item.getAttribute('data-title') ? item.getAttribute('data-title') : '';
				dataArr.push({
					src: item.getAttribute('href'),
					title: title
				});
			}

			return dataArr;
		};

		var openModal = function openModal(content, index) {
			const tingleModal = new tingle.modal({
				closeMethods: ['overlay', 'button', 'escape'],
				closeLabel: "Close",
				cssClass: ['tingle-modal--gallery'],
				beforeOpen: function () {
					document.body.style.marginRight = APP.getScrollbarSize() + 'px';
				},
				onOpen: function() {
					document.activeElement.blur()
					APP.modalCloseListener(this);
					var elem = this.modal.querySelector('.swiper-container')
					var slider = createSlider(elem);
					slider.slideTo(index);
				},
				beforeClose: function () {
					document.body.removeAttribute("style");
					return true;
				},
				onClose: function() {
					tingleModal.destroy();
					delete APP.cache.tingleModal
				}
			});
			APP.cache.tingleModal = tingleModal
			tingleModal.setContent(content)
			tingleModal.open();
		};

		var createElementFromHTML = function (htmlString) {
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

	gameModSwitcher: function () {
		const selectors = {
			SWITCHER: '.js-game-mod-switcher',
			ROWS: '.stats-table tr[data-game-mod]',
		}

		const states = {
			SWITCHER_DISABLED: 'd-none',
		}

		const switcherOnChange = e => {
			const { target } = e
			const switcherState = {
				name: target.getAttribute('name'),
				active: target.checked
			}

			const rows = document.querySelectorAll(selectors.ROWS)
			for (let i = 0; i < rows.length; i++) {
				const row = rows[i]
				if (row.dataset.gameMod !== switcherState.name) {
					continue
				}

				if (switcherState.active) {
					row.classList.remove(states.SWITCHER_DISABLED)
				} else {
					row.classList.add(states.SWITCHER_DISABLED)
				}
			}
		}

		const switchers = [...document.querySelectorAll(selectors.SWITCHER)]
		switchers.forEach(switcher => {
			switcher.addEventListener('change', switcherOnChange)
		})
	},

	tableSort: function () {
		const tables = [...document.querySelectorAll('.js-table-sort')]
		for (let i = 0; i < tables.length; i++) {
			const table = tables[i]
			const options = {
				// descending: true
			}
			new Tablesort(table, options);
		}
	},

	tableVerticalHighlight: function () {
		const selectors = {
			TABLE: '.js-vertical-highlight',
		}

		const state = {
			TD_HIGHLIGHTED: 'is-highlighted',
		}

		const highlightCols = function () {
			const table = this.closest('table')
			const rows = [...table.querySelectorAll('tr')]
			const rowCols = [...this.parentElement.querySelectorAll('td')]
			const index = rowCols.indexOf( this );

			for (var i = 0; i < rows.length; i++) {
				const row = rows[i]
				const cols = [...row.querySelectorAll('td'), ...row.querySelectorAll('th')]
				if (!cols.length) {
					continue;
				}
				cols[index].classList.add(state.TD_HIGHLIGHTED)
			}
		}

		const unhighlightCols = function () {
			const table = this.closest('table')
			const cols = [...table.querySelectorAll('td'), ...table.querySelectorAll('th')]
			for (var i = 0; i < cols.length; i++) {
				const col = cols[i]
				col.classList.remove(state.TD_HIGHLIGHTED)
			}
		}

		const tables = [...document.querySelectorAll(selectors.TABLE)]
		for (var i = 0; i < tables.length; i++) {
			const table = tables[i]
			const cols = [...table.querySelectorAll('td')]

			for (var i = 0; i < cols.length; i++) {
				const col = cols[i]
				col.onmouseover = highlightCols
				col.onmouseout = unhighlightCols
			}
		}
	},

	lazyload: function() {
		if (typeof APP.myLazyLoad == 'undefined') {
			_regularInit()
		} else {
			_update()
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
				callback_error: function(el) {
					el.parentElement.classList.add('lazyload-error')
				}
			});
			APP.objectFitFallback(document.querySelectorAll('[data-object-fit]'));
		}
	},

	objectFitFallback: function(selector) {
		if ('objectFit' in document.documentElement.style === false) {
			console.log('objectFit Fallback');
			for (var i = 0; i < selector.length; i++) {
				const that = selector[i]
				const imgUrl = that.getAttribute('src');
				const dataFit = that.getAttribute('data-object-fit')
				let fitStyle
				if (dataFit === 'contain') {
					fitStyle = 'contain'
				} else if (dataFit === 'cover') {
					fitStyle = 'cover'
				} else {
					fitStyle = 'auto'
				}
				const parent = that.parentElement
				if (imgUrl) {
					parent.style.backgroundImage = 'url(' + imgUrl + ')'
					parent.style.backgroundSize = fitStyle
					parent.classList.add('fit-img')
				}
			};
		}
	},

	polyfills: function () {
		/**
		 * polyfill for .closest
		 */
		(function(ELEMENT) {
			ELEMENT.matches = ELEMENT.matches || ELEMENT.mozMatchesSelector || ELEMENT.msMatchesSelector || ELEMENT.oMatchesSelector || ELEMENT.webkitMatchesSelector;
			ELEMENT.closest = ELEMENT.closest || function closest(selector) {
				if (!this) return null;
				if (this.matches(selector)) return this;
				if (!this.parentElement) {return null}
					else return this.parentElement.closest(selector)
				};
		}(Element.prototype));

		Element.prototype.hasClass = function(className) {
			return this.className && new RegExp("(^|\\s)" + className + "(\\s|$)").test(this.className);
		};
	},

	documentOn: function (eventName, selectorStr, callback) {
		const thatElement = (element, selector) => {
			const className = selector.replace('.', '');
			const closestElem = element.closest(selector)
			if ( element.hasClass(className) ) {
				return element
			} else if (closestElem) {
				return closestElem
			} else {
				return false
			}
		}

		document.addEventListener(eventName, function (event) {

			const elem = thatElement(event.target, selectorStr)
			if (elem) {
				const cb = callback.bind(elem)
				cb(event, elem)
			}
		})
	},


	detectIE: function() {
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

	getScrollbarSize: function () {
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

	throttle: function (callback, limit) {
		var wait = false;
		return function() {
			if (!wait) {
				callback.call();
				wait = true;
				setTimeout(function() {
					wait = false;
				}, limit);
			}
		};
	},

	getScreenSize: function() {
		let screenSize =
			window
			.getComputedStyle(document.querySelector('body'), ':after')
			.getPropertyValue('content');
		screenSize = parseInt(screenSize.match(/\d+/));
		return screenSize;
	}
};

APP.initBefore();

document.addEventListener('DOMContentLoaded', function() {
	APP.init();
});



