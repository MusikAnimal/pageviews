module.exports = function(grunt) {
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-sass');
  grunt.loadNpmTasks('grunt-babel');

  grunt.initConfig({
    watch: {
      scripts: {
        files: ['javascripts/**/*.js'],
        tasks: ['browserify']
      },
      css: {
        files: 'stylesheets/**/*.scss',
        tasks: ['sass']
      }
    },
    browserify: {
      options: {
        transform: [
          ['babelify', {presets: ['es2015']} ]
        ],
      },
      dist: {
        files: {
          'public/application.js': ['javascripts/application.js']
        }
      }
    },
    sass: {
      dist: {
        options: {
          style: 'compressed',
          sourcemap: 'none'
        },
        files: [{
          expand: true,
          cwd: 'stylesheets',
          src: ['application.scss'],
          dest: 'public',
          ext: '.css'
        }]
      }
    },
    concat: {
      options: {
        separator: '\n'
      },
      js: {
        src: [
          'javascripts/vendor/jquery.min.js',
          'javascripts/vendor/bootstrap.min.js',
          'javascripts/vendor/select2.min.js',
          'javascripts/vendor/moment.min.js',
          'javascripts/vendor/daterangepicker.min.js',
          'javascripts/vendor/Chart.min.js',
          'javascripts/sites.js',
          'public/application.js'
        ],
        dest: 'public/application.js'
      },
      css: {
        src: [
          'stylesheets/vendor/bootstrap.min.css',
          'stylesheets/vendor/select2.min.css',
          'stylesheets/vendor/daterangepicker.min.css',
          'public/application.css'
        ],
        dest: 'public/application.css'
      }
    },
    uglify: {
      options: {
        compress: true
      },
      all: {
        files: {
          'public/application.js': ['public/application.js']
        }
      }
    }
  });

  grunt.registerTask('production', ['browserify:dist', 'sass', 'concat', 'uglify:all']);
  grunt.registerTask('default', ['browserify:dist', 'sass', 'concat']);
};
