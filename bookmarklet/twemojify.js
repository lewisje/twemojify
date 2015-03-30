// ==UserScript==
// @author James Edward Lewis II
// @description This loads Twitter emoji where possible, using the open-source Twemoji API.
// @name Twemojify
// @namespace greasyfork.org
// @version 1.0.0
// @icon http://twemoji.maxcdn.com/16x16/1f4d8.png
// @include *
// @grant none
// @require https://rawgit.com/lewisje/twemojify/master/extension/twemoji.min.js
// @run-at document-start
// @copyright 2015 James Edward Lewis II
// ==/UserScript==

// greatly inspired by the Twemojify extension by Monica Dinculescu
(function twemojify(window, undefined) {
  'use strict';
  var observer = {}, observerConfig, r, NATIVE_MUTATION_EVENTS;
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
  function twemojiNode(e) {
    e = e || window.event;
    return twemoji.parse(e.target);
  }
  function twemojiBody() {
    twemojiNode({target: document.body});
  }
  function init(e) {
    var t;
    e = e || event;
    t = e.type;
    if (e && (t === 'load' || t === 'DOMContentLoaded')) {
      if (document.removeEventListener) document.removeEventListener(t, init, false);
      else if (document.detachEvent) document.detachEvent(t, init);
      else document[t] = null;
    }
    twemojiBody();
    observer.start();
  }
  if (typeof MutationObserver !== 'function')
    window.MutationObserver = window.WebKitMutationObserver || window.MozMutationObserver;
  NATIVE_MUTATION_EVENTS = (function testMutations() {
    var e, l, f = false, root = document.documentElement;
    l = root.id;
    e = function e() {
      if (root.removeEventListener) root.removeEventListener('DOMAttrModified', e, false);
      else if (root.detachEvent) root.detachEvent('DOMAttrModified', e);
      else root.onDomAttrModified = null;
      NATIVE_MUTATION_EVENTS = true;
      root.id = l;
    };
    cb_addEventListener(root, 'DOMAttrModified', e, false);
    // now modify a property
    root.id = 'nw';
    f = (root.id !== 'nw');
    root.id = l;
    return f;
  }());
  function onMutation(mutations) {
    observer.stop();
    twemojiBody();
    observer.start();
  }
  if (MutationObserver) {
    observer = new MutationObserver(onMutation);
    observerConfig = {
      attributes: false,
      characterData: false,
      childList: true,
      subtree: true
    };
    observer.start = function start() {
      observer.observe(document.body, observerConfig);
    };
    observer.stop = function stop() {
      observer.disconnect();
    };
  } else if (NATIVE_MUTATION_EVENTS) {
    observer.start = function start() {
      //cb_addEventListener(document.body, 'DOMAttrModified', onMutation, false);
      //cb_addEventListener(document.body, 'DOMCharacterDataModified', onMutation, false);
      cb_addEventListener(document.body, 'DOMNodeInserted', onMutation, false);
      cb_addEventListener(document.body, 'DOMSubtreeModified', onMutation, false);
    };
    observer.stop = function stop() {
      if (document.removeEventListener) {
       //document.body.removeEventListener('DOMAttrModified', onMutation, false);
       //document.body.removeEventListener('DOMCharacterDataModified', onMutation, false);
        document.body.removeEventListener('DOMNodeInserted', onMutation, false);
        document.body.removeEventListener('DOMSubtreeModified', onMutation, false);
      } else if (document.detachEvent) {
        //document.body.detachEvent('DOMAttrModified', onMutation);
        //document.body.detachEvent('DOMCharacterDataModified', onMutation);
        document.body.detachEvent('DOMNodeInserted', onMutation);
        document.body.detachEvent('DOMSubtreeModified', onMutation);
      } else {
        //document.body.onDOMAttrModified = null;
        //document.body.onDOMCharacterDataModified = null;
        document.body.onDOMNodeInserted = null;
        document.body.onDOMSubtreeModified = null;
      }
    };
  } else {
    observer.start = function start() {
      cb_addEventListener(document.body, 'propertychange', onMutation, false);
    };
    observer.stop = function stop() {
      if (document.removeEventListener)
        document.body.removeEventListener('propertychange', onMutation, false);
      else if (document.detachEvent)
        document.body.detachEvent('propertychange', onMutation);
      else document.body.onpropertychange = null;
    };
  }
  r = document.readyState;
  if (r === 'complete' || r === 'loaded' || r === 'interactive') init({type: 'load'});
  else cb_addEventListener(document, 'DOMContentLoaded', init, false);
}(window));
