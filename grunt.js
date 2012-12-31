module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    meta: {
      banner: '#version <%= grunt.template.today() %>'
    },
    concat: {
      dist: {
        src: ['src/lib/minheap.js', 'src/js/costdistance.js'],
        dest: 'dist/costdistance.js'
      }
    },
    min: {
      dist: {
        src: ['dist/costdistance.js'],
        dest: 'dist/costdistance.min.js'
      }
    },
    lint: {
      files: ['src/js/costdistance.js']
    },
    watch: {
      files: ['src/js/costdistance.js'],
      tasks: 'default'
    },
    jshint: {
      options: {
        "regexdash": true,
        "browser": true,
        "wsh": true,
        "trailing": true,
        "sub": true,
        "curly": true,
        "eqeqeq": true
      }
    },
    uglify: {}
  });

  // Default task.
  grunt.registerTask('default', 'lint concat min');

};