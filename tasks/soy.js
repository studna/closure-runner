var async = require('async');
var path = require('path');
var rmrf = require('rimraf');

var child = require('../lib/child');


module.exports = function (runner, args, callback) {
  var app_dirname = runner.getProjectDirname();
  var output_dirname = runner.getAppConfigValue('output.templates');
  var roots = runner.getAppConfigValue('roots');

  if (roots.length === 0) {
    return callback(new Error('No roots specified'), null);
  }

  var compile;

  async.waterfall([
    function (callback) {
      runner.runTask('get-closure-templates', callback);
    },

    function (compile_, callback) {
      compile = compile_;

      var root_dirnames = roots.map(function (root) {
        return path.join(app_dirname, root);
      });
      var find_args = root_dirnames.concat([ '-name', '*.soy' ]);

      child('find', find_args, function (err, result) {
        if (result.code !== 0) {
          return callback(new Error(result.stderr), []);
        }

        var sources = result.stdout.replace('\s*$', '').split('\n');
        if (!sources[sources.length - 1]) sources.pop();

        callback(null, sources);
      });
    },

    function (sources, callback) {
      var flags = {};

      flags['shouldGenerateJsdoc'] = true;
      flags['shouldProvideRequireSoyNamespaces'] = true;
      flags['shouldGenerateGoogMsgDefs'] = true;
      flags['bidiGlobalDir'] = 1;

      flags['outputPathFormat'] = path.join(
        output_dirname,
        '{INPUT_DIRECTORY}',
        '{INPUT_FILE_NAME_NO_EXT}' + '.js'
      );

      flags['srcs'] = sources.map(function (source) {
        return path.relative(app_dirname, source);
      });

      rmrf.sync(output_dirname);
      compile(flags, callback);
    }
  ], callback);
};
