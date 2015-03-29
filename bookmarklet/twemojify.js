(function twemojify(window, undefined) {
  'use strict';
  var r;
  /*!
   * contentloaded.js
   *
   * Author: Diego Perini (diego.perini at gmail.com)
   * Summary: cross-browser wrapper for DOMContentLoaded
   * Updated: 20101020
   * License: MIT
   * Version: 1.2
   *
   * URL:
   * http://javascript.nwbox.com/ContentLoaded/
   * http://javascript.nwbox.com/ContentLoaded/MIT-LICENSE
   *
   */
  // @win window reference
  // @fn function reference
  function contentLoaded(win, fn, cap) {
    var done = false, top = true, doc = win.document, root = doc.documentElement,
      w3c = !!doc.addEventListener, add = w3c ? 'addEventListener' : 'attachEvent',
      rem = w3c ? 'removeEventListener' : 'detachEvent', pre = w3c ? '' : 'on',
      init = function init(e) {
        if (e.type === 'readystatechange' && doc.readyState !== 'complete') return;
        (e.type === 'load' ? win : doc)[rem](pre + e.type, init, cap);
        if (!done && (done = true)) fn.call(win, e.type || e);
      },
      poll = function poll() {
        try { root.doScroll('left'); } catch(e) { setTimeout(poll, 50); return; }
        init('poll');
      };
    cap = w3c && cap;
    if (doc.readyState === 'complete') fn.call(win, 'lazy');
    else {
      if (doc.createEventObject && root.doScroll) {
        try { top = !win.frameElement; } catch(e) { }
        if (top) poll();
      }
      doc[add](pre + 'DOMContentLoaded', init, cap);
      doc[add](pre + 'readystatechange', init, cap);
      win[add](pre + 'load', init, cap);
    }
  }
  // https://gist.github.com/eduardocereto/955642
  function cb_addEventListener(obj, evt, fnc, cap) {
    cap = !window.addEventListener || cap;
    if (evt === 'DOMContentLoaded') return contentLoaded(window, fnc, cap);
    // W3C model
    if (obj.addEventListener) {
      obj.addEventListener(evt, fnc, cap);
      return true;
    } 
    // Microsoft model
    else if (obj.attachEvent) {
      var binder = function binder() {return fnc.call(obj, evt);};
      obj.attachEvent('on' + evt, binder);
      return binder;
    } else { // Browser doesn't support W3C or MSFT model, go on with traditional
      evt = 'on' + evt;
      if (typeof obj[evt] === 'function') {
        // Object already has a function on traditional
        // Let's wrap it with our own function inside another function
        fnc = (function wrapper(f1, f2) {
          return function wrapped() {
            f1.apply(this, arguments);
            f2.apply(this, arguments);
          };
        }(obj[evt], fnc));
      }
      obj[evt] = fnc;
      return true;
    }
  }
  function init(e) {
    e = e || event;
    if (e) {
      if (document.removeEventListener) document.removeEventListener(e.type, init, false);
      else if (document.detachEvent) document.detachEvent('on' + e.type, init);
      else document['on' + e.type] = null;
    }
    twemoji.parse(document.body, {size: '16x16'});
  }
  r = document.readyState;
  if (r === 'complete' || r === 'loaded' || r === 'interactive') init();
  else cb_addEventListener(document, 'DOMContentLoaded', init, false);
}(window));
