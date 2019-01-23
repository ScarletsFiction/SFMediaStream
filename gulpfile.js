var gulp = require('gulp');
var concat = require('gulp-concat');
var sourcemaps = require('gulp-sourcemaps');
var uglify = require('gulp-uglify-es').default;
var header = require('gulp-header');
var babel = require('gulp-babel');
var rename = require('gulp-rename');
var order = require("gulp-order");

gulp.task('js', function(){
  return gulp.src('src/**/*.js')
    .pipe(sourcemaps.init())
    .pipe(order([
      'a_init.js',
      '**/*.js',
      'z_extra.js'
    ]))
    .pipe(concat('SFMediaStream.js'))
    .pipe(gulp.dest('dist'))
    
    .pipe(rename('SFMediaStream.min.js'))
    .pipe(babel({
      "presets": [
        [
          "@babel/preset-env",
          {
            "targets": {
              "ie": "9"
            },
            "loose":true,
            "modules": false
          }
        ]
      ]
    }))
    .on('error', swallowError)
    .pipe(uglify())
    .on('error', swallowError)
    .pipe(header(`/*
  SFMediaStream
  HTML5 media streamer library for playing music, video, playlist,
  or even live streaming microphone & camera with node server

  https://github.com/ScarletsFiction/SFMediaStream
*/\n`))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('dist'));
});

gulp.task('watch', function() {
  gulp.watch(['src/**/*.js'], gulp.series('js'));
});

gulp.task('default', gulp.series('js'));

function swallowError(error){
  console.log(error.message)
  this.emit('end')
}