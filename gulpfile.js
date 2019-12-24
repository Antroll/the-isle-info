'use strict';

var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var browserSync = require('browser-sync');
var reload = browserSync.reload;
var jadeData = require('./data.json');
var autoprefixer = require('autoprefixer');

const SRC = 'src'
const DEST = 'docs'

var config = {
	jsConcat: [
		'node_modules/svg4everybody/dist/svg4everybody.min.js',
		'node_modules/tablesort/dist/tablesort.min.js',
		'node_modules/tablesort/dist/sorts/tablesort.number.min.js',
		`./${SRC}/vendors/lazyload.min.js`,
		`./${SRC}/vendors/tooltip/popper.min.js`,
		`./${SRC}/vendors/tooltip/tippy.all.min.js`,
		`./${SRC}/vendors/tingle/tingle.min.js`,
		`./${SRC}/vendors/smooth-scroll.polyfills.min.js`,
		`./${SRC}/vendors/swiper/js/swiper.min.js`,
		`./${SRC}/vendors/headroom.min.js`,
		`./${SRC}/vendors/rss-parser.min.js`,
		`./${SRC}/vendors/lodash.min.js`,
	],
	browserSync: {
		reloadOnRestart: true,
		notify: false,
		port: 9000,
		startPath: "/",
		server: {
			baseDir: [`${DEST}`, `${SRC}`]
		}
	}
}

var jsDest = `${DEST}/scripts`;

// compile jade
gulp.task('views', function() {
	return gulp.src([`${SRC}/templates/**/*.jade`])
		.pipe($.plumber())

		//only pass unchanged *main* files and *all* the partials
		.pipe($.changed(`${DEST}`, { extension: '.html' }))

		//filter out unchanged partials, but it only works when watching
		.pipe($.if(browserSync.active, $.cached('jade')))

		//find files that depend on the files that have changed
		.pipe($.jadeInheritance({ basedir: `${SRC}/templates` }))

		//filter out partials (folders and files starting with "_" )
		.pipe($.filter(function(file) {
			return !/\_/.test(file.path) && !/^_/.test(file.relative);
		}))

		.pipe($.jade({
			locals: jadeData,
			pretty: false
		}))
		.pipe($.beml({
			elemPrefix: '__',
			modPrefix: '--',
			modDlmtr: '-'
		}))
		.pipe($.fileInclude({ basepath: `${DEST}` }))
		.pipe($.htmlPrettify({ indent_char: '	', indent_size: 1 }))
		.pipe(gulp.dest(`${DEST}`))
		.pipe(reload({ stream: true }));
});

// compile sass
gulp.task('styles', function() {
	$.rubySass(`${SRC}/styles`, {
			style: 'compact', //compact, compressed, expanded
			precision: 10,
			sourcemap: true
		})
		.on('error', function(err) {
			console.error('Error!', err.message);
		})
		.pipe($.postcss( [autoprefixer()] ))
		.pipe($.sourcemaps.write('.'))
		.pipe(gulp.dest(`${DEST}/styles`))
		.pipe(reload({ stream: true }));
});

// view and check scripts
gulp.task('scripts', function() {
	return gulp.src([`${SRC}/scripts/**/*.js`, `!${SRC}/scripts/modernizr/modernizr.custom.js`])
		.pipe($.filter(function(file) {
			return !/\_/.test(file.path) && !/^_/.test(file.relative);
		}))
		.pipe($.plumber())
		.pipe($.sourcemaps.init())
		.pipe($.babel({
			presets: ['es2015']
		}))
		.pipe($.uglify())
		.pipe($.sourcemaps.write('.'))
		.pipe(gulp.dest(jsDest));
});

// concat scripts
gulp.task('concat-scripts', function() {
	return gulp.src(config.jsConcat)
		.pipe($.concat('vendors.js'))
		.pipe(gulp.dest(jsDest))
});

// sprite-gen
gulp.task('png-sprite', function() {
	var spriteData = gulp.src(`${SRC}/img/sprite/raster/*.png`).pipe($.spritesmith({
		imgName: 'sprite.png',
		cssName: `../../../${SRC}/styles/core/_sprite.scss`,
		padding: 20,
		imgPath: '../img/theme/sprite.png'
	}));
	return spriteData.pipe(gulp.dest(`${DEST}/img/theme/`));
});

// SVG sprite
gulp.task('svg-sprite', function() {
	gulp.src(`${SRC}/img/sprite/svg/*.svg`)
		.pipe($.plumber())
		.pipe($.svgSprite({
			shape: {
				dimension: {
					maxWidth: 32,
					maxHeight: 32
				},
				spacing: {
					padding: 0
				},
				id: {
					generator: 'si-'
				}
			},
			mode: {
				symbol: {
					sprite: "../sprite.symbol.svg"
				}
			}
		})).on('error', function(error) { console.log(error); })
		.pipe(gulp.dest(`${DEST}/img/theme`));
});


// main task
gulp.task('serve', $.sync(gulp).sync([
	['views', 'png-sprite', 'styles', 'scripts', 'concat-scripts', 'svg-sprite']
]), function() {
	browserSync.init(config.browserSync);

	// watch for changes
	gulp.watch([
		`${DEST}/scripts/**/*.js`,
		`${SRC}/img/**/*`
	]).on('change', reload);

	gulp.watch(`${SRC}/scripts/**/*.js`, ['scripts']);
	gulp.watch(`${SRC}/plugins/**/*.js`, ['concat-scripts']);
	gulp.watch(`${SRC}/styles/**/*.scss`, ['styles']);
	gulp.watch(`${SRC}/**/*.jade`, ['views']);
	gulp.watch(`${SRC}/img/sprite/**/*.png`, ['png-sprite']);
	gulp.watch(`${SRC}/img/sprite/**/*.svg`, ['svg-sprite', 'views']);
});

gulp.task('build', [
	'svg-sprite',
	'png-sprite',
	'views',
	'styles',
	'scripts',
	'concat-scripts',
]);

gulp.task('default', function() {
	gulp.start('serve');
});
