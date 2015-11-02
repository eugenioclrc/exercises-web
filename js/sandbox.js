var sandBox = (function(jailed) {
  if (!jailed) {
    return {};
  }
  var plugin = null;

  var sandBox = {};

  var printCallback;

  // sends the input to the plugin for evaluation
  var submit = function (code, callback) {
    printCallback = callback;

    // postpone the evaluation until the plugin is initialized
    plugin.whenConnected(function() {
      if (requests === 0) {
        startLoading();
      }
      requests++;
      plugin.remote.run(code);
    });
  };

  // puts the message on the terminal
  var print = function(cls, msg) {
    printCallback(cls, msg);
  };

  // will restart the plugin if it does not respond
  var disconnectTimeout = null;
  var startLoading = function() {
    disconnectTimeout = setTimeout(disconnect, 3000);
  };

  var endLoading = function() {
    clearTimeout(disconnectTimeout);
  };

  var disconnect = function() {
    plugin.disconnect();
  };

  // interface provided to the plugin
  var api = {
    output: function(data) {
      endLoading();
      // print('input', data.input);

      if (data.error) {
        print('Error', data);
        reset();
      } else {
        print(null, data);
        reset();
      }
    }
  };

  var requests;

  //  (re)initializes the plugin
  var reset = function() {
    requests = 0;
    var _path = window.location.pathname.split('/');
    _path.pop();
    plugin = new jailed.Plugin(window.location.protocol + '//' + window.location.hostname + _path.join('/') + '/plugin-45.js', api);
    plugin.whenDisconnected( function() {
      // give some time to handle the last responce
      setTimeout( function() {
        endLoading();
        console.log('resetting on fatal plugin error');
        codeOutput.setValue('resetting on fatal error (Infinite loop?)');
        reset();
      }, 10);
    });
  };
  reset();
  sandBox.submit = submit;
  return sandBox;
}(window.jailed));
