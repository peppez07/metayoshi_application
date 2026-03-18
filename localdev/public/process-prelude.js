(function () {
  var root = globalThis;
  var processRef = root.process || {};

  if (typeof processRef.browser === "undefined") processRef.browser = true;
  if (!processRef.env) processRef.env = {};
  if (!processRef.argv) processRef.argv = [];
  if (!processRef.version) processRef.version = "";
  if (!processRef.versions) processRef.versions = {};
  if (!processRef.platform) processRef.platform = "browser";
  if (typeof processRef.cwd !== "function") processRef.cwd = function () { return "/"; };
  if (typeof processRef.nextTick !== "function") {
    processRef.nextTick = function (fn) {
      var args = Array.prototype.slice.call(arguments, 1);
      return Promise.resolve().then(function () {
        return fn.apply(null, args);
      });
    };
  }

  var noop = function () {};
  if (typeof processRef.on !== "function") processRef.on = noop;
  if (typeof processRef.addListener !== "function") processRef.addListener = noop;
  if (typeof processRef.once !== "function") processRef.once = noop;
  if (typeof processRef.off !== "function") processRef.off = noop;
  if (typeof processRef.removeListener !== "function") processRef.removeListener = noop;
  if (typeof processRef.removeAllListeners !== "function") processRef.removeAllListeners = noop;
  if (typeof processRef.emit !== "function") processRef.emit = function () { return false; };
  if (typeof processRef.prependListener !== "function") processRef.prependListener = noop;
  if (typeof processRef.prependOnceListener !== "function") processRef.prependOnceListener = noop;
  if (typeof processRef.listeners !== "function") processRef.listeners = function () { return []; };

  root.process = processRef;
})();
