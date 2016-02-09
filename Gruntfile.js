module.exports = function(grunt) {
  grunt.loadNpmTasks('grunt-contrib-watch');
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
    babel: {
      options: {
        presets: ['es2015']
      },
      pageviews: {
        files: {
          'public/application.js': ['javascripts/application.js'],
          'public/helpers.js' : ['javascripts/helpers.js'],
          'public/config.js': ['javascripts/config.js']
        }
      },
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
          'javascripts/vendor/moment.min.js',
          'javascripts/vendor/bootstrap.min.js',
          'javascripts/vendor/select2.min.js',
          'javascripts/vendor/daterangepicker.min.js',
          'javascripts/vendor/Chart.min.js',
          'javascripts/sites.js',
          'public/config.js',
          'public/helpers.js',
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

  grunt.registerTask('haml', 'compile haml into html', function() {
    var exec = require('child_process').exec;
    var cmd = 'haml index.haml public/index.html';

    exec(cmd, function(error, stdout, stderr) {
      // command output is in stdout
    });
  });

  grunt.registerTask('production', ['babel', 'sass', 'concat', 'uglify:all', 'haml']);
  grunt.registerTask('default', ['babel', 'sass', 'concat', 'haml']);
};
