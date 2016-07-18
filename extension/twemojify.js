(function twemojify(window, undefined) { return; //disabled for now
  'use strict';
  var r;
  function init(e) {
    if (e) document.removeEventListener(e.type, init, false);
    twemoji.parse(document.body, {size: '16x16'});
  }
  r = document.readyState;
  if (r === 'complete' || r === 'loaded' || r === 'interactive') init();
  else document.addEventListener('DOMContentLoaded', init, false);
})(window);
