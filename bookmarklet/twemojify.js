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
  var twemojiQueue = [], observer = {}, observerConfig, r, NATIVE_MUTATION_EVENTS;
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
  // via Douglas Crockford
  function walkTheDOM(node, func) {
    if (func(node)) {
      node = node.firstChild;
      while (node) {
        walkTheDOM(node, func);
        node = node.nextSibling;
      }
    }
  }
  // https://github.com/YuzuJS/setImmediate/blob/master/setImmediate.js
  (function (global, undefined) {
    if (global.setImmediate) return;
    var nextHandle = 1, // Spec says greater than zero
      tasksByHandle = {}, currentlyRunningATask = false,
      doc = global.document, setImmediate;
    // This function accepts the same arguments as setImmediate, but
    // returns a function that requires no arguments.
    function partiallyApplied(handler) {
      var args = [].slice.call(arguments, 1);
      return function partiallyApplied() {
        if (typeof handler === 'function') handler.apply(undefined, args);
        /* jshint evil:true */
        else (new Function('' + handler)());
        /* jshint evil:false */
      };
    }
    function clearImmediate(handle) {
        delete tasksByHandle[handle];
    }
    function addFromSetImmediateArguments(args) {
      tasksByHandle[nextHandle] = partiallyApplied.apply(undefined, args);
      return nextHandle++;
    }
    function runIfPresent(handle) {
      // From the spec: "Wait until any invocations of this algorithm
      // started before this one have completed."
      // So if we're currently running a task, we'll need to delay this invocation.
      if (currentlyRunningATask) setTimeout(partiallyApplied(runIfPresent, handle), 0);
        // Delay by doing a setTimeout. setImmediate was tried instead,
        // but in Firefox 7, it generated a "too much recursion" error.
      else {
        var task = tasksByHandle[handle];
        if (task) {
          currentlyRunningATask = true;
          try {
            task();
          } finally {
            clearImmediate(handle);
            currentlyRunningATask = false;
          }
        }
      }
    }
    function installNextTickImplementation() {
      setImmediate = function setImmediate() {
        var handle = addFromSetImmediateArguments(arguments);
        process.nextTick(partiallyApplied(runIfPresent, handle));
        return handle;
      };
    }
    function canUsePostMessage() {
      // The test against `importScripts` prevents this implementation
      // from being installed inside a web worker,
      // where `global.postMessage` means something completely different
      // and can't be used for this purpose.
      if (global.postMessage && !global.importScripts) {
        var postMessageIsAsynchronous = true, oldOnMessage = global.onmessage;
        global.onmessage = function onMsg() {
          postMessageIsAsynchronous = false;
        };
        global.postMessage('', '*');
        global.onmessage = oldOnMessage;
        return postMessageIsAsynchronous;
      }
    }
    function installPostMessageImplementation() {
      // Installs an event handler on `global` for the `message` event: see
      // https://developer.mozilla.org/en/DOM/window.postMessage
      // http://www.whatwg.org/specs/web-apps/current-work/multipage/comms.html#crossDocumentMessages
      var messagePrefix = 'setImmediate$' + Math.random() + '$',
       onGlobalMessage = function onGlobalMessage(event) {
        if (event.source === global && typeof event.data === 'string' &&
            event.data.indexOf(messagePrefix) === 0)
          runIfPresent(+event.data.slice(messagePrefix.length));
      };
      cb_addEventListener(global, 'message', onGlobalMessage, false);
      setImmediate = function setImmediate() {
        var handle = addFromSetImmediateArguments(arguments);
        global.postMessage(messagePrefix + handle, '*');
        return handle;
      };
    }
    function installMessageChannelImplementation() {
      var channel = new MessageChannel();
      channel.port1.onmessage = function onMsg(event) {
        var handle = event.data;
        runIfPresent(handle);
      };
      setImmediate = function setImmediate() {
        var handle = addFromSetImmediateArguments(arguments);
        channel.port2.postMessage(handle);
        return handle;
      };
    }
    function installReadyStateChangeImplementation() {
      var html = doc.documentElement;
      setImmediate = function setImmediate() {
        var handle = addFromSetImmediateArguments(arguments),
          script = doc.createElement('script');
        // Create a <script> element; its readystatechange event
        // will be fired asynchronously once it is inserted
        // into the document. Do so, thus queuing up the task.
        // Remember to clean up once it's been called.
        script.onreadystatechange = function onready() {
          runIfPresent(handle);
          script.onreadystatechange = null;
          html.removeChild(script);
          script = null;
        };
        html.appendChild(script);
        return handle;
      };
    }
    function installSetTimeoutImplementation() {
      setImmediate = function setImmediate() {
        var handle = addFromSetImmediateArguments(arguments);
        setTimeout(partiallyApplied(runIfPresent, handle), 0);
        return handle;
      };
    }
    // If supported, we should attach to the prototype of global,
    // since that is where setTimeout et al. live.
    var attachTo = Object.getPrototypeOf && Object.getPrototypeOf(global);
    attachTo = attachTo && attachTo.setTimeout ? attachTo : global;
    // Don't get fooled by e.g. browserify environments.
    if ({}.toString.call(global.process) === '[object process]')
      installNextTickImplementation(); // For Node.js before 0.9
    else if (canUsePostMessage())
      installPostMessageImplementation(); // For non-IE10 modern browsers
    else if (global.MessageChannel)
      installMessageChannelImplementation(); // For web workers, where supported
    else if (doc && 'onreadystatechange' in doc.createElement('script'))
      installReadyStateChangeImplementation(); // For IE 6–8
    else installSetTimeoutImplementation(); // For older browsers
    attachTo.setImmediate = setImmediate;
    attachTo.clearImmediate = clearImmediate;
  }(window));
  function isEdit(el) {
    var n = el.nodeName.toLowerCase();
    return (n === 'input' && el.type === 'text') ||
      (n === 'textarea') || el.isContentEditable;
  }
  function nodeFilter(nodes, n) {
    return nodes.hasOwnProperty(n) && nodes[n].nodeType === Node.TEXT_NODE &&
             // /[^\s\w\u0000-\u203B\u2050-\u2116\u3299-\uD7FF\uE537-\uFFFD]/
             twemoji.test(nodes[n].nodeValue);// /[^\s\w\u0000-\u0022\u0024-\u002F\u003A-\u00A8
  }// \u00AA-\u00AD\u00AF-\u203B\u2050-\u2116\u3299-\uD7FF\uE537-\uF8FE\uF900-\uFFFF]/
  function hasText(el) {
    var nodes = el.childNodes, nl = nodes.length, nam = el.nodeName.toLowerCase(), n;
    if (nl && nam !== 'select' && nam !== 'noframes')
      for (n in nodes) if (nodeFilter(nodes, n)) return true;
    return false;
  }
  function getStyle(el, cssprop) {
    if (document.defaultView && document.defaultView.getComputedStyle)
      return document.defaultView.getComputedStyle(el, '')[cssprop]; // W3C
    if (el.currentStyle) return el.currentStyle[cssprop]; // IE8 and earlier
    return el.style[cssprop]; // try to get inline style
  }
  function deepen(el) {
    if (el && !el.$depth) {
      if (el === document.body) el.$depth = 1;
      else el.$depth = el.parentNode.$depth + 1;
      return true;
    }
    return false;
  }
  function twemojiLoad(el) {
    var s;
    if (!el) return false;
    if (!/^(?:frame|iframe|link|noscript|script|style|textarea)$/i.test(el.nodeName) && !isEdit(el)) {
      if (!el.$twemoji && hasText(el)) {
        el.$twemoji = true;
        s = parseFloat(getStyle(el, 'fontSize'));
        if (!s || s < 35) s = 16;
        else if (s < 70) s = 36;
        else s = 72;
        el.$s = s;
        if (s !== el.parentNode.$s) twemojiQueue.push(el);
      }
      return true;
    }
    return false;
  }
  function twemojiNode(e) {
    var ql, i;
    function ext(elt) {
      return function extender() {
        var s = elt.$s;
        twemoji.parse(elt, {size: [s, s].join('x')});
      };
    }
    e = e || window.event;
    walkTheDOM(e.target, deepen);
    walkTheDOM(e.target, twemojiLoad);
    ql = twemojiQueue.length;
    twemojiQueue.sort(function deeper(a, b) {return b.$depth - a.$depth || b.$s - a.$s;});
    for (i = ql; i--;) setImmediate(ext(twemojiQueue.shift()));
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
