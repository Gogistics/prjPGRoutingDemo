/* Grunt Tasks  */
module.exports = function(grunt){
    grunt.initConfig({
      // basic setting
      pkg: grunt.file.readJSON('package.json'),

      // check JS code
      jshint: {
        files: ['Gruntfile.js', 'public/js/*.js'],
        options: {
            globals: {
            jQuery: true,
          },
        },
      },
        
      // minify css files
      cssmin:{
        combine: {
          files: {
            'public/css/index.min.css': ['public/css/index.css']
          },
        },
      },

      // minify js
      uglify:{
        options: {
          banner: '\/\*\! \<\%\= pkg.name \%\> \<\%\= grunt.template.today\(\"dd-mm-yyyy\"\) \%\> \*\/',
          report: 'min',
          mangle: false
        },
        combine: {
          files: {
            'public/js/index.min.js': ['public/js/index.js']
          },
        },
      },

      // minify html
      htmlmin: {
        dist: {
          options: {
            removeComments: true,
            collapseWhitespace: true
          },
          files: {
            'public/my_ng_templates/index_map.html': 'public/my_ng_templates/index_map.htm'
          }
        }
      }
    });

    // load the plugin
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-htmlmin');

    // register tasks
    grunt.registerTask('default', ['jshint', 'cssmin', 'uglify', 'htmlmin']);
};