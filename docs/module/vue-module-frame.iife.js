var vueModuleFrame = function(Vue) {
  "use strict";
  function _interopNamespace(e) {
    if (e && e.__esModule)
      return e;
    const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
    if (e) {
      for (const k in e) {
        if (k !== "default") {
          const d = Object.getOwnPropertyDescriptor(e, k);
          Object.defineProperty(n, k, d.get ? d : {
            enumerable: true,
            get: () => e[k]
          });
        }
      }
    }
    n.default = e;
    return Object.freeze(n);
  }
  const Vue__namespace = /* @__PURE__ */ _interopNamespace(Vue);
  const name = "vue-module-frame";
  var __async = (__this, __arguments, generator) => {
    return new Promise((resolve, reject) => {
      var fulfilled = (value) => {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      };
      var rejected = (value) => {
        try {
          step(generator.throw(value));
        } catch (e) {
          reject(e);
        }
      };
      var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
      step((generator = generator.apply(__this, __arguments)).next());
    });
  };
  function createContext$1(ctx = {}) {
    window[Symbol.for("___VML_CONTEXT___")] = ctx;
  }
  function uninstallCache(moduleName, uninstaller) {
  }
  function loadStyle(moduleData, moduleHostUrl) {
    return new Promise((resolve, reject) => {
      const style = document.createElement("link");
      style.id = moduleData.name;
      style.rel = "stylesheet";
      style.crossOrigin = "anonymous";
      style.href = moduleHostUrl + "style.css";
      style.onload = () => {
        resolve();
      };
      style.onerror = () => {
        resolve();
      };
      document.head.append(style);
    });
  }
  function fireModule(moduleData, moduleHostUrl) {
    return __async(this, null, function* () {
      const context = window[Symbol.for("___VML_CONTEXT___")];
      let installReturn;
      try {
        console.log(`[vue-module-loader]: \u6A21\u5757\u300C${moduleData.name}\u300D\u5F00\u59CB\u52A0\u8F7D...`);
        if (moduleHostUrl) {
          yield loadStyle(moduleData, moduleHostUrl);
        }
        installReturn = yield moduleData.install(context);
        console.log(`[vue-module-loader]: \u6A21\u5757\u300C${moduleData.name}\u300D\u52A0\u8F7D\u5B8C\u6210\u3002`);
        uninstallCache(moduleData.name, moduleData.uninstall);
      } catch (error) {
        console.error(`[vue-module-loader]: \u6A21\u5757\u300C${moduleData.name}\u300D\u52A0\u8F7D\u9519\u8BEF\uFF01`, error);
        installReturn = error;
      }
      return installReturn;
    });
  }
  function useModule(moduleData, ctx) {
    return __async(this, null, function* () {
      const existingContext = window[Symbol.for("___VML_CONTEXT___")];
      if (!existingContext) {
        createContext$1(ctx);
      }
      if (typeof moduleData === "object") {
        return yield fireModule(moduleData);
      } else if (typeof moduleData === "string") {
        if (!existingContext.Vue)
          throw new Error("[vue-module-loader]: \u4E0A\u4E0B\u6587\u5BF9\u8C61\u7F3A\u5C11Vue\u5BF9\u8C61");
        const res = yield fetch(moduleData);
        const moduleString = yield res.text();
        const moduleCode = moduleString.replace("const", "return");
        const moduleStringFun = Function(`return function(vue){${moduleCode}}`)();
        const moduleDataFromUrl = moduleStringFun(existingContext.Vue);
        return yield fireModule(moduleDataFromUrl, moduleData.match(/\S*\//)[0]);
      }
    });
  }
  function getDevtoolsGlobalHook() {
    return getTarget().__VUE_DEVTOOLS_GLOBAL_HOOK__;
  }
  function getTarget() {
    return typeof navigator !== "undefined" && typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : {};
  }
  const isProxyAvailable = typeof Proxy === "function";
  const HOOK_SETUP = "devtools-plugin:setup";
  const HOOK_PLUGIN_SETTINGS_SET = "plugin:settings:set";
  let supported;
  let perf;
  function isPerformanceSupported() {
    var _a;
    if (supported !== void 0) {
      return supported;
    }
    if (typeof window !== "undefined" && window.performance) {
      supported = true;
      perf = window.performance;
    } else if (typeof global !== "undefined" && ((_a = global.perf_hooks) === null || _a === void 0 ? void 0 : _a.performance)) {
      supported = true;
      perf = global.perf_hooks.performance;
    } else {
      supported = false;
    }
    return supported;
  }
  function now() {
    return isPerformanceSupported() ? perf.now() : Date.now();
  }
  class ApiProxy {
    constructor(plugin, hook) {
      this.target = null;
      this.targetQueue = [];
      this.onQueue = [];
      this.plugin = plugin;
      this.hook = hook;
      const defaultSettings = {};
      if (plugin.settings) {
        for (const id in plugin.settings) {
          const item = plugin.settings[id];
          defaultSettings[id] = item.defaultValue;
        }
      }
      const localSettingsSaveId = `__vue-devtools-plugin-settings__${plugin.id}`;
      let currentSettings = Object.assign({}, defaultSettings);
      try {
        const raw = localStorage.getItem(localSettingsSaveId);
        const data = JSON.parse(raw);
        Object.assign(currentSettings, data);
      } catch (e) {
      }
      this.fallbacks = {
        getSettings() {
          return currentSettings;
        },
        setSettings(value) {
          try {
            localStorage.setItem(localSettingsSaveId, JSON.stringify(value));
          } catch (e) {
          }
          currentSettings = value;
        },
        now() {
          return now();
        }
      };
      if (hook) {
        hook.on(HOOK_PLUGIN_SETTINGS_SET, (pluginId, value) => {
          if (pluginId === this.plugin.id) {
            this.fallbacks.setSettings(value);
          }
        });
      }
      this.proxiedOn = new Proxy({}, {
        get: (_target, prop) => {
          if (this.target) {
            return this.target.on[prop];
          } else {
            return (...args) => {
              this.onQueue.push({
                method: prop,
                args
              });
            };
          }
        }
      });
      this.proxiedTarget = new Proxy({}, {
        get: (_target, prop) => {
          if (this.target) {
            return this.target[prop];
          } else if (prop === "on") {
            return this.proxiedOn;
          } else if (Object.keys(this.fallbacks).includes(prop)) {
            return (...args) => {
              this.targetQueue.push({
                method: prop,
                args,
                resolve: () => {
                }
              });
              return this.fallbacks[prop](...args);
            };
          } else {
            return (...args) => {
              return new Promise((resolve) => {
                this.targetQueue.push({
                  method: prop,
                  args,
                  resolve
                });
              });
            };
          }
        }
      });
    }
    async setRealTarget(target) {
      this.target = target;
      for (const item of this.onQueue) {
        this.target.on[item.method](...item.args);
      }
      for (const item of this.targetQueue) {
        item.resolve(await this.target[item.method](...item.args));
      }
    }
  }
  function setupDevtoolsPlugin(pluginDescriptor, setupFn) {
    const descriptor = pluginDescriptor;
    const target = getTarget();
    const hook = getDevtoolsGlobalHook();
    const enableProxy = isProxyAvailable && descriptor.enableEarlyProxy;
    if (hook && (target.__VUE_DEVTOOLS_PLUGIN_API_AVAILABLE__ || !enableProxy)) {
      hook.emit(HOOK_SETUP, pluginDescriptor, setupFn);
    } else {
      const proxy = enableProxy ? new ApiProxy(descriptor, hook) : null;
      const list = target.__VUE_DEVTOOLS_PLUGINS__ = target.__VUE_DEVTOOLS_PLUGINS__ || [];
      list.push({
        pluginDescriptor: descriptor,
        setupFn,
        proxy
      });
      if (proxy)
        setupFn(proxy.proxiedTarget);
    }
  }
  /*!
    * vue-router v4.1.5
    * (c) 2022 Eduardo San Martin Morote
    * @license MIT
    */
  const isBrowser = typeof window !== "undefined";
  function isESModule(obj) {
    return obj.__esModule || obj[Symbol.toStringTag] === "Module";
  }
  const assign = Object.assign;
  function applyToParams(fn, params) {
    const newParams = {};
    for (const key in params) {
      const value = params[key];
      newParams[key] = isArray(value) ? value.map(fn) : fn(value);
    }
    return newParams;
  }
  const noop = () => {
  };
  const isArray = Array.isArray;
  function warn(msg) {
    const args = Array.from(arguments).slice(1);
    console.warn.apply(console, ["[Vue Router warn]: " + msg].concat(args));
  }
  const TRAILING_SLASH_RE = /\/$/;
  const removeTrailingSlash = (path) => path.replace(TRAILING_SLASH_RE, "");
  function parseURL(parseQuery2, location2, currentLocation = "/") {
    let path, query = {}, searchString = "", hash = "";
    const hashPos = location2.indexOf("#");
    let searchPos = location2.indexOf("?");
    if (hashPos < searchPos && hashPos >= 0) {
      searchPos = -1;
    }
    if (searchPos > -1) {
      path = location2.slice(0, searchPos);
      searchString = location2.slice(searchPos + 1, hashPos > -1 ? hashPos : location2.length);
      query = parseQuery2(searchString);
    }
    if (hashPos > -1) {
      path = path || location2.slice(0, hashPos);
      hash = location2.slice(hashPos, location2.length);
    }
    path = resolveRelativePath(path != null ? path : location2, currentLocation);
    return {
      fullPath: path + (searchString && "?") + searchString + hash,
      path,
      query,
      hash
    };
  }
  function stringifyURL(stringifyQuery2, location2) {
    const query = location2.query ? stringifyQuery2(location2.query) : "";
    return location2.path + (query && "?") + query + (location2.hash || "");
  }
  function stripBase(pathname, base) {
    if (!base || !pathname.toLowerCase().startsWith(base.toLowerCase()))
      return pathname;
    return pathname.slice(base.length) || "/";
  }
  function isSameRouteLocation(stringifyQuery2, a, b) {
    const aLastIndex = a.matched.length - 1;
    const bLastIndex = b.matched.length - 1;
    return aLastIndex > -1 && aLastIndex === bLastIndex && isSameRouteRecord(a.matched[aLastIndex], b.matched[bLastIndex]) && isSameRouteLocationParams(a.params, b.params) && stringifyQuery2(a.query) === stringifyQuery2(b.query) && a.hash === b.hash;
  }
  function isSameRouteRecord(a, b) {
    return (a.aliasOf || a) === (b.aliasOf || b);
  }
  function isSameRouteLocationParams(a, b) {
    if (Object.keys(a).length !== Object.keys(b).length)
      return false;
    for (const key in a) {
      if (!isSameRouteLocationParamsValue(a[key], b[key]))
        return false;
    }
    return true;
  }
  function isSameRouteLocationParamsValue(a, b) {
    return isArray(a) ? isEquivalentArray(a, b) : isArray(b) ? isEquivalentArray(b, a) : a === b;
  }
  function isEquivalentArray(a, b) {
    return isArray(b) ? a.length === b.length && a.every((value, i) => value === b[i]) : a.length === 1 && a[0] === b;
  }
  function resolveRelativePath(to, from) {
    if (to.startsWith("/"))
      return to;
    if (process.env.NODE_ENV !== "production" && !from.startsWith("/")) {
      warn(`Cannot resolve a relative location without an absolute path. Trying to resolve "${to}" from "${from}". It should look like "/${from}".`);
      return to;
    }
    if (!to)
      return from;
    const fromSegments = from.split("/");
    const toSegments = to.split("/");
    let position = fromSegments.length - 1;
    let toPosition;
    let segment;
    for (toPosition = 0; toPosition < toSegments.length; toPosition++) {
      segment = toSegments[toPosition];
      if (segment === ".")
        continue;
      if (segment === "..") {
        if (position > 1)
          position--;
      } else
        break;
    }
    return fromSegments.slice(0, position).join("/") + "/" + toSegments.slice(toPosition - (toPosition === toSegments.length ? 1 : 0)).join("/");
  }
  var NavigationType;
  (function(NavigationType2) {
    NavigationType2["pop"] = "pop";
    NavigationType2["push"] = "push";
  })(NavigationType || (NavigationType = {}));
  var NavigationDirection;
  (function(NavigationDirection2) {
    NavigationDirection2["back"] = "back";
    NavigationDirection2["forward"] = "forward";
    NavigationDirection2["unknown"] = "";
  })(NavigationDirection || (NavigationDirection = {}));
  function normalizeBase(base) {
    if (!base) {
      if (isBrowser) {
        const baseEl = document.querySelector("base");
        base = baseEl && baseEl.getAttribute("href") || "/";
        base = base.replace(/^\w+:\/\/[^\/]+/, "");
      } else {
        base = "/";
      }
    }
    if (base[0] !== "/" && base[0] !== "#")
      base = "/" + base;
    return removeTrailingSlash(base);
  }
  const BEFORE_HASH_RE = /^[^#]+#/;
  function createHref(base, location2) {
    return base.replace(BEFORE_HASH_RE, "#") + location2;
  }
  function getElementPosition(el, offset) {
    const docRect = document.documentElement.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    return {
      behavior: offset.behavior,
      left: elRect.left - docRect.left - (offset.left || 0),
      top: elRect.top - docRect.top - (offset.top || 0)
    };
  }
  const computeScrollPosition = () => ({
    left: window.pageXOffset,
    top: window.pageYOffset
  });
  function scrollToPosition(position) {
    let scrollToOptions;
    if ("el" in position) {
      const positionEl = position.el;
      const isIdSelector = typeof positionEl === "string" && positionEl.startsWith("#");
      if (process.env.NODE_ENV !== "production" && typeof position.el === "string") {
        if (!isIdSelector || !document.getElementById(position.el.slice(1))) {
          try {
            const foundEl = document.querySelector(position.el);
            if (isIdSelector && foundEl) {
              warn(`The selector "${position.el}" should be passed as "el: document.querySelector('${position.el}')" because it starts with "#".`);
              return;
            }
          } catch (err) {
            warn(`The selector "${position.el}" is invalid. If you are using an id selector, make sure to escape it. You can find more information about escaping characters in selectors at https://mathiasbynens.be/notes/css-escapes or use CSS.escape (https://developer.mozilla.org/en-US/docs/Web/API/CSS/escape).`);
            return;
          }
        }
      }
      const el = typeof positionEl === "string" ? isIdSelector ? document.getElementById(positionEl.slice(1)) : document.querySelector(positionEl) : positionEl;
      if (!el) {
        process.env.NODE_ENV !== "production" && warn(`Couldn't find element using selector "${position.el}" returned by scrollBehavior.`);
        return;
      }
      scrollToOptions = getElementPosition(el, position);
    } else {
      scrollToOptions = position;
    }
    if ("scrollBehavior" in document.documentElement.style)
      window.scrollTo(scrollToOptions);
    else {
      window.scrollTo(scrollToOptions.left != null ? scrollToOptions.left : window.pageXOffset, scrollToOptions.top != null ? scrollToOptions.top : window.pageYOffset);
    }
  }
  function getScrollKey(path, delta) {
    const position = history.state ? history.state.position - delta : -1;
    return position + path;
  }
  const scrollPositions = /* @__PURE__ */ new Map();
  function saveScrollPosition(key, scrollPosition) {
    scrollPositions.set(key, scrollPosition);
  }
  function getSavedScrollPosition(key) {
    const scroll = scrollPositions.get(key);
    scrollPositions.delete(key);
    return scroll;
  }
  let createBaseLocation = () => location.protocol + "//" + location.host;
  function createCurrentLocation(base, location2) {
    const { pathname, search, hash } = location2;
    const hashPos = base.indexOf("#");
    if (hashPos > -1) {
      let slicePos = hash.includes(base.slice(hashPos)) ? base.slice(hashPos).length : 1;
      let pathFromHash = hash.slice(slicePos);
      if (pathFromHash[0] !== "/")
        pathFromHash = "/" + pathFromHash;
      return stripBase(pathFromHash, "");
    }
    const path = stripBase(pathname, base);
    return path + search + hash;
  }
  function useHistoryListeners(base, historyState, currentLocation, replace) {
    let listeners = [];
    let teardowns = [];
    let pauseState = null;
    const popStateHandler = ({ state }) => {
      const to = createCurrentLocation(base, location);
      const from = currentLocation.value;
      const fromState = historyState.value;
      let delta = 0;
      if (state) {
        currentLocation.value = to;
        historyState.value = state;
        if (pauseState && pauseState === from) {
          pauseState = null;
          return;
        }
        delta = fromState ? state.position - fromState.position : 0;
      } else {
        replace(to);
      }
      listeners.forEach((listener) => {
        listener(currentLocation.value, from, {
          delta,
          type: NavigationType.pop,
          direction: delta ? delta > 0 ? NavigationDirection.forward : NavigationDirection.back : NavigationDirection.unknown
        });
      });
    };
    function pauseListeners() {
      pauseState = currentLocation.value;
    }
    function listen(callback) {
      listeners.push(callback);
      const teardown = () => {
        const index = listeners.indexOf(callback);
        if (index > -1)
          listeners.splice(index, 1);
      };
      teardowns.push(teardown);
      return teardown;
    }
    function beforeUnloadListener() {
      const { history: history2 } = window;
      if (!history2.state)
        return;
      history2.replaceState(assign({}, history2.state, { scroll: computeScrollPosition() }), "");
    }
    function destroy() {
      for (const teardown of teardowns)
        teardown();
      teardowns = [];
      window.removeEventListener("popstate", popStateHandler);
      window.removeEventListener("beforeunload", beforeUnloadListener);
    }
    window.addEventListener("popstate", popStateHandler);
    window.addEventListener("beforeunload", beforeUnloadListener);
    return {
      pauseListeners,
      listen,
      destroy
    };
  }
  function buildState(back, current, forward, replaced = false, computeScroll = false) {
    return {
      back,
      current,
      forward,
      replaced,
      position: window.history.length,
      scroll: computeScroll ? computeScrollPosition() : null
    };
  }
  function useHistoryStateNavigation(base) {
    const { history: history2, location: location2 } = window;
    const currentLocation = {
      value: createCurrentLocation(base, location2)
    };
    const historyState = { value: history2.state };
    if (!historyState.value) {
      changeLocation(currentLocation.value, {
        back: null,
        current: currentLocation.value,
        forward: null,
        position: history2.length - 1,
        replaced: true,
        scroll: null
      }, true);
    }
    function changeLocation(to, state, replace2) {
      const hashIndex = base.indexOf("#");
      const url = hashIndex > -1 ? (location2.host && document.querySelector("base") ? base : base.slice(hashIndex)) + to : createBaseLocation() + base + to;
      try {
        history2[replace2 ? "replaceState" : "pushState"](state, "", url);
        historyState.value = state;
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          warn("Error with push/replace State", err);
        } else {
          console.error(err);
        }
        location2[replace2 ? "replace" : "assign"](url);
      }
    }
    function replace(to, data) {
      const state = assign({}, history2.state, buildState(
        historyState.value.back,
        to,
        historyState.value.forward,
        true
      ), data, { position: historyState.value.position });
      changeLocation(to, state, true);
      currentLocation.value = to;
    }
    function push(to, data) {
      const currentState = assign(
        {},
        historyState.value,
        history2.state,
        {
          forward: to,
          scroll: computeScrollPosition()
        }
      );
      if (process.env.NODE_ENV !== "production" && !history2.state) {
        warn(`history.state seems to have been manually replaced without preserving the necessary values. Make sure to preserve existing history state if you are manually calling history.replaceState:

history.replaceState(history.state, '', url)

You can find more information at https://next.router.vuejs.org/guide/migration/#usage-of-history-state.`);
      }
      changeLocation(currentState.current, currentState, true);
      const state = assign({}, buildState(currentLocation.value, to, null), { position: currentState.position + 1 }, data);
      changeLocation(to, state, false);
      currentLocation.value = to;
    }
    return {
      location: currentLocation,
      state: historyState,
      push,
      replace
    };
  }
  function createWebHistory(base) {
    base = normalizeBase(base);
    const historyNavigation = useHistoryStateNavigation(base);
    const historyListeners = useHistoryListeners(base, historyNavigation.state, historyNavigation.location, historyNavigation.replace);
    function go(delta, triggerListeners = true) {
      if (!triggerListeners)
        historyListeners.pauseListeners();
      history.go(delta);
    }
    const routerHistory = assign({
      location: "",
      base,
      go,
      createHref: createHref.bind(null, base)
    }, historyNavigation, historyListeners);
    Object.defineProperty(routerHistory, "location", {
      enumerable: true,
      get: () => historyNavigation.location.value
    });
    Object.defineProperty(routerHistory, "state", {
      enumerable: true,
      get: () => historyNavigation.state.value
    });
    return routerHistory;
  }
  function createWebHashHistory(base) {
    base = location.host ? base || location.pathname + location.search : "";
    if (!base.includes("#"))
      base += "#";
    if (process.env.NODE_ENV !== "production" && !base.endsWith("#/") && !base.endsWith("#")) {
      warn(`A hash base must end with a "#":
"${base}" should be "${base.replace(/#.*$/, "#")}".`);
    }
    return createWebHistory(base);
  }
  function isRouteLocation(route) {
    return typeof route === "string" || route && typeof route === "object";
  }
  function isRouteName(name2) {
    return typeof name2 === "string" || typeof name2 === "symbol";
  }
  const START_LOCATION_NORMALIZED = {
    path: "/",
    name: void 0,
    params: {},
    query: {},
    hash: "",
    fullPath: "/",
    matched: [],
    meta: {},
    redirectedFrom: void 0
  };
  const NavigationFailureSymbol = Symbol(process.env.NODE_ENV !== "production" ? "navigation failure" : "");
  var NavigationFailureType;
  (function(NavigationFailureType2) {
    NavigationFailureType2[NavigationFailureType2["aborted"] = 4] = "aborted";
    NavigationFailureType2[NavigationFailureType2["cancelled"] = 8] = "cancelled";
    NavigationFailureType2[NavigationFailureType2["duplicated"] = 16] = "duplicated";
  })(NavigationFailureType || (NavigationFailureType = {}));
  const ErrorTypeMessages = {
    [1]({ location: location2, currentLocation }) {
      return `No match for
 ${JSON.stringify(location2)}${currentLocation ? "\nwhile being at\n" + JSON.stringify(currentLocation) : ""}`;
    },
    [2]({ from, to }) {
      return `Redirected from "${from.fullPath}" to "${stringifyRoute(to)}" via a navigation guard.`;
    },
    [4]({ from, to }) {
      return `Navigation aborted from "${from.fullPath}" to "${to.fullPath}" via a navigation guard.`;
    },
    [8]({ from, to }) {
      return `Navigation cancelled from "${from.fullPath}" to "${to.fullPath}" with a new navigation.`;
    },
    [16]({ from, to }) {
      return `Avoided redundant navigation to current location: "${from.fullPath}".`;
    }
  };
  function createRouterError(type, params) {
    if (process.env.NODE_ENV !== "production" || false) {
      return assign(new Error(ErrorTypeMessages[type](params)), {
        type,
        [NavigationFailureSymbol]: true
      }, params);
    } else {
      return assign(new Error(), {
        type,
        [NavigationFailureSymbol]: true
      }, params);
    }
  }
  function isNavigationFailure(error, type) {
    return error instanceof Error && NavigationFailureSymbol in error && (type == null || !!(error.type & type));
  }
  const propertiesToLog = ["params", "query", "hash"];
  function stringifyRoute(to) {
    if (typeof to === "string")
      return to;
    if ("path" in to)
      return to.path;
    const location2 = {};
    for (const key of propertiesToLog) {
      if (key in to)
        location2[key] = to[key];
    }
    return JSON.stringify(location2, null, 2);
  }
  const BASE_PARAM_PATTERN = "[^/]+?";
  const BASE_PATH_PARSER_OPTIONS = {
    sensitive: false,
    strict: false,
    start: true,
    end: true
  };
  const REGEX_CHARS_RE = /[.+*?^${}()[\]/\\]/g;
  function tokensToParser(segments, extraOptions) {
    const options = assign({}, BASE_PATH_PARSER_OPTIONS, extraOptions);
    const score = [];
    let pattern = options.start ? "^" : "";
    const keys = [];
    for (const segment of segments) {
      const segmentScores = segment.length ? [] : [90];
      if (options.strict && !segment.length)
        pattern += "/";
      for (let tokenIndex = 0; tokenIndex < segment.length; tokenIndex++) {
        const token = segment[tokenIndex];
        let subSegmentScore = 40 + (options.sensitive ? 0.25 : 0);
        if (token.type === 0) {
          if (!tokenIndex)
            pattern += "/";
          pattern += token.value.replace(REGEX_CHARS_RE, "\\$&");
          subSegmentScore += 40;
        } else if (token.type === 1) {
          const { value, repeatable, optional, regexp } = token;
          keys.push({
            name: value,
            repeatable,
            optional
          });
          const re2 = regexp ? regexp : BASE_PARAM_PATTERN;
          if (re2 !== BASE_PARAM_PATTERN) {
            subSegmentScore += 10;
            try {
              new RegExp(`(${re2})`);
            } catch (err) {
              throw new Error(`Invalid custom RegExp for param "${value}" (${re2}): ` + err.message);
            }
          }
          let subPattern = repeatable ? `((?:${re2})(?:/(?:${re2}))*)` : `(${re2})`;
          if (!tokenIndex)
            subPattern = optional && segment.length < 2 ? `(?:/${subPattern})` : "/" + subPattern;
          if (optional)
            subPattern += "?";
          pattern += subPattern;
          subSegmentScore += 20;
          if (optional)
            subSegmentScore += -8;
          if (repeatable)
            subSegmentScore += -20;
          if (re2 === ".*")
            subSegmentScore += -50;
        }
        segmentScores.push(subSegmentScore);
      }
      score.push(segmentScores);
    }
    if (options.strict && options.end) {
      const i = score.length - 1;
      score[i][score[i].length - 1] += 0.7000000000000001;
    }
    if (!options.strict)
      pattern += "/?";
    if (options.end)
      pattern += "$";
    else if (options.strict)
      pattern += "(?:/|$)";
    const re = new RegExp(pattern, options.sensitive ? "" : "i");
    function parse(path) {
      const match = path.match(re);
      const params = {};
      if (!match)
        return null;
      for (let i = 1; i < match.length; i++) {
        const value = match[i] || "";
        const key = keys[i - 1];
        params[key.name] = value && key.repeatable ? value.split("/") : value;
      }
      return params;
    }
    function stringify(params) {
      let path = "";
      let avoidDuplicatedSlash = false;
      for (const segment of segments) {
        if (!avoidDuplicatedSlash || !path.endsWith("/"))
          path += "/";
        avoidDuplicatedSlash = false;
        for (const token of segment) {
          if (token.type === 0) {
            path += token.value;
          } else if (token.type === 1) {
            const { value, repeatable, optional } = token;
            const param = value in params ? params[value] : "";
            if (isArray(param) && !repeatable) {
              throw new Error(`Provided param "${value}" is an array but it is not repeatable (* or + modifiers)`);
            }
            const text = isArray(param) ? param.join("/") : param;
            if (!text) {
              if (optional) {
                if (segment.length < 2) {
                  if (path.endsWith("/"))
                    path = path.slice(0, -1);
                  else
                    avoidDuplicatedSlash = true;
                }
              } else
                throw new Error(`Missing required param "${value}"`);
            }
            path += text;
          }
        }
      }
      return path || "/";
    }
    return {
      re,
      score,
      keys,
      parse,
      stringify
    };
  }
  function compareScoreArray(a, b) {
    let i = 0;
    while (i < a.length && i < b.length) {
      const diff = b[i] - a[i];
      if (diff)
        return diff;
      i++;
    }
    if (a.length < b.length) {
      return a.length === 1 && a[0] === 40 + 40 ? -1 : 1;
    } else if (a.length > b.length) {
      return b.length === 1 && b[0] === 40 + 40 ? 1 : -1;
    }
    return 0;
  }
  function comparePathParserScore(a, b) {
    let i = 0;
    const aScore = a.score;
    const bScore = b.score;
    while (i < aScore.length && i < bScore.length) {
      const comp = compareScoreArray(aScore[i], bScore[i]);
      if (comp)
        return comp;
      i++;
    }
    if (Math.abs(bScore.length - aScore.length) === 1) {
      if (isLastScoreNegative(aScore))
        return 1;
      if (isLastScoreNegative(bScore))
        return -1;
    }
    return bScore.length - aScore.length;
  }
  function isLastScoreNegative(score) {
    const last = score[score.length - 1];
    return score.length > 0 && last[last.length - 1] < 0;
  }
  const ROOT_TOKEN = {
    type: 0,
    value: ""
  };
  const VALID_PARAM_RE = /[a-zA-Z0-9_]/;
  function tokenizePath(path) {
    if (!path)
      return [[]];
    if (path === "/")
      return [[ROOT_TOKEN]];
    if (!path.startsWith("/")) {
      throw new Error(process.env.NODE_ENV !== "production" ? `Route paths should start with a "/": "${path}" should be "/${path}".` : `Invalid path "${path}"`);
    }
    function crash(message) {
      throw new Error(`ERR (${state})/"${buffer}": ${message}`);
    }
    let state = 0;
    let previousState = state;
    const tokens = [];
    let segment;
    function finalizeSegment() {
      if (segment)
        tokens.push(segment);
      segment = [];
    }
    let i = 0;
    let char;
    let buffer = "";
    let customRe = "";
    function consumeBuffer() {
      if (!buffer)
        return;
      if (state === 0) {
        segment.push({
          type: 0,
          value: buffer
        });
      } else if (state === 1 || state === 2 || state === 3) {
        if (segment.length > 1 && (char === "*" || char === "+"))
          crash(`A repeatable param (${buffer}) must be alone in its segment. eg: '/:ids+.`);
        segment.push({
          type: 1,
          value: buffer,
          regexp: customRe,
          repeatable: char === "*" || char === "+",
          optional: char === "*" || char === "?"
        });
      } else {
        crash("Invalid state to consume buffer");
      }
      buffer = "";
    }
    function addCharToBuffer() {
      buffer += char;
    }
    while (i < path.length) {
      char = path[i++];
      if (char === "\\" && state !== 2) {
        previousState = state;
        state = 4;
        continue;
      }
      switch (state) {
        case 0:
          if (char === "/") {
            if (buffer) {
              consumeBuffer();
            }
            finalizeSegment();
          } else if (char === ":") {
            consumeBuffer();
            state = 1;
          } else {
            addCharToBuffer();
          }
          break;
        case 4:
          addCharToBuffer();
          state = previousState;
          break;
        case 1:
          if (char === "(") {
            state = 2;
          } else if (VALID_PARAM_RE.test(char)) {
            addCharToBuffer();
          } else {
            consumeBuffer();
            state = 0;
            if (char !== "*" && char !== "?" && char !== "+")
              i--;
          }
          break;
        case 2:
          if (char === ")") {
            if (customRe[customRe.length - 1] == "\\")
              customRe = customRe.slice(0, -1) + char;
            else
              state = 3;
          } else {
            customRe += char;
          }
          break;
        case 3:
          consumeBuffer();
          state = 0;
          if (char !== "*" && char !== "?" && char !== "+")
            i--;
          customRe = "";
          break;
        default:
          crash("Unknown state");
          break;
      }
    }
    if (state === 2)
      crash(`Unfinished custom RegExp for param "${buffer}"`);
    consumeBuffer();
    finalizeSegment();
    return tokens;
  }
  function createRouteRecordMatcher(record, parent, options) {
    const parser = tokensToParser(tokenizePath(record.path), options);
    if (process.env.NODE_ENV !== "production") {
      const existingKeys = /* @__PURE__ */ new Set();
      for (const key of parser.keys) {
        if (existingKeys.has(key.name))
          warn(`Found duplicated params with name "${key.name}" for path "${record.path}". Only the last one will be available on "$route.params".`);
        existingKeys.add(key.name);
      }
    }
    const matcher = assign(parser, {
      record,
      parent,
      children: [],
      alias: []
    });
    if (parent) {
      if (!matcher.record.aliasOf === !parent.record.aliasOf)
        parent.children.push(matcher);
    }
    return matcher;
  }
  function createRouterMatcher(routes, globalOptions) {
    const matchers = [];
    const matcherMap = /* @__PURE__ */ new Map();
    globalOptions = mergeOptions({ strict: false, end: true, sensitive: false }, globalOptions);
    function getRecordMatcher(name2) {
      return matcherMap.get(name2);
    }
    function addRoute(record, parent, originalRecord) {
      const isRootAdd = !originalRecord;
      const mainNormalizedRecord = normalizeRouteRecord(record);
      if (process.env.NODE_ENV !== "production") {
        checkChildMissingNameWithEmptyPath(mainNormalizedRecord, parent);
      }
      mainNormalizedRecord.aliasOf = originalRecord && originalRecord.record;
      const options = mergeOptions(globalOptions, record);
      const normalizedRecords = [
        mainNormalizedRecord
      ];
      if ("alias" in record) {
        const aliases = typeof record.alias === "string" ? [record.alias] : record.alias;
        for (const alias of aliases) {
          normalizedRecords.push(assign({}, mainNormalizedRecord, {
            components: originalRecord ? originalRecord.record.components : mainNormalizedRecord.components,
            path: alias,
            aliasOf: originalRecord ? originalRecord.record : mainNormalizedRecord
          }));
        }
      }
      let matcher;
      let originalMatcher;
      for (const normalizedRecord of normalizedRecords) {
        const { path } = normalizedRecord;
        if (parent && path[0] !== "/") {
          const parentPath = parent.record.path;
          const connectingSlash = parentPath[parentPath.length - 1] === "/" ? "" : "/";
          normalizedRecord.path = parent.record.path + (path && connectingSlash + path);
        }
        if (process.env.NODE_ENV !== "production" && normalizedRecord.path === "*") {
          throw new Error('Catch all routes ("*") must now be defined using a param with a custom regexp.\nSee more at https://next.router.vuejs.org/guide/migration/#removed-star-or-catch-all-routes.');
        }
        matcher = createRouteRecordMatcher(normalizedRecord, parent, options);
        if (process.env.NODE_ENV !== "production" && parent && path[0] === "/")
          checkMissingParamsInAbsolutePath(matcher, parent);
        if (originalRecord) {
          originalRecord.alias.push(matcher);
          if (process.env.NODE_ENV !== "production") {
            checkSameParams(originalRecord, matcher);
          }
        } else {
          originalMatcher = originalMatcher || matcher;
          if (originalMatcher !== matcher)
            originalMatcher.alias.push(matcher);
          if (isRootAdd && record.name && !isAliasRecord(matcher))
            removeRoute(record.name);
        }
        if (mainNormalizedRecord.children) {
          const children = mainNormalizedRecord.children;
          for (let i = 0; i < children.length; i++) {
            addRoute(children[i], matcher, originalRecord && originalRecord.children[i]);
          }
        }
        originalRecord = originalRecord || matcher;
        insertMatcher(matcher);
      }
      return originalMatcher ? () => {
        removeRoute(originalMatcher);
      } : noop;
    }
    function removeRoute(matcherRef) {
      if (isRouteName(matcherRef)) {
        const matcher = matcherMap.get(matcherRef);
        if (matcher) {
          matcherMap.delete(matcherRef);
          matchers.splice(matchers.indexOf(matcher), 1);
          matcher.children.forEach(removeRoute);
          matcher.alias.forEach(removeRoute);
        }
      } else {
        const index = matchers.indexOf(matcherRef);
        if (index > -1) {
          matchers.splice(index, 1);
          if (matcherRef.record.name)
            matcherMap.delete(matcherRef.record.name);
          matcherRef.children.forEach(removeRoute);
          matcherRef.alias.forEach(removeRoute);
        }
      }
    }
    function getRoutes() {
      return matchers;
    }
    function insertMatcher(matcher) {
      let i = 0;
      while (i < matchers.length && comparePathParserScore(matcher, matchers[i]) >= 0 && (matcher.record.path !== matchers[i].record.path || !isRecordChildOf(matcher, matchers[i])))
        i++;
      matchers.splice(i, 0, matcher);
      if (matcher.record.name && !isAliasRecord(matcher))
        matcherMap.set(matcher.record.name, matcher);
    }
    function resolve(location2, currentLocation) {
      let matcher;
      let params = {};
      let path;
      let name2;
      if ("name" in location2 && location2.name) {
        matcher = matcherMap.get(location2.name);
        if (!matcher)
          throw createRouterError(1, {
            location: location2
          });
        if (process.env.NODE_ENV !== "production") {
          const invalidParams = Object.keys(location2.params || {}).filter((paramName) => !matcher.keys.find((k) => k.name === paramName));
          if (invalidParams.length) {
            warn(`Discarded invalid param(s) "${invalidParams.join('", "')}" when navigating. See https://github.com/vuejs/router/blob/main/packages/router/CHANGELOG.md#414-2022-08-22 for more details.`);
          }
        }
        name2 = matcher.record.name;
        params = assign(
          paramsFromLocation(
            currentLocation.params,
            matcher.keys.filter((k) => !k.optional).map((k) => k.name)
          ),
          location2.params && paramsFromLocation(location2.params, matcher.keys.map((k) => k.name))
        );
        path = matcher.stringify(params);
      } else if ("path" in location2) {
        path = location2.path;
        if (process.env.NODE_ENV !== "production" && !path.startsWith("/")) {
          warn(`The Matcher cannot resolve relative paths but received "${path}". Unless you directly called \`matcher.resolve("${path}")\`, this is probably a bug in vue-router. Please open an issue at https://new-issue.vuejs.org/?repo=vuejs/router.`);
        }
        matcher = matchers.find((m) => m.re.test(path));
        if (matcher) {
          params = matcher.parse(path);
          name2 = matcher.record.name;
        }
      } else {
        matcher = currentLocation.name ? matcherMap.get(currentLocation.name) : matchers.find((m) => m.re.test(currentLocation.path));
        if (!matcher)
          throw createRouterError(1, {
            location: location2,
            currentLocation
          });
        name2 = matcher.record.name;
        params = assign({}, currentLocation.params, location2.params);
        path = matcher.stringify(params);
      }
      const matched = [];
      let parentMatcher = matcher;
      while (parentMatcher) {
        matched.unshift(parentMatcher.record);
        parentMatcher = parentMatcher.parent;
      }
      return {
        name: name2,
        path,
        params,
        matched,
        meta: mergeMetaFields(matched)
      };
    }
    routes.forEach((route) => addRoute(route));
    return { addRoute, resolve, removeRoute, getRoutes, getRecordMatcher };
  }
  function paramsFromLocation(params, keys) {
    const newParams = {};
    for (const key of keys) {
      if (key in params)
        newParams[key] = params[key];
    }
    return newParams;
  }
  function normalizeRouteRecord(record) {
    return {
      path: record.path,
      redirect: record.redirect,
      name: record.name,
      meta: record.meta || {},
      aliasOf: void 0,
      beforeEnter: record.beforeEnter,
      props: normalizeRecordProps(record),
      children: record.children || [],
      instances: {},
      leaveGuards: /* @__PURE__ */ new Set(),
      updateGuards: /* @__PURE__ */ new Set(),
      enterCallbacks: {},
      components: "components" in record ? record.components || null : record.component && { default: record.component }
    };
  }
  function normalizeRecordProps(record) {
    const propsObject = {};
    const props = record.props || false;
    if ("component" in record) {
      propsObject.default = props;
    } else {
      for (const name2 in record.components)
        propsObject[name2] = typeof props === "boolean" ? props : props[name2];
    }
    return propsObject;
  }
  function isAliasRecord(record) {
    while (record) {
      if (record.record.aliasOf)
        return true;
      record = record.parent;
    }
    return false;
  }
  function mergeMetaFields(matched) {
    return matched.reduce((meta, record) => assign(meta, record.meta), {});
  }
  function mergeOptions(defaults, partialOptions) {
    const options = {};
    for (const key in defaults) {
      options[key] = key in partialOptions ? partialOptions[key] : defaults[key];
    }
    return options;
  }
  function isSameParam(a, b) {
    return a.name === b.name && a.optional === b.optional && a.repeatable === b.repeatable;
  }
  function checkSameParams(a, b) {
    for (const key of a.keys) {
      if (!key.optional && !b.keys.find(isSameParam.bind(null, key)))
        return warn(`Alias "${b.record.path}" and the original record: "${a.record.path}" must have the exact same param named "${key.name}"`);
    }
    for (const key of b.keys) {
      if (!key.optional && !a.keys.find(isSameParam.bind(null, key)))
        return warn(`Alias "${b.record.path}" and the original record: "${a.record.path}" must have the exact same param named "${key.name}"`);
    }
  }
  function checkChildMissingNameWithEmptyPath(mainNormalizedRecord, parent) {
    if (parent && parent.record.name && !mainNormalizedRecord.name && !mainNormalizedRecord.path) {
      warn(`The route named "${String(parent.record.name)}" has a child without a name and an empty path. Using that name won't render the empty path child so you probably want to move the name to the child instead. If this is intentional, add a name to the child route to remove the warning.`);
    }
  }
  function checkMissingParamsInAbsolutePath(record, parent) {
    for (const key of parent.keys) {
      if (!record.keys.find(isSameParam.bind(null, key)))
        return warn(`Absolute path "${record.record.path}" must have the exact same param named "${key.name}" as its parent "${parent.record.path}".`);
    }
  }
  function isRecordChildOf(record, parent) {
    return parent.children.some((child) => child === record || isRecordChildOf(record, child));
  }
  const HASH_RE = /#/g;
  const AMPERSAND_RE = /&/g;
  const SLASH_RE = /\//g;
  const EQUAL_RE = /=/g;
  const IM_RE = /\?/g;
  const PLUS_RE = /\+/g;
  const ENC_BRACKET_OPEN_RE = /%5B/g;
  const ENC_BRACKET_CLOSE_RE = /%5D/g;
  const ENC_CARET_RE = /%5E/g;
  const ENC_BACKTICK_RE = /%60/g;
  const ENC_CURLY_OPEN_RE = /%7B/g;
  const ENC_PIPE_RE = /%7C/g;
  const ENC_CURLY_CLOSE_RE = /%7D/g;
  const ENC_SPACE_RE = /%20/g;
  function commonEncode(text) {
    return encodeURI("" + text).replace(ENC_PIPE_RE, "|").replace(ENC_BRACKET_OPEN_RE, "[").replace(ENC_BRACKET_CLOSE_RE, "]");
  }
  function encodeHash(text) {
    return commonEncode(text).replace(ENC_CURLY_OPEN_RE, "{").replace(ENC_CURLY_CLOSE_RE, "}").replace(ENC_CARET_RE, "^");
  }
  function encodeQueryValue(text) {
    return commonEncode(text).replace(PLUS_RE, "%2B").replace(ENC_SPACE_RE, "+").replace(HASH_RE, "%23").replace(AMPERSAND_RE, "%26").replace(ENC_BACKTICK_RE, "`").replace(ENC_CURLY_OPEN_RE, "{").replace(ENC_CURLY_CLOSE_RE, "}").replace(ENC_CARET_RE, "^");
  }
  function encodeQueryKey(text) {
    return encodeQueryValue(text).replace(EQUAL_RE, "%3D");
  }
  function encodePath(text) {
    return commonEncode(text).replace(HASH_RE, "%23").replace(IM_RE, "%3F");
  }
  function encodeParam(text) {
    return text == null ? "" : encodePath(text).replace(SLASH_RE, "%2F");
  }
  function decode(text) {
    try {
      return decodeURIComponent("" + text);
    } catch (err) {
      process.env.NODE_ENV !== "production" && warn(`Error decoding "${text}". Using original value`);
    }
    return "" + text;
  }
  function parseQuery(search) {
    const query = {};
    if (search === "" || search === "?")
      return query;
    const hasLeadingIM = search[0] === "?";
    const searchParams = (hasLeadingIM ? search.slice(1) : search).split("&");
    for (let i = 0; i < searchParams.length; ++i) {
      const searchParam = searchParams[i].replace(PLUS_RE, " ");
      const eqPos = searchParam.indexOf("=");
      const key = decode(eqPos < 0 ? searchParam : searchParam.slice(0, eqPos));
      const value = eqPos < 0 ? null : decode(searchParam.slice(eqPos + 1));
      if (key in query) {
        let currentValue = query[key];
        if (!isArray(currentValue)) {
          currentValue = query[key] = [currentValue];
        }
        currentValue.push(value);
      } else {
        query[key] = value;
      }
    }
    return query;
  }
  function stringifyQuery(query) {
    let search = "";
    for (let key in query) {
      const value = query[key];
      key = encodeQueryKey(key);
      if (value == null) {
        if (value !== void 0) {
          search += (search.length ? "&" : "") + key;
        }
        continue;
      }
      const values = isArray(value) ? value.map((v) => v && encodeQueryValue(v)) : [value && encodeQueryValue(value)];
      values.forEach((value2) => {
        if (value2 !== void 0) {
          search += (search.length ? "&" : "") + key;
          if (value2 != null)
            search += "=" + value2;
        }
      });
    }
    return search;
  }
  function normalizeQuery(query) {
    const normalizedQuery = {};
    for (const key in query) {
      const value = query[key];
      if (value !== void 0) {
        normalizedQuery[key] = isArray(value) ? value.map((v) => v == null ? null : "" + v) : value == null ? value : "" + value;
      }
    }
    return normalizedQuery;
  }
  const matchedRouteKey = Symbol(process.env.NODE_ENV !== "production" ? "router view location matched" : "");
  const viewDepthKey = Symbol(process.env.NODE_ENV !== "production" ? "router view depth" : "");
  const routerKey = Symbol(process.env.NODE_ENV !== "production" ? "router" : "");
  const routeLocationKey = Symbol(process.env.NODE_ENV !== "production" ? "route location" : "");
  const routerViewLocationKey = Symbol(process.env.NODE_ENV !== "production" ? "router view location" : "");
  function useCallbacks() {
    let handlers = [];
    function add(handler) {
      handlers.push(handler);
      return () => {
        const i = handlers.indexOf(handler);
        if (i > -1)
          handlers.splice(i, 1);
      };
    }
    function reset() {
      handlers = [];
    }
    return {
      add,
      list: () => handlers,
      reset
    };
  }
  function guardToPromiseFn(guard, to, from, record, name2) {
    const enterCallbackArray = record && (record.enterCallbacks[name2] = record.enterCallbacks[name2] || []);
    return () => new Promise((resolve, reject) => {
      const next = (valid) => {
        if (valid === false) {
          reject(createRouterError(4, {
            from,
            to
          }));
        } else if (valid instanceof Error) {
          reject(valid);
        } else if (isRouteLocation(valid)) {
          reject(createRouterError(2, {
            from: to,
            to: valid
          }));
        } else {
          if (enterCallbackArray && record.enterCallbacks[name2] === enterCallbackArray && typeof valid === "function") {
            enterCallbackArray.push(valid);
          }
          resolve();
        }
      };
      const guardReturn = guard.call(record && record.instances[name2], to, from, process.env.NODE_ENV !== "production" ? canOnlyBeCalledOnce(next, to, from) : next);
      let guardCall = Promise.resolve(guardReturn);
      if (guard.length < 3)
        guardCall = guardCall.then(next);
      if (process.env.NODE_ENV !== "production" && guard.length > 2) {
        const message = `The "next" callback was never called inside of ${guard.name ? '"' + guard.name + '"' : ""}:
${guard.toString()}
. If you are returning a value instead of calling "next", make sure to remove the "next" parameter from your function.`;
        if (typeof guardReturn === "object" && "then" in guardReturn) {
          guardCall = guardCall.then((resolvedValue) => {
            if (!next._called) {
              warn(message);
              return Promise.reject(new Error("Invalid navigation guard"));
            }
            return resolvedValue;
          });
        } else if (guardReturn !== void 0) {
          if (!next._called) {
            warn(message);
            reject(new Error("Invalid navigation guard"));
            return;
          }
        }
      }
      guardCall.catch((err) => reject(err));
    });
  }
  function canOnlyBeCalledOnce(next, to, from) {
    let called = 0;
    return function() {
      if (called++ === 1)
        warn(`The "next" callback was called more than once in one navigation guard when going from "${from.fullPath}" to "${to.fullPath}". It should be called exactly one time in each navigation guard. This will fail in production.`);
      next._called = true;
      if (called === 1)
        next.apply(null, arguments);
    };
  }
  function extractComponentsGuards(matched, guardType, to, from) {
    const guards = [];
    for (const record of matched) {
      if (process.env.NODE_ENV !== "production" && !record.components && !record.children.length) {
        warn(`Record with path "${record.path}" is either missing a "component(s)" or "children" property.`);
      }
      for (const name2 in record.components) {
        let rawComponent = record.components[name2];
        if (process.env.NODE_ENV !== "production") {
          if (!rawComponent || typeof rawComponent !== "object" && typeof rawComponent !== "function") {
            warn(`Component "${name2}" in record with path "${record.path}" is not a valid component. Received "${String(rawComponent)}".`);
            throw new Error("Invalid route component");
          } else if ("then" in rawComponent) {
            warn(`Component "${name2}" in record with path "${record.path}" is a Promise instead of a function that returns a Promise. Did you write "import('./MyPage.vue')" instead of "() => import('./MyPage.vue')" ? This will break in production if not fixed.`);
            const promise = rawComponent;
            rawComponent = () => promise;
          } else if (rawComponent.__asyncLoader && !rawComponent.__warnedDefineAsync) {
            rawComponent.__warnedDefineAsync = true;
            warn(`Component "${name2}" in record with path "${record.path}" is defined using "defineAsyncComponent()". Write "() => import('./MyPage.vue')" instead of "defineAsyncComponent(() => import('./MyPage.vue'))".`);
          }
        }
        if (guardType !== "beforeRouteEnter" && !record.instances[name2])
          continue;
        if (isRouteComponent(rawComponent)) {
          const options = rawComponent.__vccOpts || rawComponent;
          const guard = options[guardType];
          guard && guards.push(guardToPromiseFn(guard, to, from, record, name2));
        } else {
          let componentPromise = rawComponent();
          if (process.env.NODE_ENV !== "production" && !("catch" in componentPromise)) {
            warn(`Component "${name2}" in record with path "${record.path}" is a function that does not return a Promise. If you were passing a functional component, make sure to add a "displayName" to the component. This will break in production if not fixed.`);
            componentPromise = Promise.resolve(componentPromise);
          }
          guards.push(() => componentPromise.then((resolved) => {
            if (!resolved)
              return Promise.reject(new Error(`Couldn't resolve component "${name2}" at "${record.path}"`));
            const resolvedComponent = isESModule(resolved) ? resolved.default : resolved;
            record.components[name2] = resolvedComponent;
            const options = resolvedComponent.__vccOpts || resolvedComponent;
            const guard = options[guardType];
            return guard && guardToPromiseFn(guard, to, from, record, name2)();
          }));
        }
      }
    }
    return guards;
  }
  function isRouteComponent(component) {
    return typeof component === "object" || "displayName" in component || "props" in component || "__vccOpts" in component;
  }
  function useLink(props) {
    const router2 = Vue.inject(routerKey);
    const currentRoute = Vue.inject(routeLocationKey);
    const route = Vue.computed(() => router2.resolve(Vue.unref(props.to)));
    const activeRecordIndex = Vue.computed(() => {
      const { matched } = route.value;
      const { length } = matched;
      const routeMatched = matched[length - 1];
      const currentMatched = currentRoute.matched;
      if (!routeMatched || !currentMatched.length)
        return -1;
      const index = currentMatched.findIndex(isSameRouteRecord.bind(null, routeMatched));
      if (index > -1)
        return index;
      const parentRecordPath = getOriginalPath(matched[length - 2]);
      return length > 1 && getOriginalPath(routeMatched) === parentRecordPath && currentMatched[currentMatched.length - 1].path !== parentRecordPath ? currentMatched.findIndex(isSameRouteRecord.bind(null, matched[length - 2])) : index;
    });
    const isActive = Vue.computed(() => activeRecordIndex.value > -1 && includesParams(currentRoute.params, route.value.params));
    const isExactActive = Vue.computed(() => activeRecordIndex.value > -1 && activeRecordIndex.value === currentRoute.matched.length - 1 && isSameRouteLocationParams(currentRoute.params, route.value.params));
    function navigate(e = {}) {
      if (guardEvent(e)) {
        return router2[Vue.unref(props.replace) ? "replace" : "push"](
          Vue.unref(props.to)
        ).catch(noop);
      }
      return Promise.resolve();
    }
    if ((process.env.NODE_ENV !== "production" || false) && isBrowser) {
      const instance = Vue.getCurrentInstance();
      if (instance) {
        const linkContextDevtools = {
          route: route.value,
          isActive: isActive.value,
          isExactActive: isExactActive.value
        };
        instance.__vrl_devtools = instance.__vrl_devtools || [];
        instance.__vrl_devtools.push(linkContextDevtools);
        Vue.watchEffect(() => {
          linkContextDevtools.route = route.value;
          linkContextDevtools.isActive = isActive.value;
          linkContextDevtools.isExactActive = isExactActive.value;
        }, { flush: "post" });
      }
    }
    return {
      route,
      href: Vue.computed(() => route.value.href),
      isActive,
      isExactActive,
      navigate
    };
  }
  const RouterLinkImpl = /* @__PURE__ */ Vue.defineComponent({
    name: "RouterLink",
    compatConfig: { MODE: 3 },
    props: {
      to: {
        type: [String, Object],
        required: true
      },
      replace: Boolean,
      activeClass: String,
      exactActiveClass: String,
      custom: Boolean,
      ariaCurrentValue: {
        type: String,
        default: "page"
      }
    },
    useLink,
    setup(props, { slots }) {
      const link = Vue.reactive(useLink(props));
      const { options } = Vue.inject(routerKey);
      const elClass = Vue.computed(() => ({
        [getLinkClass(props.activeClass, options.linkActiveClass, "router-link-active")]: link.isActive,
        [getLinkClass(props.exactActiveClass, options.linkExactActiveClass, "router-link-exact-active")]: link.isExactActive
      }));
      return () => {
        const children = slots.default && slots.default(link);
        return props.custom ? children : Vue.h("a", {
          "aria-current": link.isExactActive ? props.ariaCurrentValue : null,
          href: link.href,
          onClick: link.navigate,
          class: elClass.value
        }, children);
      };
    }
  });
  const RouterLink = RouterLinkImpl;
  function guardEvent(e) {
    if (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey)
      return;
    if (e.defaultPrevented)
      return;
    if (e.button !== void 0 && e.button !== 0)
      return;
    if (e.currentTarget && e.currentTarget.getAttribute) {
      const target = e.currentTarget.getAttribute("target");
      if (/\b_blank\b/i.test(target))
        return;
    }
    if (e.preventDefault)
      e.preventDefault();
    return true;
  }
  function includesParams(outer, inner) {
    for (const key in inner) {
      const innerValue = inner[key];
      const outerValue = outer[key];
      if (typeof innerValue === "string") {
        if (innerValue !== outerValue)
          return false;
      } else {
        if (!isArray(outerValue) || outerValue.length !== innerValue.length || innerValue.some((value, i) => value !== outerValue[i]))
          return false;
      }
    }
    return true;
  }
  function getOriginalPath(record) {
    return record ? record.aliasOf ? record.aliasOf.path : record.path : "";
  }
  const getLinkClass = (propClass, globalClass, defaultClass) => propClass != null ? propClass : globalClass != null ? globalClass : defaultClass;
  const RouterViewImpl = /* @__PURE__ */ Vue.defineComponent({
    name: "RouterView",
    inheritAttrs: false,
    props: {
      name: {
        type: String,
        default: "default"
      },
      route: Object
    },
    compatConfig: { MODE: 3 },
    setup(props, { attrs, slots }) {
      process.env.NODE_ENV !== "production" && warnDeprecatedUsage();
      const injectedRoute = Vue.inject(routerViewLocationKey);
      const routeToDisplay = Vue.computed(() => props.route || injectedRoute.value);
      const injectedDepth = Vue.inject(viewDepthKey, 0);
      const depth = Vue.computed(() => {
        let initialDepth = Vue.unref(injectedDepth);
        const { matched } = routeToDisplay.value;
        let matchedRoute;
        while ((matchedRoute = matched[initialDepth]) && !matchedRoute.components) {
          initialDepth++;
        }
        return initialDepth;
      });
      const matchedRouteRef = Vue.computed(() => routeToDisplay.value.matched[depth.value]);
      Vue.provide(viewDepthKey, Vue.computed(() => depth.value + 1));
      Vue.provide(matchedRouteKey, matchedRouteRef);
      Vue.provide(routerViewLocationKey, routeToDisplay);
      const viewRef = Vue.ref();
      Vue.watch(() => [viewRef.value, matchedRouteRef.value, props.name], ([instance, to, name2], [oldInstance, from, oldName]) => {
        if (to) {
          to.instances[name2] = instance;
          if (from && from !== to && instance && instance === oldInstance) {
            if (!to.leaveGuards.size) {
              to.leaveGuards = from.leaveGuards;
            }
            if (!to.updateGuards.size) {
              to.updateGuards = from.updateGuards;
            }
          }
        }
        if (instance && to && (!from || !isSameRouteRecord(to, from) || !oldInstance)) {
          (to.enterCallbacks[name2] || []).forEach((callback) => callback(instance));
        }
      }, { flush: "post" });
      return () => {
        const route = routeToDisplay.value;
        const currentName = props.name;
        const matchedRoute = matchedRouteRef.value;
        const ViewComponent = matchedRoute && matchedRoute.components[currentName];
        if (!ViewComponent) {
          return normalizeSlot(slots.default, { Component: ViewComponent, route });
        }
        const routePropsOption = matchedRoute.props[currentName];
        const routeProps = routePropsOption ? routePropsOption === true ? route.params : typeof routePropsOption === "function" ? routePropsOption(route) : routePropsOption : null;
        const onVnodeUnmounted = (vnode) => {
          if (vnode.component.isUnmounted) {
            matchedRoute.instances[currentName] = null;
          }
        };
        const component = Vue.h(ViewComponent, assign({}, routeProps, attrs, {
          onVnodeUnmounted,
          ref: viewRef
        }));
        if ((process.env.NODE_ENV !== "production" || false) && isBrowser && component.ref) {
          const info = {
            depth: depth.value,
            name: matchedRoute.name,
            path: matchedRoute.path,
            meta: matchedRoute.meta
          };
          const internalInstances = isArray(component.ref) ? component.ref.map((r) => r.i) : [component.ref.i];
          internalInstances.forEach((instance) => {
            instance.__vrv_devtools = info;
          });
        }
        return normalizeSlot(slots.default, { Component: component, route }) || component;
      };
    }
  });
  function normalizeSlot(slot, data) {
    if (!slot)
      return null;
    const slotContent = slot(data);
    return slotContent.length === 1 ? slotContent[0] : slotContent;
  }
  const RouterView = RouterViewImpl;
  function warnDeprecatedUsage() {
    const instance = Vue.getCurrentInstance();
    const parentName = instance.parent && instance.parent.type.name;
    if (parentName && (parentName === "KeepAlive" || parentName.includes("Transition"))) {
      const comp = parentName === "KeepAlive" ? "keep-alive" : "transition";
      warn(`<router-view> can no longer be used directly inside <transition> or <keep-alive>.
Use slot props instead:

<router-view v-slot="{ Component }">
  <${comp}>
    <component :is="Component" />
  </${comp}>
</router-view>`);
    }
  }
  function formatRouteLocation(routeLocation, tooltip) {
    const copy = assign({}, routeLocation, {
      matched: routeLocation.matched.map((matched) => omit(matched, ["instances", "children", "aliasOf"]))
    });
    return {
      _custom: {
        type: null,
        readOnly: true,
        display: routeLocation.fullPath,
        tooltip,
        value: copy
      }
    };
  }
  function formatDisplay(display) {
    return {
      _custom: {
        display
      }
    };
  }
  let routerId = 0;
  function addDevtools(app, router2, matcher) {
    if (router2.__hasDevtools)
      return;
    router2.__hasDevtools = true;
    const id = routerId++;
    setupDevtoolsPlugin({
      id: "org.vuejs.router" + (id ? "." + id : ""),
      label: "Vue Router",
      packageName: "vue-router",
      homepage: "https://router.vuejs.org",
      logo: "https://router.vuejs.org/logo.png",
      componentStateTypes: ["Routing"],
      app
    }, (api) => {
      if (typeof api.now !== "function") {
        console.warn("[Vue Router]: You seem to be using an outdated version of Vue Devtools. Are you still using the Beta release instead of the stable one? You can find the links at https://devtools.vuejs.org/guide/installation.html.");
      }
      api.on.inspectComponent((payload, ctx) => {
        if (payload.instanceData) {
          payload.instanceData.state.push({
            type: "Routing",
            key: "$route",
            editable: false,
            value: formatRouteLocation(router2.currentRoute.value, "Current Route")
          });
        }
      });
      api.on.visitComponentTree(({ treeNode: node, componentInstance }) => {
        if (componentInstance.__vrv_devtools) {
          const info = componentInstance.__vrv_devtools;
          node.tags.push({
            label: (info.name ? `${info.name.toString()}: ` : "") + info.path,
            textColor: 0,
            tooltip: "This component is rendered by &lt;router-view&gt;",
            backgroundColor: PINK_500
          });
        }
        if (isArray(componentInstance.__vrl_devtools)) {
          componentInstance.__devtoolsApi = api;
          componentInstance.__vrl_devtools.forEach((devtoolsData) => {
            let backgroundColor = ORANGE_400;
            let tooltip = "";
            if (devtoolsData.isExactActive) {
              backgroundColor = LIME_500;
              tooltip = "This is exactly active";
            } else if (devtoolsData.isActive) {
              backgroundColor = BLUE_600;
              tooltip = "This link is active";
            }
            node.tags.push({
              label: devtoolsData.route.path,
              textColor: 0,
              tooltip,
              backgroundColor
            });
          });
        }
      });
      Vue.watch(router2.currentRoute, () => {
        refreshRoutesView();
        api.notifyComponentUpdate();
        api.sendInspectorTree(routerInspectorId);
        api.sendInspectorState(routerInspectorId);
      });
      const navigationsLayerId = "router:navigations:" + id;
      api.addTimelineLayer({
        id: navigationsLayerId,
        label: `Router${id ? " " + id : ""} Navigations`,
        color: 4237508
      });
      router2.onError((error, to) => {
        api.addTimelineEvent({
          layerId: navigationsLayerId,
          event: {
            title: "Error during Navigation",
            subtitle: to.fullPath,
            logType: "error",
            time: api.now(),
            data: { error },
            groupId: to.meta.__navigationId
          }
        });
      });
      let navigationId = 0;
      router2.beforeEach((to, from) => {
        const data = {
          guard: formatDisplay("beforeEach"),
          from: formatRouteLocation(from, "Current Location during this navigation"),
          to: formatRouteLocation(to, "Target location")
        };
        Object.defineProperty(to.meta, "__navigationId", {
          value: navigationId++
        });
        api.addTimelineEvent({
          layerId: navigationsLayerId,
          event: {
            time: api.now(),
            title: "Start of navigation",
            subtitle: to.fullPath,
            data,
            groupId: to.meta.__navigationId
          }
        });
      });
      router2.afterEach((to, from, failure) => {
        const data = {
          guard: formatDisplay("afterEach")
        };
        if (failure) {
          data.failure = {
            _custom: {
              type: Error,
              readOnly: true,
              display: failure ? failure.message : "",
              tooltip: "Navigation Failure",
              value: failure
            }
          };
          data.status = formatDisplay("\u274C");
        } else {
          data.status = formatDisplay("\u2705");
        }
        data.from = formatRouteLocation(from, "Current Location during this navigation");
        data.to = formatRouteLocation(to, "Target location");
        api.addTimelineEvent({
          layerId: navigationsLayerId,
          event: {
            title: "End of navigation",
            subtitle: to.fullPath,
            time: api.now(),
            data,
            logType: failure ? "warning" : "default",
            groupId: to.meta.__navigationId
          }
        });
      });
      const routerInspectorId = "router-inspector:" + id;
      api.addInspector({
        id: routerInspectorId,
        label: "Routes" + (id ? " " + id : ""),
        icon: "book",
        treeFilterPlaceholder: "Search routes"
      });
      function refreshRoutesView() {
        if (!activeRoutesPayload)
          return;
        const payload = activeRoutesPayload;
        let routes = matcher.getRoutes().filter((route) => !route.parent);
        routes.forEach(resetMatchStateOnRouteRecord);
        if (payload.filter) {
          routes = routes.filter((route) => isRouteMatching(route, payload.filter.toLowerCase()));
        }
        routes.forEach((route) => markRouteRecordActive(route, router2.currentRoute.value));
        payload.rootNodes = routes.map(formatRouteRecordForInspector);
      }
      let activeRoutesPayload;
      api.on.getInspectorTree((payload) => {
        activeRoutesPayload = payload;
        if (payload.app === app && payload.inspectorId === routerInspectorId) {
          refreshRoutesView();
        }
      });
      api.on.getInspectorState((payload) => {
        if (payload.app === app && payload.inspectorId === routerInspectorId) {
          const routes = matcher.getRoutes();
          const route = routes.find((route2) => route2.record.__vd_id === payload.nodeId);
          if (route) {
            payload.state = {
              options: formatRouteRecordMatcherForStateInspector(route)
            };
          }
        }
      });
      api.sendInspectorTree(routerInspectorId);
      api.sendInspectorState(routerInspectorId);
    });
  }
  function modifierForKey(key) {
    if (key.optional) {
      return key.repeatable ? "*" : "?";
    } else {
      return key.repeatable ? "+" : "";
    }
  }
  function formatRouteRecordMatcherForStateInspector(route) {
    const { record } = route;
    const fields = [
      { editable: false, key: "path", value: record.path }
    ];
    if (record.name != null) {
      fields.push({
        editable: false,
        key: "name",
        value: record.name
      });
    }
    fields.push({ editable: false, key: "regexp", value: route.re });
    if (route.keys.length) {
      fields.push({
        editable: false,
        key: "keys",
        value: {
          _custom: {
            type: null,
            readOnly: true,
            display: route.keys.map((key) => `${key.name}${modifierForKey(key)}`).join(" "),
            tooltip: "Param keys",
            value: route.keys
          }
        }
      });
    }
    if (record.redirect != null) {
      fields.push({
        editable: false,
        key: "redirect",
        value: record.redirect
      });
    }
    if (route.alias.length) {
      fields.push({
        editable: false,
        key: "aliases",
        value: route.alias.map((alias) => alias.record.path)
      });
    }
    if (Object.keys(route.record.meta).length) {
      fields.push({
        editable: false,
        key: "meta",
        value: route.record.meta
      });
    }
    fields.push({
      key: "score",
      editable: false,
      value: {
        _custom: {
          type: null,
          readOnly: true,
          display: route.score.map((score) => score.join(", ")).join(" | "),
          tooltip: "Score used to sort routes",
          value: route.score
        }
      }
    });
    return fields;
  }
  const PINK_500 = 15485081;
  const BLUE_600 = 2450411;
  const LIME_500 = 8702998;
  const CYAN_400 = 2282478;
  const ORANGE_400 = 16486972;
  const DARK = 6710886;
  function formatRouteRecordForInspector(route) {
    const tags = [];
    const { record } = route;
    if (record.name != null) {
      tags.push({
        label: String(record.name),
        textColor: 0,
        backgroundColor: CYAN_400
      });
    }
    if (record.aliasOf) {
      tags.push({
        label: "alias",
        textColor: 0,
        backgroundColor: ORANGE_400
      });
    }
    if (route.__vd_match) {
      tags.push({
        label: "matches",
        textColor: 0,
        backgroundColor: PINK_500
      });
    }
    if (route.__vd_exactActive) {
      tags.push({
        label: "exact",
        textColor: 0,
        backgroundColor: LIME_500
      });
    }
    if (route.__vd_active) {
      tags.push({
        label: "active",
        textColor: 0,
        backgroundColor: BLUE_600
      });
    }
    if (record.redirect) {
      tags.push({
        label: typeof record.redirect === "string" ? `redirect: ${record.redirect}` : "redirects",
        textColor: 16777215,
        backgroundColor: DARK
      });
    }
    let id = record.__vd_id;
    if (id == null) {
      id = String(routeRecordId++);
      record.__vd_id = id;
    }
    return {
      id,
      label: record.path,
      tags,
      children: route.children.map(formatRouteRecordForInspector)
    };
  }
  let routeRecordId = 0;
  const EXTRACT_REGEXP_RE = /^\/(.*)\/([a-z]*)$/;
  function markRouteRecordActive(route, currentRoute) {
    const isExactActive = currentRoute.matched.length && isSameRouteRecord(currentRoute.matched[currentRoute.matched.length - 1], route.record);
    route.__vd_exactActive = route.__vd_active = isExactActive;
    if (!isExactActive) {
      route.__vd_active = currentRoute.matched.some((match) => isSameRouteRecord(match, route.record));
    }
    route.children.forEach((childRoute) => markRouteRecordActive(childRoute, currentRoute));
  }
  function resetMatchStateOnRouteRecord(route) {
    route.__vd_match = false;
    route.children.forEach(resetMatchStateOnRouteRecord);
  }
  function isRouteMatching(route, filter) {
    const found = String(route.re).match(EXTRACT_REGEXP_RE);
    route.__vd_match = false;
    if (!found || found.length < 3) {
      return false;
    }
    const nonEndingRE = new RegExp(found[1].replace(/\$$/, ""), found[2]);
    if (nonEndingRE.test(filter)) {
      route.children.forEach((child) => isRouteMatching(child, filter));
      if (route.record.path !== "/" || filter === "/") {
        route.__vd_match = route.re.test(filter);
        return true;
      }
      return false;
    }
    const path = route.record.path.toLowerCase();
    const decodedPath = decode(path);
    if (!filter.startsWith("/") && (decodedPath.includes(filter) || path.includes(filter)))
      return true;
    if (decodedPath.startsWith(filter) || path.startsWith(filter))
      return true;
    if (route.record.name && String(route.record.name).includes(filter))
      return true;
    return route.children.some((child) => isRouteMatching(child, filter));
  }
  function omit(obj, keys) {
    const ret = {};
    for (const key in obj) {
      if (!keys.includes(key)) {
        ret[key] = obj[key];
      }
    }
    return ret;
  }
  function createRouter(options) {
    const matcher = createRouterMatcher(options.routes, options);
    const parseQuery$1 = options.parseQuery || parseQuery;
    const stringifyQuery$1 = options.stringifyQuery || stringifyQuery;
    const routerHistory = options.history;
    if (process.env.NODE_ENV !== "production" && !routerHistory)
      throw new Error('Provide the "history" option when calling "createRouter()": https://next.router.vuejs.org/api/#history.');
    const beforeGuards = useCallbacks();
    const beforeResolveGuards = useCallbacks();
    const afterGuards = useCallbacks();
    const currentRoute = Vue.shallowRef(START_LOCATION_NORMALIZED);
    let pendingLocation = START_LOCATION_NORMALIZED;
    if (isBrowser && options.scrollBehavior && "scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
    const normalizeParams = applyToParams.bind(null, (paramValue) => "" + paramValue);
    const encodeParams = applyToParams.bind(null, encodeParam);
    const decodeParams = applyToParams.bind(null, decode);
    function addRoute(parentOrRoute, route) {
      let parent;
      let record;
      if (isRouteName(parentOrRoute)) {
        parent = matcher.getRecordMatcher(parentOrRoute);
        record = route;
      } else {
        record = parentOrRoute;
      }
      return matcher.addRoute(record, parent);
    }
    function removeRoute(name2) {
      const recordMatcher = matcher.getRecordMatcher(name2);
      if (recordMatcher) {
        matcher.removeRoute(recordMatcher);
      } else if (process.env.NODE_ENV !== "production") {
        warn(`Cannot remove non-existent route "${String(name2)}"`);
      }
    }
    function getRoutes() {
      return matcher.getRoutes().map((routeMatcher) => routeMatcher.record);
    }
    function hasRoute(name2) {
      return !!matcher.getRecordMatcher(name2);
    }
    function resolve(rawLocation, currentLocation) {
      currentLocation = assign({}, currentLocation || currentRoute.value);
      if (typeof rawLocation === "string") {
        const locationNormalized = parseURL(parseQuery$1, rawLocation, currentLocation.path);
        const matchedRoute2 = matcher.resolve({ path: locationNormalized.path }, currentLocation);
        const href2 = routerHistory.createHref(locationNormalized.fullPath);
        if (process.env.NODE_ENV !== "production") {
          if (href2.startsWith("//"))
            warn(`Location "${rawLocation}" resolved to "${href2}". A resolved location cannot start with multiple slashes.`);
          else if (!matchedRoute2.matched.length) {
            warn(`No match found for location with path "${rawLocation}"`);
          }
        }
        return assign(locationNormalized, matchedRoute2, {
          params: decodeParams(matchedRoute2.params),
          hash: decode(locationNormalized.hash),
          redirectedFrom: void 0,
          href: href2
        });
      }
      let matcherLocation;
      if ("path" in rawLocation) {
        if (process.env.NODE_ENV !== "production" && "params" in rawLocation && !("name" in rawLocation) && Object.keys(rawLocation.params).length) {
          warn(`Path "${rawLocation.path}" was passed with params but they will be ignored. Use a named route alongside params instead.`);
        }
        matcherLocation = assign({}, rawLocation, {
          path: parseURL(parseQuery$1, rawLocation.path, currentLocation.path).path
        });
      } else {
        const targetParams = assign({}, rawLocation.params);
        for (const key in targetParams) {
          if (targetParams[key] == null) {
            delete targetParams[key];
          }
        }
        matcherLocation = assign({}, rawLocation, {
          params: encodeParams(rawLocation.params)
        });
        currentLocation.params = encodeParams(currentLocation.params);
      }
      const matchedRoute = matcher.resolve(matcherLocation, currentLocation);
      const hash = rawLocation.hash || "";
      if (process.env.NODE_ENV !== "production" && hash && !hash.startsWith("#")) {
        warn(`A \`hash\` should always start with the character "#". Replace "${hash}" with "#${hash}".`);
      }
      matchedRoute.params = normalizeParams(decodeParams(matchedRoute.params));
      const fullPath = stringifyURL(stringifyQuery$1, assign({}, rawLocation, {
        hash: encodeHash(hash),
        path: matchedRoute.path
      }));
      const href = routerHistory.createHref(fullPath);
      if (process.env.NODE_ENV !== "production") {
        if (href.startsWith("//")) {
          warn(`Location "${rawLocation}" resolved to "${href}". A resolved location cannot start with multiple slashes.`);
        } else if (!matchedRoute.matched.length) {
          warn(`No match found for location with path "${"path" in rawLocation ? rawLocation.path : rawLocation}"`);
        }
      }
      return assign({
        fullPath,
        hash,
        query: stringifyQuery$1 === stringifyQuery ? normalizeQuery(rawLocation.query) : rawLocation.query || {}
      }, matchedRoute, {
        redirectedFrom: void 0,
        href
      });
    }
    function locationAsObject(to) {
      return typeof to === "string" ? parseURL(parseQuery$1, to, currentRoute.value.path) : assign({}, to);
    }
    function checkCanceledNavigation(to, from) {
      if (pendingLocation !== to) {
        return createRouterError(8, {
          from,
          to
        });
      }
    }
    function push(to) {
      return pushWithRedirect(to);
    }
    function replace(to) {
      return push(assign(locationAsObject(to), { replace: true }));
    }
    function handleRedirectRecord(to) {
      const lastMatched = to.matched[to.matched.length - 1];
      if (lastMatched && lastMatched.redirect) {
        const { redirect } = lastMatched;
        let newTargetLocation = typeof redirect === "function" ? redirect(to) : redirect;
        if (typeof newTargetLocation === "string") {
          newTargetLocation = newTargetLocation.includes("?") || newTargetLocation.includes("#") ? newTargetLocation = locationAsObject(newTargetLocation) : { path: newTargetLocation };
          newTargetLocation.params = {};
        }
        if (process.env.NODE_ENV !== "production" && !("path" in newTargetLocation) && !("name" in newTargetLocation)) {
          warn(`Invalid redirect found:
${JSON.stringify(newTargetLocation, null, 2)}
 when navigating to "${to.fullPath}". A redirect must contain a name or path. This will break in production.`);
          throw new Error("Invalid redirect");
        }
        return assign({
          query: to.query,
          hash: to.hash,
          params: "path" in newTargetLocation ? {} : to.params
        }, newTargetLocation);
      }
    }
    function pushWithRedirect(to, redirectedFrom) {
      const targetLocation = pendingLocation = resolve(to);
      const from = currentRoute.value;
      const data = to.state;
      const force = to.force;
      const replace2 = to.replace === true;
      const shouldRedirect = handleRedirectRecord(targetLocation);
      if (shouldRedirect)
        return pushWithRedirect(
          assign(locationAsObject(shouldRedirect), {
            state: typeof shouldRedirect === "object" ? assign({}, data, shouldRedirect.state) : data,
            force,
            replace: replace2
          }),
          redirectedFrom || targetLocation
        );
      const toLocation = targetLocation;
      toLocation.redirectedFrom = redirectedFrom;
      let failure;
      if (!force && isSameRouteLocation(stringifyQuery$1, from, targetLocation)) {
        failure = createRouterError(16, { to: toLocation, from });
        handleScroll(
          from,
          from,
          true,
          false
        );
      }
      return (failure ? Promise.resolve(failure) : navigate(toLocation, from)).catch((error) => isNavigationFailure(error) ? isNavigationFailure(error, 2) ? error : markAsReady(error) : triggerError(error, toLocation, from)).then((failure2) => {
        if (failure2) {
          if (isNavigationFailure(failure2, 2)) {
            if (process.env.NODE_ENV !== "production" && isSameRouteLocation(stringifyQuery$1, resolve(failure2.to), toLocation) && redirectedFrom && (redirectedFrom._count = redirectedFrom._count ? redirectedFrom._count + 1 : 1) > 10) {
              warn(`Detected an infinite redirection in a navigation guard when going from "${from.fullPath}" to "${toLocation.fullPath}". Aborting to avoid a Stack Overflow. This will break in production if not fixed.`);
              return Promise.reject(new Error("Infinite redirect in navigation guard"));
            }
            return pushWithRedirect(
              assign({
                replace: replace2
              }, locationAsObject(failure2.to), {
                state: typeof failure2.to === "object" ? assign({}, data, failure2.to.state) : data,
                force
              }),
              redirectedFrom || toLocation
            );
          }
        } else {
          failure2 = finalizeNavigation(toLocation, from, true, replace2, data);
        }
        triggerAfterEach(toLocation, from, failure2);
        return failure2;
      });
    }
    function checkCanceledNavigationAndReject(to, from) {
      const error = checkCanceledNavigation(to, from);
      return error ? Promise.reject(error) : Promise.resolve();
    }
    function navigate(to, from) {
      let guards;
      const [leavingRecords, updatingRecords, enteringRecords] = extractChangingRecords(to, from);
      guards = extractComponentsGuards(leavingRecords.reverse(), "beforeRouteLeave", to, from);
      for (const record of leavingRecords) {
        record.leaveGuards.forEach((guard) => {
          guards.push(guardToPromiseFn(guard, to, from));
        });
      }
      const canceledNavigationCheck = checkCanceledNavigationAndReject.bind(null, to, from);
      guards.push(canceledNavigationCheck);
      return runGuardQueue(guards).then(() => {
        guards = [];
        for (const guard of beforeGuards.list()) {
          guards.push(guardToPromiseFn(guard, to, from));
        }
        guards.push(canceledNavigationCheck);
        return runGuardQueue(guards);
      }).then(() => {
        guards = extractComponentsGuards(updatingRecords, "beforeRouteUpdate", to, from);
        for (const record of updatingRecords) {
          record.updateGuards.forEach((guard) => {
            guards.push(guardToPromiseFn(guard, to, from));
          });
        }
        guards.push(canceledNavigationCheck);
        return runGuardQueue(guards);
      }).then(() => {
        guards = [];
        for (const record of to.matched) {
          if (record.beforeEnter && !from.matched.includes(record)) {
            if (isArray(record.beforeEnter)) {
              for (const beforeEnter of record.beforeEnter)
                guards.push(guardToPromiseFn(beforeEnter, to, from));
            } else {
              guards.push(guardToPromiseFn(record.beforeEnter, to, from));
            }
          }
        }
        guards.push(canceledNavigationCheck);
        return runGuardQueue(guards);
      }).then(() => {
        to.matched.forEach((record) => record.enterCallbacks = {});
        guards = extractComponentsGuards(enteringRecords, "beforeRouteEnter", to, from);
        guards.push(canceledNavigationCheck);
        return runGuardQueue(guards);
      }).then(() => {
        guards = [];
        for (const guard of beforeResolveGuards.list()) {
          guards.push(guardToPromiseFn(guard, to, from));
        }
        guards.push(canceledNavigationCheck);
        return runGuardQueue(guards);
      }).catch((err) => isNavigationFailure(err, 8) ? err : Promise.reject(err));
    }
    function triggerAfterEach(to, from, failure) {
      for (const guard of afterGuards.list())
        guard(to, from, failure);
    }
    function finalizeNavigation(toLocation, from, isPush, replace2, data) {
      const error = checkCanceledNavigation(toLocation, from);
      if (error)
        return error;
      const isFirstNavigation = from === START_LOCATION_NORMALIZED;
      const state = !isBrowser ? {} : history.state;
      if (isPush) {
        if (replace2 || isFirstNavigation)
          routerHistory.replace(toLocation.fullPath, assign({
            scroll: isFirstNavigation && state && state.scroll
          }, data));
        else
          routerHistory.push(toLocation.fullPath, data);
      }
      currentRoute.value = toLocation;
      handleScroll(toLocation, from, isPush, isFirstNavigation);
      markAsReady();
    }
    let removeHistoryListener;
    function setupListeners() {
      if (removeHistoryListener)
        return;
      removeHistoryListener = routerHistory.listen((to, _from, info) => {
        if (!router2.listening)
          return;
        const toLocation = resolve(to);
        const shouldRedirect = handleRedirectRecord(toLocation);
        if (shouldRedirect) {
          pushWithRedirect(assign(shouldRedirect, { replace: true }), toLocation).catch(noop);
          return;
        }
        pendingLocation = toLocation;
        const from = currentRoute.value;
        if (isBrowser) {
          saveScrollPosition(getScrollKey(from.fullPath, info.delta), computeScrollPosition());
        }
        navigate(toLocation, from).catch((error) => {
          if (isNavigationFailure(error, 4 | 8)) {
            return error;
          }
          if (isNavigationFailure(error, 2)) {
            pushWithRedirect(
              error.to,
              toLocation
            ).then((failure) => {
              if (isNavigationFailure(failure, 4 | 16) && !info.delta && info.type === NavigationType.pop) {
                routerHistory.go(-1, false);
              }
            }).catch(noop);
            return Promise.reject();
          }
          if (info.delta) {
            routerHistory.go(-info.delta, false);
          }
          return triggerError(error, toLocation, from);
        }).then((failure) => {
          failure = failure || finalizeNavigation(
            toLocation,
            from,
            false
          );
          if (failure) {
            if (info.delta && !isNavigationFailure(failure, 8)) {
              routerHistory.go(-info.delta, false);
            } else if (info.type === NavigationType.pop && isNavigationFailure(failure, 4 | 16)) {
              routerHistory.go(-1, false);
            }
          }
          triggerAfterEach(toLocation, from, failure);
        }).catch(noop);
      });
    }
    let readyHandlers = useCallbacks();
    let errorHandlers = useCallbacks();
    let ready;
    function triggerError(error, to, from) {
      markAsReady(error);
      const list = errorHandlers.list();
      if (list.length) {
        list.forEach((handler) => handler(error, to, from));
      } else {
        if (process.env.NODE_ENV !== "production") {
          warn("uncaught error during route navigation:");
        }
        console.error(error);
      }
      return Promise.reject(error);
    }
    function isReady() {
      if (ready && currentRoute.value !== START_LOCATION_NORMALIZED)
        return Promise.resolve();
      return new Promise((resolve2, reject) => {
        readyHandlers.add([resolve2, reject]);
      });
    }
    function markAsReady(err) {
      if (!ready) {
        ready = !err;
        setupListeners();
        readyHandlers.list().forEach(([resolve2, reject]) => err ? reject(err) : resolve2());
        readyHandlers.reset();
      }
      return err;
    }
    function handleScroll(to, from, isPush, isFirstNavigation) {
      const { scrollBehavior } = options;
      if (!isBrowser || !scrollBehavior)
        return Promise.resolve();
      const scrollPosition = !isPush && getSavedScrollPosition(getScrollKey(to.fullPath, 0)) || (isFirstNavigation || !isPush) && history.state && history.state.scroll || null;
      return Vue.nextTick().then(() => scrollBehavior(to, from, scrollPosition)).then((position) => position && scrollToPosition(position)).catch((err) => triggerError(err, to, from));
    }
    const go = (delta) => routerHistory.go(delta);
    let started;
    const installedApps = /* @__PURE__ */ new Set();
    const router2 = {
      currentRoute,
      listening: true,
      addRoute,
      removeRoute,
      hasRoute,
      getRoutes,
      resolve,
      options,
      push,
      replace,
      go,
      back: () => go(-1),
      forward: () => go(1),
      beforeEach: beforeGuards.add,
      beforeResolve: beforeResolveGuards.add,
      afterEach: afterGuards.add,
      onError: errorHandlers.add,
      isReady,
      install(app) {
        const router3 = this;
        app.component("RouterLink", RouterLink);
        app.component("RouterView", RouterView);
        app.config.globalProperties.$router = router3;
        Object.defineProperty(app.config.globalProperties, "$route", {
          enumerable: true,
          get: () => Vue.unref(currentRoute)
        });
        if (isBrowser && !started && currentRoute.value === START_LOCATION_NORMALIZED) {
          started = true;
          push(routerHistory.location).catch((err) => {
            if (process.env.NODE_ENV !== "production")
              warn("Unexpected error when starting the router:", err);
          });
        }
        const reactiveRoute = {};
        for (const key in START_LOCATION_NORMALIZED) {
          reactiveRoute[key] = Vue.computed(() => currentRoute.value[key]);
        }
        app.provide(routerKey, router3);
        app.provide(routeLocationKey, Vue.reactive(reactiveRoute));
        app.provide(routerViewLocationKey, currentRoute);
        const unmountApp = app.unmount;
        installedApps.add(app);
        app.unmount = function() {
          installedApps.delete(app);
          if (installedApps.size < 1) {
            pendingLocation = START_LOCATION_NORMALIZED;
            removeHistoryListener && removeHistoryListener();
            removeHistoryListener = null;
            currentRoute.value = START_LOCATION_NORMALIZED;
            started = false;
            ready = false;
          }
          unmountApp();
        };
        if ((process.env.NODE_ENV !== "production" || false) && isBrowser) {
          addDevtools(app, router3, matcher);
        }
      }
    };
    return router2;
  }
  function runGuardQueue(guards) {
    return guards.reduce((promise, guard) => promise.then(() => guard()), Promise.resolve());
  }
  function extractChangingRecords(to, from) {
    const leavingRecords = [];
    const updatingRecords = [];
    const enteringRecords = [];
    const len = Math.max(from.matched.length, to.matched.length);
    for (let i = 0; i < len; i++) {
      const recordFrom = from.matched[i];
      if (recordFrom) {
        if (to.matched.find((record) => isSameRouteRecord(record, recordFrom)))
          updatingRecords.push(recordFrom);
        else
          leavingRecords.push(recordFrom);
      }
      const recordTo = to.matched[i];
      if (recordTo) {
        if (!from.matched.find((record) => isSameRouteRecord(record, recordTo))) {
          enteringRecords.push(recordTo);
        }
      }
    }
    return [leavingRecords, updatingRecords, enteringRecords];
  }
  const _export_sfc = (sfc, props) => {
    const target = sfc.__vccOpts || sfc;
    for (const [key, val] of props) {
      target[key] = val;
    }
    return target;
  };
  const _sfc_main$1 = {};
  const _hoisted_1$1 = { class: "home" };
  const _hoisted_2$1 = /* @__PURE__ */ Vue.createElementVNode("p", null, "\u8FD9\u91CC\u662F\u4E3B\u6846\u67B6\u6A21\u677F\u5DE5\u7A0B\u9875\u9762", -1);
  const _hoisted_3$1 = [
    _hoisted_2$1
  ];
  function _sfc_render$1(_ctx, _cache) {
    return Vue.openBlock(), Vue.createElementBlock("div", _hoisted_1$1, _hoisted_3$1);
  }
  const Home = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["render", _sfc_render$1]]);
  const router = createRouter({
    history: createWebHashHistory(),
    routes: [
      {
        path: "/",
        name: "home",
        component: Home
      }
    ]
  });
  const _imports_0 = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzI0IiBoZWlnaHQ9IjExMCIgdmlld0JveD0iMCAwIDMyNCAxMTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxnIGZpbHRlcj0idXJsKCNmaWx0ZXIwX2lfMl8yKSI+CjxwYXRoIGQ9Ik0yNS4yODggMTA5LjIzMkMyMy4zMjUzIDEwOS4yMzIgMjEuNzQ2NyAxMDguODQ4IDIwLjU1MiAxMDguMDhDMTkuMzU3MyAxMDcuMzk3IDE4LjM3NiAxMDYuMTE3IDE3LjYwOCAxMDQuMjRMNS4wNjQgNzIuODhDNC4yOTYgNzAuOTE3MyAzLjYxMzMzIDY5LjI1MzMgMy4wMTYgNjcuODg4QzIuNTA0IDY2LjQzNzMgMi4wNzczMyA2NS4wNzIgMS43MzYgNjMuNzkyQzEuMzk0NjcgNjIuNDI2NyAxLjEzODY3IDYxLjAxODcgMC45NjggNTkuNTY4QzAuODgyNjY3IDU4LjAzMiAwLjg0IDU2LjI0IDAuODQgNTQuMTkyVjIwLjRDMC44NCAxOS4yOTA3IDAuOTY4IDE4LjM1MiAxLjIyNCAxNy41ODRDMS41NjUzMyAxNi44MTYgMi4wMzQ2NyAxNi4xNzYgMi42MzIgMTUuNjY0TDE5LjE0NCAxLjcxMkMxOS41NzA3IDEuMzcwNjYgMjAuMTI1MyAxLjExNDY2IDIwLjgwOCAwLjk0Mzk5M0MyMS41NzYgMC42ODc5OTYgMjIuMzg2NyAwLjU1OTk5OCAyMy4yNCAwLjU1OTk5OEg0My41OTJDNDUuNjQgMC41NTk5OTggNDcuMTc2IDEuMDcyIDQ4LjIgMi4wOTU5OUM0OS4zMDkzIDMuMDM0NjYgNDkuODY0IDQuNDg1MzMgNDkuODY0IDYuNDQ4VjQxLjc3NkM0OS44NjQgNDIuNjI5MyA0OS45NDkzIDQzLjQ0IDUwLjEyIDQ0LjIwOEM1MC4yOTA3IDQ0Ljk3NiA1MC41MDQgNDUuNzg2NyA1MC43NiA0Ni42NEw1MS4xNDQgNDcuNTM2VjIwLjRDNTEuMTQ0IDE5LjI5MDcgNTEuMjcyIDE4LjM1MiA1MS41MjggMTcuNTg0QzUxLjg2OTMgMTYuODE2IDUyLjMzODcgMTYuMTc2IDUyLjkzNiAxNS42NjRMNjkuNDQ4IDEuNzEyQzY5Ljg3NDcgMS4zNzA2NiA3MC40MjkzIDEuMTE0NjYgNzEuMTEyIDAuOTQzOTkzQzcxLjg4IDAuNjg3OTk2IDcyLjY5MDcgMC41NTk5OTggNzMuNTQ0IDAuNTU5OTk4SDkzLjY0Qzk1Ljc3MzMgMC41NTk5OTggOTcuMjY2NyAxLjAyOTMzIDk4LjEyIDEuOTY3OTlDOTkuMDU4NyAyLjkwNjY2IDk5LjUyOCA0LjQgOTkuNTI4IDYuNDQ4VjQwLjI0Qzk5LjUyOCA0Mi4yODggOTkuNDQyNyA0NC4wOCA5OS4yNzIgNDUuNjE2Qzk5LjE4NjcgNDcuMDY2NyA5OC45NzMzIDQ4LjQ3NDcgOTguNjMyIDQ5Ljg0Qzk4LjI5MDcgNTEuMTIgOTcuODIxMyA1Mi40ODUzIDk3LjIyNCA1My45MzZDOTYuNzEyIDU1LjMwMTMgOTYuMDcyIDU2Ljk2NTMgOTUuMzA0IDU4LjkyOEw4Mi43NiA5MC4yODhDODIuNTA0IDkxLjA1NiA4Mi4xNjI3IDkxLjczODcgODEuNzM2IDkyLjMzNkM4MS4zMDkzIDkyLjkzMzMgODAuODgyNyA5My40MDI3IDgwLjQ1NiA5My43NDRMNjMuOTQ0IDEwNy40NEM2My4yNjEzIDEwOC4wMzcgNjIuNDUwNyAxMDguNDY0IDYxLjUxMiAxMDguNzJDNjAuNjU4NyAxMDkuMDYxIDU5LjY3NzMgMTA5LjIzMiA1OC41NjggMTA5LjIzMkgyNS4yODhaTTc1LjA4IDk0Qzc2LjcwMTMgOTQgNzguMDI0IDkzLjcwMTMgNzkuMDQ4IDkzLjEwNEM4MC4xNTczIDkyLjUwNjcgODEuMDEwNyA5MS4zOTczIDgxLjYwOCA4OS43NzZMOTQuMTUyIDU4LjQxNkM5NC45MiA1Ni41Mzg3IDk1LjU2IDU0LjkxNzMgOTYuMDcyIDUzLjU1MkM5Ni41ODQgNTIuMTAxMyA5Ny4wMTA3IDUwLjczNiA5Ny4zNTIgNDkuNDU2Qzk3LjY5MzMgNDguMTc2IDk3LjkwNjcgNDYuODUzMyA5Ny45OTIgNDUuNDg4Qzk4LjE2MjcgNDQuMDM3MyA5OC4yNDggNDIuMjg4IDk4LjI0OCA0MC4yNFY2LjQ0OEM5OC4yNDggNC44MjY2NyA5Ny44NjQgMy42NzQ2NiA5Ny4wOTYgMi45OTJDOTYuNDEzMyAyLjIyNCA5NS4yNjEzIDEuODQgOTMuNjQgMS44NEg3My41NDRDNzEuOTIyNyAxLjg0IDcwLjcyOCAyLjIyNCA2OS45NiAyLjk5MkM2OS4yNzczIDMuNjc0NjYgNjguOTM2IDQuODI2NjcgNjguOTM2IDYuNDQ4VjQxLjY0OEM2OC45MzYgNDIuNTAxMyA2OC44NTA3IDQzLjM1NDcgNjguNjggNDQuMjA4QzY4LjUwOTMgNDUuMDYxMyA2OC4yNTMzIDQ1Ljk1NzMgNjcuOTEyIDQ2Ljg5Nkw2MS44OTYgNjQuOTQ0QzYxLjY0IDY1Ljc5NzMgNjEuMzQxMyA2Ni4zOTQ3IDYxIDY2LjczNkM2MC42NTg3IDY2Ljk5MiA2MC4xNDY3IDY3LjEyIDU5LjQ2NCA2Ny4xMkg1OC4wNTZDNTcuMzczMyA2Ny4xMiA1Ni44NjEzIDY2Ljk5MiA1Ni41MiA2Ni43MzZDNTYuMTc4NyA2Ni4zOTQ3IDU1Ljg4IDY1Ljc5NzMgNTUuNjI0IDY0Ljk0NEw0OS42MDggNDcuMDI0QzQ5LjI2NjcgNDYuMDg1MyA0OS4wMTA3IDQ1LjE4OTMgNDguODQgNDQuMzM2QzQ4LjY2OTMgNDMuNDgyNyA0OC41ODQgNDIuNjI5MyA0OC41ODQgNDEuNzc2VjYuNDQ4QzQ4LjU4NCA0LjgyNjY3IDQ4LjE1NzMgMy42NzQ2NiA0Ny4zMDQgMi45OTJDNDYuNDUwNyAyLjIyNCA0NS4yMTMzIDEuODQgNDMuNTkyIDEuODRIMjMuMjRDMjEuNjE4NyAxLjg0IDIwLjQyNCAyLjIyNCAxOS42NTYgMi45OTJDMTguOTczMyAzLjY3NDY2IDE4LjYzMiA0LjgyNjY3IDE4LjYzMiA2LjQ0OFY0MC4yNEMxOC42MzIgNDIuMjg4IDE4LjY3NDcgNDQuMDM3MyAxOC43NiA0NS40ODhDMTguOTMwNyA0Ni44NTMzIDE5LjE4NjcgNDguMTc2IDE5LjUyOCA0OS40NTZDMTkuODY5MyA1MC43MzYgMjAuMjk2IDUyLjEwMTMgMjAuODA4IDUzLjU1MkMyMS4zMiA1NC45MTczIDIxLjk2IDU2LjUzODcgMjIuNzI4IDU4LjQxNkwzNS4yNzIgODkuNzc2QzM1Ljg2OTMgOTEuMzk3MyAzNi42OCA5Mi41MDY3IDM3LjcwNCA5My4xMDRDMzguODEzMyA5My43MDEzIDQwLjE3ODcgOTQgNDEuOCA5NEg3NS4wOFpNMzMuMDk2IDEzLjM2SDM0LjM3NlY0MS4wMDhDMzQuMzc2IDQzLjIyNjcgMzQuNTQ2NyA0NS4zNiAzNC44ODggNDcuNDA4QzM1LjIyOTMgNDkuMzcwNyAzNS43NDEzIDUxLjIwNTMgMzYuNDI0IDUyLjkxMkw0NC44NzIgNzMuMzkyQzQ1LjcyNTMgNzUuNjEwNyA0Ni42NjQgNzcuNDg4IDQ3LjY4OCA3OS4wMjRDNDguNzk3MyA4MC40NzQ3IDUwLjU0NjcgODEuMiA1Mi45MzYgODEuMkg2NC4yQzY2LjU4OTMgODEuMiA2OC4yOTYgODAuNDc0NyA2OS4zMiA3OS4wMjRDNzAuNDI5MyA3Ny40ODggNzEuNDEwNyA3NS42MTA3IDcyLjI2NCA3My4zOTJMODAuNzEyIDUyLjkxMkM4MS4zOTQ3IDUxLjIwNTMgODEuOTA2NyA0OS4zNzA3IDgyLjI0OCA0Ny40MDhDODIuNTg5MyA0NS4zNiA4Mi43NiA0My4yMjY3IDgyLjc2IDQxLjAwOFYxMy4zNkg4NC4wNFY0MS4wMDhDODQuMDQgNDMuMzk3MyA4My44NjkzIDQ1LjYxNiA4My41MjggNDcuNjY0QzgzLjI3MiA0OS42MjY3IDgyLjc2IDUxLjU0NjcgODEuOTkyIDUzLjQyNEw3My41NDQgNzMuOTA0QzcyLjUyIDc2LjM3ODcgNzEuMzY4IDc4LjQyNjcgNzAuMDg4IDgwLjA0OEM2OC44MDggODEuNjY5MyA2Ni44NDUzIDgyLjQ4IDY0LjIgODIuNDhINTIuOTM2QzUwLjI5MDcgODIuNDggNDguMzI4IDgxLjY2OTMgNDcuMDQ4IDgwLjA0OEM0NS43NjggNzguNDI2NyA0NC42MTYgNzYuMzc4NyA0My41OTIgNzMuOTA0TDM1LjE0NCA1My40MjRDMzQuMzc2IDUxLjU0NjcgMzMuODIxMyA0OS42MjY3IDMzLjQ4IDQ3LjY2NEMzMy4yMjQgNDUuNjE2IDMzLjA5NiA0My4zOTczIDMzLjA5NiA0MS4wMDhWMTMuMzZaTTE3MS44NTggNDQuNzJDMTczLjM5NCA0NC43MiAxNzQuNTAzIDQ0LjM3ODcgMTc1LjE4NiA0My42OTZDMTc1Ljg2OSA0My4wMTMzIDE3Ni45MzUgNDEuNTYyNyAxNzguMzg2IDM5LjM0NEwxOTQuMDAyIDE1LjUzNkMxOTQuNTE0IDE0LjY4MjcgMTk1LjA2OSAxNC4xMjggMTk1LjY2NiAxMy44NzJDMTk2LjM0OSAxMy41MzA3IDE5Ny4wMzEgMTMuMzYgMTk3LjcxNCAxMy4zNkgxOTkuODlDMjAxLjA4NSAxMy4zNiAyMDEuOTM4IDEzLjcwMTMgMjAyLjQ1IDE0LjM4NEMyMDMuMDQ3IDE0Ljk4MTMgMjAzLjM0NiAxNS45NjI3IDIwMy4zNDYgMTcuMzI4VjgyLjQ4SDIwMi4wNjZWMTcuMzI4QzIwMi4wNjYgMTYuNjQ1MyAyMDEuODk1IDE2LjA0OCAyMDEuNTU0IDE1LjUzNkMyMDEuMjk4IDE0LjkzODcgMjAwLjc0MyAxNC42NCAxOTkuODkgMTQuNjRIMTk3Ljk3QzE5Ny4zNzMgMTQuNjQgMTk2Ljg2MSAxNC43MjUzIDE5Ni40MzQgMTQuODk2QzE5Ni4wMDcgMTUuMDY2NyAxOTUuNTM4IDE1LjU3ODcgMTk1LjAyNiAxNi40MzJMMTc5LjQxIDM5Ljk4NEMxNzcuODc0IDQyLjI4OCAxNzYuNjc5IDQzLjg2NjcgMTc1LjgyNiA0NC43MkMxNzUuMDU4IDQ1LjU3MzMgMTczLjczNSA0NiAxNzEuODU4IDQ2QzE2OS45ODEgNDYgMTY4LjYxNSA0NS41NzMzIDE2Ny43NjIgNDQuNzJDMTY2Ljk5NCA0My44NjY3IDE2NS44NDIgNDIuMjg4IDE2NC4zMDYgMzkuOTg0TDE0OC42OSAxNi40MzJDMTQ4LjE3OCAxNS41Nzg3IDE0Ny42NjYgMTUuMDY2NyAxNDcuMTU0IDE0Ljg5NkMxNDYuNzI3IDE0LjcyNTMgMTQ2LjIxNSAxNC42NCAxNDUuNjE4IDE0LjY0SDE0My42OThDMTQyLjg0NSAxNC42NCAxNDIuMjkgMTQuOTM4NyAxNDIuMDM0IDE1LjUzNkMxNDEuNzc4IDE2LjA0OCAxNDEuNjUgMTYuNjQ1MyAxNDEuNjUgMTcuMzI4VjgyLjQ4SDE0MC4zN1YxNy4zMjhDMTQwLjM3IDE1Ljk2MjcgMTQwLjYyNiAxNC45ODEzIDE0MS4xMzggMTQuMzg0QzE0MS43MzUgMTMuNzAxMyAxNDIuNTg5IDEzLjM2IDE0My42OTggMTMuMzZIMTQ1Ljg3NEMxNDYuNTU3IDEzLjM2IDE0Ny4yMzkgMTMuNTMwNyAxNDcuOTIyIDEzLjg3MkMxNDguNjA1IDE0LjEyOCAxNDkuMjAyIDE0LjY4MjcgMTQ5LjcxNCAxNS41MzZMMTY1LjMzIDM5LjM0NEMxNjYuNzgxIDQxLjU2MjcgMTY3Ljg0NyA0My4wMTMzIDE2OC41MyA0My42OTZDMTY5LjIxMyA0NC4zNzg3IDE3MC4zMjIgNDQuNzIgMTcxLjg1OCA0NC43MlpNMTUwLjQ4MiA5NEMxNTIuMTAzIDk0IDE1My4yNTUgOTMuNjU4NyAxNTMuOTM4IDkyLjk3NkMxNTQuNzA2IDkyLjIwOCAxNTUuMDkgOTEuMDEzMyAxNTUuMDkgODkuMzkyVjQ0LjMzNkwxNjIuNjQyIDU4LjI4OEMxNjMuNDEgNTkuNzM4NyAxNjQuMzA2IDYwLjgwNTMgMTY1LjMzIDYxLjQ4OEMxNjYuNDM5IDYyLjA4NTMgMTY3LjgwNSA2Mi4zODQgMTY5LjQyNiA2Mi4zODRIMTc0LjU0NkMxNzYuMTY3IDYyLjM4NCAxNzcuNDkgNjIuMDg1MyAxNzguNTE0IDYxLjQ4OEMxNzkuNjIzIDYwLjgwNTMgMTgwLjU2MiA1OS43Mzg3IDE4MS4zMyA1OC4yODhMMTg4Ljg4MiA0NC4zMzZWODkuMzkyQzE4OC44ODIgOTEuMDEzMyAxODkuMjIzIDkyLjIwOCAxODkuOTA2IDkyLjk3NkMxOTAuNjc0IDkzLjY1ODcgMTkxLjg2OSA5NCAxOTMuNDkgOTRIMjEzLjIwMkMyMTQuODIzIDk0IDIxNS45NzUgOTMuNjU4NyAyMTYuNjU4IDkyLjk3NkMyMTcuNDI2IDkyLjIwOCAyMTcuODEgOTEuMDEzMyAyMTcuODEgODkuMzkyVjYuNDQ4QzIxNy44MSA0LjgyNjY3IDIxNy40MjYgMy42NzQ2NiAyMTYuNjU4IDIuOTkyQzIxNS45NzUgMi4yMjQgMjE0LjgyMyAxLjg0IDIxMy4yMDIgMS44NEgxOTIuNDY2QzE5MS4xMDEgMS44NCAxODkuOTQ5IDIuMTM4NjYgMTg5LjAxIDIuNzM1OTlDMTg4LjE1NyAzLjMzMzMzIDE4Ny4zNDYgNC4zMTQ2NiAxODYuNTc4IDUuNjc5OTlMMTc1LjE4NiAyNi41NDRDMTc0Ljc1OSAyNy4zMTIgMTc0LjM3NSAyNy44NjY3IDE3NC4wMzQgMjguMjA4QzE3My43NzggMjguNTQ5MyAxNzMuMzk0IDI4LjcyIDE3Mi44ODIgMjguNzJIMTcxLjczQzE3MS4yMTggMjguNzIgMTcwLjc5MSAyOC41NDkzIDE3MC40NSAyOC4yMDhDMTcwLjE5NCAyNy44NjY3IDE2OS44NTMgMjcuMzEyIDE2OS40MjYgMjYuNTQ0TDE1Ny45MDYgNS42Nzk5OUMxNTcuMTM4IDQuMzE0NjYgMTU2LjI4NSAzLjMzMzMzIDE1NS4zNDYgMi43MzU5OUMxNTQuNDkzIDIuMTM4NjYgMTUzLjM4MyAxLjg0IDE1Mi4wMTggMS44NEgxMzEuNDFDMTI5Ljc4OSAxLjg0IDEyOC41OTQgMi4yMjQgMTI3LjgyNiAyLjk5MkMxMjcuMTQzIDMuNjc0NjYgMTI2LjgwMiA0LjgyNjY3IDEyNi44MDIgNi40NDhWODkuMzkyQzEyNi44MDIgOTEuMDEzMyAxMjcuMTQzIDkyLjIwOCAxMjcuODI2IDkyLjk3NkMxMjguNTk0IDkzLjY1ODcgMTI5Ljc4OSA5NCAxMzEuNDEgOTRIMTUwLjQ4MlpNMTU0LjU3OCA5NC4xMjhMMTM3LjkzOCAxMDcuOTUyQzEzNy41OTcgMTA4LjI5MyAxMzcuMDQyIDEwOC41OTIgMTM2LjI3NCAxMDguODQ4QzEzNS41OTEgMTA5LjEwNCAxMzQuODIzIDEwOS4yMzIgMTMzLjk3IDEwOS4yMzJIMTE0Ljg5OEMxMTIuODUgMTA5LjIzMiAxMTEuMzU3IDEwOC43NjMgMTEwLjQxOCAxMDcuODI0QzEwOS40NzkgMTA2Ljg4NSAxMDkuMDEgMTA1LjM5MiAxMDkuMDEgMTAzLjM0NFYyMC40QzEwOS4wMSAxOS4yOTA3IDEwOS4xMzggMTguMzUyIDEwOS4zOTQgMTcuNTg0QzEwOS43MzUgMTYuODE2IDExMC4yMDUgMTYuMTc2IDExMC44MDIgMTUuNjY0TDEyNy4zMTQgMS43MTJDMTI3Ljc0MSAxLjM3MDY2IDEyOC4yOTUgMS4xMTQ2NiAxMjguOTc4IDAuOTQzOTkzQzEyOS43NDYgMC42ODc5OTYgMTMwLjU1NyAwLjU1OTk5OCAxMzEuNDEgMC41NTk5OThIMTUyLjAxOEMxNTMuNjM5IDAuNTU5OTk4IDE1NC45NjIgMC45MDEzMjkgMTU1Ljk4NiAxLjU4Mzk5QzE1Ny4wOTUgMi4yNjY2NiAxNTguMTE5IDMuNDE4NjYgMTU5LjA1OCA1LjAzOTk5TDE2Ny43NjIgMjEuMDRMMTY4LjkxNCAxOC45OTJDMTY5LjI1NSAxOC4zOTQ3IDE2OS41OTcgMTcuODQgMTY5LjkzOCAxNy4zMjhDMTcwLjM2NSAxNi43MzA3IDE3MC43OTEgMTYuMjYxMyAxNzEuMjE4IDE1LjkyTDE4Ny43MyAyLjA5NTk5QzE4OC40MTMgMS41ODM5OSAxODkuMDk1IDEuMTk5OTkgMTg5Ljc3OCAwLjk0Mzk5M0MxOTAuNTQ2IDAuNjg3OTk2IDE5MS40NDIgMC41NTk5OTggMTkyLjQ2NiAwLjU1OTk5OEgyMTMuMjAyQzIxNS4yNSAwLjU1OTk5OCAyMTYuNzQzIDEuMDI5MzMgMjE3LjY4MiAxLjk2Nzk5QzIxOC42MjEgMi45MDY2NiAyMTkuMDkgNC40IDIxOS4wOSA2LjQ0OFY4OS4zOTJDMjE5LjA5IDkwLjUwMTMgMjE4LjkxOSA5MS40NCAyMTguNTc4IDkyLjIwOEMyMTguMzIyIDkyLjk3NiAyMTcuODk1IDkzLjYxNiAyMTcuMjk4IDk0LjEyOEwyMDAuNjU4IDEwNy45NTJDMjAwLjMxNyAxMDguMjkzIDE5OS43NjIgMTA4LjU5MiAxOTguOTk0IDEwOC44NDhDMTk4LjMxMSAxMDkuMTA0IDE5Ny41NDMgMTA5LjIzMiAxOTYuNjkgMTA5LjIzMkgxNzYuOTc4QzE3NC44NDUgMTA5LjIzMiAxNzMuMzA5IDEwOC43NjMgMTcyLjM3IDEwNy44MjRDMTcxLjUxNyAxMDYuODg1IDE3MS4wOSAxMDUuMzkyIDE3MS4wOSAxMDMuMzQ0VjY5LjU1MkwxNjMuNTM4IDc1LjgyNEMxNjIuODU1IDc2LjQyMTMgMTYyLjA0NSA3Ni44OTA3IDE2MS4xMDYgNzcuMjMyQzE2MC4yNTMgNzcuNDg4IDE1OS4yMjkgNzcuNjE2IDE1OC4wMzQgNzcuNjE2SDE1Ni4zN1Y4OS4zOTJDMTU2LjM3IDkwLjUwMTMgMTU2LjE5OSA5MS40NCAxNTUuODU4IDkyLjIwOEMxNTUuNjAyIDkyLjk3NiAxNTUuMTc1IDkzLjYxNiAxNTQuNTc4IDk0LjEyOFpNMzAxLjU1IDEwOS4yMzJIMjM2LjM5OEMyMzQuMzUgMTA5LjIzMiAyMzIuODU3IDEwOC43NjMgMjMxLjkxOCAxMDcuODI0QzIzMC45NzkgMTA2Ljg4NSAyMzAuNTEgMTA1LjM5MiAyMzAuNTEgMTAzLjM0NFYyMC40QzIzMC41MSAxOS4yOTA3IDIzMC42MzggMTguMzUyIDIzMC44OTQgMTcuNTg0QzIzMS4yMzUgMTYuODE2IDIzMS43MDUgMTYuMTc2IDIzMi4zMDIgMTUuNjY0TDI0OC44MTQgMS43MTJDMjQ5LjI0MSAxLjM3MDY2IDI0OS43OTUgMS4xMTQ2NiAyNTAuNDc4IDAuOTQzOTkzQzI1MS4yNDYgMC42ODc5OTYgMjUyLjA1NyAwLjU1OTk5OCAyNTIuOTEgMC41NTk5OThIMjcyLjc1QzI3NC43OTggMC41NTk5OTggMjc2LjI5MSAxLjAyOTMzIDI3Ny4yMyAxLjk2Nzk5QzI3OC4xNjkgMi45MDY2NiAyNzguNjM4IDQuNCAyNzguNjM4IDYuNDQ4VjU4LjU0NEwyNzguODk0IDU4LjI4OEwyOTUuNDA2IDQ0LjMzNkMyOTUuODMzIDQzLjk5NDcgMjk2LjM4NyA0My43Mzg3IDI5Ny4wNyA0My41NjhDMjk3LjgzOCA0My4zMTIgMjk4LjY0OSA0My4xODQgMjk5LjUwMiA0My4xODRIMzE4LjA2MkMzMjAuMTEgNDMuMTg0IDMyMS42MDMgNDMuNjUzMyAzMjIuNTQyIDQ0LjU5MkMzMjMuNDgxIDQ1LjUzMDcgMzIzLjk1IDQ3LjAyNCAzMjMuOTUgNDkuMDcyVjg5LjM5MkMzMjMuOTUgOTAuNTAxMyAzMjMuNzc5IDkxLjQ0IDMyMy40MzggOTIuMjA4QzMyMy4xODIgOTIuOTc2IDMyMi43NTUgOTMuNjE2IDMyMi4xNTggOTQuMTI4TDMwNS41MTggMTA3Ljk1MkMzMDUuMTc3IDEwOC4yOTMgMzA0LjYyMiAxMDguNTkyIDMwMy44NTQgMTA4Ljg0OEMzMDMuMTcxIDEwOS4xMDQgMzAyLjQwMyAxMDkuMjMyIDMwMS41NSAxMDkuMjMyWk0zMTguMDYyIDk0QzMxOS42ODMgOTQgMzIwLjgzNSA5My42NTg3IDMyMS41MTggOTIuOTc2QzMyMi4yODYgOTIuMjA4IDMyMi42NyA5MS4wMTMzIDMyMi42NyA4OS4zOTJWNDkuMDcyQzMyMi42NyA0Ny40NTA3IDMyMi4yODYgNDYuMjk4NyAzMjEuNTE4IDQ1LjYxNkMzMjAuODM1IDQ0Ljg0OCAzMTkuNjgzIDQ0LjQ2NCAzMTguMDYyIDQ0LjQ2NEgyOTkuNTAyQzI5Ny44ODEgNDQuNDY0IDI5Ni42ODYgNDQuODQ4IDI5NS45MTggNDUuNjE2QzI5NS4yMzUgNDYuMjk4NyAyOTQuODk0IDQ3LjQ1MDcgMjk0Ljg5NCA0OS4wNzJWNjkuODA4SDI3Ny4zNThWNi40NDhDMjc3LjM1OCA0LjgyNjY3IDI3Ni45NzQgMy42NzQ2NiAyNzYuMjA2IDIuOTkyQzI3NS41MjMgMi4yMjQgMjc0LjM3MSAxLjg0IDI3Mi43NSAxLjg0SDI1Mi45MUMyNTEuMjg5IDEuODQgMjUwLjA5NCAyLjIyNCAyNDkuMzI2IDIuOTkyQzI0OC42NDMgMy42NzQ2NiAyNDguMzAyIDQuODI2NjcgMjQ4LjMwMiA2LjQ0OFY4OS4zOTJDMjQ4LjMwMiA5MS4wMTMzIDI0OC42NDMgOTIuMjA4IDI0OS4zMjYgOTIuOTc2QzI1MC4wOTQgOTMuNjU4NyAyNTEuMjg5IDk0IDI1Mi45MSA5NEgzMTguMDYyWk0yNjIuMjU0IDgyLjQ4VjEzLjM2SDI2My41MzRWODEuMkgzMDguMDc4VjU1Ljk4NEgzMDkuMzU4VjgyLjQ4SDI2Mi4yNTRaIiBmaWxsPSIjNEFCODgzIi8+CjwvZz4KPGRlZnM+CjxmaWx0ZXIgaWQ9ImZpbHRlcjBfaV8yXzIiIHg9IjAuODM5OTk2IiB5PSIwLjU1OTk5OCIgd2lkdGg9IjMyMy4xMSIgaGVpZ2h0PSIxMTIuNjcyIiBmaWx0ZXJVbml0cz0idXNlclNwYWNlT25Vc2UiIGNvbG9yLWludGVycG9sYXRpb24tZmlsdGVycz0ic1JHQiI+CjxmZUZsb29kIGZsb29kLW9wYWNpdHk9IjAiIHJlc3VsdD0iQmFja2dyb3VuZEltYWdlRml4Ii8+CjxmZUJsZW5kIG1vZGU9Im5vcm1hbCIgaW49IlNvdXJjZUdyYXBoaWMiIGluMj0iQmFja2dyb3VuZEltYWdlRml4IiByZXN1bHQ9InNoYXBlIi8+CjxmZUNvbG9yTWF0cml4IGluPSJTb3VyY2VBbHBoYSIgdHlwZT0ibWF0cml4IiB2YWx1ZXM9IjAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDEyNyAwIiByZXN1bHQ9ImhhcmRBbHBoYSIvPgo8ZmVPZmZzZXQgZHk9IjQiLz4KPGZlR2F1c3NpYW5CbHVyIHN0ZERldmlhdGlvbj0iMiIvPgo8ZmVDb21wb3NpdGUgaW4yPSJoYXJkQWxwaGEiIG9wZXJhdG9yPSJhcml0aG1ldGljIiBrMj0iLTEiIGszPSIxIi8+CjxmZUNvbG9yTWF0cml4IHR5cGU9Im1hdHJpeCIgdmFsdWVzPSIwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwLjI1IDAiLz4KPGZlQmxlbmQgbW9kZT0ibm9ybWFsIiBpbjI9InNoYXBlIiByZXN1bHQ9ImVmZmVjdDFfaW5uZXJTaGFkb3dfMl8yIi8+CjwvZmlsdGVyPgo8L2RlZnM+Cjwvc3ZnPgo=";
  const App_vue_vue_type_style_index_0_lang = "";
  const _sfc_main = {};
  const _hoisted_1 = { class: "frame" };
  const _hoisted_2 = /* @__PURE__ */ Vue.createElementVNode("img", { src: _imports_0 }, null, -1);
  const _hoisted_3 = /* @__PURE__ */ Vue.createElementVNode("h1", null, "vue-module-loader", -1);
  const _hoisted_4 = /* @__PURE__ */ Vue.createElementVNode("h2", null, "\u5FAE\u524D\u7AEF\u67B6\u6784", -1);
  function _sfc_render(_ctx, _cache) {
    const _component_router_view = Vue.resolveComponent("router-view");
    return Vue.openBlock(), Vue.createElementBlock("div", _hoisted_1, [
      Vue.createElementVNode("header", null, [
        _hoisted_2,
        _hoisted_3,
        _hoisted_4,
        Vue.createElementVNode("button", {
          onClick: _cache[0] || (_cache[0] = ($event) => _ctx.$router.push("/"))
        }, "\u672C\u5730\u6A21\u5757"),
        Vue.createTextVNode(" | "),
        Vue.createElementVNode("button", {
          onClick: _cache[1] || (_cache[1] = ($event) => _ctx.$router.push("/module-page"))
        }, "\u8FDC\u7A0B\u6A21\u5757")
      ]),
      Vue.createVNode(_component_router_view)
    ]);
  }
  const App = /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render]]);
  const module = {
    name,
    install(ctx) {
      ctx.Vue = Vue__namespace;
      const app = Vue__namespace.createApp(App);
      ctx.app = app;
      app.use(router);
      app.mount("#app");
      useModule(
        "http://static.mengqinghe.com/vml/module/vue-module-module.iife.js"
      );
    }
  };
  return module;
}(vue);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidnVlLW1vZHVsZS1mcmFtZS5paWZlLmpzIiwic291cmNlcyI6WyIuLi8uLi9ub2RlX21vZHVsZXMvdnVlLW1vZHVsZS1sb2FkZXIvZGlzdC92dWUtbW9kdWxlLWxvYWRlci5lcy5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9AdnVlL2RldnRvb2xzLWFwaS9saWIvZXNtL2Vudi5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9AdnVlL2RldnRvb2xzLWFwaS9saWIvZXNtL2NvbnN0LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL0B2dWUvZGV2dG9vbHMtYXBpL2xpYi9lc20vdGltZS5qcyIsIi4uLy4uL25vZGVfbW9kdWxlcy9AdnVlL2RldnRvb2xzLWFwaS9saWIvZXNtL3Byb3h5LmpzIiwiLi4vLi4vbm9kZV9tb2R1bGVzL0B2dWUvZGV2dG9vbHMtYXBpL2xpYi9lc20vaW5kZXguanMiLCIuLi8uLi9ub2RlX21vZHVsZXMvdnVlLXJvdXRlci9kaXN0L3Z1ZS1yb3V0ZXIubWpzIiwiLi4vLi4vc3JjL3BhZ2VzL0hvbWUudnVlIiwiLi4vLi4vc3JjL3JvdXRlci5qcyIsIi4uLy4uL3NyYy9hc3NldHMvVk1MLnN2ZyIsIi4uLy4uL3NyYy9BcHAudnVlIiwiLi4vLi4vc3JjL21vZHVsZS5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgX19kZWZQcm9wID0gT2JqZWN0LmRlZmluZVByb3BlcnR5O1xudmFyIF9fZ2V0T3duUHJvcFN5bWJvbHMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzO1xudmFyIF9faGFzT3duUHJvcCA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG52YXIgX19wcm9wSXNFbnVtID0gT2JqZWN0LnByb3RvdHlwZS5wcm9wZXJ0eUlzRW51bWVyYWJsZTtcbnZhciBfX2RlZk5vcm1hbFByb3AgPSAob2JqLCBrZXksIHZhbHVlKSA9PiBrZXkgaW4gb2JqID8gX19kZWZQcm9wKG9iaiwga2V5LCB7IGVudW1lcmFibGU6IHRydWUsIGNvbmZpZ3VyYWJsZTogdHJ1ZSwgd3JpdGFibGU6IHRydWUsIHZhbHVlIH0pIDogb2JqW2tleV0gPSB2YWx1ZTtcbnZhciBfX3NwcmVhZFZhbHVlcyA9IChhLCBiKSA9PiB7XG4gIGZvciAodmFyIHByb3AgaW4gYiB8fCAoYiA9IHt9KSlcbiAgICBpZiAoX19oYXNPd25Qcm9wLmNhbGwoYiwgcHJvcCkpXG4gICAgICBfX2RlZk5vcm1hbFByb3AoYSwgcHJvcCwgYltwcm9wXSk7XG4gIGlmIChfX2dldE93blByb3BTeW1ib2xzKVxuICAgIGZvciAodmFyIHByb3Agb2YgX19nZXRPd25Qcm9wU3ltYm9scyhiKSkge1xuICAgICAgaWYgKF9fcHJvcElzRW51bS5jYWxsKGIsIHByb3ApKVxuICAgICAgICBfX2RlZk5vcm1hbFByb3AoYSwgcHJvcCwgYltwcm9wXSk7XG4gICAgfVxuICByZXR1cm4gYTtcbn07XG52YXIgX19hc3luYyA9IChfX3RoaXMsIF9fYXJndW1lbnRzLCBnZW5lcmF0b3IpID0+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICB2YXIgZnVsZmlsbGVkID0gKHZhbHVlKSA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICBzdGVwKGdlbmVyYXRvci5uZXh0KHZhbHVlKSk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHJlamVjdChlKTtcbiAgICAgIH1cbiAgICB9O1xuICAgIHZhciByZWplY3RlZCA9ICh2YWx1ZSkgPT4ge1xuICAgICAgdHJ5IHtcbiAgICAgICAgc3RlcChnZW5lcmF0b3IudGhyb3codmFsdWUpKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgcmVqZWN0KGUpO1xuICAgICAgfVxuICAgIH07XG4gICAgdmFyIHN0ZXAgPSAoeCkgPT4geC5kb25lID8gcmVzb2x2ZSh4LnZhbHVlKSA6IFByb21pc2UucmVzb2x2ZSh4LnZhbHVlKS50aGVuKGZ1bGZpbGxlZCwgcmVqZWN0ZWQpO1xuICAgIHN0ZXAoKGdlbmVyYXRvciA9IGdlbmVyYXRvci5hcHBseShfX3RoaXMsIF9fYXJndW1lbnRzKSkubmV4dCgpKTtcbiAgfSk7XG59O1xuZnVuY3Rpb24gY3JlYXRlQ29udGV4dCQxKGN0eCA9IHt9KSB7XG4gIHdpbmRvd1tTeW1ib2wuZm9yKFwiX19fVk1MX0NPTlRFWFRfX19cIildID0gY3R4O1xufVxuZnVuY3Rpb24gaW5zdGFsbChhcHAsIGN0eCkge1xuICB2YXIgX2E7XG4gIGlmICghKChfYSA9IGFwcC52ZXJzaW9uKSA9PSBudWxsID8gdm9pZCAwIDogX2Euc3RhcnRzV2l0aChcIjNcIikpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBbdnVlLW1vZHVsZS1sb2FkZXJdOiBcXHU0RUM1XFx1OTAwMlxcdTc1MjhcXHU0RThFdnVlM2ApO1xuICB9IGVsc2Uge1xuICAgIGNyZWF0ZUNvbnRleHQkMShfX3NwcmVhZFZhbHVlcyh7XG4gICAgICBhcHBcbiAgICB9LCBjdHgpKTtcbiAgfVxufVxuY29uc3QgbW9kdWxlVW5pbnN0YWxsZXJNYXAgPSB7fTtcbmZ1bmN0aW9uIHVuaW5zdGFsbENhY2hlKG1vZHVsZU5hbWUsIHVuaW5zdGFsbGVyKSB7XG4gIG1vZHVsZVVuaW5zdGFsbGVyTWFwW21vZHVsZU5hbWVdID0gdW5pbnN0YWxsZXI7XG59XG5mdW5jdGlvbiBsaXN0KCkge1xuICByZXR1cm4gbW9kdWxlVW5pbnN0YWxsZXJNYXA7XG59XG5mdW5jdGlvbiB1bmluc3RhbGwobW9kdWxlTmFtZSkge1xuICByZXR1cm4gX19hc3luYyh0aGlzLCBudWxsLCBmdW5jdGlvbiogKCkge1xuICAgIG1vZHVsZVVuaW5zdGFsbGVyTWFwW21vZHVsZU5hbWVdKHdpbmRvd1tTeW1ib2wuZm9yKFwiX19fVk1MX0NPTlRFWFRfX19cIildKTtcbiAgfSk7XG59XG5mdW5jdGlvbiBjbGVhcigpIHtcbiAgcmV0dXJuIF9fYXN5bmModGhpcywgbnVsbCwgZnVuY3Rpb24qICgpIHtcbiAgICBmb3IgKGxldCBtb2R1bGVOYW1lIGluIG1vZHVsZVVuaW5zdGFsbGVyTWFwKSB7XG4gICAgICBtb2R1bGVVbmluc3RhbGxlck1hcFttb2R1bGVOYW1lXSh3aW5kb3dbU3ltYm9sLmZvcihcIl9fX1ZNTF9DT05URVhUX19fXCIpXSk7XG4gICAgfVxuICB9KTtcbn1cbmZ1bmN0aW9uIGxvYWRTdHlsZShtb2R1bGVEYXRhLCBtb2R1bGVIb3N0VXJsKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgY29uc3Qgc3R5bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwibGlua1wiKTtcbiAgICBzdHlsZS5pZCA9IG1vZHVsZURhdGEubmFtZTtcbiAgICBzdHlsZS5yZWwgPSBcInN0eWxlc2hlZXRcIjtcbiAgICBzdHlsZS5jcm9zc09yaWdpbiA9IFwiYW5vbnltb3VzXCI7XG4gICAgc3R5bGUuaHJlZiA9IG1vZHVsZUhvc3RVcmwgKyBcInN0eWxlLmNzc1wiO1xuICAgIHN0eWxlLm9ubG9hZCA9ICgpID0+IHtcbiAgICAgIHJlc29sdmUoKTtcbiAgICB9O1xuICAgIHN0eWxlLm9uZXJyb3IgPSAoKSA9PiB7XG4gICAgICByZXNvbHZlKCk7XG4gICAgfTtcbiAgICBkb2N1bWVudC5oZWFkLmFwcGVuZChzdHlsZSk7XG4gIH0pO1xufVxuZnVuY3Rpb24gZmlyZU1vZHVsZShtb2R1bGVEYXRhLCBtb2R1bGVIb3N0VXJsKSB7XG4gIHJldHVybiBfX2FzeW5jKHRoaXMsIG51bGwsIGZ1bmN0aW9uKiAoKSB7XG4gICAgY29uc3QgY29udGV4dCA9IHdpbmRvd1tTeW1ib2wuZm9yKFwiX19fVk1MX0NPTlRFWFRfX19cIildO1xuICAgIGxldCBpbnN0YWxsUmV0dXJuO1xuICAgIHRyeSB7XG4gICAgICBjb25zb2xlLmxvZyhgW3Z1ZS1tb2R1bGUtbG9hZGVyXTogXFx1NkEyMVxcdTU3NTdcXHUzMDBDJHttb2R1bGVEYXRhLm5hbWV9XFx1MzAwRFxcdTVGMDBcXHU1OUNCXFx1NTJBMFxcdThGN0QuLi5gKTtcbiAgICAgIGlmIChtb2R1bGVIb3N0VXJsKSB7XG4gICAgICAgIHlpZWxkIGxvYWRTdHlsZShtb2R1bGVEYXRhLCBtb2R1bGVIb3N0VXJsKTtcbiAgICAgIH1cbiAgICAgIGluc3RhbGxSZXR1cm4gPSB5aWVsZCBtb2R1bGVEYXRhLmluc3RhbGwoY29udGV4dCk7XG4gICAgICBjb25zb2xlLmxvZyhgW3Z1ZS1tb2R1bGUtbG9hZGVyXTogXFx1NkEyMVxcdTU3NTdcXHUzMDBDJHttb2R1bGVEYXRhLm5hbWV9XFx1MzAwRFxcdTUyQTBcXHU4RjdEXFx1NUI4Q1xcdTYyMTBcXHUzMDAyYCk7XG4gICAgICB1bmluc3RhbGxDYWNoZShtb2R1bGVEYXRhLm5hbWUsIG1vZHVsZURhdGEudW5pbnN0YWxsKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcihgW3Z1ZS1tb2R1bGUtbG9hZGVyXTogXFx1NkEyMVxcdTU3NTdcXHUzMDBDJHttb2R1bGVEYXRhLm5hbWV9XFx1MzAwRFxcdTUyQTBcXHU4RjdEXFx1OTUxOVxcdThCRUZcXHVGRjAxYCwgZXJyb3IpO1xuICAgICAgaW5zdGFsbFJldHVybiA9IGVycm9yO1xuICAgIH1cbiAgICByZXR1cm4gaW5zdGFsbFJldHVybjtcbiAgfSk7XG59XG5mdW5jdGlvbiB1c2VNb2R1bGUobW9kdWxlRGF0YSwgY3R4KSB7XG4gIHJldHVybiBfX2FzeW5jKHRoaXMsIG51bGwsIGZ1bmN0aW9uKiAoKSB7XG4gICAgY29uc3QgZXhpc3RpbmdDb250ZXh0ID0gd2luZG93W1N5bWJvbC5mb3IoXCJfX19WTUxfQ09OVEVYVF9fX1wiKV07XG4gICAgaWYgKCFleGlzdGluZ0NvbnRleHQpIHtcbiAgICAgIGNyZWF0ZUNvbnRleHQkMShjdHgpO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIG1vZHVsZURhdGEgPT09IFwib2JqZWN0XCIpIHtcbiAgICAgIHJldHVybiB5aWVsZCBmaXJlTW9kdWxlKG1vZHVsZURhdGEpO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZURhdGEgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgIGlmICghZXhpc3RpbmdDb250ZXh0LlZ1ZSlcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiW3Z1ZS1tb2R1bGUtbG9hZGVyXTogXFx1NEUwQVxcdTRFMEJcXHU2NTg3XFx1NUJGOVxcdThDNjFcXHU3RjNBXFx1NUMxMVZ1ZVxcdTVCRjlcXHU4QzYxXCIpO1xuICAgICAgY29uc3QgcmVzID0geWllbGQgZmV0Y2gobW9kdWxlRGF0YSk7XG4gICAgICBjb25zdCBtb2R1bGVTdHJpbmcgPSB5aWVsZCByZXMudGV4dCgpO1xuICAgICAgY29uc3QgbW9kdWxlQ29kZSA9IG1vZHVsZVN0cmluZy5yZXBsYWNlKFwiY29uc3RcIiwgXCJyZXR1cm5cIik7XG4gICAgICBjb25zdCBtb2R1bGVTdHJpbmdGdW4gPSBGdW5jdGlvbihgcmV0dXJuIGZ1bmN0aW9uKHZ1ZSl7JHttb2R1bGVDb2RlfX1gKSgpO1xuICAgICAgY29uc3QgbW9kdWxlRGF0YUZyb21VcmwgPSBtb2R1bGVTdHJpbmdGdW4oZXhpc3RpbmdDb250ZXh0LlZ1ZSk7XG4gICAgICByZXR1cm4geWllbGQgZmlyZU1vZHVsZShtb2R1bGVEYXRhRnJvbVVybCwgbW9kdWxlRGF0YS5tYXRjaCgvXFxTKlxcLy8pWzBdKTtcbiAgICB9XG4gIH0pO1xufVxuZnVuY3Rpb24gY3JlYXRlQ29udGV4dChjdHggPSB7fSkge1xuICB3aW5kb3dbU3ltYm9sLmZvcihcIl9fX1ZNTF9DT05URVhUX19fXCIpXSA9IGN0eDtcbn1cbmZ1bmN0aW9uIHVzZUNvbnRleHQoa2V5KSB7XG4gIGlmICghd2luZG93W1N5bWJvbC5mb3IoXCJfX19WTUxfQ09OVEVYVF9fX1wiKV0pIHtcbiAgICBjcmVhdGVDb250ZXh0KCk7XG4gIH1cbiAgaWYgKCFrZXkpIHtcbiAgICByZXR1cm4gd2luZG93W1N5bWJvbC5mb3IoXCJfX19WTUxfQ09OVEVYVF9fX1wiKV07XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgdGFyZ2V0ID0gd2luZG93W1N5bWJvbC5mb3IoXCJfX19WTUxfQ09OVEVYVF9fX1wiKV1ba2V5XTtcbiAgICBpZiAodGFyZ2V0ID09PSB2b2lkIDApXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFt2dWUtbW9kdWxlLWxvYWRlcl1cXHVGRjFBXFx1NEUwQVxcdTRFMEJcXHU2NTg3XFx1NEUyRFxcdTRFMERcXHU1QjU4XFx1NTcyOFxcdTIwMUMke2tleX1cXHUyMDFEYCk7XG4gICAgcmV0dXJuIHRhcmdldDtcbiAgfVxufVxuZXhwb3J0IHsgY2xlYXIsIGluc3RhbGwgYXMgZGVmYXVsdCwgbGlzdCwgdW5pbnN0YWxsLCB1c2VDb250ZXh0LCB1c2VNb2R1bGUgfTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXZ1ZS1tb2R1bGUtbG9hZGVyLmVzLmpzLm1hcFxuIiwiZXhwb3J0IGZ1bmN0aW9uIGdldERldnRvb2xzR2xvYmFsSG9vaygpIHtcbiAgICByZXR1cm4gZ2V0VGFyZ2V0KCkuX19WVUVfREVWVE9PTFNfR0xPQkFMX0hPT0tfXztcbn1cbmV4cG9ydCBmdW5jdGlvbiBnZXRUYXJnZXQoKSB7XG4gICAgLy8gQHRzLWlnbm9yZVxuICAgIHJldHVybiAodHlwZW9mIG5hdmlnYXRvciAhPT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpXG4gICAgICAgID8gd2luZG93XG4gICAgICAgIDogdHlwZW9mIGdsb2JhbCAhPT0gJ3VuZGVmaW5lZCdcbiAgICAgICAgICAgID8gZ2xvYmFsXG4gICAgICAgICAgICA6IHt9O1xufVxuZXhwb3J0IGNvbnN0IGlzUHJveHlBdmFpbGFibGUgPSB0eXBlb2YgUHJveHkgPT09ICdmdW5jdGlvbic7XG4iLCJleHBvcnQgY29uc3QgSE9PS19TRVRVUCA9ICdkZXZ0b29scy1wbHVnaW46c2V0dXAnO1xuZXhwb3J0IGNvbnN0IEhPT0tfUExVR0lOX1NFVFRJTkdTX1NFVCA9ICdwbHVnaW46c2V0dGluZ3M6c2V0JztcbiIsImxldCBzdXBwb3J0ZWQ7XG5sZXQgcGVyZjtcbmV4cG9ydCBmdW5jdGlvbiBpc1BlcmZvcm1hbmNlU3VwcG9ydGVkKCkge1xuICAgIHZhciBfYTtcbiAgICBpZiAoc3VwcG9ydGVkICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIHN1cHBvcnRlZDtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmIHdpbmRvdy5wZXJmb3JtYW5jZSkge1xuICAgICAgICBzdXBwb3J0ZWQgPSB0cnVlO1xuICAgICAgICBwZXJmID0gd2luZG93LnBlcmZvcm1hbmNlO1xuICAgIH1cbiAgICBlbHNlIGlmICh0eXBlb2YgZ2xvYmFsICE9PSAndW5kZWZpbmVkJyAmJiAoKF9hID0gZ2xvYmFsLnBlcmZfaG9va3MpID09PSBudWxsIHx8IF9hID09PSB2b2lkIDAgPyB2b2lkIDAgOiBfYS5wZXJmb3JtYW5jZSkpIHtcbiAgICAgICAgc3VwcG9ydGVkID0gdHJ1ZTtcbiAgICAgICAgcGVyZiA9IGdsb2JhbC5wZXJmX2hvb2tzLnBlcmZvcm1hbmNlO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgc3VwcG9ydGVkID0gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiBzdXBwb3J0ZWQ7XG59XG5leHBvcnQgZnVuY3Rpb24gbm93KCkge1xuICAgIHJldHVybiBpc1BlcmZvcm1hbmNlU3VwcG9ydGVkKCkgPyBwZXJmLm5vdygpIDogRGF0ZS5ub3coKTtcbn1cbiIsImltcG9ydCB7IEhPT0tfUExVR0lOX1NFVFRJTkdTX1NFVCB9IGZyb20gJy4vY29uc3QuanMnO1xuaW1wb3J0IHsgbm93IH0gZnJvbSAnLi90aW1lLmpzJztcbmV4cG9ydCBjbGFzcyBBcGlQcm94eSB7XG4gICAgY29uc3RydWN0b3IocGx1Z2luLCBob29rKSB7XG4gICAgICAgIHRoaXMudGFyZ2V0ID0gbnVsbDtcbiAgICAgICAgdGhpcy50YXJnZXRRdWV1ZSA9IFtdO1xuICAgICAgICB0aGlzLm9uUXVldWUgPSBbXTtcbiAgICAgICAgdGhpcy5wbHVnaW4gPSBwbHVnaW47XG4gICAgICAgIHRoaXMuaG9vayA9IGhvb2s7XG4gICAgICAgIGNvbnN0IGRlZmF1bHRTZXR0aW5ncyA9IHt9O1xuICAgICAgICBpZiAocGx1Z2luLnNldHRpbmdzKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGlkIGluIHBsdWdpbi5zZXR0aW5ncykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGl0ZW0gPSBwbHVnaW4uc2V0dGluZ3NbaWRdO1xuICAgICAgICAgICAgICAgIGRlZmF1bHRTZXR0aW5nc1tpZF0gPSBpdGVtLmRlZmF1bHRWYWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjb25zdCBsb2NhbFNldHRpbmdzU2F2ZUlkID0gYF9fdnVlLWRldnRvb2xzLXBsdWdpbi1zZXR0aW5nc19fJHtwbHVnaW4uaWR9YDtcbiAgICAgICAgbGV0IGN1cnJlbnRTZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRTZXR0aW5ncyk7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCByYXcgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShsb2NhbFNldHRpbmdzU2F2ZUlkKTtcbiAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBKU09OLnBhcnNlKHJhdyk7XG4gICAgICAgICAgICBPYmplY3QuYXNzaWduKGN1cnJlbnRTZXR0aW5ncywgZGF0YSk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIC8vIG5vb3BcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmZhbGxiYWNrcyA9IHtcbiAgICAgICAgICAgIGdldFNldHRpbmdzKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBjdXJyZW50U2V0dGluZ3M7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0U2V0dGluZ3ModmFsdWUpIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShsb2NhbFNldHRpbmdzU2F2ZUlkLCBKU09OLnN0cmluZ2lmeSh2YWx1ZSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBub29wXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGN1cnJlbnRTZXR0aW5ncyA9IHZhbHVlO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG5vdygpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbm93KCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgICAgICBpZiAoaG9vaykge1xuICAgICAgICAgICAgaG9vay5vbihIT09LX1BMVUdJTl9TRVRUSU5HU19TRVQsIChwbHVnaW5JZCwgdmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocGx1Z2luSWQgPT09IHRoaXMucGx1Z2luLmlkKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZmFsbGJhY2tzLnNldFNldHRpbmdzKHZhbHVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnByb3hpZWRPbiA9IG5ldyBQcm94eSh7fSwge1xuICAgICAgICAgICAgZ2V0OiAoX3RhcmdldCwgcHJvcCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnRhcmdldCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy50YXJnZXQub25bcHJvcF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gKC4uLmFyZ3MpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMub25RdWV1ZS5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXRob2Q6IHByb3AsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXJncyxcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLnByb3hpZWRUYXJnZXQgPSBuZXcgUHJveHkoe30sIHtcbiAgICAgICAgICAgIGdldDogKF90YXJnZXQsIHByb3ApID0+IHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy50YXJnZXQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMudGFyZ2V0W3Byb3BdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmIChwcm9wID09PSAnb24nKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnByb3hpZWRPbjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAoT2JqZWN0LmtleXModGhpcy5mYWxsYmFja3MpLmluY2x1ZGVzKHByb3ApKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAoLi4uYXJncykgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50YXJnZXRRdWV1ZS5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXRob2Q6IHByb3AsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXJncyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlOiAoKSA9PiB7IH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmZhbGxiYWNrc1twcm9wXSguLi5hcmdzKTtcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAoLi4uYXJncykgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudGFyZ2V0UXVldWUucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ldGhvZDogcHJvcCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXJncyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBhc3luYyBzZXRSZWFsVGFyZ2V0KHRhcmdldCkge1xuICAgICAgICB0aGlzLnRhcmdldCA9IHRhcmdldDtcbiAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIHRoaXMub25RdWV1ZSkge1xuICAgICAgICAgICAgdGhpcy50YXJnZXQub25baXRlbS5tZXRob2RdKC4uLml0ZW0uYXJncyk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIHRoaXMudGFyZ2V0UXVldWUpIHtcbiAgICAgICAgICAgIGl0ZW0ucmVzb2x2ZShhd2FpdCB0aGlzLnRhcmdldFtpdGVtLm1ldGhvZF0oLi4uaXRlbS5hcmdzKSk7XG4gICAgICAgIH1cbiAgICB9XG59XG4iLCJpbXBvcnQgeyBnZXRUYXJnZXQsIGdldERldnRvb2xzR2xvYmFsSG9vaywgaXNQcm94eUF2YWlsYWJsZSB9IGZyb20gJy4vZW52LmpzJztcbmltcG9ydCB7IEhPT0tfU0VUVVAgfSBmcm9tICcuL2NvbnN0LmpzJztcbmltcG9ydCB7IEFwaVByb3h5IH0gZnJvbSAnLi9wcm94eS5qcyc7XG5leHBvcnQgKiBmcm9tICcuL2FwaS9pbmRleC5qcyc7XG5leHBvcnQgKiBmcm9tICcuL3BsdWdpbi5qcyc7XG5leHBvcnQgKiBmcm9tICcuL3RpbWUuanMnO1xuZXhwb3J0IGZ1bmN0aW9uIHNldHVwRGV2dG9vbHNQbHVnaW4ocGx1Z2luRGVzY3JpcHRvciwgc2V0dXBGbikge1xuICAgIGNvbnN0IGRlc2NyaXB0b3IgPSBwbHVnaW5EZXNjcmlwdG9yO1xuICAgIGNvbnN0IHRhcmdldCA9IGdldFRhcmdldCgpO1xuICAgIGNvbnN0IGhvb2sgPSBnZXREZXZ0b29sc0dsb2JhbEhvb2soKTtcbiAgICBjb25zdCBlbmFibGVQcm94eSA9IGlzUHJveHlBdmFpbGFibGUgJiYgZGVzY3JpcHRvci5lbmFibGVFYXJseVByb3h5O1xuICAgIGlmIChob29rICYmICh0YXJnZXQuX19WVUVfREVWVE9PTFNfUExVR0lOX0FQSV9BVkFJTEFCTEVfXyB8fCAhZW5hYmxlUHJveHkpKSB7XG4gICAgICAgIGhvb2suZW1pdChIT09LX1NFVFVQLCBwbHVnaW5EZXNjcmlwdG9yLCBzZXR1cEZuKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGNvbnN0IHByb3h5ID0gZW5hYmxlUHJveHkgPyBuZXcgQXBpUHJveHkoZGVzY3JpcHRvciwgaG9vaykgOiBudWxsO1xuICAgICAgICBjb25zdCBsaXN0ID0gdGFyZ2V0Ll9fVlVFX0RFVlRPT0xTX1BMVUdJTlNfXyA9IHRhcmdldC5fX1ZVRV9ERVZUT09MU19QTFVHSU5TX18gfHwgW107XG4gICAgICAgIGxpc3QucHVzaCh7XG4gICAgICAgICAgICBwbHVnaW5EZXNjcmlwdG9yOiBkZXNjcmlwdG9yLFxuICAgICAgICAgICAgc2V0dXBGbixcbiAgICAgICAgICAgIHByb3h5LFxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKHByb3h5KVxuICAgICAgICAgICAgc2V0dXBGbihwcm94eS5wcm94aWVkVGFyZ2V0KTtcbiAgICB9XG59XG4iLCIvKiFcbiAgKiB2dWUtcm91dGVyIHY0LjEuNVxuICAqIChjKSAyMDIyIEVkdWFyZG8gU2FuIE1hcnRpbiBNb3JvdGVcbiAgKiBAbGljZW5zZSBNSVRcbiAgKi9cbmltcG9ydCB7IGdldEN1cnJlbnRJbnN0YW5jZSwgaW5qZWN0LCBvblVubW91bnRlZCwgb25EZWFjdGl2YXRlZCwgb25BY3RpdmF0ZWQsIGNvbXB1dGVkLCB1bnJlZiwgd2F0Y2hFZmZlY3QsIGRlZmluZUNvbXBvbmVudCwgcmVhY3RpdmUsIGgsIHByb3ZpZGUsIHJlZiwgd2F0Y2gsIHNoYWxsb3dSZWYsIG5leHRUaWNrIH0gZnJvbSAndnVlJztcbmltcG9ydCB7IHNldHVwRGV2dG9vbHNQbHVnaW4gfSBmcm9tICdAdnVlL2RldnRvb2xzLWFwaSc7XG5cbmNvbnN0IGlzQnJvd3NlciA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnO1xuXG5mdW5jdGlvbiBpc0VTTW9kdWxlKG9iaikge1xyXG4gICAgcmV0dXJuIG9iai5fX2VzTW9kdWxlIHx8IG9ialtTeW1ib2wudG9TdHJpbmdUYWddID09PSAnTW9kdWxlJztcclxufVxyXG5jb25zdCBhc3NpZ24gPSBPYmplY3QuYXNzaWduO1xyXG5mdW5jdGlvbiBhcHBseVRvUGFyYW1zKGZuLCBwYXJhbXMpIHtcclxuICAgIGNvbnN0IG5ld1BhcmFtcyA9IHt9O1xyXG4gICAgZm9yIChjb25zdCBrZXkgaW4gcGFyYW1zKSB7XHJcbiAgICAgICAgY29uc3QgdmFsdWUgPSBwYXJhbXNba2V5XTtcclxuICAgICAgICBuZXdQYXJhbXNba2V5XSA9IGlzQXJyYXkodmFsdWUpXHJcbiAgICAgICAgICAgID8gdmFsdWUubWFwKGZuKVxyXG4gICAgICAgICAgICA6IGZuKHZhbHVlKTtcclxuICAgIH1cclxuICAgIHJldHVybiBuZXdQYXJhbXM7XHJcbn1cclxuY29uc3Qgbm9vcCA9ICgpID0+IHsgfTtcclxuLyoqXHJcbiAqIFR5cGVzYWZlIGFsdGVybmF0aXZlIHRvIEFycmF5LmlzQXJyYXlcclxuICogaHR0cHM6Ly9naXRodWIuY29tL21pY3Jvc29mdC9UeXBlU2NyaXB0L3B1bGwvNDgyMjhcclxuICovXHJcbmNvbnN0IGlzQXJyYXkgPSBBcnJheS5pc0FycmF5O1xuXG5mdW5jdGlvbiB3YXJuKG1zZykge1xyXG4gICAgLy8gYXZvaWQgdXNpbmcgLi4uYXJncyBhcyBpdCBicmVha3MgaW4gb2xkZXIgRWRnZSBidWlsZHNcclxuICAgIGNvbnN0IGFyZ3MgPSBBcnJheS5mcm9tKGFyZ3VtZW50cykuc2xpY2UoMSk7XHJcbiAgICBjb25zb2xlLndhcm4uYXBwbHkoY29uc29sZSwgWydbVnVlIFJvdXRlciB3YXJuXTogJyArIG1zZ10uY29uY2F0KGFyZ3MpKTtcclxufVxuXG5jb25zdCBUUkFJTElOR19TTEFTSF9SRSA9IC9cXC8kLztcclxuY29uc3QgcmVtb3ZlVHJhaWxpbmdTbGFzaCA9IChwYXRoKSA9PiBwYXRoLnJlcGxhY2UoVFJBSUxJTkdfU0xBU0hfUkUsICcnKTtcclxuLyoqXHJcbiAqIFRyYW5zZm9ybXMgYSBVUkkgaW50byBhIG5vcm1hbGl6ZWQgaGlzdG9yeSBsb2NhdGlvblxyXG4gKlxyXG4gKiBAcGFyYW0gcGFyc2VRdWVyeVxyXG4gKiBAcGFyYW0gbG9jYXRpb24gLSBVUkkgdG8gbm9ybWFsaXplXHJcbiAqIEBwYXJhbSBjdXJyZW50TG9jYXRpb24gLSBjdXJyZW50IGFic29sdXRlIGxvY2F0aW9uLiBBbGxvd3MgcmVzb2x2aW5nIHJlbGF0aXZlXHJcbiAqIHBhdGhzLiBNdXN0IHN0YXJ0IHdpdGggYC9gLiBEZWZhdWx0cyB0byBgL2BcclxuICogQHJldHVybnMgYSBub3JtYWxpemVkIGhpc3RvcnkgbG9jYXRpb25cclxuICovXHJcbmZ1bmN0aW9uIHBhcnNlVVJMKHBhcnNlUXVlcnksIGxvY2F0aW9uLCBjdXJyZW50TG9jYXRpb24gPSAnLycpIHtcclxuICAgIGxldCBwYXRoLCBxdWVyeSA9IHt9LCBzZWFyY2hTdHJpbmcgPSAnJywgaGFzaCA9ICcnO1xyXG4gICAgLy8gQ291bGQgdXNlIFVSTCBhbmQgVVJMU2VhcmNoUGFyYW1zIGJ1dCBJRSAxMSBkb2Vzbid0IHN1cHBvcnQgaXRcclxuICAgIC8vIFRPRE86IG1vdmUgdG8gbmV3IFVSTCgpXHJcbiAgICBjb25zdCBoYXNoUG9zID0gbG9jYXRpb24uaW5kZXhPZignIycpO1xyXG4gICAgbGV0IHNlYXJjaFBvcyA9IGxvY2F0aW9uLmluZGV4T2YoJz8nKTtcclxuICAgIC8vIHRoZSBoYXNoIGFwcGVhcnMgYmVmb3JlIHRoZSBzZWFyY2gsIHNvIGl0J3Mgbm90IHBhcnQgb2YgdGhlIHNlYXJjaCBzdHJpbmdcclxuICAgIGlmIChoYXNoUG9zIDwgc2VhcmNoUG9zICYmIGhhc2hQb3MgPj0gMCkge1xyXG4gICAgICAgIHNlYXJjaFBvcyA9IC0xO1xyXG4gICAgfVxyXG4gICAgaWYgKHNlYXJjaFBvcyA+IC0xKSB7XHJcbiAgICAgICAgcGF0aCA9IGxvY2F0aW9uLnNsaWNlKDAsIHNlYXJjaFBvcyk7XHJcbiAgICAgICAgc2VhcmNoU3RyaW5nID0gbG9jYXRpb24uc2xpY2Uoc2VhcmNoUG9zICsgMSwgaGFzaFBvcyA+IC0xID8gaGFzaFBvcyA6IGxvY2F0aW9uLmxlbmd0aCk7XHJcbiAgICAgICAgcXVlcnkgPSBwYXJzZVF1ZXJ5KHNlYXJjaFN0cmluZyk7XHJcbiAgICB9XHJcbiAgICBpZiAoaGFzaFBvcyA+IC0xKSB7XHJcbiAgICAgICAgcGF0aCA9IHBhdGggfHwgbG9jYXRpb24uc2xpY2UoMCwgaGFzaFBvcyk7XHJcbiAgICAgICAgLy8ga2VlcCB0aGUgIyBjaGFyYWN0ZXJcclxuICAgICAgICBoYXNoID0gbG9jYXRpb24uc2xpY2UoaGFzaFBvcywgbG9jYXRpb24ubGVuZ3RoKTtcclxuICAgIH1cclxuICAgIC8vIG5vIHNlYXJjaCBhbmQgbm8gcXVlcnlcclxuICAgIHBhdGggPSByZXNvbHZlUmVsYXRpdmVQYXRoKHBhdGggIT0gbnVsbCA/IHBhdGggOiBsb2NhdGlvbiwgY3VycmVudExvY2F0aW9uKTtcclxuICAgIC8vIGVtcHR5IHBhdGggbWVhbnMgYSByZWxhdGl2ZSBxdWVyeSBvciBoYXNoIGA/Zm9vPWZgLCBgI3RoaW5nYFxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBmdWxsUGF0aDogcGF0aCArIChzZWFyY2hTdHJpbmcgJiYgJz8nKSArIHNlYXJjaFN0cmluZyArIGhhc2gsXHJcbiAgICAgICAgcGF0aCxcclxuICAgICAgICBxdWVyeSxcclxuICAgICAgICBoYXNoLFxyXG4gICAgfTtcclxufVxyXG4vKipcclxuICogU3RyaW5naWZpZXMgYSBVUkwgb2JqZWN0XHJcbiAqXHJcbiAqIEBwYXJhbSBzdHJpbmdpZnlRdWVyeVxyXG4gKiBAcGFyYW0gbG9jYXRpb25cclxuICovXHJcbmZ1bmN0aW9uIHN0cmluZ2lmeVVSTChzdHJpbmdpZnlRdWVyeSwgbG9jYXRpb24pIHtcclxuICAgIGNvbnN0IHF1ZXJ5ID0gbG9jYXRpb24ucXVlcnkgPyBzdHJpbmdpZnlRdWVyeShsb2NhdGlvbi5xdWVyeSkgOiAnJztcclxuICAgIHJldHVybiBsb2NhdGlvbi5wYXRoICsgKHF1ZXJ5ICYmICc/JykgKyBxdWVyeSArIChsb2NhdGlvbi5oYXNoIHx8ICcnKTtcclxufVxyXG4vKipcclxuICogU3RyaXBzIG9mZiB0aGUgYmFzZSBmcm9tIHRoZSBiZWdpbm5pbmcgb2YgYSBsb2NhdGlvbi5wYXRobmFtZSBpbiBhIG5vbi1jYXNlLXNlbnNpdGl2ZSB3YXkuXHJcbiAqXHJcbiAqIEBwYXJhbSBwYXRobmFtZSAtIGxvY2F0aW9uLnBhdGhuYW1lXHJcbiAqIEBwYXJhbSBiYXNlIC0gYmFzZSB0byBzdHJpcCBvZmZcclxuICovXHJcbmZ1bmN0aW9uIHN0cmlwQmFzZShwYXRobmFtZSwgYmFzZSkge1xyXG4gICAgLy8gbm8gYmFzZSBvciBiYXNlIGlzIG5vdCBmb3VuZCBhdCB0aGUgYmVnaW5uaW5nXHJcbiAgICBpZiAoIWJhc2UgfHwgIXBhdGhuYW1lLnRvTG93ZXJDYXNlKCkuc3RhcnRzV2l0aChiYXNlLnRvTG93ZXJDYXNlKCkpKVxyXG4gICAgICAgIHJldHVybiBwYXRobmFtZTtcclxuICAgIHJldHVybiBwYXRobmFtZS5zbGljZShiYXNlLmxlbmd0aCkgfHwgJy8nO1xyXG59XHJcbi8qKlxyXG4gKiBDaGVja3MgaWYgdHdvIFJvdXRlTG9jYXRpb24gYXJlIGVxdWFsLiBUaGlzIG1lYW5zIHRoYXQgYm90aCBsb2NhdGlvbnMgYXJlXHJcbiAqIHBvaW50aW5nIHRvd2FyZHMgdGhlIHNhbWUge0BsaW5rIFJvdXRlUmVjb3JkfSBhbmQgdGhhdCBhbGwgYHBhcmFtc2AsIGBxdWVyeWBcclxuICogcGFyYW1ldGVycyBhbmQgYGhhc2hgIGFyZSB0aGUgc2FtZVxyXG4gKlxyXG4gKiBAcGFyYW0gYSAtIGZpcnN0IHtAbGluayBSb3V0ZUxvY2F0aW9ufVxyXG4gKiBAcGFyYW0gYiAtIHNlY29uZCB7QGxpbmsgUm91dGVMb2NhdGlvbn1cclxuICovXHJcbmZ1bmN0aW9uIGlzU2FtZVJvdXRlTG9jYXRpb24oc3RyaW5naWZ5UXVlcnksIGEsIGIpIHtcclxuICAgIGNvbnN0IGFMYXN0SW5kZXggPSBhLm1hdGNoZWQubGVuZ3RoIC0gMTtcclxuICAgIGNvbnN0IGJMYXN0SW5kZXggPSBiLm1hdGNoZWQubGVuZ3RoIC0gMTtcclxuICAgIHJldHVybiAoYUxhc3RJbmRleCA+IC0xICYmXHJcbiAgICAgICAgYUxhc3RJbmRleCA9PT0gYkxhc3RJbmRleCAmJlxyXG4gICAgICAgIGlzU2FtZVJvdXRlUmVjb3JkKGEubWF0Y2hlZFthTGFzdEluZGV4XSwgYi5tYXRjaGVkW2JMYXN0SW5kZXhdKSAmJlxyXG4gICAgICAgIGlzU2FtZVJvdXRlTG9jYXRpb25QYXJhbXMoYS5wYXJhbXMsIGIucGFyYW1zKSAmJlxyXG4gICAgICAgIHN0cmluZ2lmeVF1ZXJ5KGEucXVlcnkpID09PSBzdHJpbmdpZnlRdWVyeShiLnF1ZXJ5KSAmJlxyXG4gICAgICAgIGEuaGFzaCA9PT0gYi5oYXNoKTtcclxufVxyXG4vKipcclxuICogQ2hlY2sgaWYgdHdvIGBSb3V0ZVJlY29yZHNgIGFyZSBlcXVhbC4gVGFrZXMgaW50byBhY2NvdW50IGFsaWFzZXM6IHRoZXkgYXJlXHJcbiAqIGNvbnNpZGVyZWQgZXF1YWwgdG8gdGhlIGBSb3V0ZVJlY29yZGAgdGhleSBhcmUgYWxpYXNpbmcuXHJcbiAqXHJcbiAqIEBwYXJhbSBhIC0gZmlyc3Qge0BsaW5rIFJvdXRlUmVjb3JkfVxyXG4gKiBAcGFyYW0gYiAtIHNlY29uZCB7QGxpbmsgUm91dGVSZWNvcmR9XHJcbiAqL1xyXG5mdW5jdGlvbiBpc1NhbWVSb3V0ZVJlY29yZChhLCBiKSB7XHJcbiAgICAvLyBzaW5jZSB0aGUgb3JpZ2luYWwgcmVjb3JkIGhhcyBhbiB1bmRlZmluZWQgdmFsdWUgZm9yIGFsaWFzT2ZcclxuICAgIC8vIGJ1dCBhbGwgYWxpYXNlcyBwb2ludCB0byB0aGUgb3JpZ2luYWwgcmVjb3JkLCB0aGlzIHdpbGwgYWx3YXlzIGNvbXBhcmVcclxuICAgIC8vIHRoZSBvcmlnaW5hbCByZWNvcmRcclxuICAgIHJldHVybiAoYS5hbGlhc09mIHx8IGEpID09PSAoYi5hbGlhc09mIHx8IGIpO1xyXG59XHJcbmZ1bmN0aW9uIGlzU2FtZVJvdXRlTG9jYXRpb25QYXJhbXMoYSwgYikge1xyXG4gICAgaWYgKE9iamVjdC5rZXlzKGEpLmxlbmd0aCAhPT0gT2JqZWN0LmtleXMoYikubGVuZ3RoKVxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIGZvciAoY29uc3Qga2V5IGluIGEpIHtcclxuICAgICAgICBpZiAoIWlzU2FtZVJvdXRlTG9jYXRpb25QYXJhbXNWYWx1ZShhW2tleV0sIGJba2V5XSkpXHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuICAgIHJldHVybiB0cnVlO1xyXG59XHJcbmZ1bmN0aW9uIGlzU2FtZVJvdXRlTG9jYXRpb25QYXJhbXNWYWx1ZShhLCBiKSB7XHJcbiAgICByZXR1cm4gaXNBcnJheShhKVxyXG4gICAgICAgID8gaXNFcXVpdmFsZW50QXJyYXkoYSwgYilcclxuICAgICAgICA6IGlzQXJyYXkoYilcclxuICAgICAgICAgICAgPyBpc0VxdWl2YWxlbnRBcnJheShiLCBhKVxyXG4gICAgICAgICAgICA6IGEgPT09IGI7XHJcbn1cclxuLyoqXHJcbiAqIENoZWNrIGlmIHR3byBhcnJheXMgYXJlIHRoZSBzYW1lIG9yIGlmIGFuIGFycmF5IHdpdGggb25lIHNpbmdsZSBlbnRyeSBpcyB0aGVcclxuICogc2FtZSBhcyBhbm90aGVyIHByaW1pdGl2ZSB2YWx1ZS4gVXNlZCB0byBjaGVjayBxdWVyeSBhbmQgcGFyYW1ldGVyc1xyXG4gKlxyXG4gKiBAcGFyYW0gYSAtIGFycmF5IG9mIHZhbHVlc1xyXG4gKiBAcGFyYW0gYiAtIGFycmF5IG9mIHZhbHVlcyBvciBhIHNpbmdsZSB2YWx1ZVxyXG4gKi9cclxuZnVuY3Rpb24gaXNFcXVpdmFsZW50QXJyYXkoYSwgYikge1xyXG4gICAgcmV0dXJuIGlzQXJyYXkoYilcclxuICAgICAgICA/IGEubGVuZ3RoID09PSBiLmxlbmd0aCAmJiBhLmV2ZXJ5KCh2YWx1ZSwgaSkgPT4gdmFsdWUgPT09IGJbaV0pXHJcbiAgICAgICAgOiBhLmxlbmd0aCA9PT0gMSAmJiBhWzBdID09PSBiO1xyXG59XHJcbi8qKlxyXG4gKiBSZXNvbHZlcyBhIHJlbGF0aXZlIHBhdGggdGhhdCBzdGFydHMgd2l0aCBgLmAuXHJcbiAqXHJcbiAqIEBwYXJhbSB0byAtIHBhdGggbG9jYXRpb24gd2UgYXJlIHJlc29sdmluZ1xyXG4gKiBAcGFyYW0gZnJvbSAtIGN1cnJlbnRMb2NhdGlvbi5wYXRoLCBzaG91bGQgc3RhcnQgd2l0aCBgL2BcclxuICovXHJcbmZ1bmN0aW9uIHJlc29sdmVSZWxhdGl2ZVBhdGgodG8sIGZyb20pIHtcclxuICAgIGlmICh0by5zdGFydHNXaXRoKCcvJykpXHJcbiAgICAgICAgcmV0dXJuIHRvO1xyXG4gICAgaWYgKChwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nKSAmJiAhZnJvbS5zdGFydHNXaXRoKCcvJykpIHtcclxuICAgICAgICB3YXJuKGBDYW5ub3QgcmVzb2x2ZSBhIHJlbGF0aXZlIGxvY2F0aW9uIHdpdGhvdXQgYW4gYWJzb2x1dGUgcGF0aC4gVHJ5aW5nIHRvIHJlc29sdmUgXCIke3RvfVwiIGZyb20gXCIke2Zyb219XCIuIEl0IHNob3VsZCBsb29rIGxpa2UgXCIvJHtmcm9tfVwiLmApO1xyXG4gICAgICAgIHJldHVybiB0bztcclxuICAgIH1cclxuICAgIGlmICghdG8pXHJcbiAgICAgICAgcmV0dXJuIGZyb207XHJcbiAgICBjb25zdCBmcm9tU2VnbWVudHMgPSBmcm9tLnNwbGl0KCcvJyk7XHJcbiAgICBjb25zdCB0b1NlZ21lbnRzID0gdG8uc3BsaXQoJy8nKTtcclxuICAgIGxldCBwb3NpdGlvbiA9IGZyb21TZWdtZW50cy5sZW5ndGggLSAxO1xyXG4gICAgbGV0IHRvUG9zaXRpb247XHJcbiAgICBsZXQgc2VnbWVudDtcclxuICAgIGZvciAodG9Qb3NpdGlvbiA9IDA7IHRvUG9zaXRpb24gPCB0b1NlZ21lbnRzLmxlbmd0aDsgdG9Qb3NpdGlvbisrKSB7XHJcbiAgICAgICAgc2VnbWVudCA9IHRvU2VnbWVudHNbdG9Qb3NpdGlvbl07XHJcbiAgICAgICAgLy8gd2Ugc3RheSBvbiB0aGUgc2FtZSBwb3NpdGlvblxyXG4gICAgICAgIGlmIChzZWdtZW50ID09PSAnLicpXHJcbiAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgIC8vIGdvIHVwIGluIHRoZSBmcm9tIGFycmF5XHJcbiAgICAgICAgaWYgKHNlZ21lbnQgPT09ICcuLicpIHtcclxuICAgICAgICAgICAgLy8gd2UgY2FuJ3QgZ28gYmVsb3cgemVybywgYnV0IHdlIHN0aWxsIG5lZWQgdG8gaW5jcmVtZW50IHRvUG9zaXRpb25cclxuICAgICAgICAgICAgaWYgKHBvc2l0aW9uID4gMSlcclxuICAgICAgICAgICAgICAgIHBvc2l0aW9uLS07XHJcbiAgICAgICAgICAgIC8vIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIHdlIHJlYWNoZWQgYSBub24tcmVsYXRpdmUgcGF0aCwgd2Ugc3RvcCBoZXJlXHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICBicmVhaztcclxuICAgIH1cclxuICAgIHJldHVybiAoZnJvbVNlZ21lbnRzLnNsaWNlKDAsIHBvc2l0aW9uKS5qb2luKCcvJykgK1xyXG4gICAgICAgICcvJyArXHJcbiAgICAgICAgdG9TZWdtZW50c1xyXG4gICAgICAgICAgICAvLyBlbnN1cmUgd2UgdXNlIGF0IGxlYXN0IHRoZSBsYXN0IGVsZW1lbnQgaW4gdGhlIHRvU2VnbWVudHNcclxuICAgICAgICAgICAgLnNsaWNlKHRvUG9zaXRpb24gLSAodG9Qb3NpdGlvbiA9PT0gdG9TZWdtZW50cy5sZW5ndGggPyAxIDogMCkpXHJcbiAgICAgICAgICAgIC5qb2luKCcvJykpO1xyXG59XG5cbnZhciBOYXZpZ2F0aW9uVHlwZTtcclxuKGZ1bmN0aW9uIChOYXZpZ2F0aW9uVHlwZSkge1xyXG4gICAgTmF2aWdhdGlvblR5cGVbXCJwb3BcIl0gPSBcInBvcFwiO1xyXG4gICAgTmF2aWdhdGlvblR5cGVbXCJwdXNoXCJdID0gXCJwdXNoXCI7XHJcbn0pKE5hdmlnYXRpb25UeXBlIHx8IChOYXZpZ2F0aW9uVHlwZSA9IHt9KSk7XHJcbnZhciBOYXZpZ2F0aW9uRGlyZWN0aW9uO1xyXG4oZnVuY3Rpb24gKE5hdmlnYXRpb25EaXJlY3Rpb24pIHtcclxuICAgIE5hdmlnYXRpb25EaXJlY3Rpb25bXCJiYWNrXCJdID0gXCJiYWNrXCI7XHJcbiAgICBOYXZpZ2F0aW9uRGlyZWN0aW9uW1wiZm9yd2FyZFwiXSA9IFwiZm9yd2FyZFwiO1xyXG4gICAgTmF2aWdhdGlvbkRpcmVjdGlvbltcInVua25vd25cIl0gPSBcIlwiO1xyXG59KShOYXZpZ2F0aW9uRGlyZWN0aW9uIHx8IChOYXZpZ2F0aW9uRGlyZWN0aW9uID0ge30pKTtcclxuLyoqXHJcbiAqIFN0YXJ0aW5nIGxvY2F0aW9uIGZvciBIaXN0b3JpZXNcclxuICovXHJcbmNvbnN0IFNUQVJUID0gJyc7XHJcbi8vIEdlbmVyaWMgdXRpbHNcclxuLyoqXHJcbiAqIE5vcm1hbGl6ZXMgYSBiYXNlIGJ5IHJlbW92aW5nIGFueSB0cmFpbGluZyBzbGFzaCBhbmQgcmVhZGluZyB0aGUgYmFzZSB0YWcgaWZcclxuICogcHJlc2VudC5cclxuICpcclxuICogQHBhcmFtIGJhc2UgLSBiYXNlIHRvIG5vcm1hbGl6ZVxyXG4gKi9cclxuZnVuY3Rpb24gbm9ybWFsaXplQmFzZShiYXNlKSB7XHJcbiAgICBpZiAoIWJhc2UpIHtcclxuICAgICAgICBpZiAoaXNCcm93c2VyKSB7XHJcbiAgICAgICAgICAgIC8vIHJlc3BlY3QgPGJhc2U+IHRhZ1xyXG4gICAgICAgICAgICBjb25zdCBiYXNlRWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdiYXNlJyk7XHJcbiAgICAgICAgICAgIGJhc2UgPSAoYmFzZUVsICYmIGJhc2VFbC5nZXRBdHRyaWJ1dGUoJ2hyZWYnKSkgfHwgJy8nO1xyXG4gICAgICAgICAgICAvLyBzdHJpcCBmdWxsIFVSTCBvcmlnaW5cclxuICAgICAgICAgICAgYmFzZSA9IGJhc2UucmVwbGFjZSgvXlxcdys6XFwvXFwvW15cXC9dKy8sICcnKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIGJhc2UgPSAnLyc7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgLy8gZW5zdXJlIGxlYWRpbmcgc2xhc2ggd2hlbiBpdCB3YXMgcmVtb3ZlZCBieSB0aGUgcmVnZXggYWJvdmUgYXZvaWQgbGVhZGluZ1xyXG4gICAgLy8gc2xhc2ggd2l0aCBoYXNoIGJlY2F1c2UgdGhlIGZpbGUgY291bGQgYmUgcmVhZCBmcm9tIHRoZSBkaXNrIGxpa2UgZmlsZTovL1xyXG4gICAgLy8gYW5kIHRoZSBsZWFkaW5nIHNsYXNoIHdvdWxkIGNhdXNlIHByb2JsZW1zXHJcbiAgICBpZiAoYmFzZVswXSAhPT0gJy8nICYmIGJhc2VbMF0gIT09ICcjJylcclxuICAgICAgICBiYXNlID0gJy8nICsgYmFzZTtcclxuICAgIC8vIHJlbW92ZSB0aGUgdHJhaWxpbmcgc2xhc2ggc28gYWxsIG90aGVyIG1ldGhvZCBjYW4ganVzdCBkbyBgYmFzZSArIGZ1bGxQYXRoYFxyXG4gICAgLy8gdG8gYnVpbGQgYW4gaHJlZlxyXG4gICAgcmV0dXJuIHJlbW92ZVRyYWlsaW5nU2xhc2goYmFzZSk7XHJcbn1cclxuLy8gcmVtb3ZlIGFueSBjaGFyYWN0ZXIgYmVmb3JlIHRoZSBoYXNoXHJcbmNvbnN0IEJFRk9SRV9IQVNIX1JFID0gL15bXiNdKyMvO1xyXG5mdW5jdGlvbiBjcmVhdGVIcmVmKGJhc2UsIGxvY2F0aW9uKSB7XHJcbiAgICByZXR1cm4gYmFzZS5yZXBsYWNlKEJFRk9SRV9IQVNIX1JFLCAnIycpICsgbG9jYXRpb247XHJcbn1cblxuZnVuY3Rpb24gZ2V0RWxlbWVudFBvc2l0aW9uKGVsLCBvZmZzZXQpIHtcclxuICAgIGNvbnN0IGRvY1JlY3QgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcbiAgICBjb25zdCBlbFJlY3QgPSBlbC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgYmVoYXZpb3I6IG9mZnNldC5iZWhhdmlvcixcclxuICAgICAgICBsZWZ0OiBlbFJlY3QubGVmdCAtIGRvY1JlY3QubGVmdCAtIChvZmZzZXQubGVmdCB8fCAwKSxcclxuICAgICAgICB0b3A6IGVsUmVjdC50b3AgLSBkb2NSZWN0LnRvcCAtIChvZmZzZXQudG9wIHx8IDApLFxyXG4gICAgfTtcclxufVxyXG5jb25zdCBjb21wdXRlU2Nyb2xsUG9zaXRpb24gPSAoKSA9PiAoe1xyXG4gICAgbGVmdDogd2luZG93LnBhZ2VYT2Zmc2V0LFxyXG4gICAgdG9wOiB3aW5kb3cucGFnZVlPZmZzZXQsXHJcbn0pO1xyXG5mdW5jdGlvbiBzY3JvbGxUb1Bvc2l0aW9uKHBvc2l0aW9uKSB7XHJcbiAgICBsZXQgc2Nyb2xsVG9PcHRpb25zO1xyXG4gICAgaWYgKCdlbCcgaW4gcG9zaXRpb24pIHtcclxuICAgICAgICBjb25zdCBwb3NpdGlvbkVsID0gcG9zaXRpb24uZWw7XHJcbiAgICAgICAgY29uc3QgaXNJZFNlbGVjdG9yID0gdHlwZW9mIHBvc2l0aW9uRWwgPT09ICdzdHJpbmcnICYmIHBvc2l0aW9uRWwuc3RhcnRzV2l0aCgnIycpO1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIGBpZGBzIGNhbiBhY2NlcHQgcHJldHR5IG11Y2ggYW55IGNoYXJhY3RlcnMsIGluY2x1ZGluZyBDU1MgY29tYmluYXRvcnNcclxuICAgICAgICAgKiBsaWtlIGA+YCBvciBgfmAuIEl0J3Mgc3RpbGwgcG9zc2libGUgdG8gcmV0cmlldmUgZWxlbWVudHMgdXNpbmdcclxuICAgICAgICAgKiBgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ34nKWAgYnV0IGl0IG5lZWRzIHRvIGJlIGVzY2FwZWQgd2hlbiB1c2luZ1xyXG4gICAgICAgICAqIGBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjXFxcXH4nKWAgZm9yIGl0IHRvIGJlIHZhbGlkLiBUaGUgb25seVxyXG4gICAgICAgICAqIHJlcXVpcmVtZW50cyBmb3IgYGlkYHMgYXJlIHRoZW0gdG8gYmUgdW5pcXVlIG9uIHRoZSBwYWdlIGFuZCB0byBub3QgYmVcclxuICAgICAgICAgKiBlbXB0eSAoYGlkPVwiXCJgKS4gQmVjYXVzZSBvZiB0aGF0LCB3aGVuIHBhc3NpbmcgYW4gaWQgc2VsZWN0b3IsIGl0IHNob3VsZFxyXG4gICAgICAgICAqIGJlIHByb3Blcmx5IGVzY2FwZWQgZm9yIGl0IHRvIHdvcmsgd2l0aCBgcXVlcnlTZWxlY3RvcmAuIFdlIGNvdWxkIGNoZWNrXHJcbiAgICAgICAgICogZm9yIHRoZSBpZCBzZWxlY3RvciB0byBiZSBzaW1wbGUgKG5vIENTUyBjb21iaW5hdG9ycyBgKyA+fmApIGJ1dCB0aGF0XHJcbiAgICAgICAgICogd291bGQgbWFrZSB0aGluZ3MgaW5jb25zaXN0ZW50IHNpbmNlIHRoZXkgYXJlIHZhbGlkIGNoYXJhY3RlcnMgZm9yIGFuXHJcbiAgICAgICAgICogYGlkYCBidXQgd291bGQgbmVlZCB0byBiZSBlc2NhcGVkIHdoZW4gdXNpbmcgYHF1ZXJ5U2VsZWN0b3JgLCBicmVha2luZ1xyXG4gICAgICAgICAqIHRoZWlyIHVzYWdlIGFuZCBlbmRpbmcgdXAgaW4gbm8gc2VsZWN0b3IgcmV0dXJuZWQuIFNlbGVjdG9ycyBuZWVkIHRvIGJlXHJcbiAgICAgICAgICogZXNjYXBlZDpcclxuICAgICAgICAgKlxyXG4gICAgICAgICAqIC0gYCMxLXRoaW5nYCBiZWNvbWVzIGAjXFwzMSAtdGhpbmdgXHJcbiAgICAgICAgICogLSBgI3dpdGh+c3ltYm9sc2AgYmVjb21lcyBgI3dpdGhcXFxcfnN5bWJvbHNgXHJcbiAgICAgICAgICpcclxuICAgICAgICAgKiAtIE1vcmUgaW5mb3JtYXRpb24gYWJvdXQgIHRoZSB0b3BpYyBjYW4gYmUgZm91bmQgYXRcclxuICAgICAgICAgKiAgIGh0dHBzOi8vbWF0aGlhc2J5bmVucy5iZS9ub3Rlcy9odG1sNS1pZC1jbGFzcy5cclxuICAgICAgICAgKiAtIFByYWN0aWNhbCBleGFtcGxlOiBodHRwczovL21hdGhpYXNieW5lbnMuYmUvZGVtby9odG1sNS1pZFxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIGlmICgocHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJykgJiYgdHlwZW9mIHBvc2l0aW9uLmVsID09PSAnc3RyaW5nJykge1xyXG4gICAgICAgICAgICBpZiAoIWlzSWRTZWxlY3RvciB8fCAhZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQocG9zaXRpb24uZWwuc2xpY2UoMSkpKSB7XHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZvdW5kRWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHBvc2l0aW9uLmVsKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaXNJZFNlbGVjdG9yICYmIGZvdW5kRWwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgd2FybihgVGhlIHNlbGVjdG9yIFwiJHtwb3NpdGlvbi5lbH1cIiBzaG91bGQgYmUgcGFzc2VkIGFzIFwiZWw6IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyR7cG9zaXRpb24uZWx9JylcIiBiZWNhdXNlIGl0IHN0YXJ0cyB3aXRoIFwiI1wiLmApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyByZXR1cm4gdG8gYXZvaWQgb3RoZXIgd2FybmluZ3NcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNhdGNoIChlcnIpIHtcclxuICAgICAgICAgICAgICAgICAgICB3YXJuKGBUaGUgc2VsZWN0b3IgXCIke3Bvc2l0aW9uLmVsfVwiIGlzIGludmFsaWQuIElmIHlvdSBhcmUgdXNpbmcgYW4gaWQgc2VsZWN0b3IsIG1ha2Ugc3VyZSB0byBlc2NhcGUgaXQuIFlvdSBjYW4gZmluZCBtb3JlIGluZm9ybWF0aW9uIGFib3V0IGVzY2FwaW5nIGNoYXJhY3RlcnMgaW4gc2VsZWN0b3JzIGF0IGh0dHBzOi8vbWF0aGlhc2J5bmVucy5iZS9ub3Rlcy9jc3MtZXNjYXBlcyBvciB1c2UgQ1NTLmVzY2FwZSAoaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvQVBJL0NTUy9lc2NhcGUpLmApO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIHJldHVybiB0byBhdm9pZCBvdGhlciB3YXJuaW5nc1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBjb25zdCBlbCA9IHR5cGVvZiBwb3NpdGlvbkVsID09PSAnc3RyaW5nJ1xyXG4gICAgICAgICAgICA/IGlzSWRTZWxlY3RvclxyXG4gICAgICAgICAgICAgICAgPyBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChwb3NpdGlvbkVsLnNsaWNlKDEpKVxyXG4gICAgICAgICAgICAgICAgOiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHBvc2l0aW9uRWwpXHJcbiAgICAgICAgICAgIDogcG9zaXRpb25FbDtcclxuICAgICAgICBpZiAoIWVsKSB7XHJcbiAgICAgICAgICAgIChwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nKSAmJlxyXG4gICAgICAgICAgICAgICAgd2FybihgQ291bGRuJ3QgZmluZCBlbGVtZW50IHVzaW5nIHNlbGVjdG9yIFwiJHtwb3NpdGlvbi5lbH1cIiByZXR1cm5lZCBieSBzY3JvbGxCZWhhdmlvci5gKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBzY3JvbGxUb09wdGlvbnMgPSBnZXRFbGVtZW50UG9zaXRpb24oZWwsIHBvc2l0aW9uKTtcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICAgIHNjcm9sbFRvT3B0aW9ucyA9IHBvc2l0aW9uO1xyXG4gICAgfVxyXG4gICAgaWYgKCdzY3JvbGxCZWhhdmlvcicgaW4gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnN0eWxlKVxyXG4gICAgICAgIHdpbmRvdy5zY3JvbGxUbyhzY3JvbGxUb09wdGlvbnMpO1xyXG4gICAgZWxzZSB7XHJcbiAgICAgICAgd2luZG93LnNjcm9sbFRvKHNjcm9sbFRvT3B0aW9ucy5sZWZ0ICE9IG51bGwgPyBzY3JvbGxUb09wdGlvbnMubGVmdCA6IHdpbmRvdy5wYWdlWE9mZnNldCwgc2Nyb2xsVG9PcHRpb25zLnRvcCAhPSBudWxsID8gc2Nyb2xsVG9PcHRpb25zLnRvcCA6IHdpbmRvdy5wYWdlWU9mZnNldCk7XHJcbiAgICB9XHJcbn1cclxuZnVuY3Rpb24gZ2V0U2Nyb2xsS2V5KHBhdGgsIGRlbHRhKSB7XHJcbiAgICBjb25zdCBwb3NpdGlvbiA9IGhpc3Rvcnkuc3RhdGUgPyBoaXN0b3J5LnN0YXRlLnBvc2l0aW9uIC0gZGVsdGEgOiAtMTtcclxuICAgIHJldHVybiBwb3NpdGlvbiArIHBhdGg7XHJcbn1cclxuY29uc3Qgc2Nyb2xsUG9zaXRpb25zID0gbmV3IE1hcCgpO1xyXG5mdW5jdGlvbiBzYXZlU2Nyb2xsUG9zaXRpb24oa2V5LCBzY3JvbGxQb3NpdGlvbikge1xyXG4gICAgc2Nyb2xsUG9zaXRpb25zLnNldChrZXksIHNjcm9sbFBvc2l0aW9uKTtcclxufVxyXG5mdW5jdGlvbiBnZXRTYXZlZFNjcm9sbFBvc2l0aW9uKGtleSkge1xyXG4gICAgY29uc3Qgc2Nyb2xsID0gc2Nyb2xsUG9zaXRpb25zLmdldChrZXkpO1xyXG4gICAgLy8gY29uc3VtZSBpdCBzbyBpdCdzIG5vdCB1c2VkIGFnYWluXHJcbiAgICBzY3JvbGxQb3NpdGlvbnMuZGVsZXRlKGtleSk7XHJcbiAgICByZXR1cm4gc2Nyb2xsO1xyXG59XHJcbi8vIFRPRE86IFJGQyBhYm91dCBob3cgdG8gc2F2ZSBzY3JvbGwgcG9zaXRpb25cclxuLyoqXHJcbiAqIFNjcm9sbEJlaGF2aW9yIGluc3RhbmNlIHVzZWQgYnkgdGhlIHJvdXRlciB0byBjb21wdXRlIGFuZCByZXN0b3JlIHRoZSBzY3JvbGxcclxuICogcG9zaXRpb24gd2hlbiBuYXZpZ2F0aW5nLlxyXG4gKi9cclxuLy8gZXhwb3J0IGludGVyZmFjZSBTY3JvbGxIYW5kbGVyPFNjcm9sbFBvc2l0aW9uRW50cnkgZXh0ZW5kcyBIaXN0b3J5U3RhdGVWYWx1ZSwgU2Nyb2xsUG9zaXRpb24gZXh0ZW5kcyBTY3JvbGxQb3NpdGlvbkVudHJ5PiB7XHJcbi8vICAgLy8gcmV0dXJucyBhIHNjcm9sbCBwb3NpdGlvbiB0aGF0IGNhbiBiZSBzYXZlZCBpbiBoaXN0b3J5XHJcbi8vICAgY29tcHV0ZSgpOiBTY3JvbGxQb3NpdGlvbkVudHJ5XHJcbi8vICAgLy8gY2FuIHRha2UgYW4gZXh0ZW5kZWQgU2Nyb2xsUG9zaXRpb25FbnRyeVxyXG4vLyAgIHNjcm9sbChwb3NpdGlvbjogU2Nyb2xsUG9zaXRpb24pOiB2b2lkXHJcbi8vIH1cclxuLy8gZXhwb3J0IGNvbnN0IHNjcm9sbEhhbmRsZXI6IFNjcm9sbEhhbmRsZXI8U2Nyb2xsUG9zaXRpb24+ID0ge1xyXG4vLyAgIGNvbXB1dGU6IGNvbXB1dGVTY3JvbGwsXHJcbi8vICAgc2Nyb2xsOiBzY3JvbGxUb1Bvc2l0aW9uLFxyXG4vLyB9XG5cbmxldCBjcmVhdGVCYXNlTG9jYXRpb24gPSAoKSA9PiBsb2NhdGlvbi5wcm90b2NvbCArICcvLycgKyBsb2NhdGlvbi5ob3N0O1xyXG4vKipcclxuICogQ3JlYXRlcyBhIG5vcm1hbGl6ZWQgaGlzdG9yeSBsb2NhdGlvbiBmcm9tIGEgd2luZG93LmxvY2F0aW9uIG9iamVjdFxyXG4gKiBAcGFyYW0gbG9jYXRpb24gLVxyXG4gKi9cclxuZnVuY3Rpb24gY3JlYXRlQ3VycmVudExvY2F0aW9uKGJhc2UsIGxvY2F0aW9uKSB7XHJcbiAgICBjb25zdCB7IHBhdGhuYW1lLCBzZWFyY2gsIGhhc2ggfSA9IGxvY2F0aW9uO1xyXG4gICAgLy8gYWxsb3dzIGhhc2ggYmFzZXMgbGlrZSAjLCAvIywgIy8sICMhLCAjIS8sIC8jIS8sIG9yIGV2ZW4gL2ZvbGRlciNlbmRcclxuICAgIGNvbnN0IGhhc2hQb3MgPSBiYXNlLmluZGV4T2YoJyMnKTtcclxuICAgIGlmIChoYXNoUG9zID4gLTEpIHtcclxuICAgICAgICBsZXQgc2xpY2VQb3MgPSBoYXNoLmluY2x1ZGVzKGJhc2Uuc2xpY2UoaGFzaFBvcykpXHJcbiAgICAgICAgICAgID8gYmFzZS5zbGljZShoYXNoUG9zKS5sZW5ndGhcclxuICAgICAgICAgICAgOiAxO1xyXG4gICAgICAgIGxldCBwYXRoRnJvbUhhc2ggPSBoYXNoLnNsaWNlKHNsaWNlUG9zKTtcclxuICAgICAgICAvLyBwcmVwZW5kIHRoZSBzdGFydGluZyBzbGFzaCB0byBoYXNoIHNvIHRoZSB1cmwgc3RhcnRzIHdpdGggLyNcclxuICAgICAgICBpZiAocGF0aEZyb21IYXNoWzBdICE9PSAnLycpXHJcbiAgICAgICAgICAgIHBhdGhGcm9tSGFzaCA9ICcvJyArIHBhdGhGcm9tSGFzaDtcclxuICAgICAgICByZXR1cm4gc3RyaXBCYXNlKHBhdGhGcm9tSGFzaCwgJycpO1xyXG4gICAgfVxyXG4gICAgY29uc3QgcGF0aCA9IHN0cmlwQmFzZShwYXRobmFtZSwgYmFzZSk7XHJcbiAgICByZXR1cm4gcGF0aCArIHNlYXJjaCArIGhhc2g7XHJcbn1cclxuZnVuY3Rpb24gdXNlSGlzdG9yeUxpc3RlbmVycyhiYXNlLCBoaXN0b3J5U3RhdGUsIGN1cnJlbnRMb2NhdGlvbiwgcmVwbGFjZSkge1xyXG4gICAgbGV0IGxpc3RlbmVycyA9IFtdO1xyXG4gICAgbGV0IHRlYXJkb3ducyA9IFtdO1xyXG4gICAgLy8gVE9ETzogc2hvdWxkIGl0IGJlIGEgc3RhY2s/IGEgRGljdC4gQ2hlY2sgaWYgdGhlIHBvcHN0YXRlIGxpc3RlbmVyXHJcbiAgICAvLyBjYW4gdHJpZ2dlciB0d2ljZVxyXG4gICAgbGV0IHBhdXNlU3RhdGUgPSBudWxsO1xyXG4gICAgY29uc3QgcG9wU3RhdGVIYW5kbGVyID0gKHsgc3RhdGUsIH0pID0+IHtcclxuICAgICAgICBjb25zdCB0byA9IGNyZWF0ZUN1cnJlbnRMb2NhdGlvbihiYXNlLCBsb2NhdGlvbik7XHJcbiAgICAgICAgY29uc3QgZnJvbSA9IGN1cnJlbnRMb2NhdGlvbi52YWx1ZTtcclxuICAgICAgICBjb25zdCBmcm9tU3RhdGUgPSBoaXN0b3J5U3RhdGUudmFsdWU7XHJcbiAgICAgICAgbGV0IGRlbHRhID0gMDtcclxuICAgICAgICBpZiAoc3RhdGUpIHtcclxuICAgICAgICAgICAgY3VycmVudExvY2F0aW9uLnZhbHVlID0gdG87XHJcbiAgICAgICAgICAgIGhpc3RvcnlTdGF0ZS52YWx1ZSA9IHN0YXRlO1xyXG4gICAgICAgICAgICAvLyBpZ25vcmUgdGhlIHBvcHN0YXRlIGFuZCByZXNldCB0aGUgcGF1c2VTdGF0ZVxyXG4gICAgICAgICAgICBpZiAocGF1c2VTdGF0ZSAmJiBwYXVzZVN0YXRlID09PSBmcm9tKSB7XHJcbiAgICAgICAgICAgICAgICBwYXVzZVN0YXRlID0gbnVsbDtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBkZWx0YSA9IGZyb21TdGF0ZSA/IHN0YXRlLnBvc2l0aW9uIC0gZnJvbVN0YXRlLnBvc2l0aW9uIDogMDtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIHJlcGxhY2UodG8pO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBjb25zb2xlLmxvZyh7IGRlbHRhRnJvbUN1cnJlbnQgfSlcclxuICAgICAgICAvLyBIZXJlIHdlIGNvdWxkIGFsc28gcmV2ZXJ0IHRoZSBuYXZpZ2F0aW9uIGJ5IGNhbGxpbmcgaGlzdG9yeS5nbygtZGVsdGEpXHJcbiAgICAgICAgLy8gdGhpcyBsaXN0ZW5lciB3aWxsIGhhdmUgdG8gYmUgYWRhcHRlZCB0byBub3QgdHJpZ2dlciBhZ2FpbiBhbmQgdG8gd2FpdCBmb3IgdGhlIHVybFxyXG4gICAgICAgIC8vIHRvIGJlIHVwZGF0ZWQgYmVmb3JlIHRyaWdnZXJpbmcgdGhlIGxpc3RlbmVycy4gU29tZSBraW5kIG9mIHZhbGlkYXRpb24gZnVuY3Rpb24gd291bGQgYWxzb1xyXG4gICAgICAgIC8vIG5lZWQgdG8gYmUgcGFzc2VkIHRvIHRoZSBsaXN0ZW5lcnMgc28gdGhlIG5hdmlnYXRpb24gY2FuIGJlIGFjY2VwdGVkXHJcbiAgICAgICAgLy8gY2FsbCBhbGwgbGlzdGVuZXJzXHJcbiAgICAgICAgbGlzdGVuZXJzLmZvckVhY2gobGlzdGVuZXIgPT4ge1xyXG4gICAgICAgICAgICBsaXN0ZW5lcihjdXJyZW50TG9jYXRpb24udmFsdWUsIGZyb20sIHtcclxuICAgICAgICAgICAgICAgIGRlbHRhLFxyXG4gICAgICAgICAgICAgICAgdHlwZTogTmF2aWdhdGlvblR5cGUucG9wLFxyXG4gICAgICAgICAgICAgICAgZGlyZWN0aW9uOiBkZWx0YVxyXG4gICAgICAgICAgICAgICAgICAgID8gZGVsdGEgPiAwXHJcbiAgICAgICAgICAgICAgICAgICAgICAgID8gTmF2aWdhdGlvbkRpcmVjdGlvbi5mb3J3YXJkXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDogTmF2aWdhdGlvbkRpcmVjdGlvbi5iYWNrXHJcbiAgICAgICAgICAgICAgICAgICAgOiBOYXZpZ2F0aW9uRGlyZWN0aW9uLnVua25vd24sXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfTtcclxuICAgIGZ1bmN0aW9uIHBhdXNlTGlzdGVuZXJzKCkge1xyXG4gICAgICAgIHBhdXNlU3RhdGUgPSBjdXJyZW50TG9jYXRpb24udmFsdWU7XHJcbiAgICB9XHJcbiAgICBmdW5jdGlvbiBsaXN0ZW4oY2FsbGJhY2spIHtcclxuICAgICAgICAvLyBzZXQgdXAgdGhlIGxpc3RlbmVyIGFuZCBwcmVwYXJlIHRlYXJkb3duIGNhbGxiYWNrc1xyXG4gICAgICAgIGxpc3RlbmVycy5wdXNoKGNhbGxiYWNrKTtcclxuICAgICAgICBjb25zdCB0ZWFyZG93biA9ICgpID0+IHtcclxuICAgICAgICAgICAgY29uc3QgaW5kZXggPSBsaXN0ZW5lcnMuaW5kZXhPZihjYWxsYmFjayk7XHJcbiAgICAgICAgICAgIGlmIChpbmRleCA+IC0xKVxyXG4gICAgICAgICAgICAgICAgbGlzdGVuZXJzLnNwbGljZShpbmRleCwgMSk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICB0ZWFyZG93bnMucHVzaCh0ZWFyZG93bik7XHJcbiAgICAgICAgcmV0dXJuIHRlYXJkb3duO1xyXG4gICAgfVxyXG4gICAgZnVuY3Rpb24gYmVmb3JlVW5sb2FkTGlzdGVuZXIoKSB7XHJcbiAgICAgICAgY29uc3QgeyBoaXN0b3J5IH0gPSB3aW5kb3c7XHJcbiAgICAgICAgaWYgKCFoaXN0b3J5LnN0YXRlKVxyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgaGlzdG9yeS5yZXBsYWNlU3RhdGUoYXNzaWduKHt9LCBoaXN0b3J5LnN0YXRlLCB7IHNjcm9sbDogY29tcHV0ZVNjcm9sbFBvc2l0aW9uKCkgfSksICcnKTtcclxuICAgIH1cclxuICAgIGZ1bmN0aW9uIGRlc3Ryb3koKSB7XHJcbiAgICAgICAgZm9yIChjb25zdCB0ZWFyZG93biBvZiB0ZWFyZG93bnMpXHJcbiAgICAgICAgICAgIHRlYXJkb3duKCk7XHJcbiAgICAgICAgdGVhcmRvd25zID0gW107XHJcbiAgICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3BvcHN0YXRlJywgcG9wU3RhdGVIYW5kbGVyKTtcclxuICAgICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcignYmVmb3JldW5sb2FkJywgYmVmb3JlVW5sb2FkTGlzdGVuZXIpO1xyXG4gICAgfVxyXG4gICAgLy8gc2V0IHVwIHRoZSBsaXN0ZW5lcnMgYW5kIHByZXBhcmUgdGVhcmRvd24gY2FsbGJhY2tzXHJcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncG9wc3RhdGUnLCBwb3BTdGF0ZUhhbmRsZXIpO1xyXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2JlZm9yZXVubG9hZCcsIGJlZm9yZVVubG9hZExpc3RlbmVyKTtcclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgcGF1c2VMaXN0ZW5lcnMsXHJcbiAgICAgICAgbGlzdGVuLFxyXG4gICAgICAgIGRlc3Ryb3ksXHJcbiAgICB9O1xyXG59XHJcbi8qKlxyXG4gKiBDcmVhdGVzIGEgc3RhdGUgb2JqZWN0XHJcbiAqL1xyXG5mdW5jdGlvbiBidWlsZFN0YXRlKGJhY2ssIGN1cnJlbnQsIGZvcndhcmQsIHJlcGxhY2VkID0gZmFsc2UsIGNvbXB1dGVTY3JvbGwgPSBmYWxzZSkge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBiYWNrLFxyXG4gICAgICAgIGN1cnJlbnQsXHJcbiAgICAgICAgZm9yd2FyZCxcclxuICAgICAgICByZXBsYWNlZCxcclxuICAgICAgICBwb3NpdGlvbjogd2luZG93Lmhpc3RvcnkubGVuZ3RoLFxyXG4gICAgICAgIHNjcm9sbDogY29tcHV0ZVNjcm9sbCA/IGNvbXB1dGVTY3JvbGxQb3NpdGlvbigpIDogbnVsbCxcclxuICAgIH07XHJcbn1cclxuZnVuY3Rpb24gdXNlSGlzdG9yeVN0YXRlTmF2aWdhdGlvbihiYXNlKSB7XHJcbiAgICBjb25zdCB7IGhpc3RvcnksIGxvY2F0aW9uIH0gPSB3aW5kb3c7XHJcbiAgICAvLyBwcml2YXRlIHZhcmlhYmxlc1xyXG4gICAgY29uc3QgY3VycmVudExvY2F0aW9uID0ge1xyXG4gICAgICAgIHZhbHVlOiBjcmVhdGVDdXJyZW50TG9jYXRpb24oYmFzZSwgbG9jYXRpb24pLFxyXG4gICAgfTtcclxuICAgIGNvbnN0IGhpc3RvcnlTdGF0ZSA9IHsgdmFsdWU6IGhpc3Rvcnkuc3RhdGUgfTtcclxuICAgIC8vIGJ1aWxkIGN1cnJlbnQgaGlzdG9yeSBlbnRyeSBhcyB0aGlzIGlzIGEgZnJlc2ggbmF2aWdhdGlvblxyXG4gICAgaWYgKCFoaXN0b3J5U3RhdGUudmFsdWUpIHtcclxuICAgICAgICBjaGFuZ2VMb2NhdGlvbihjdXJyZW50TG9jYXRpb24udmFsdWUsIHtcclxuICAgICAgICAgICAgYmFjazogbnVsbCxcclxuICAgICAgICAgICAgY3VycmVudDogY3VycmVudExvY2F0aW9uLnZhbHVlLFxyXG4gICAgICAgICAgICBmb3J3YXJkOiBudWxsLFxyXG4gICAgICAgICAgICAvLyB0aGUgbGVuZ3RoIGlzIG9mZiBieSBvbmUsIHdlIG5lZWQgdG8gZGVjcmVhc2UgaXRcclxuICAgICAgICAgICAgcG9zaXRpb246IGhpc3RvcnkubGVuZ3RoIC0gMSxcclxuICAgICAgICAgICAgcmVwbGFjZWQ6IHRydWUsXHJcbiAgICAgICAgICAgIC8vIGRvbid0IGFkZCBhIHNjcm9sbCBhcyB0aGUgdXNlciBtYXkgaGF2ZSBhbiBhbmNob3IsIGFuZCB3ZSB3YW50XHJcbiAgICAgICAgICAgIC8vIHNjcm9sbEJlaGF2aW9yIHRvIGJlIHRyaWdnZXJlZCB3aXRob3V0IGEgc2F2ZWQgcG9zaXRpb25cclxuICAgICAgICAgICAgc2Nyb2xsOiBudWxsLFxyXG4gICAgICAgIH0sIHRydWUpO1xyXG4gICAgfVxyXG4gICAgZnVuY3Rpb24gY2hhbmdlTG9jYXRpb24odG8sIHN0YXRlLCByZXBsYWNlKSB7XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogaWYgYSBiYXNlIHRhZyBpcyBwcm92aWRlZCwgYW5kIHdlIGFyZSBvbiBhIG5vcm1hbCBkb21haW4sIHdlIGhhdmUgdG9cclxuICAgICAgICAgKiByZXNwZWN0IHRoZSBwcm92aWRlZCBgYmFzZWAgYXR0cmlidXRlIGJlY2F1c2UgcHVzaFN0YXRlKCkgd2lsbCB1c2UgaXQgYW5kXHJcbiAgICAgICAgICogcG90ZW50aWFsbHkgZXJhc2UgYW55dGhpbmcgYmVmb3JlIHRoZSBgI2AgbGlrZSBhdFxyXG4gICAgICAgICAqIGh0dHBzOi8vZ2l0aHViLmNvbS92dWVqcy9yb3V0ZXIvaXNzdWVzLzY4NSB3aGVyZSBhIGJhc2Ugb2ZcclxuICAgICAgICAgKiBgL2ZvbGRlci8jYCBidXQgYSBiYXNlIG9mIGAvYCB3b3VsZCBlcmFzZSB0aGUgYC9mb2xkZXIvYCBzZWN0aW9uLiBJZlxyXG4gICAgICAgICAqIHRoZXJlIGlzIG5vIGhvc3QsIHRoZSBgPGJhc2U+YCB0YWcgbWFrZXMgbm8gc2Vuc2UgYW5kIGlmIHRoZXJlIGlzbid0IGFcclxuICAgICAgICAgKiBiYXNlIHRhZyB3ZSBjYW4ganVzdCB1c2UgZXZlcnl0aGluZyBhZnRlciB0aGUgYCNgLlxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIGNvbnN0IGhhc2hJbmRleCA9IGJhc2UuaW5kZXhPZignIycpO1xyXG4gICAgICAgIGNvbnN0IHVybCA9IGhhc2hJbmRleCA+IC0xXHJcbiAgICAgICAgICAgID8gKGxvY2F0aW9uLmhvc3QgJiYgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignYmFzZScpXHJcbiAgICAgICAgICAgICAgICA/IGJhc2VcclxuICAgICAgICAgICAgICAgIDogYmFzZS5zbGljZShoYXNoSW5kZXgpKSArIHRvXHJcbiAgICAgICAgICAgIDogY3JlYXRlQmFzZUxvY2F0aW9uKCkgKyBiYXNlICsgdG87XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgLy8gQlJPV1NFUiBRVUlSS1xyXG4gICAgICAgICAgICAvLyBOT1RFOiBTYWZhcmkgdGhyb3dzIGEgU2VjdXJpdHlFcnJvciB3aGVuIGNhbGxpbmcgdGhpcyBmdW5jdGlvbiAxMDAgdGltZXMgaW4gMzAgc2Vjb25kc1xyXG4gICAgICAgICAgICBoaXN0b3J5W3JlcGxhY2UgPyAncmVwbGFjZVN0YXRlJyA6ICdwdXNoU3RhdGUnXShzdGF0ZSwgJycsIHVybCk7XHJcbiAgICAgICAgICAgIGhpc3RvcnlTdGF0ZS52YWx1ZSA9IHN0YXRlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYXRjaCAoZXJyKSB7XHJcbiAgICAgICAgICAgIGlmICgocHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJykpIHtcclxuICAgICAgICAgICAgICAgIHdhcm4oJ0Vycm9yIHdpdGggcHVzaC9yZXBsYWNlIFN0YXRlJywgZXJyKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyBGb3JjZSB0aGUgbmF2aWdhdGlvbiwgdGhpcyBhbHNvIHJlc2V0cyB0aGUgY2FsbCBjb3VudFxyXG4gICAgICAgICAgICBsb2NhdGlvbltyZXBsYWNlID8gJ3JlcGxhY2UnIDogJ2Fzc2lnbiddKHVybCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZnVuY3Rpb24gcmVwbGFjZSh0bywgZGF0YSkge1xyXG4gICAgICAgIGNvbnN0IHN0YXRlID0gYXNzaWduKHt9LCBoaXN0b3J5LnN0YXRlLCBidWlsZFN0YXRlKGhpc3RvcnlTdGF0ZS52YWx1ZS5iYWNrLCBcclxuICAgICAgICAvLyBrZWVwIGJhY2sgYW5kIGZvcndhcmQgZW50cmllcyBidXQgb3ZlcnJpZGUgY3VycmVudCBwb3NpdGlvblxyXG4gICAgICAgIHRvLCBoaXN0b3J5U3RhdGUudmFsdWUuZm9yd2FyZCwgdHJ1ZSksIGRhdGEsIHsgcG9zaXRpb246IGhpc3RvcnlTdGF0ZS52YWx1ZS5wb3NpdGlvbiB9KTtcclxuICAgICAgICBjaGFuZ2VMb2NhdGlvbih0bywgc3RhdGUsIHRydWUpO1xyXG4gICAgICAgIGN1cnJlbnRMb2NhdGlvbi52YWx1ZSA9IHRvO1xyXG4gICAgfVxyXG4gICAgZnVuY3Rpb24gcHVzaCh0bywgZGF0YSkge1xyXG4gICAgICAgIC8vIEFkZCB0byBjdXJyZW50IGVudHJ5IHRoZSBpbmZvcm1hdGlvbiBvZiB3aGVyZSB3ZSBhcmUgZ29pbmdcclxuICAgICAgICAvLyBhcyB3ZWxsIGFzIHNhdmluZyB0aGUgY3VycmVudCBwb3NpdGlvblxyXG4gICAgICAgIGNvbnN0IGN1cnJlbnRTdGF0ZSA9IGFzc2lnbih7fSwgXHJcbiAgICAgICAgLy8gdXNlIGN1cnJlbnQgaGlzdG9yeSBzdGF0ZSB0byBncmFjZWZ1bGx5IGhhbmRsZSBhIHdyb25nIGNhbGwgdG9cclxuICAgICAgICAvLyBoaXN0b3J5LnJlcGxhY2VTdGF0ZVxyXG4gICAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS92dWVqcy9yb3V0ZXIvaXNzdWVzLzM2NlxyXG4gICAgICAgIGhpc3RvcnlTdGF0ZS52YWx1ZSwgaGlzdG9yeS5zdGF0ZSwge1xyXG4gICAgICAgICAgICBmb3J3YXJkOiB0byxcclxuICAgICAgICAgICAgc2Nyb2xsOiBjb21wdXRlU2Nyb2xsUG9zaXRpb24oKSxcclxuICAgICAgICB9KTtcclxuICAgICAgICBpZiAoKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicpICYmICFoaXN0b3J5LnN0YXRlKSB7XHJcbiAgICAgICAgICAgIHdhcm4oYGhpc3Rvcnkuc3RhdGUgc2VlbXMgdG8gaGF2ZSBiZWVuIG1hbnVhbGx5IHJlcGxhY2VkIHdpdGhvdXQgcHJlc2VydmluZyB0aGUgbmVjZXNzYXJ5IHZhbHVlcy4gTWFrZSBzdXJlIHRvIHByZXNlcnZlIGV4aXN0aW5nIGhpc3Rvcnkgc3RhdGUgaWYgeW91IGFyZSBtYW51YWxseSBjYWxsaW5nIGhpc3RvcnkucmVwbGFjZVN0YXRlOlxcblxcbmAgK1xyXG4gICAgICAgICAgICAgICAgYGhpc3RvcnkucmVwbGFjZVN0YXRlKGhpc3Rvcnkuc3RhdGUsICcnLCB1cmwpXFxuXFxuYCArXHJcbiAgICAgICAgICAgICAgICBgWW91IGNhbiBmaW5kIG1vcmUgaW5mb3JtYXRpb24gYXQgaHR0cHM6Ly9uZXh0LnJvdXRlci52dWVqcy5vcmcvZ3VpZGUvbWlncmF0aW9uLyN1c2FnZS1vZi1oaXN0b3J5LXN0YXRlLmApO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjaGFuZ2VMb2NhdGlvbihjdXJyZW50U3RhdGUuY3VycmVudCwgY3VycmVudFN0YXRlLCB0cnVlKTtcclxuICAgICAgICBjb25zdCBzdGF0ZSA9IGFzc2lnbih7fSwgYnVpbGRTdGF0ZShjdXJyZW50TG9jYXRpb24udmFsdWUsIHRvLCBudWxsKSwgeyBwb3NpdGlvbjogY3VycmVudFN0YXRlLnBvc2l0aW9uICsgMSB9LCBkYXRhKTtcclxuICAgICAgICBjaGFuZ2VMb2NhdGlvbih0bywgc3RhdGUsIGZhbHNlKTtcclxuICAgICAgICBjdXJyZW50TG9jYXRpb24udmFsdWUgPSB0bztcclxuICAgIH1cclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgbG9jYXRpb246IGN1cnJlbnRMb2NhdGlvbixcclxuICAgICAgICBzdGF0ZTogaGlzdG9yeVN0YXRlLFxyXG4gICAgICAgIHB1c2gsXHJcbiAgICAgICAgcmVwbGFjZSxcclxuICAgIH07XHJcbn1cclxuLyoqXHJcbiAqIENyZWF0ZXMgYW4gSFRNTDUgaGlzdG9yeS4gTW9zdCBjb21tb24gaGlzdG9yeSBmb3Igc2luZ2xlIHBhZ2UgYXBwbGljYXRpb25zLlxyXG4gKlxyXG4gKiBAcGFyYW0gYmFzZSAtXHJcbiAqL1xyXG5mdW5jdGlvbiBjcmVhdGVXZWJIaXN0b3J5KGJhc2UpIHtcclxuICAgIGJhc2UgPSBub3JtYWxpemVCYXNlKGJhc2UpO1xyXG4gICAgY29uc3QgaGlzdG9yeU5hdmlnYXRpb24gPSB1c2VIaXN0b3J5U3RhdGVOYXZpZ2F0aW9uKGJhc2UpO1xyXG4gICAgY29uc3QgaGlzdG9yeUxpc3RlbmVycyA9IHVzZUhpc3RvcnlMaXN0ZW5lcnMoYmFzZSwgaGlzdG9yeU5hdmlnYXRpb24uc3RhdGUsIGhpc3RvcnlOYXZpZ2F0aW9uLmxvY2F0aW9uLCBoaXN0b3J5TmF2aWdhdGlvbi5yZXBsYWNlKTtcclxuICAgIGZ1bmN0aW9uIGdvKGRlbHRhLCB0cmlnZ2VyTGlzdGVuZXJzID0gdHJ1ZSkge1xyXG4gICAgICAgIGlmICghdHJpZ2dlckxpc3RlbmVycylcclxuICAgICAgICAgICAgaGlzdG9yeUxpc3RlbmVycy5wYXVzZUxpc3RlbmVycygpO1xyXG4gICAgICAgIGhpc3RvcnkuZ28oZGVsdGEpO1xyXG4gICAgfVxyXG4gICAgY29uc3Qgcm91dGVySGlzdG9yeSA9IGFzc2lnbih7XHJcbiAgICAgICAgLy8gaXQncyBvdmVycmlkZGVuIHJpZ2h0IGFmdGVyXHJcbiAgICAgICAgbG9jYXRpb246ICcnLFxyXG4gICAgICAgIGJhc2UsXHJcbiAgICAgICAgZ28sXHJcbiAgICAgICAgY3JlYXRlSHJlZjogY3JlYXRlSHJlZi5iaW5kKG51bGwsIGJhc2UpLFxyXG4gICAgfSwgaGlzdG9yeU5hdmlnYXRpb24sIGhpc3RvcnlMaXN0ZW5lcnMpO1xyXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHJvdXRlckhpc3RvcnksICdsb2NhdGlvbicsIHtcclxuICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxyXG4gICAgICAgIGdldDogKCkgPT4gaGlzdG9yeU5hdmlnYXRpb24ubG9jYXRpb24udmFsdWUsXHJcbiAgICB9KTtcclxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShyb3V0ZXJIaXN0b3J5LCAnc3RhdGUnLCB7XHJcbiAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcclxuICAgICAgICBnZXQ6ICgpID0+IGhpc3RvcnlOYXZpZ2F0aW9uLnN0YXRlLnZhbHVlLFxyXG4gICAgfSk7XHJcbiAgICByZXR1cm4gcm91dGVySGlzdG9yeTtcclxufVxuXG4vKipcclxuICogQ3JlYXRlcyBhbiBpbi1tZW1vcnkgYmFzZWQgaGlzdG9yeS4gVGhlIG1haW4gcHVycG9zZSBvZiB0aGlzIGhpc3RvcnkgaXMgdG8gaGFuZGxlIFNTUi4gSXQgc3RhcnRzIGluIGEgc3BlY2lhbCBsb2NhdGlvbiB0aGF0IGlzIG5vd2hlcmUuXHJcbiAqIEl0J3MgdXAgdG8gdGhlIHVzZXIgdG8gcmVwbGFjZSB0aGF0IGxvY2F0aW9uIHdpdGggdGhlIHN0YXJ0ZXIgbG9jYXRpb24gYnkgZWl0aGVyIGNhbGxpbmcgYHJvdXRlci5wdXNoYCBvciBgcm91dGVyLnJlcGxhY2VgLlxyXG4gKlxyXG4gKiBAcGFyYW0gYmFzZSAtIEJhc2UgYXBwbGllZCB0byBhbGwgdXJscywgZGVmYXVsdHMgdG8gJy8nXHJcbiAqIEByZXR1cm5zIGEgaGlzdG9yeSBvYmplY3QgdGhhdCBjYW4gYmUgcGFzc2VkIHRvIHRoZSByb3V0ZXIgY29uc3RydWN0b3JcclxuICovXHJcbmZ1bmN0aW9uIGNyZWF0ZU1lbW9yeUhpc3RvcnkoYmFzZSA9ICcnKSB7XHJcbiAgICBsZXQgbGlzdGVuZXJzID0gW107XHJcbiAgICBsZXQgcXVldWUgPSBbU1RBUlRdO1xyXG4gICAgbGV0IHBvc2l0aW9uID0gMDtcclxuICAgIGJhc2UgPSBub3JtYWxpemVCYXNlKGJhc2UpO1xyXG4gICAgZnVuY3Rpb24gc2V0TG9jYXRpb24obG9jYXRpb24pIHtcclxuICAgICAgICBwb3NpdGlvbisrO1xyXG4gICAgICAgIGlmIChwb3NpdGlvbiA9PT0gcXVldWUubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgIC8vIHdlIGFyZSBhdCB0aGUgZW5kLCB3ZSBjYW4gc2ltcGx5IGFwcGVuZCBhIG5ldyBlbnRyeVxyXG4gICAgICAgICAgICBxdWV1ZS5wdXNoKGxvY2F0aW9uKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIC8vIHdlIGFyZSBpbiB0aGUgbWlkZGxlLCB3ZSByZW1vdmUgZXZlcnl0aGluZyBmcm9tIGhlcmUgaW4gdGhlIHF1ZXVlXHJcbiAgICAgICAgICAgIHF1ZXVlLnNwbGljZShwb3NpdGlvbik7XHJcbiAgICAgICAgICAgIHF1ZXVlLnB1c2gobG9jYXRpb24pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGZ1bmN0aW9uIHRyaWdnZXJMaXN0ZW5lcnModG8sIGZyb20sIHsgZGlyZWN0aW9uLCBkZWx0YSB9KSB7XHJcbiAgICAgICAgY29uc3QgaW5mbyA9IHtcclxuICAgICAgICAgICAgZGlyZWN0aW9uLFxyXG4gICAgICAgICAgICBkZWx0YSxcclxuICAgICAgICAgICAgdHlwZTogTmF2aWdhdGlvblR5cGUucG9wLFxyXG4gICAgICAgIH07XHJcbiAgICAgICAgZm9yIChjb25zdCBjYWxsYmFjayBvZiBsaXN0ZW5lcnMpIHtcclxuICAgICAgICAgICAgY2FsbGJhY2sodG8sIGZyb20sIGluZm8pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGNvbnN0IHJvdXRlckhpc3RvcnkgPSB7XHJcbiAgICAgICAgLy8gcmV3cml0dGVuIGJ5IE9iamVjdC5kZWZpbmVQcm9wZXJ0eVxyXG4gICAgICAgIGxvY2F0aW9uOiBTVEFSVCxcclxuICAgICAgICAvLyBUT0RPOiBzaG91bGQgYmUga2VwdCBpbiBxdWV1ZVxyXG4gICAgICAgIHN0YXRlOiB7fSxcclxuICAgICAgICBiYXNlLFxyXG4gICAgICAgIGNyZWF0ZUhyZWY6IGNyZWF0ZUhyZWYuYmluZChudWxsLCBiYXNlKSxcclxuICAgICAgICByZXBsYWNlKHRvKSB7XHJcbiAgICAgICAgICAgIC8vIHJlbW92ZSBjdXJyZW50IGVudHJ5IGFuZCBkZWNyZW1lbnQgcG9zaXRpb25cclxuICAgICAgICAgICAgcXVldWUuc3BsaWNlKHBvc2l0aW9uLS0sIDEpO1xyXG4gICAgICAgICAgICBzZXRMb2NhdGlvbih0byk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBwdXNoKHRvLCBkYXRhKSB7XHJcbiAgICAgICAgICAgIHNldExvY2F0aW9uKHRvKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGxpc3RlbihjYWxsYmFjaykge1xyXG4gICAgICAgICAgICBsaXN0ZW5lcnMucHVzaChjYWxsYmFjayk7XHJcbiAgICAgICAgICAgIHJldHVybiAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBpbmRleCA9IGxpc3RlbmVycy5pbmRleE9mKGNhbGxiYWNrKTtcclxuICAgICAgICAgICAgICAgIGlmIChpbmRleCA+IC0xKVxyXG4gICAgICAgICAgICAgICAgICAgIGxpc3RlbmVycy5zcGxpY2UoaW5kZXgsIDEpO1xyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZGVzdHJveSgpIHtcclxuICAgICAgICAgICAgbGlzdGVuZXJzID0gW107XHJcbiAgICAgICAgICAgIHF1ZXVlID0gW1NUQVJUXTtcclxuICAgICAgICAgICAgcG9zaXRpb24gPSAwO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZ28oZGVsdGEsIHNob3VsZFRyaWdnZXIgPSB0cnVlKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGZyb20gPSB0aGlzLmxvY2F0aW9uO1xyXG4gICAgICAgICAgICBjb25zdCBkaXJlY3Rpb24gPSBcclxuICAgICAgICAgICAgLy8gd2UgYXJlIGNvbnNpZGVyaW5nIGRlbHRhID09PSAwIGdvaW5nIGZvcndhcmQsIGJ1dCBpbiBhYnN0cmFjdCBtb2RlXHJcbiAgICAgICAgICAgIC8vIHVzaW5nIDAgZm9yIHRoZSBkZWx0YSBkb2Vzbid0IG1ha2Ugc2Vuc2UgbGlrZSBpdCBkb2VzIGluIGh0bWw1IHdoZXJlXHJcbiAgICAgICAgICAgIC8vIGl0IHJlbG9hZHMgdGhlIHBhZ2VcclxuICAgICAgICAgICAgZGVsdGEgPCAwID8gTmF2aWdhdGlvbkRpcmVjdGlvbi5iYWNrIDogTmF2aWdhdGlvbkRpcmVjdGlvbi5mb3J3YXJkO1xyXG4gICAgICAgICAgICBwb3NpdGlvbiA9IE1hdGgubWF4KDAsIE1hdGgubWluKHBvc2l0aW9uICsgZGVsdGEsIHF1ZXVlLmxlbmd0aCAtIDEpKTtcclxuICAgICAgICAgICAgaWYgKHNob3VsZFRyaWdnZXIpIHtcclxuICAgICAgICAgICAgICAgIHRyaWdnZXJMaXN0ZW5lcnModGhpcy5sb2NhdGlvbiwgZnJvbSwge1xyXG4gICAgICAgICAgICAgICAgICAgIGRpcmVjdGlvbixcclxuICAgICAgICAgICAgICAgICAgICBkZWx0YSxcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuICAgIH07XHJcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkocm91dGVySGlzdG9yeSwgJ2xvY2F0aW9uJywge1xyXG4gICAgICAgIGVudW1lcmFibGU6IHRydWUsXHJcbiAgICAgICAgZ2V0OiAoKSA9PiBxdWV1ZVtwb3NpdGlvbl0sXHJcbiAgICB9KTtcclxuICAgIHJldHVybiByb3V0ZXJIaXN0b3J5O1xyXG59XG5cbi8qKlxyXG4gKiBDcmVhdGVzIGEgaGFzaCBoaXN0b3J5LiBVc2VmdWwgZm9yIHdlYiBhcHBsaWNhdGlvbnMgd2l0aCBubyBob3N0IChlLmcuIGBmaWxlOi8vYCkgb3Igd2hlbiBjb25maWd1cmluZyBhIHNlcnZlciB0b1xyXG4gKiBoYW5kbGUgYW55IFVSTCBpcyBub3QgcG9zc2libGUuXHJcbiAqXHJcbiAqIEBwYXJhbSBiYXNlIC0gb3B0aW9uYWwgYmFzZSB0byBwcm92aWRlLiBEZWZhdWx0cyB0byBgbG9jYXRpb24ucGF0aG5hbWUgKyBsb2NhdGlvbi5zZWFyY2hgIElmIHRoZXJlIGlzIGEgYDxiYXNlPmAgdGFnXHJcbiAqIGluIHRoZSBgaGVhZGAsIGl0cyB2YWx1ZSB3aWxsIGJlIGlnbm9yZWQgaW4gZmF2b3Igb2YgdGhpcyBwYXJhbWV0ZXIgKipidXQgbm90ZSBpdCBhZmZlY3RzIGFsbCB0aGUgaGlzdG9yeS5wdXNoU3RhdGUoKVxyXG4gKiBjYWxscyoqLCBtZWFuaW5nIHRoYXQgaWYgeW91IHVzZSBhIGA8YmFzZT5gIHRhZywgaXQncyBgaHJlZmAgdmFsdWUgKipoYXMgdG8gbWF0Y2ggdGhpcyBwYXJhbWV0ZXIqKiAoaWdub3JpbmcgYW55dGhpbmdcclxuICogYWZ0ZXIgdGhlIGAjYCkuXHJcbiAqXHJcbiAqIEBleGFtcGxlXHJcbiAqIGBgYGpzXHJcbiAqIC8vIGF0IGh0dHBzOi8vZXhhbXBsZS5jb20vZm9sZGVyXHJcbiAqIGNyZWF0ZVdlYkhhc2hIaXN0b3J5KCkgLy8gZ2l2ZXMgYSB1cmwgb2YgYGh0dHBzOi8vZXhhbXBsZS5jb20vZm9sZGVyI2BcclxuICogY3JlYXRlV2ViSGFzaEhpc3RvcnkoJy9mb2xkZXIvJykgLy8gZ2l2ZXMgYSB1cmwgb2YgYGh0dHBzOi8vZXhhbXBsZS5jb20vZm9sZGVyLyNgXHJcbiAqIC8vIGlmIHRoZSBgI2AgaXMgcHJvdmlkZWQgaW4gdGhlIGJhc2UsIGl0IHdvbid0IGJlIGFkZGVkIGJ5IGBjcmVhdGVXZWJIYXNoSGlzdG9yeWBcclxuICogY3JlYXRlV2ViSGFzaEhpc3RvcnkoJy9mb2xkZXIvIy9hcHAvJykgLy8gZ2l2ZXMgYSB1cmwgb2YgYGh0dHBzOi8vZXhhbXBsZS5jb20vZm9sZGVyLyMvYXBwL2BcclxuICogLy8geW91IHNob3VsZCBhdm9pZCBkb2luZyB0aGlzIGJlY2F1c2UgaXQgY2hhbmdlcyB0aGUgb3JpZ2luYWwgdXJsIGFuZCBicmVha3MgY29weWluZyB1cmxzXHJcbiAqIGNyZWF0ZVdlYkhhc2hIaXN0b3J5KCcvb3RoZXItZm9sZGVyLycpIC8vIGdpdmVzIGEgdXJsIG9mIGBodHRwczovL2V4YW1wbGUuY29tL290aGVyLWZvbGRlci8jYFxyXG4gKlxyXG4gKiAvLyBhdCBmaWxlOi8vL3Vzci9ldGMvZm9sZGVyL2luZGV4Lmh0bWxcclxuICogLy8gZm9yIGxvY2F0aW9ucyB3aXRoIG5vIGBob3N0YCwgdGhlIGJhc2UgaXMgaWdub3JlZFxyXG4gKiBjcmVhdGVXZWJIYXNoSGlzdG9yeSgnL2lBbUlnbm9yZWQnKSAvLyBnaXZlcyBhIHVybCBvZiBgZmlsZTovLy91c3IvZXRjL2ZvbGRlci9pbmRleC5odG1sI2BcclxuICogYGBgXHJcbiAqL1xyXG5mdW5jdGlvbiBjcmVhdGVXZWJIYXNoSGlzdG9yeShiYXNlKSB7XHJcbiAgICAvLyBNYWtlIHN1cmUgdGhpcyBpbXBsZW1lbnRhdGlvbiBpcyBmaW5lIGluIHRlcm1zIG9mIGVuY29kaW5nLCBzcGVjaWFsbHkgZm9yIElFMTFcclxuICAgIC8vIGZvciBgZmlsZTovL2AsIGRpcmVjdGx5IHVzZSB0aGUgcGF0aG5hbWUgYW5kIGlnbm9yZSB0aGUgYmFzZVxyXG4gICAgLy8gbG9jYXRpb24ucGF0aG5hbWUgY29udGFpbnMgYW4gaW5pdGlhbCBgL2AgZXZlbiBhdCB0aGUgcm9vdDogYGh0dHBzOi8vZXhhbXBsZS5jb21gXHJcbiAgICBiYXNlID0gbG9jYXRpb24uaG9zdCA/IGJhc2UgfHwgbG9jYXRpb24ucGF0aG5hbWUgKyBsb2NhdGlvbi5zZWFyY2ggOiAnJztcclxuICAgIC8vIGFsbG93IHRoZSB1c2VyIHRvIHByb3ZpZGUgYSBgI2AgaW4gdGhlIG1pZGRsZTogYC9iYXNlLyMvYXBwYFxyXG4gICAgaWYgKCFiYXNlLmluY2x1ZGVzKCcjJykpXHJcbiAgICAgICAgYmFzZSArPSAnIyc7XHJcbiAgICBpZiAoKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicpICYmICFiYXNlLmVuZHNXaXRoKCcjLycpICYmICFiYXNlLmVuZHNXaXRoKCcjJykpIHtcclxuICAgICAgICB3YXJuKGBBIGhhc2ggYmFzZSBtdXN0IGVuZCB3aXRoIGEgXCIjXCI6XFxuXCIke2Jhc2V9XCIgc2hvdWxkIGJlIFwiJHtiYXNlLnJlcGxhY2UoLyMuKiQvLCAnIycpfVwiLmApO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGNyZWF0ZVdlYkhpc3RvcnkoYmFzZSk7XHJcbn1cblxuZnVuY3Rpb24gaXNSb3V0ZUxvY2F0aW9uKHJvdXRlKSB7XHJcbiAgICByZXR1cm4gdHlwZW9mIHJvdXRlID09PSAnc3RyaW5nJyB8fCAocm91dGUgJiYgdHlwZW9mIHJvdXRlID09PSAnb2JqZWN0Jyk7XHJcbn1cclxuZnVuY3Rpb24gaXNSb3V0ZU5hbWUobmFtZSkge1xyXG4gICAgcmV0dXJuIHR5cGVvZiBuYW1lID09PSAnc3RyaW5nJyB8fCB0eXBlb2YgbmFtZSA9PT0gJ3N5bWJvbCc7XHJcbn1cblxuLyoqXHJcbiAqIEluaXRpYWwgcm91dGUgbG9jYXRpb24gd2hlcmUgdGhlIHJvdXRlciBpcy4gQ2FuIGJlIHVzZWQgaW4gbmF2aWdhdGlvbiBndWFyZHNcclxuICogdG8gZGlmZmVyZW50aWF0ZSB0aGUgaW5pdGlhbCBuYXZpZ2F0aW9uLlxyXG4gKlxyXG4gKiBAZXhhbXBsZVxyXG4gKiBgYGBqc1xyXG4gKiBpbXBvcnQgeyBTVEFSVF9MT0NBVElPTiB9IGZyb20gJ3Z1ZS1yb3V0ZXInXHJcbiAqXHJcbiAqIHJvdXRlci5iZWZvcmVFYWNoKCh0bywgZnJvbSkgPT4ge1xyXG4gKiAgIGlmIChmcm9tID09PSBTVEFSVF9MT0NBVElPTikge1xyXG4gKiAgICAgLy8gaW5pdGlhbCBuYXZpZ2F0aW9uXHJcbiAqICAgfVxyXG4gKiB9KVxyXG4gKiBgYGBcclxuICovXHJcbmNvbnN0IFNUQVJUX0xPQ0FUSU9OX05PUk1BTElaRUQgPSB7XHJcbiAgICBwYXRoOiAnLycsXHJcbiAgICBuYW1lOiB1bmRlZmluZWQsXHJcbiAgICBwYXJhbXM6IHt9LFxyXG4gICAgcXVlcnk6IHt9LFxyXG4gICAgaGFzaDogJycsXHJcbiAgICBmdWxsUGF0aDogJy8nLFxyXG4gICAgbWF0Y2hlZDogW10sXHJcbiAgICBtZXRhOiB7fSxcclxuICAgIHJlZGlyZWN0ZWRGcm9tOiB1bmRlZmluZWQsXHJcbn07XG5cbmNvbnN0IE5hdmlnYXRpb25GYWlsdXJlU3ltYm9sID0gU3ltYm9sKChwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nKSA/ICduYXZpZ2F0aW9uIGZhaWx1cmUnIDogJycpO1xyXG4vKipcclxuICogRW51bWVyYXRpb24gd2l0aCBhbGwgcG9zc2libGUgdHlwZXMgZm9yIG5hdmlnYXRpb24gZmFpbHVyZXMuIENhbiBiZSBwYXNzZWQgdG9cclxuICoge0BsaW5rIGlzTmF2aWdhdGlvbkZhaWx1cmV9IHRvIGNoZWNrIGZvciBzcGVjaWZpYyBmYWlsdXJlcy5cclxuICovXHJcbnZhciBOYXZpZ2F0aW9uRmFpbHVyZVR5cGU7XHJcbihmdW5jdGlvbiAoTmF2aWdhdGlvbkZhaWx1cmVUeXBlKSB7XHJcbiAgICAvKipcclxuICAgICAqIEFuIGFib3J0ZWQgbmF2aWdhdGlvbiBpcyBhIG5hdmlnYXRpb24gdGhhdCBmYWlsZWQgYmVjYXVzZSBhIG5hdmlnYXRpb25cclxuICAgICAqIGd1YXJkIHJldHVybmVkIGBmYWxzZWAgb3IgY2FsbGVkIGBuZXh0KGZhbHNlKWBcclxuICAgICAqL1xyXG4gICAgTmF2aWdhdGlvbkZhaWx1cmVUeXBlW05hdmlnYXRpb25GYWlsdXJlVHlwZVtcImFib3J0ZWRcIl0gPSA0XSA9IFwiYWJvcnRlZFwiO1xyXG4gICAgLyoqXHJcbiAgICAgKiBBIGNhbmNlbGxlZCBuYXZpZ2F0aW9uIGlzIGEgbmF2aWdhdGlvbiB0aGF0IGZhaWxlZCBiZWNhdXNlIGEgbW9yZSByZWNlbnRcclxuICAgICAqIG5hdmlnYXRpb24gZmluaXNoZWQgc3RhcnRlZCAobm90IG5lY2Vzc2FyaWx5IGZpbmlzaGVkKS5cclxuICAgICAqL1xyXG4gICAgTmF2aWdhdGlvbkZhaWx1cmVUeXBlW05hdmlnYXRpb25GYWlsdXJlVHlwZVtcImNhbmNlbGxlZFwiXSA9IDhdID0gXCJjYW5jZWxsZWRcIjtcclxuICAgIC8qKlxyXG4gICAgICogQSBkdXBsaWNhdGVkIG5hdmlnYXRpb24gaXMgYSBuYXZpZ2F0aW9uIHRoYXQgZmFpbGVkIGJlY2F1c2UgaXQgd2FzXHJcbiAgICAgKiBpbml0aWF0ZWQgd2hpbGUgYWxyZWFkeSBiZWluZyBhdCB0aGUgZXhhY3Qgc2FtZSBsb2NhdGlvbi5cclxuICAgICAqL1xyXG4gICAgTmF2aWdhdGlvbkZhaWx1cmVUeXBlW05hdmlnYXRpb25GYWlsdXJlVHlwZVtcImR1cGxpY2F0ZWRcIl0gPSAxNl0gPSBcImR1cGxpY2F0ZWRcIjtcclxufSkoTmF2aWdhdGlvbkZhaWx1cmVUeXBlIHx8IChOYXZpZ2F0aW9uRmFpbHVyZVR5cGUgPSB7fSkpO1xyXG4vLyBERVYgb25seSBkZWJ1ZyBtZXNzYWdlc1xyXG5jb25zdCBFcnJvclR5cGVNZXNzYWdlcyA9IHtcclxuICAgIFsxIC8qIEVycm9yVHlwZXMuTUFUQ0hFUl9OT1RfRk9VTkQgKi9dKHsgbG9jYXRpb24sIGN1cnJlbnRMb2NhdGlvbiB9KSB7XHJcbiAgICAgICAgcmV0dXJuIGBObyBtYXRjaCBmb3JcXG4gJHtKU09OLnN0cmluZ2lmeShsb2NhdGlvbil9JHtjdXJyZW50TG9jYXRpb25cclxuICAgICAgICAgICAgPyAnXFxud2hpbGUgYmVpbmcgYXRcXG4nICsgSlNPTi5zdHJpbmdpZnkoY3VycmVudExvY2F0aW9uKVxyXG4gICAgICAgICAgICA6ICcnfWA7XHJcbiAgICB9LFxyXG4gICAgWzIgLyogRXJyb3JUeXBlcy5OQVZJR0FUSU9OX0dVQVJEX1JFRElSRUNUICovXSh7IGZyb20sIHRvLCB9KSB7XHJcbiAgICAgICAgcmV0dXJuIGBSZWRpcmVjdGVkIGZyb20gXCIke2Zyb20uZnVsbFBhdGh9XCIgdG8gXCIke3N0cmluZ2lmeVJvdXRlKHRvKX1cIiB2aWEgYSBuYXZpZ2F0aW9uIGd1YXJkLmA7XHJcbiAgICB9LFxyXG4gICAgWzQgLyogRXJyb3JUeXBlcy5OQVZJR0FUSU9OX0FCT1JURUQgKi9dKHsgZnJvbSwgdG8gfSkge1xyXG4gICAgICAgIHJldHVybiBgTmF2aWdhdGlvbiBhYm9ydGVkIGZyb20gXCIke2Zyb20uZnVsbFBhdGh9XCIgdG8gXCIke3RvLmZ1bGxQYXRofVwiIHZpYSBhIG5hdmlnYXRpb24gZ3VhcmQuYDtcclxuICAgIH0sXHJcbiAgICBbOCAvKiBFcnJvclR5cGVzLk5BVklHQVRJT05fQ0FOQ0VMTEVEICovXSh7IGZyb20sIHRvIH0pIHtcclxuICAgICAgICByZXR1cm4gYE5hdmlnYXRpb24gY2FuY2VsbGVkIGZyb20gXCIke2Zyb20uZnVsbFBhdGh9XCIgdG8gXCIke3RvLmZ1bGxQYXRofVwiIHdpdGggYSBuZXcgbmF2aWdhdGlvbi5gO1xyXG4gICAgfSxcclxuICAgIFsxNiAvKiBFcnJvclR5cGVzLk5BVklHQVRJT05fRFVQTElDQVRFRCAqL10oeyBmcm9tLCB0byB9KSB7XHJcbiAgICAgICAgcmV0dXJuIGBBdm9pZGVkIHJlZHVuZGFudCBuYXZpZ2F0aW9uIHRvIGN1cnJlbnQgbG9jYXRpb246IFwiJHtmcm9tLmZ1bGxQYXRofVwiLmA7XHJcbiAgICB9LFxyXG59O1xyXG5mdW5jdGlvbiBjcmVhdGVSb3V0ZXJFcnJvcih0eXBlLCBwYXJhbXMpIHtcclxuICAgIC8vIGtlZXAgZnVsbCBlcnJvciBtZXNzYWdlcyBpbiBjanMgdmVyc2lvbnNcclxuICAgIGlmICgocHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJykgfHwgIXRydWUpIHtcclxuICAgICAgICByZXR1cm4gYXNzaWduKG5ldyBFcnJvcihFcnJvclR5cGVNZXNzYWdlc1t0eXBlXShwYXJhbXMpKSwge1xyXG4gICAgICAgICAgICB0eXBlLFxyXG4gICAgICAgICAgICBbTmF2aWdhdGlvbkZhaWx1cmVTeW1ib2xdOiB0cnVlLFxyXG4gICAgICAgIH0sIHBhcmFtcyk7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgICByZXR1cm4gYXNzaWduKG5ldyBFcnJvcigpLCB7XHJcbiAgICAgICAgICAgIHR5cGUsXHJcbiAgICAgICAgICAgIFtOYXZpZ2F0aW9uRmFpbHVyZVN5bWJvbF06IHRydWUsXHJcbiAgICAgICAgfSwgcGFyYW1zKTtcclxuICAgIH1cclxufVxyXG5mdW5jdGlvbiBpc05hdmlnYXRpb25GYWlsdXJlKGVycm9yLCB0eXBlKSB7XHJcbiAgICByZXR1cm4gKGVycm9yIGluc3RhbmNlb2YgRXJyb3IgJiZcclxuICAgICAgICBOYXZpZ2F0aW9uRmFpbHVyZVN5bWJvbCBpbiBlcnJvciAmJlxyXG4gICAgICAgICh0eXBlID09IG51bGwgfHwgISEoZXJyb3IudHlwZSAmIHR5cGUpKSk7XHJcbn1cclxuY29uc3QgcHJvcGVydGllc1RvTG9nID0gWydwYXJhbXMnLCAncXVlcnknLCAnaGFzaCddO1xyXG5mdW5jdGlvbiBzdHJpbmdpZnlSb3V0ZSh0bykge1xyXG4gICAgaWYgKHR5cGVvZiB0byA9PT0gJ3N0cmluZycpXHJcbiAgICAgICAgcmV0dXJuIHRvO1xyXG4gICAgaWYgKCdwYXRoJyBpbiB0bylcclxuICAgICAgICByZXR1cm4gdG8ucGF0aDtcclxuICAgIGNvbnN0IGxvY2F0aW9uID0ge307XHJcbiAgICBmb3IgKGNvbnN0IGtleSBvZiBwcm9wZXJ0aWVzVG9Mb2cpIHtcclxuICAgICAgICBpZiAoa2V5IGluIHRvKVxyXG4gICAgICAgICAgICBsb2NhdGlvbltrZXldID0gdG9ba2V5XTtcclxuICAgIH1cclxuICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShsb2NhdGlvbiwgbnVsbCwgMik7XHJcbn1cblxuLy8gZGVmYXVsdCBwYXR0ZXJuIGZvciBhIHBhcmFtOiBub24tZ3JlZWR5IGV2ZXJ5dGhpbmcgYnV0IC9cclxuY29uc3QgQkFTRV9QQVJBTV9QQVRURVJOID0gJ1teL10rPyc7XHJcbmNvbnN0IEJBU0VfUEFUSF9QQVJTRVJfT1BUSU9OUyA9IHtcclxuICAgIHNlbnNpdGl2ZTogZmFsc2UsXHJcbiAgICBzdHJpY3Q6IGZhbHNlLFxyXG4gICAgc3RhcnQ6IHRydWUsXHJcbiAgICBlbmQ6IHRydWUsXHJcbn07XHJcbi8vIFNwZWNpYWwgUmVnZXggY2hhcmFjdGVycyB0aGF0IG11c3QgYmUgZXNjYXBlZCBpbiBzdGF0aWMgdG9rZW5zXHJcbmNvbnN0IFJFR0VYX0NIQVJTX1JFID0gL1suKyo/XiR7fSgpW1xcXS9cXFxcXS9nO1xyXG4vKipcclxuICogQ3JlYXRlcyBhIHBhdGggcGFyc2VyIGZyb20gYW4gYXJyYXkgb2YgU2VnbWVudHMgKGEgc2VnbWVudCBpcyBhbiBhcnJheSBvZiBUb2tlbnMpXHJcbiAqXHJcbiAqIEBwYXJhbSBzZWdtZW50cyAtIGFycmF5IG9mIHNlZ21lbnRzIHJldHVybmVkIGJ5IHRva2VuaXplUGF0aFxyXG4gKiBAcGFyYW0gZXh0cmFPcHRpb25zIC0gb3B0aW9uYWwgb3B0aW9ucyBmb3IgdGhlIHJlZ2V4cFxyXG4gKiBAcmV0dXJucyBhIFBhdGhQYXJzZXJcclxuICovXHJcbmZ1bmN0aW9uIHRva2Vuc1RvUGFyc2VyKHNlZ21lbnRzLCBleHRyYU9wdGlvbnMpIHtcclxuICAgIGNvbnN0IG9wdGlvbnMgPSBhc3NpZ24oe30sIEJBU0VfUEFUSF9QQVJTRVJfT1BUSU9OUywgZXh0cmFPcHRpb25zKTtcclxuICAgIC8vIHRoZSBhbW91bnQgb2Ygc2NvcmVzIGlzIHRoZSBzYW1lIGFzIHRoZSBsZW5ndGggb2Ygc2VnbWVudHMgZXhjZXB0IGZvciB0aGUgcm9vdCBzZWdtZW50IFwiL1wiXHJcbiAgICBjb25zdCBzY29yZSA9IFtdO1xyXG4gICAgLy8gdGhlIHJlZ2V4cCBhcyBhIHN0cmluZ1xyXG4gICAgbGV0IHBhdHRlcm4gPSBvcHRpb25zLnN0YXJ0ID8gJ14nIDogJyc7XHJcbiAgICAvLyBleHRyYWN0ZWQga2V5c1xyXG4gICAgY29uc3Qga2V5cyA9IFtdO1xyXG4gICAgZm9yIChjb25zdCBzZWdtZW50IG9mIHNlZ21lbnRzKSB7XHJcbiAgICAgICAgLy8gdGhlIHJvb3Qgc2VnbWVudCBuZWVkcyBzcGVjaWFsIHRyZWF0bWVudFxyXG4gICAgICAgIGNvbnN0IHNlZ21lbnRTY29yZXMgPSBzZWdtZW50Lmxlbmd0aCA/IFtdIDogWzkwIC8qIFBhdGhTY29yZS5Sb290ICovXTtcclxuICAgICAgICAvLyBhbGxvdyB0cmFpbGluZyBzbGFzaFxyXG4gICAgICAgIGlmIChvcHRpb25zLnN0cmljdCAmJiAhc2VnbWVudC5sZW5ndGgpXHJcbiAgICAgICAgICAgIHBhdHRlcm4gKz0gJy8nO1xyXG4gICAgICAgIGZvciAobGV0IHRva2VuSW5kZXggPSAwOyB0b2tlbkluZGV4IDwgc2VnbWVudC5sZW5ndGg7IHRva2VuSW5kZXgrKykge1xyXG4gICAgICAgICAgICBjb25zdCB0b2tlbiA9IHNlZ21lbnRbdG9rZW5JbmRleF07XHJcbiAgICAgICAgICAgIC8vIHJlc2V0cyB0aGUgc2NvcmUgaWYgd2UgYXJlIGluc2lkZSBhIHN1Yi1zZWdtZW50IC86YS1vdGhlci06YlxyXG4gICAgICAgICAgICBsZXQgc3ViU2VnbWVudFNjb3JlID0gNDAgLyogUGF0aFNjb3JlLlNlZ21lbnQgKi8gK1xyXG4gICAgICAgICAgICAgICAgKG9wdGlvbnMuc2Vuc2l0aXZlID8gMC4yNSAvKiBQYXRoU2NvcmUuQm9udXNDYXNlU2Vuc2l0aXZlICovIDogMCk7XHJcbiAgICAgICAgICAgIGlmICh0b2tlbi50eXBlID09PSAwIC8qIFRva2VuVHlwZS5TdGF0aWMgKi8pIHtcclxuICAgICAgICAgICAgICAgIC8vIHByZXBlbmQgdGhlIHNsYXNoIGlmIHdlIGFyZSBzdGFydGluZyBhIG5ldyBzZWdtZW50XHJcbiAgICAgICAgICAgICAgICBpZiAoIXRva2VuSW5kZXgpXHJcbiAgICAgICAgICAgICAgICAgICAgcGF0dGVybiArPSAnLyc7XHJcbiAgICAgICAgICAgICAgICBwYXR0ZXJuICs9IHRva2VuLnZhbHVlLnJlcGxhY2UoUkVHRVhfQ0hBUlNfUkUsICdcXFxcJCYnKTtcclxuICAgICAgICAgICAgICAgIHN1YlNlZ21lbnRTY29yZSArPSA0MCAvKiBQYXRoU2NvcmUuU3RhdGljICovO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKHRva2VuLnR5cGUgPT09IDEgLyogVG9rZW5UeXBlLlBhcmFtICovKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB7IHZhbHVlLCByZXBlYXRhYmxlLCBvcHRpb25hbCwgcmVnZXhwIH0gPSB0b2tlbjtcclxuICAgICAgICAgICAgICAgIGtleXMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogdmFsdWUsXHJcbiAgICAgICAgICAgICAgICAgICAgcmVwZWF0YWJsZSxcclxuICAgICAgICAgICAgICAgICAgICBvcHRpb25hbCxcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcmUgPSByZWdleHAgPyByZWdleHAgOiBCQVNFX1BBUkFNX1BBVFRFUk47XHJcbiAgICAgICAgICAgICAgICAvLyB0aGUgdXNlciBwcm92aWRlZCBhIGN1c3RvbSByZWdleHAgLzppZChcXFxcZCspXHJcbiAgICAgICAgICAgICAgICBpZiAocmUgIT09IEJBU0VfUEFSQU1fUEFUVEVSTikge1xyXG4gICAgICAgICAgICAgICAgICAgIHN1YlNlZ21lbnRTY29yZSArPSAxMCAvKiBQYXRoU2NvcmUuQm9udXNDdXN0b21SZWdFeHAgKi87XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gbWFrZSBzdXJlIHRoZSByZWdleHAgaXMgdmFsaWQgYmVmb3JlIHVzaW5nIGl0XHJcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3IFJlZ0V4cChgKCR7cmV9KWApO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBjYXRjaCAoZXJyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBjdXN0b20gUmVnRXhwIGZvciBwYXJhbSBcIiR7dmFsdWV9XCIgKCR7cmV9KTogYCArXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnIubWVzc2FnZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgLy8gd2hlbiB3ZSByZXBlYXQgd2UgbXVzdCB0YWtlIGNhcmUgb2YgdGhlIHJlcGVhdGluZyBsZWFkaW5nIHNsYXNoXHJcbiAgICAgICAgICAgICAgICBsZXQgc3ViUGF0dGVybiA9IHJlcGVhdGFibGUgPyBgKCg/OiR7cmV9KSg/Oi8oPzoke3JlfSkpKilgIDogYCgke3JlfSlgO1xyXG4gICAgICAgICAgICAgICAgLy8gcHJlcGVuZCB0aGUgc2xhc2ggaWYgd2UgYXJlIHN0YXJ0aW5nIGEgbmV3IHNlZ21lbnRcclxuICAgICAgICAgICAgICAgIGlmICghdG9rZW5JbmRleClcclxuICAgICAgICAgICAgICAgICAgICBzdWJQYXR0ZXJuID1cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gYXZvaWQgYW4gb3B0aW9uYWwgLyBpZiB0aGVyZSBhcmUgbW9yZSBzZWdtZW50cyBlLmcuIC86cD8tc3RhdGljXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIG9yIC86cD8tOnAyXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbmFsICYmIHNlZ21lbnQubGVuZ3RoIDwgMlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPyBgKD86LyR7c3ViUGF0dGVybn0pYFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgOiAnLycgKyBzdWJQYXR0ZXJuO1xyXG4gICAgICAgICAgICAgICAgaWYgKG9wdGlvbmFsKVxyXG4gICAgICAgICAgICAgICAgICAgIHN1YlBhdHRlcm4gKz0gJz8nO1xyXG4gICAgICAgICAgICAgICAgcGF0dGVybiArPSBzdWJQYXR0ZXJuO1xyXG4gICAgICAgICAgICAgICAgc3ViU2VnbWVudFNjb3JlICs9IDIwIC8qIFBhdGhTY29yZS5EeW5hbWljICovO1xyXG4gICAgICAgICAgICAgICAgaWYgKG9wdGlvbmFsKVxyXG4gICAgICAgICAgICAgICAgICAgIHN1YlNlZ21lbnRTY29yZSArPSAtOCAvKiBQYXRoU2NvcmUuQm9udXNPcHRpb25hbCAqLztcclxuICAgICAgICAgICAgICAgIGlmIChyZXBlYXRhYmxlKVxyXG4gICAgICAgICAgICAgICAgICAgIHN1YlNlZ21lbnRTY29yZSArPSAtMjAgLyogUGF0aFNjb3JlLkJvbnVzUmVwZWF0YWJsZSAqLztcclxuICAgICAgICAgICAgICAgIGlmIChyZSA9PT0gJy4qJylcclxuICAgICAgICAgICAgICAgICAgICBzdWJTZWdtZW50U2NvcmUgKz0gLTUwIC8qIFBhdGhTY29yZS5Cb251c1dpbGRjYXJkICovO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHNlZ21lbnRTY29yZXMucHVzaChzdWJTZWdtZW50U2NvcmUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBhbiBlbXB0eSBhcnJheSBsaWtlIC9ob21lLyAtPiBbW3tob21lfV0sIFtdXVxyXG4gICAgICAgIC8vIGlmICghc2VnbWVudC5sZW5ndGgpIHBhdHRlcm4gKz0gJy8nXHJcbiAgICAgICAgc2NvcmUucHVzaChzZWdtZW50U2NvcmVzKTtcclxuICAgIH1cclxuICAgIC8vIG9ubHkgYXBwbHkgdGhlIHN0cmljdCBib251cyB0byB0aGUgbGFzdCBzY29yZVxyXG4gICAgaWYgKG9wdGlvbnMuc3RyaWN0ICYmIG9wdGlvbnMuZW5kKSB7XHJcbiAgICAgICAgY29uc3QgaSA9IHNjb3JlLmxlbmd0aCAtIDE7XHJcbiAgICAgICAgc2NvcmVbaV1bc2NvcmVbaV0ubGVuZ3RoIC0gMV0gKz0gMC43MDAwMDAwMDAwMDAwMDAxIC8qIFBhdGhTY29yZS5Cb251c1N0cmljdCAqLztcclxuICAgIH1cclxuICAgIC8vIFRPRE86IGRldiBvbmx5IHdhcm4gZG91YmxlIHRyYWlsaW5nIHNsYXNoXHJcbiAgICBpZiAoIW9wdGlvbnMuc3RyaWN0KVxyXG4gICAgICAgIHBhdHRlcm4gKz0gJy8/JztcclxuICAgIGlmIChvcHRpb25zLmVuZClcclxuICAgICAgICBwYXR0ZXJuICs9ICckJztcclxuICAgIC8vIGFsbG93IHBhdGhzIGxpa2UgL2R5bmFtaWMgdG8gb25seSBtYXRjaCBkeW5hbWljIG9yIGR5bmFtaWMvLi4uIGJ1dCBub3QgZHluYW1pY19zb21ldGhpbmdfZWxzZVxyXG4gICAgZWxzZSBpZiAob3B0aW9ucy5zdHJpY3QpXHJcbiAgICAgICAgcGF0dGVybiArPSAnKD86L3wkKSc7XHJcbiAgICBjb25zdCByZSA9IG5ldyBSZWdFeHAocGF0dGVybiwgb3B0aW9ucy5zZW5zaXRpdmUgPyAnJyA6ICdpJyk7XHJcbiAgICBmdW5jdGlvbiBwYXJzZShwYXRoKSB7XHJcbiAgICAgICAgY29uc3QgbWF0Y2ggPSBwYXRoLm1hdGNoKHJlKTtcclxuICAgICAgICBjb25zdCBwYXJhbXMgPSB7fTtcclxuICAgICAgICBpZiAoIW1hdGNoKVxyXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICBmb3IgKGxldCBpID0gMTsgaSA8IG1hdGNoLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gbWF0Y2hbaV0gfHwgJyc7XHJcbiAgICAgICAgICAgIGNvbnN0IGtleSA9IGtleXNbaSAtIDFdO1xyXG4gICAgICAgICAgICBwYXJhbXNba2V5Lm5hbWVdID0gdmFsdWUgJiYga2V5LnJlcGVhdGFibGUgPyB2YWx1ZS5zcGxpdCgnLycpIDogdmFsdWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBwYXJhbXM7XHJcbiAgICB9XHJcbiAgICBmdW5jdGlvbiBzdHJpbmdpZnkocGFyYW1zKSB7XHJcbiAgICAgICAgbGV0IHBhdGggPSAnJztcclxuICAgICAgICAvLyBmb3Igb3B0aW9uYWwgcGFyYW1ldGVycyB0byBhbGxvdyB0byBiZSBlbXB0eVxyXG4gICAgICAgIGxldCBhdm9pZER1cGxpY2F0ZWRTbGFzaCA9IGZhbHNlO1xyXG4gICAgICAgIGZvciAoY29uc3Qgc2VnbWVudCBvZiBzZWdtZW50cykge1xyXG4gICAgICAgICAgICBpZiAoIWF2b2lkRHVwbGljYXRlZFNsYXNoIHx8ICFwYXRoLmVuZHNXaXRoKCcvJykpXHJcbiAgICAgICAgICAgICAgICBwYXRoICs9ICcvJztcclxuICAgICAgICAgICAgYXZvaWREdXBsaWNhdGVkU2xhc2ggPSBmYWxzZTtcclxuICAgICAgICAgICAgZm9yIChjb25zdCB0b2tlbiBvZiBzZWdtZW50KSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodG9rZW4udHlwZSA9PT0gMCAvKiBUb2tlblR5cGUuU3RhdGljICovKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcGF0aCArPSB0b2tlbi52YWx1ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKHRva2VuLnR5cGUgPT09IDEgLyogVG9rZW5UeXBlLlBhcmFtICovKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeyB2YWx1ZSwgcmVwZWF0YWJsZSwgb3B0aW9uYWwgfSA9IHRva2VuO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBhcmFtID0gdmFsdWUgaW4gcGFyYW1zID8gcGFyYW1zW3ZhbHVlXSA6ICcnO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpc0FycmF5KHBhcmFtKSAmJiAhcmVwZWF0YWJsZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFByb3ZpZGVkIHBhcmFtIFwiJHt2YWx1ZX1cIiBpcyBhbiBhcnJheSBidXQgaXQgaXMgbm90IHJlcGVhdGFibGUgKCogb3IgKyBtb2RpZmllcnMpYCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRleHQgPSBpc0FycmF5KHBhcmFtKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICA/IHBhcmFtLmpvaW4oJy8nKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICA6IHBhcmFtO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghdGV4dCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAob3B0aW9uYWwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGlmIHdlIGhhdmUgbW9yZSB0aGFuIG9uZSBvcHRpb25hbCBwYXJhbSBsaWtlIC86YT8tc3RhdGljIHdlIGRvbid0IG5lZWQgdG8gY2FyZSBhYm91dCB0aGUgb3B0aW9uYWwgcGFyYW1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzZWdtZW50Lmxlbmd0aCA8IDIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyByZW1vdmUgdGhlIGxhc3Qgc2xhc2ggYXMgd2UgY291bGQgYmUgYXQgdGhlIGVuZFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwYXRoLmVuZHNXaXRoKCcvJykpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhdGggPSBwYXRoLnNsaWNlKDAsIC0xKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBkbyBub3QgYXBwZW5kIGEgc2xhc2ggb24gdGhlIG5leHQgaXRlcmF0aW9uXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdm9pZER1cGxpY2F0ZWRTbGFzaCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIHBhcmFtIFwiJHt2YWx1ZX1cImApO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBwYXRoICs9IHRleHQ7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gYXZvaWQgZW1wdHkgcGF0aCB3aGVuIHdlIGhhdmUgbXVsdGlwbGUgb3B0aW9uYWwgcGFyYW1zXHJcbiAgICAgICAgcmV0dXJuIHBhdGggfHwgJy8nO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICByZSxcclxuICAgICAgICBzY29yZSxcclxuICAgICAgICBrZXlzLFxyXG4gICAgICAgIHBhcnNlLFxyXG4gICAgICAgIHN0cmluZ2lmeSxcclxuICAgIH07XHJcbn1cclxuLyoqXHJcbiAqIENvbXBhcmVzIGFuIGFycmF5IG9mIG51bWJlcnMgYXMgdXNlZCBpbiBQYXRoUGFyc2VyLnNjb3JlIGFuZCByZXR1cm5zIGFcclxuICogbnVtYmVyLiBUaGlzIGZ1bmN0aW9uIGNhbiBiZSB1c2VkIHRvIGBzb3J0YCBhbiBhcnJheVxyXG4gKlxyXG4gKiBAcGFyYW0gYSAtIGZpcnN0IGFycmF5IG9mIG51bWJlcnNcclxuICogQHBhcmFtIGIgLSBzZWNvbmQgYXJyYXkgb2YgbnVtYmVyc1xyXG4gKiBAcmV0dXJucyAwIGlmIGJvdGggYXJlIGVxdWFsLCA8IDAgaWYgYSBzaG91bGQgYmUgc29ydGVkIGZpcnN0LCA+IDAgaWYgYlxyXG4gKiBzaG91bGQgYmUgc29ydGVkIGZpcnN0XHJcbiAqL1xyXG5mdW5jdGlvbiBjb21wYXJlU2NvcmVBcnJheShhLCBiKSB7XHJcbiAgICBsZXQgaSA9IDA7XHJcbiAgICB3aGlsZSAoaSA8IGEubGVuZ3RoICYmIGkgPCBiLmxlbmd0aCkge1xyXG4gICAgICAgIGNvbnN0IGRpZmYgPSBiW2ldIC0gYVtpXTtcclxuICAgICAgICAvLyBvbmx5IGtlZXAgZ29pbmcgaWYgZGlmZiA9PT0gMFxyXG4gICAgICAgIGlmIChkaWZmKVxyXG4gICAgICAgICAgICByZXR1cm4gZGlmZjtcclxuICAgICAgICBpKys7XHJcbiAgICB9XHJcbiAgICAvLyBpZiB0aGUgbGFzdCBzdWJzZWdtZW50IHdhcyBTdGF0aWMsIHRoZSBzaG9ydGVyIHNlZ21lbnRzIHNob3VsZCBiZSBzb3J0ZWQgZmlyc3RcclxuICAgIC8vIG90aGVyd2lzZSBzb3J0IHRoZSBsb25nZXN0IHNlZ21lbnQgZmlyc3RcclxuICAgIGlmIChhLmxlbmd0aCA8IGIubGVuZ3RoKSB7XHJcbiAgICAgICAgcmV0dXJuIGEubGVuZ3RoID09PSAxICYmIGFbMF0gPT09IDQwIC8qIFBhdGhTY29yZS5TdGF0aWMgKi8gKyA0MCAvKiBQYXRoU2NvcmUuU2VnbWVudCAqL1xyXG4gICAgICAgICAgICA/IC0xXHJcbiAgICAgICAgICAgIDogMTtcclxuICAgIH1cclxuICAgIGVsc2UgaWYgKGEubGVuZ3RoID4gYi5sZW5ndGgpIHtcclxuICAgICAgICByZXR1cm4gYi5sZW5ndGggPT09IDEgJiYgYlswXSA9PT0gNDAgLyogUGF0aFNjb3JlLlN0YXRpYyAqLyArIDQwIC8qIFBhdGhTY29yZS5TZWdtZW50ICovXHJcbiAgICAgICAgICAgID8gMVxyXG4gICAgICAgICAgICA6IC0xO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIDA7XHJcbn1cclxuLyoqXHJcbiAqIENvbXBhcmUgZnVuY3Rpb24gdGhhdCBjYW4gYmUgdXNlZCB3aXRoIGBzb3J0YCB0byBzb3J0IGFuIGFycmF5IG9mIFBhdGhQYXJzZXJcclxuICpcclxuICogQHBhcmFtIGEgLSBmaXJzdCBQYXRoUGFyc2VyXHJcbiAqIEBwYXJhbSBiIC0gc2Vjb25kIFBhdGhQYXJzZXJcclxuICogQHJldHVybnMgMCBpZiBib3RoIGFyZSBlcXVhbCwgPCAwIGlmIGEgc2hvdWxkIGJlIHNvcnRlZCBmaXJzdCwgPiAwIGlmIGJcclxuICovXHJcbmZ1bmN0aW9uIGNvbXBhcmVQYXRoUGFyc2VyU2NvcmUoYSwgYikge1xyXG4gICAgbGV0IGkgPSAwO1xyXG4gICAgY29uc3QgYVNjb3JlID0gYS5zY29yZTtcclxuICAgIGNvbnN0IGJTY29yZSA9IGIuc2NvcmU7XHJcbiAgICB3aGlsZSAoaSA8IGFTY29yZS5sZW5ndGggJiYgaSA8IGJTY29yZS5sZW5ndGgpIHtcclxuICAgICAgICBjb25zdCBjb21wID0gY29tcGFyZVNjb3JlQXJyYXkoYVNjb3JlW2ldLCBiU2NvcmVbaV0pO1xyXG4gICAgICAgIC8vIGRvIG5vdCByZXR1cm4gaWYgYm90aCBhcmUgZXF1YWxcclxuICAgICAgICBpZiAoY29tcClcclxuICAgICAgICAgICAgcmV0dXJuIGNvbXA7XHJcbiAgICAgICAgaSsrO1xyXG4gICAgfVxyXG4gICAgaWYgKE1hdGguYWJzKGJTY29yZS5sZW5ndGggLSBhU2NvcmUubGVuZ3RoKSA9PT0gMSkge1xyXG4gICAgICAgIGlmIChpc0xhc3RTY29yZU5lZ2F0aXZlKGFTY29yZSkpXHJcbiAgICAgICAgICAgIHJldHVybiAxO1xyXG4gICAgICAgIGlmIChpc0xhc3RTY29yZU5lZ2F0aXZlKGJTY29yZSkpXHJcbiAgICAgICAgICAgIHJldHVybiAtMTtcclxuICAgIH1cclxuICAgIC8vIGlmIGEgYW5kIGIgc2hhcmUgdGhlIHNhbWUgc2NvcmUgZW50cmllcyBidXQgYiBoYXMgbW9yZSwgc29ydCBiIGZpcnN0XHJcbiAgICByZXR1cm4gYlNjb3JlLmxlbmd0aCAtIGFTY29yZS5sZW5ndGg7XHJcbiAgICAvLyB0aGlzIGlzIHRoZSB0ZXJuYXJ5IHZlcnNpb25cclxuICAgIC8vIHJldHVybiBhU2NvcmUubGVuZ3RoIDwgYlNjb3JlLmxlbmd0aFxyXG4gICAgLy8gICA/IDFcclxuICAgIC8vICAgOiBhU2NvcmUubGVuZ3RoID4gYlNjb3JlLmxlbmd0aFxyXG4gICAgLy8gICA/IC0xXHJcbiAgICAvLyAgIDogMFxyXG59XHJcbi8qKlxyXG4gKiBUaGlzIGFsbG93cyBkZXRlY3Rpbmcgc3BsYXRzIGF0IHRoZSBlbmQgb2YgYSBwYXRoOiAvaG9tZS86aWQoLiopKlxyXG4gKlxyXG4gKiBAcGFyYW0gc2NvcmUgLSBzY29yZSB0byBjaGVja1xyXG4gKiBAcmV0dXJucyB0cnVlIGlmIHRoZSBsYXN0IGVudHJ5IGlzIG5lZ2F0aXZlXHJcbiAqL1xyXG5mdW5jdGlvbiBpc0xhc3RTY29yZU5lZ2F0aXZlKHNjb3JlKSB7XHJcbiAgICBjb25zdCBsYXN0ID0gc2NvcmVbc2NvcmUubGVuZ3RoIC0gMV07XHJcbiAgICByZXR1cm4gc2NvcmUubGVuZ3RoID4gMCAmJiBsYXN0W2xhc3QubGVuZ3RoIC0gMV0gPCAwO1xyXG59XG5cbmNvbnN0IFJPT1RfVE9LRU4gPSB7XHJcbiAgICB0eXBlOiAwIC8qIFRva2VuVHlwZS5TdGF0aWMgKi8sXHJcbiAgICB2YWx1ZTogJycsXHJcbn07XHJcbmNvbnN0IFZBTElEX1BBUkFNX1JFID0gL1thLXpBLVowLTlfXS87XHJcbi8vIEFmdGVyIHNvbWUgcHJvZmlsaW5nLCB0aGUgY2FjaGUgc2VlbXMgdG8gYmUgdW5uZWNlc3NhcnkgYmVjYXVzZSB0b2tlbml6ZVBhdGhcclxuLy8gKHRoZSBzbG93ZXN0IHBhcnQgb2YgYWRkaW5nIGEgcm91dGUpIGlzIHZlcnkgZmFzdFxyXG4vLyBjb25zdCB0b2tlbkNhY2hlID0gbmV3IE1hcDxzdHJpbmcsIFRva2VuW11bXT4oKVxyXG5mdW5jdGlvbiB0b2tlbml6ZVBhdGgocGF0aCkge1xyXG4gICAgaWYgKCFwYXRoKVxyXG4gICAgICAgIHJldHVybiBbW11dO1xyXG4gICAgaWYgKHBhdGggPT09ICcvJylcclxuICAgICAgICByZXR1cm4gW1tST09UX1RPS0VOXV07XHJcbiAgICBpZiAoIXBhdGguc3RhcnRzV2l0aCgnLycpKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKChwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nKVxyXG4gICAgICAgICAgICA/IGBSb3V0ZSBwYXRocyBzaG91bGQgc3RhcnQgd2l0aCBhIFwiL1wiOiBcIiR7cGF0aH1cIiBzaG91bGQgYmUgXCIvJHtwYXRofVwiLmBcclxuICAgICAgICAgICAgOiBgSW52YWxpZCBwYXRoIFwiJHtwYXRofVwiYCk7XHJcbiAgICB9XHJcbiAgICAvLyBpZiAodG9rZW5DYWNoZS5oYXMocGF0aCkpIHJldHVybiB0b2tlbkNhY2hlLmdldChwYXRoKSFcclxuICAgIGZ1bmN0aW9uIGNyYXNoKG1lc3NhZ2UpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEVSUiAoJHtzdGF0ZX0pL1wiJHtidWZmZXJ9XCI6ICR7bWVzc2FnZX1gKTtcclxuICAgIH1cclxuICAgIGxldCBzdGF0ZSA9IDAgLyogVG9rZW5pemVyU3RhdGUuU3RhdGljICovO1xyXG4gICAgbGV0IHByZXZpb3VzU3RhdGUgPSBzdGF0ZTtcclxuICAgIGNvbnN0IHRva2VucyA9IFtdO1xyXG4gICAgLy8gdGhlIHNlZ21lbnQgd2lsbCBhbHdheXMgYmUgdmFsaWQgYmVjYXVzZSB3ZSBnZXQgaW50byB0aGUgaW5pdGlhbCBzdGF0ZVxyXG4gICAgLy8gd2l0aCB0aGUgbGVhZGluZyAvXHJcbiAgICBsZXQgc2VnbWVudDtcclxuICAgIGZ1bmN0aW9uIGZpbmFsaXplU2VnbWVudCgpIHtcclxuICAgICAgICBpZiAoc2VnbWVudClcclxuICAgICAgICAgICAgdG9rZW5zLnB1c2goc2VnbWVudCk7XHJcbiAgICAgICAgc2VnbWVudCA9IFtdO1xyXG4gICAgfVxyXG4gICAgLy8gaW5kZXggb24gdGhlIHBhdGhcclxuICAgIGxldCBpID0gMDtcclxuICAgIC8vIGNoYXIgYXQgaW5kZXhcclxuICAgIGxldCBjaGFyO1xyXG4gICAgLy8gYnVmZmVyIG9mIHRoZSB2YWx1ZSByZWFkXHJcbiAgICBsZXQgYnVmZmVyID0gJyc7XHJcbiAgICAvLyBjdXN0b20gcmVnZXhwIGZvciBhIHBhcmFtXHJcbiAgICBsZXQgY3VzdG9tUmUgPSAnJztcclxuICAgIGZ1bmN0aW9uIGNvbnN1bWVCdWZmZXIoKSB7XHJcbiAgICAgICAgaWYgKCFidWZmZXIpXHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICBpZiAoc3RhdGUgPT09IDAgLyogVG9rZW5pemVyU3RhdGUuU3RhdGljICovKSB7XHJcbiAgICAgICAgICAgIHNlZ21lbnQucHVzaCh7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiAwIC8qIFRva2VuVHlwZS5TdGF0aWMgKi8sXHJcbiAgICAgICAgICAgICAgICB2YWx1ZTogYnVmZmVyLFxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAoc3RhdGUgPT09IDEgLyogVG9rZW5pemVyU3RhdGUuUGFyYW0gKi8gfHxcclxuICAgICAgICAgICAgc3RhdGUgPT09IDIgLyogVG9rZW5pemVyU3RhdGUuUGFyYW1SZWdFeHAgKi8gfHxcclxuICAgICAgICAgICAgc3RhdGUgPT09IDMgLyogVG9rZW5pemVyU3RhdGUuUGFyYW1SZWdFeHBFbmQgKi8pIHtcclxuICAgICAgICAgICAgaWYgKHNlZ21lbnQubGVuZ3RoID4gMSAmJiAoY2hhciA9PT0gJyonIHx8IGNoYXIgPT09ICcrJykpXHJcbiAgICAgICAgICAgICAgICBjcmFzaChgQSByZXBlYXRhYmxlIHBhcmFtICgke2J1ZmZlcn0pIG11c3QgYmUgYWxvbmUgaW4gaXRzIHNlZ21lbnQuIGVnOiAnLzppZHMrLmApO1xyXG4gICAgICAgICAgICBzZWdtZW50LnB1c2goe1xyXG4gICAgICAgICAgICAgICAgdHlwZTogMSAvKiBUb2tlblR5cGUuUGFyYW0gKi8sXHJcbiAgICAgICAgICAgICAgICB2YWx1ZTogYnVmZmVyLFxyXG4gICAgICAgICAgICAgICAgcmVnZXhwOiBjdXN0b21SZSxcclxuICAgICAgICAgICAgICAgIHJlcGVhdGFibGU6IGNoYXIgPT09ICcqJyB8fCBjaGFyID09PSAnKycsXHJcbiAgICAgICAgICAgICAgICBvcHRpb25hbDogY2hhciA9PT0gJyonIHx8IGNoYXIgPT09ICc/JyxcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBjcmFzaCgnSW52YWxpZCBzdGF0ZSB0byBjb25zdW1lIGJ1ZmZlcicpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBidWZmZXIgPSAnJztcclxuICAgIH1cclxuICAgIGZ1bmN0aW9uIGFkZENoYXJUb0J1ZmZlcigpIHtcclxuICAgICAgICBidWZmZXIgKz0gY2hhcjtcclxuICAgIH1cclxuICAgIHdoaWxlIChpIDwgcGF0aC5sZW5ndGgpIHtcclxuICAgICAgICBjaGFyID0gcGF0aFtpKytdO1xyXG4gICAgICAgIGlmIChjaGFyID09PSAnXFxcXCcgJiYgc3RhdGUgIT09IDIgLyogVG9rZW5pemVyU3RhdGUuUGFyYW1SZWdFeHAgKi8pIHtcclxuICAgICAgICAgICAgcHJldmlvdXNTdGF0ZSA9IHN0YXRlO1xyXG4gICAgICAgICAgICBzdGF0ZSA9IDQgLyogVG9rZW5pemVyU3RhdGUuRXNjYXBlTmV4dCAqLztcclxuICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHN3aXRjaCAoc3RhdGUpIHtcclxuICAgICAgICAgICAgY2FzZSAwIC8qIFRva2VuaXplclN0YXRlLlN0YXRpYyAqLzpcclxuICAgICAgICAgICAgICAgIGlmIChjaGFyID09PSAnLycpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoYnVmZmVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN1bWVCdWZmZXIoKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgZmluYWxpemVTZWdtZW50KCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIGlmIChjaGFyID09PSAnOicpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdW1lQnVmZmVyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgc3RhdGUgPSAxIC8qIFRva2VuaXplclN0YXRlLlBhcmFtICovO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYWRkQ2hhclRvQnVmZmVyKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSA0IC8qIFRva2VuaXplclN0YXRlLkVzY2FwZU5leHQgKi86XHJcbiAgICAgICAgICAgICAgICBhZGRDaGFyVG9CdWZmZXIoKTtcclxuICAgICAgICAgICAgICAgIHN0YXRlID0gcHJldmlvdXNTdGF0ZTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIDEgLyogVG9rZW5pemVyU3RhdGUuUGFyYW0gKi86XHJcbiAgICAgICAgICAgICAgICBpZiAoY2hhciA9PT0gJygnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc3RhdGUgPSAyIC8qIFRva2VuaXplclN0YXRlLlBhcmFtUmVnRXhwICovO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSBpZiAoVkFMSURfUEFSQU1fUkUudGVzdChjaGFyKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGFkZENoYXJUb0J1ZmZlcigpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3VtZUJ1ZmZlcigpO1xyXG4gICAgICAgICAgICAgICAgICAgIHN0YXRlID0gMCAvKiBUb2tlbml6ZXJTdGF0ZS5TdGF0aWMgKi87XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gZ28gYmFjayBvbmUgY2hhcmFjdGVyIGlmIHdlIHdlcmUgbm90IG1vZGlmeWluZ1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChjaGFyICE9PSAnKicgJiYgY2hhciAhPT0gJz8nICYmIGNoYXIgIT09ICcrJylcclxuICAgICAgICAgICAgICAgICAgICAgICAgaS0tO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgMiAvKiBUb2tlbml6ZXJTdGF0ZS5QYXJhbVJlZ0V4cCAqLzpcclxuICAgICAgICAgICAgICAgIC8vIFRPRE86IGlzIGl0IHdvcnRoIGhhbmRsaW5nIG5lc3RlZCByZWdleHA/IGxpa2UgOnAoPzpwcmVmaXhfKFteL10rKV9zdWZmaXgpXHJcbiAgICAgICAgICAgICAgICAvLyBpdCBhbHJlYWR5IHdvcmtzIGJ5IGVzY2FwaW5nIHRoZSBjbG9zaW5nIClcclxuICAgICAgICAgICAgICAgIC8vIGh0dHBzOi8vcGF0aHMuZXNtLmRldi8/cD1BQU1lSmJpQXdRRWNES2JBb0FBa1A2MFBHMlI2UUF2Z05hQTZBRkFDTTJBQnVRQkIjXHJcbiAgICAgICAgICAgICAgICAvLyBpcyB0aGlzIHJlYWxseSBzb21ldGhpbmcgcGVvcGxlIG5lZWQgc2luY2UgeW91IGNhbiBhbHNvIHdyaXRlXHJcbiAgICAgICAgICAgICAgICAvLyAvcHJlZml4XzpwKClfc3VmZml4XHJcbiAgICAgICAgICAgICAgICBpZiAoY2hhciA9PT0gJyknKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gaGFuZGxlIHRoZSBlc2NhcGVkIClcclxuICAgICAgICAgICAgICAgICAgICBpZiAoY3VzdG9tUmVbY3VzdG9tUmUubGVuZ3RoIC0gMV0gPT0gJ1xcXFwnKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21SZSA9IGN1c3RvbVJlLnNsaWNlKDAsIC0xKSArIGNoYXI7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZSA9IDMgLyogVG9rZW5pemVyU3RhdGUuUGFyYW1SZWdFeHBFbmQgKi87XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBjdXN0b21SZSArPSBjaGFyO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgMyAvKiBUb2tlbml6ZXJTdGF0ZS5QYXJhbVJlZ0V4cEVuZCAqLzpcclxuICAgICAgICAgICAgICAgIC8vIHNhbWUgYXMgZmluYWxpemluZyBhIHBhcmFtXHJcbiAgICAgICAgICAgICAgICBjb25zdW1lQnVmZmVyKCk7XHJcbiAgICAgICAgICAgICAgICBzdGF0ZSA9IDAgLyogVG9rZW5pemVyU3RhdGUuU3RhdGljICovO1xyXG4gICAgICAgICAgICAgICAgLy8gZ28gYmFjayBvbmUgY2hhcmFjdGVyIGlmIHdlIHdlcmUgbm90IG1vZGlmeWluZ1xyXG4gICAgICAgICAgICAgICAgaWYgKGNoYXIgIT09ICcqJyAmJiBjaGFyICE9PSAnPycgJiYgY2hhciAhPT0gJysnKVxyXG4gICAgICAgICAgICAgICAgICAgIGktLTtcclxuICAgICAgICAgICAgICAgIGN1c3RvbVJlID0gJyc7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgIGNyYXNoKCdVbmtub3duIHN0YXRlJyk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBpZiAoc3RhdGUgPT09IDIgLyogVG9rZW5pemVyU3RhdGUuUGFyYW1SZWdFeHAgKi8pXHJcbiAgICAgICAgY3Jhc2goYFVuZmluaXNoZWQgY3VzdG9tIFJlZ0V4cCBmb3IgcGFyYW0gXCIke2J1ZmZlcn1cImApO1xyXG4gICAgY29uc3VtZUJ1ZmZlcigpO1xyXG4gICAgZmluYWxpemVTZWdtZW50KCk7XHJcbiAgICAvLyB0b2tlbkNhY2hlLnNldChwYXRoLCB0b2tlbnMpXHJcbiAgICByZXR1cm4gdG9rZW5zO1xyXG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVJvdXRlUmVjb3JkTWF0Y2hlcihyZWNvcmQsIHBhcmVudCwgb3B0aW9ucykge1xyXG4gICAgY29uc3QgcGFyc2VyID0gdG9rZW5zVG9QYXJzZXIodG9rZW5pemVQYXRoKHJlY29yZC5wYXRoKSwgb3B0aW9ucyk7XHJcbiAgICAvLyB3YXJuIGFnYWluc3QgcGFyYW1zIHdpdGggdGhlIHNhbWUgbmFtZVxyXG4gICAgaWYgKChwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nKSkge1xyXG4gICAgICAgIGNvbnN0IGV4aXN0aW5nS2V5cyA9IG5ldyBTZXQoKTtcclxuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBwYXJzZXIua2V5cykge1xyXG4gICAgICAgICAgICBpZiAoZXhpc3RpbmdLZXlzLmhhcyhrZXkubmFtZSkpXHJcbiAgICAgICAgICAgICAgICB3YXJuKGBGb3VuZCBkdXBsaWNhdGVkIHBhcmFtcyB3aXRoIG5hbWUgXCIke2tleS5uYW1lfVwiIGZvciBwYXRoIFwiJHtyZWNvcmQucGF0aH1cIi4gT25seSB0aGUgbGFzdCBvbmUgd2lsbCBiZSBhdmFpbGFibGUgb24gXCIkcm91dGUucGFyYW1zXCIuYCk7XHJcbiAgICAgICAgICAgIGV4aXN0aW5nS2V5cy5hZGQoa2V5Lm5hbWUpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGNvbnN0IG1hdGNoZXIgPSBhc3NpZ24ocGFyc2VyLCB7XHJcbiAgICAgICAgcmVjb3JkLFxyXG4gICAgICAgIHBhcmVudCxcclxuICAgICAgICAvLyB0aGVzZSBuZWVkcyB0byBiZSBwb3B1bGF0ZWQgYnkgdGhlIHBhcmVudFxyXG4gICAgICAgIGNoaWxkcmVuOiBbXSxcclxuICAgICAgICBhbGlhczogW10sXHJcbiAgICB9KTtcclxuICAgIGlmIChwYXJlbnQpIHtcclxuICAgICAgICAvLyBib3RoIGFyZSBhbGlhc2VzIG9yIGJvdGggYXJlIG5vdCBhbGlhc2VzXHJcbiAgICAgICAgLy8gd2UgZG9uJ3Qgd2FudCB0byBtaXggdGhlbSBiZWNhdXNlIHRoZSBvcmRlciBpcyB1c2VkIHdoZW5cclxuICAgICAgICAvLyBwYXNzaW5nIG9yaWdpbmFsUmVjb3JkIGluIE1hdGNoZXIuYWRkUm91dGVcclxuICAgICAgICBpZiAoIW1hdGNoZXIucmVjb3JkLmFsaWFzT2YgPT09ICFwYXJlbnQucmVjb3JkLmFsaWFzT2YpXHJcbiAgICAgICAgICAgIHBhcmVudC5jaGlsZHJlbi5wdXNoKG1hdGNoZXIpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIG1hdGNoZXI7XHJcbn1cblxuLyoqXHJcbiAqIENyZWF0ZXMgYSBSb3V0ZXIgTWF0Y2hlci5cclxuICpcclxuICogQGludGVybmFsXHJcbiAqIEBwYXJhbSByb3V0ZXMgLSBhcnJheSBvZiBpbml0aWFsIHJvdXRlc1xyXG4gKiBAcGFyYW0gZ2xvYmFsT3B0aW9ucyAtIGdsb2JhbCByb3V0ZSBvcHRpb25zXHJcbiAqL1xyXG5mdW5jdGlvbiBjcmVhdGVSb3V0ZXJNYXRjaGVyKHJvdXRlcywgZ2xvYmFsT3B0aW9ucykge1xyXG4gICAgLy8gbm9ybWFsaXplZCBvcmRlcmVkIGFycmF5IG9mIG1hdGNoZXJzXHJcbiAgICBjb25zdCBtYXRjaGVycyA9IFtdO1xyXG4gICAgY29uc3QgbWF0Y2hlck1hcCA9IG5ldyBNYXAoKTtcclxuICAgIGdsb2JhbE9wdGlvbnMgPSBtZXJnZU9wdGlvbnMoeyBzdHJpY3Q6IGZhbHNlLCBlbmQ6IHRydWUsIHNlbnNpdGl2ZTogZmFsc2UgfSwgZ2xvYmFsT3B0aW9ucyk7XHJcbiAgICBmdW5jdGlvbiBnZXRSZWNvcmRNYXRjaGVyKG5hbWUpIHtcclxuICAgICAgICByZXR1cm4gbWF0Y2hlck1hcC5nZXQobmFtZSk7XHJcbiAgICB9XHJcbiAgICBmdW5jdGlvbiBhZGRSb3V0ZShyZWNvcmQsIHBhcmVudCwgb3JpZ2luYWxSZWNvcmQpIHtcclxuICAgICAgICAvLyB1c2VkIGxhdGVyIG9uIHRvIHJlbW92ZSBieSBuYW1lXHJcbiAgICAgICAgY29uc3QgaXNSb290QWRkID0gIW9yaWdpbmFsUmVjb3JkO1xyXG4gICAgICAgIGNvbnN0IG1haW5Ob3JtYWxpemVkUmVjb3JkID0gbm9ybWFsaXplUm91dGVSZWNvcmQocmVjb3JkKTtcclxuICAgICAgICBpZiAoKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicpKSB7XHJcbiAgICAgICAgICAgIGNoZWNrQ2hpbGRNaXNzaW5nTmFtZVdpdGhFbXB0eVBhdGgobWFpbk5vcm1hbGl6ZWRSZWNvcmQsIHBhcmVudCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIHdlIG1pZ2h0IGJlIHRoZSBjaGlsZCBvZiBhbiBhbGlhc1xyXG4gICAgICAgIG1haW5Ob3JtYWxpemVkUmVjb3JkLmFsaWFzT2YgPSBvcmlnaW5hbFJlY29yZCAmJiBvcmlnaW5hbFJlY29yZC5yZWNvcmQ7XHJcbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IG1lcmdlT3B0aW9ucyhnbG9iYWxPcHRpb25zLCByZWNvcmQpO1xyXG4gICAgICAgIC8vIGdlbmVyYXRlIGFuIGFycmF5IG9mIHJlY29yZHMgdG8gY29ycmVjdGx5IGhhbmRsZSBhbGlhc2VzXHJcbiAgICAgICAgY29uc3Qgbm9ybWFsaXplZFJlY29yZHMgPSBbXHJcbiAgICAgICAgICAgIG1haW5Ob3JtYWxpemVkUmVjb3JkLFxyXG4gICAgICAgIF07XHJcbiAgICAgICAgaWYgKCdhbGlhcycgaW4gcmVjb3JkKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGFsaWFzZXMgPSB0eXBlb2YgcmVjb3JkLmFsaWFzID09PSAnc3RyaW5nJyA/IFtyZWNvcmQuYWxpYXNdIDogcmVjb3JkLmFsaWFzO1xyXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGFsaWFzIG9mIGFsaWFzZXMpIHtcclxuICAgICAgICAgICAgICAgIG5vcm1hbGl6ZWRSZWNvcmRzLnB1c2goYXNzaWduKHt9LCBtYWluTm9ybWFsaXplZFJlY29yZCwge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIHRoaXMgYWxsb3dzIHVzIHRvIGhvbGQgYSBjb3B5IG9mIHRoZSBgY29tcG9uZW50c2Agb3B0aW9uXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gc28gdGhhdCBhc3luYyBjb21wb25lbnRzIGNhY2hlIGlzIGhvbGQgb24gdGhlIG9yaWdpbmFsIHJlY29yZFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudHM6IG9yaWdpbmFsUmVjb3JkXHJcbiAgICAgICAgICAgICAgICAgICAgICAgID8gb3JpZ2luYWxSZWNvcmQucmVjb3JkLmNvbXBvbmVudHNcclxuICAgICAgICAgICAgICAgICAgICAgICAgOiBtYWluTm9ybWFsaXplZFJlY29yZC5jb21wb25lbnRzLFxyXG4gICAgICAgICAgICAgICAgICAgIHBhdGg6IGFsaWFzLFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIHdlIG1pZ2h0IGJlIHRoZSBjaGlsZCBvZiBhbiBhbGlhc1xyXG4gICAgICAgICAgICAgICAgICAgIGFsaWFzT2Y6IG9yaWdpbmFsUmVjb3JkXHJcbiAgICAgICAgICAgICAgICAgICAgICAgID8gb3JpZ2luYWxSZWNvcmQucmVjb3JkXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDogbWFpbk5vcm1hbGl6ZWRSZWNvcmQsXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gdGhlIGFsaWFzZXMgYXJlIGFsd2F5cyBvZiB0aGUgc2FtZSBraW5kIGFzIHRoZSBvcmlnaW5hbCBzaW5jZSB0aGV5XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gYXJlIGRlZmluZWQgb24gdGhlIHNhbWUgcmVjb3JkXHJcbiAgICAgICAgICAgICAgICB9KSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgbGV0IG1hdGNoZXI7XHJcbiAgICAgICAgbGV0IG9yaWdpbmFsTWF0Y2hlcjtcclxuICAgICAgICBmb3IgKGNvbnN0IG5vcm1hbGl6ZWRSZWNvcmQgb2Ygbm9ybWFsaXplZFJlY29yZHMpIHtcclxuICAgICAgICAgICAgY29uc3QgeyBwYXRoIH0gPSBub3JtYWxpemVkUmVjb3JkO1xyXG4gICAgICAgICAgICAvLyBCdWlsZCB1cCB0aGUgcGF0aCBmb3IgbmVzdGVkIHJvdXRlcyBpZiB0aGUgY2hpbGQgaXNuJ3QgYW4gYWJzb2x1dGVcclxuICAgICAgICAgICAgLy8gcm91dGUuIE9ubHkgYWRkIHRoZSAvIGRlbGltaXRlciBpZiB0aGUgY2hpbGQgcGF0aCBpc24ndCBlbXB0eSBhbmQgaWYgdGhlXHJcbiAgICAgICAgICAgIC8vIHBhcmVudCBwYXRoIGRvZXNuJ3QgaGF2ZSBhIHRyYWlsaW5nIHNsYXNoXHJcbiAgICAgICAgICAgIGlmIChwYXJlbnQgJiYgcGF0aFswXSAhPT0gJy8nKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBwYXJlbnRQYXRoID0gcGFyZW50LnJlY29yZC5wYXRoO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgY29ubmVjdGluZ1NsYXNoID0gcGFyZW50UGF0aFtwYXJlbnRQYXRoLmxlbmd0aCAtIDFdID09PSAnLycgPyAnJyA6ICcvJztcclxuICAgICAgICAgICAgICAgIG5vcm1hbGl6ZWRSZWNvcmQucGF0aCA9XHJcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50LnJlY29yZC5wYXRoICsgKHBhdGggJiYgY29ubmVjdGluZ1NsYXNoICsgcGF0aCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKChwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nKSAmJiBub3JtYWxpemVkUmVjb3JkLnBhdGggPT09ICcqJykge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYXRjaCBhbGwgcm91dGVzIChcIipcIikgbXVzdCBub3cgYmUgZGVmaW5lZCB1c2luZyBhIHBhcmFtIHdpdGggYSBjdXN0b20gcmVnZXhwLlxcbicgK1xyXG4gICAgICAgICAgICAgICAgICAgICdTZWUgbW9yZSBhdCBodHRwczovL25leHQucm91dGVyLnZ1ZWpzLm9yZy9ndWlkZS9taWdyYXRpb24vI3JlbW92ZWQtc3Rhci1vci1jYXRjaC1hbGwtcm91dGVzLicpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIGNyZWF0ZSB0aGUgb2JqZWN0IGJlZm9yZWhhbmQsIHNvIGl0IGNhbiBiZSBwYXNzZWQgdG8gY2hpbGRyZW5cclxuICAgICAgICAgICAgbWF0Y2hlciA9IGNyZWF0ZVJvdXRlUmVjb3JkTWF0Y2hlcihub3JtYWxpemVkUmVjb3JkLCBwYXJlbnQsIG9wdGlvbnMpO1xyXG4gICAgICAgICAgICBpZiAoKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicpICYmIHBhcmVudCAmJiBwYXRoWzBdID09PSAnLycpXHJcbiAgICAgICAgICAgICAgICBjaGVja01pc3NpbmdQYXJhbXNJbkFic29sdXRlUGF0aChtYXRjaGVyLCBwYXJlbnQpO1xyXG4gICAgICAgICAgICAvLyBpZiB3ZSBhcmUgYW4gYWxpYXMgd2UgbXVzdCB0ZWxsIHRoZSBvcmlnaW5hbCByZWNvcmQgdGhhdCB3ZSBleGlzdCxcclxuICAgICAgICAgICAgLy8gc28gd2UgY2FuIGJlIHJlbW92ZWRcclxuICAgICAgICAgICAgaWYgKG9yaWdpbmFsUmVjb3JkKSB7XHJcbiAgICAgICAgICAgICAgICBvcmlnaW5hbFJlY29yZC5hbGlhcy5wdXNoKG1hdGNoZXIpO1xyXG4gICAgICAgICAgICAgICAgaWYgKChwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNoZWNrU2FtZVBhcmFtcyhvcmlnaW5hbFJlY29yZCwgbWF0Y2hlcik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAvLyBvdGhlcndpc2UsIHRoZSBmaXJzdCByZWNvcmQgaXMgdGhlIG9yaWdpbmFsIGFuZCBvdGhlcnMgYXJlIGFsaWFzZXNcclxuICAgICAgICAgICAgICAgIG9yaWdpbmFsTWF0Y2hlciA9IG9yaWdpbmFsTWF0Y2hlciB8fCBtYXRjaGVyO1xyXG4gICAgICAgICAgICAgICAgaWYgKG9yaWdpbmFsTWF0Y2hlciAhPT0gbWF0Y2hlcilcclxuICAgICAgICAgICAgICAgICAgICBvcmlnaW5hbE1hdGNoZXIuYWxpYXMucHVzaChtYXRjaGVyKTtcclxuICAgICAgICAgICAgICAgIC8vIHJlbW92ZSB0aGUgcm91dGUgaWYgbmFtZWQgYW5kIG9ubHkgZm9yIHRoZSB0b3AgcmVjb3JkIChhdm9pZCBpbiBuZXN0ZWQgY2FsbHMpXHJcbiAgICAgICAgICAgICAgICAvLyB0aGlzIHdvcmtzIGJlY2F1c2UgdGhlIG9yaWdpbmFsIHJlY29yZCBpcyB0aGUgZmlyc3Qgb25lXHJcbiAgICAgICAgICAgICAgICBpZiAoaXNSb290QWRkICYmIHJlY29yZC5uYW1lICYmICFpc0FsaWFzUmVjb3JkKG1hdGNoZXIpKVxyXG4gICAgICAgICAgICAgICAgICAgIHJlbW92ZVJvdXRlKHJlY29yZC5uYW1lKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAobWFpbk5vcm1hbGl6ZWRSZWNvcmQuY2hpbGRyZW4pIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGNoaWxkcmVuID0gbWFpbk5vcm1hbGl6ZWRSZWNvcmQuY2hpbGRyZW47XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYWRkUm91dGUoY2hpbGRyZW5baV0sIG1hdGNoZXIsIG9yaWdpbmFsUmVjb3JkICYmIG9yaWdpbmFsUmVjb3JkLmNoaWxkcmVuW2ldKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyBpZiB0aGVyZSB3YXMgbm8gb3JpZ2luYWwgcmVjb3JkLCB0aGVuIHRoZSBmaXJzdCBvbmUgd2FzIG5vdCBhbiBhbGlhcyBhbmQgYWxsXHJcbiAgICAgICAgICAgIC8vIG90aGVyIGFsaWFzZXMgKGlmIGFueSkgbmVlZCB0byByZWZlcmVuY2UgdGhpcyByZWNvcmQgd2hlbiBhZGRpbmcgY2hpbGRyZW5cclxuICAgICAgICAgICAgb3JpZ2luYWxSZWNvcmQgPSBvcmlnaW5hbFJlY29yZCB8fCBtYXRjaGVyO1xyXG4gICAgICAgICAgICAvLyBUT0RPOiBhZGQgbm9ybWFsaXplZCByZWNvcmRzIGZvciBtb3JlIGZsZXhpYmlsaXR5XHJcbiAgICAgICAgICAgIC8vIGlmIChwYXJlbnQgJiYgaXNBbGlhc1JlY29yZChvcmlnaW5hbFJlY29yZCkpIHtcclxuICAgICAgICAgICAgLy8gICBwYXJlbnQuY2hpbGRyZW4ucHVzaChvcmlnaW5hbFJlY29yZClcclxuICAgICAgICAgICAgLy8gfVxyXG4gICAgICAgICAgICBpbnNlcnRNYXRjaGVyKG1hdGNoZXIpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gb3JpZ2luYWxNYXRjaGVyXHJcbiAgICAgICAgICAgID8gKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgLy8gc2luY2Ugb3RoZXIgbWF0Y2hlcnMgYXJlIGFsaWFzZXMsIHRoZXkgc2hvdWxkIGJlIHJlbW92ZWQgYnkgdGhlIG9yaWdpbmFsIG1hdGNoZXJcclxuICAgICAgICAgICAgICAgIHJlbW92ZVJvdXRlKG9yaWdpbmFsTWF0Y2hlcik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgOiBub29wO1xyXG4gICAgfVxyXG4gICAgZnVuY3Rpb24gcmVtb3ZlUm91dGUobWF0Y2hlclJlZikge1xyXG4gICAgICAgIGlmIChpc1JvdXRlTmFtZShtYXRjaGVyUmVmKSkge1xyXG4gICAgICAgICAgICBjb25zdCBtYXRjaGVyID0gbWF0Y2hlck1hcC5nZXQobWF0Y2hlclJlZik7XHJcbiAgICAgICAgICAgIGlmIChtYXRjaGVyKSB7XHJcbiAgICAgICAgICAgICAgICBtYXRjaGVyTWFwLmRlbGV0ZShtYXRjaGVyUmVmKTtcclxuICAgICAgICAgICAgICAgIG1hdGNoZXJzLnNwbGljZShtYXRjaGVycy5pbmRleE9mKG1hdGNoZXIpLCAxKTtcclxuICAgICAgICAgICAgICAgIG1hdGNoZXIuY2hpbGRyZW4uZm9yRWFjaChyZW1vdmVSb3V0ZSk7XHJcbiAgICAgICAgICAgICAgICBtYXRjaGVyLmFsaWFzLmZvckVhY2gocmVtb3ZlUm91dGUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBjb25zdCBpbmRleCA9IG1hdGNoZXJzLmluZGV4T2YobWF0Y2hlclJlZik7XHJcbiAgICAgICAgICAgIGlmIChpbmRleCA+IC0xKSB7XHJcbiAgICAgICAgICAgICAgICBtYXRjaGVycy5zcGxpY2UoaW5kZXgsIDEpO1xyXG4gICAgICAgICAgICAgICAgaWYgKG1hdGNoZXJSZWYucmVjb3JkLm5hbWUpXHJcbiAgICAgICAgICAgICAgICAgICAgbWF0Y2hlck1hcC5kZWxldGUobWF0Y2hlclJlZi5yZWNvcmQubmFtZSk7XHJcbiAgICAgICAgICAgICAgICBtYXRjaGVyUmVmLmNoaWxkcmVuLmZvckVhY2gocmVtb3ZlUm91dGUpO1xyXG4gICAgICAgICAgICAgICAgbWF0Y2hlclJlZi5hbGlhcy5mb3JFYWNoKHJlbW92ZVJvdXRlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGZ1bmN0aW9uIGdldFJvdXRlcygpIHtcclxuICAgICAgICByZXR1cm4gbWF0Y2hlcnM7XHJcbiAgICB9XHJcbiAgICBmdW5jdGlvbiBpbnNlcnRNYXRjaGVyKG1hdGNoZXIpIHtcclxuICAgICAgICBsZXQgaSA9IDA7XHJcbiAgICAgICAgd2hpbGUgKGkgPCBtYXRjaGVycy5sZW5ndGggJiZcclxuICAgICAgICAgICAgY29tcGFyZVBhdGhQYXJzZXJTY29yZShtYXRjaGVyLCBtYXRjaGVyc1tpXSkgPj0gMCAmJlxyXG4gICAgICAgICAgICAvLyBBZGRpbmcgY2hpbGRyZW4gd2l0aCBlbXB0eSBwYXRoIHNob3VsZCBzdGlsbCBhcHBlYXIgYmVmb3JlIHRoZSBwYXJlbnRcclxuICAgICAgICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL3Z1ZWpzL3JvdXRlci9pc3N1ZXMvMTEyNFxyXG4gICAgICAgICAgICAobWF0Y2hlci5yZWNvcmQucGF0aCAhPT0gbWF0Y2hlcnNbaV0ucmVjb3JkLnBhdGggfHxcclxuICAgICAgICAgICAgICAgICFpc1JlY29yZENoaWxkT2YobWF0Y2hlciwgbWF0Y2hlcnNbaV0pKSlcclxuICAgICAgICAgICAgaSsrO1xyXG4gICAgICAgIG1hdGNoZXJzLnNwbGljZShpLCAwLCBtYXRjaGVyKTtcclxuICAgICAgICAvLyBvbmx5IGFkZCB0aGUgb3JpZ2luYWwgcmVjb3JkIHRvIHRoZSBuYW1lIG1hcFxyXG4gICAgICAgIGlmIChtYXRjaGVyLnJlY29yZC5uYW1lICYmICFpc0FsaWFzUmVjb3JkKG1hdGNoZXIpKVxyXG4gICAgICAgICAgICBtYXRjaGVyTWFwLnNldChtYXRjaGVyLnJlY29yZC5uYW1lLCBtYXRjaGVyKTtcclxuICAgIH1cclxuICAgIGZ1bmN0aW9uIHJlc29sdmUobG9jYXRpb24sIGN1cnJlbnRMb2NhdGlvbikge1xyXG4gICAgICAgIGxldCBtYXRjaGVyO1xyXG4gICAgICAgIGxldCBwYXJhbXMgPSB7fTtcclxuICAgICAgICBsZXQgcGF0aDtcclxuICAgICAgICBsZXQgbmFtZTtcclxuICAgICAgICBpZiAoJ25hbWUnIGluIGxvY2F0aW9uICYmIGxvY2F0aW9uLm5hbWUpIHtcclxuICAgICAgICAgICAgbWF0Y2hlciA9IG1hdGNoZXJNYXAuZ2V0KGxvY2F0aW9uLm5hbWUpO1xyXG4gICAgICAgICAgICBpZiAoIW1hdGNoZXIpXHJcbiAgICAgICAgICAgICAgICB0aHJvdyBjcmVhdGVSb3V0ZXJFcnJvcigxIC8qIEVycm9yVHlwZXMuTUFUQ0hFUl9OT1RfRk9VTkQgKi8sIHtcclxuICAgICAgICAgICAgICAgICAgICBsb2NhdGlvbixcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAvLyB3YXJuIGlmIHRoZSB1c2VyIGlzIHBhc3NpbmcgaW52YWxpZCBwYXJhbXMgc28gdGhleSBjYW4gZGVidWcgaXQgYmV0dGVyIHdoZW4gdGhleSBnZXQgcmVtb3ZlZFxyXG4gICAgICAgICAgICBpZiAoKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicpKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBpbnZhbGlkUGFyYW1zID0gT2JqZWN0LmtleXMobG9jYXRpb24ucGFyYW1zIHx8IHt9KS5maWx0ZXIocGFyYW1OYW1lID0+ICFtYXRjaGVyLmtleXMuZmluZChrID0+IGsubmFtZSA9PT0gcGFyYW1OYW1lKSk7XHJcbiAgICAgICAgICAgICAgICBpZiAoaW52YWxpZFBhcmFtcy5sZW5ndGgpIHtcclxuICAgICAgICAgICAgICAgICAgICB3YXJuKGBEaXNjYXJkZWQgaW52YWxpZCBwYXJhbShzKSBcIiR7aW52YWxpZFBhcmFtcy5qb2luKCdcIiwgXCInKX1cIiB3aGVuIG5hdmlnYXRpbmcuIFNlZSBodHRwczovL2dpdGh1Yi5jb20vdnVlanMvcm91dGVyL2Jsb2IvbWFpbi9wYWNrYWdlcy9yb3V0ZXIvQ0hBTkdFTE9HLm1kIzQxNC0yMDIyLTA4LTIyIGZvciBtb3JlIGRldGFpbHMuYCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgbmFtZSA9IG1hdGNoZXIucmVjb3JkLm5hbWU7XHJcbiAgICAgICAgICAgIHBhcmFtcyA9IGFzc2lnbihcclxuICAgICAgICAgICAgLy8gcGFyYW1zRnJvbUxvY2F0aW9uIGlzIGEgbmV3IG9iamVjdFxyXG4gICAgICAgICAgICBwYXJhbXNGcm9tTG9jYXRpb24oY3VycmVudExvY2F0aW9uLnBhcmFtcywgXHJcbiAgICAgICAgICAgIC8vIG9ubHkga2VlcCBwYXJhbXMgdGhhdCBleGlzdCBpbiB0aGUgcmVzb2x2ZWQgbG9jYXRpb25cclxuICAgICAgICAgICAgLy8gVE9ETzogb25seSBrZWVwIG9wdGlvbmFsIHBhcmFtcyBjb21pbmcgZnJvbSBhIHBhcmVudCByZWNvcmRcclxuICAgICAgICAgICAgbWF0Y2hlci5rZXlzLmZpbHRlcihrID0+ICFrLm9wdGlvbmFsKS5tYXAoayA9PiBrLm5hbWUpKSwgXHJcbiAgICAgICAgICAgIC8vIGRpc2NhcmQgYW55IGV4aXN0aW5nIHBhcmFtcyBpbiB0aGUgY3VycmVudCBsb2NhdGlvbiB0aGF0IGRvIG5vdCBleGlzdCBoZXJlXHJcbiAgICAgICAgICAgIC8vICMxNDk3IHRoaXMgZW5zdXJlcyBiZXR0ZXIgYWN0aXZlL2V4YWN0IG1hdGNoaW5nXHJcbiAgICAgICAgICAgIGxvY2F0aW9uLnBhcmFtcyAmJlxyXG4gICAgICAgICAgICAgICAgcGFyYW1zRnJvbUxvY2F0aW9uKGxvY2F0aW9uLnBhcmFtcywgbWF0Y2hlci5rZXlzLm1hcChrID0+IGsubmFtZSkpKTtcclxuICAgICAgICAgICAgLy8gdGhyb3dzIGlmIGNhbm5vdCBiZSBzdHJpbmdpZmllZFxyXG4gICAgICAgICAgICBwYXRoID0gbWF0Y2hlci5zdHJpbmdpZnkocGFyYW1zKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAoJ3BhdGgnIGluIGxvY2F0aW9uKSB7XHJcbiAgICAgICAgICAgIC8vIG5vIG5lZWQgdG8gcmVzb2x2ZSB0aGUgcGF0aCB3aXRoIHRoZSBtYXRjaGVyIGFzIGl0IHdhcyBwcm92aWRlZFxyXG4gICAgICAgICAgICAvLyB0aGlzIGFsc28gYWxsb3dzIHRoZSB1c2VyIHRvIGNvbnRyb2wgdGhlIGVuY29kaW5nXHJcbiAgICAgICAgICAgIHBhdGggPSBsb2NhdGlvbi5wYXRoO1xyXG4gICAgICAgICAgICBpZiAoKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicpICYmICFwYXRoLnN0YXJ0c1dpdGgoJy8nKSkge1xyXG4gICAgICAgICAgICAgICAgd2FybihgVGhlIE1hdGNoZXIgY2Fubm90IHJlc29sdmUgcmVsYXRpdmUgcGF0aHMgYnV0IHJlY2VpdmVkIFwiJHtwYXRofVwiLiBVbmxlc3MgeW91IGRpcmVjdGx5IGNhbGxlZCBcXGBtYXRjaGVyLnJlc29sdmUoXCIke3BhdGh9XCIpXFxgLCB0aGlzIGlzIHByb2JhYmx5IGEgYnVnIGluIHZ1ZS1yb3V0ZXIuIFBsZWFzZSBvcGVuIGFuIGlzc3VlIGF0IGh0dHBzOi8vbmV3LWlzc3VlLnZ1ZWpzLm9yZy8/cmVwbz12dWVqcy9yb3V0ZXIuYCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgbWF0Y2hlciA9IG1hdGNoZXJzLmZpbmQobSA9PiBtLnJlLnRlc3QocGF0aCkpO1xyXG4gICAgICAgICAgICAvLyBtYXRjaGVyIHNob3VsZCBoYXZlIGEgdmFsdWUgYWZ0ZXIgdGhlIGxvb3BcclxuICAgICAgICAgICAgaWYgKG1hdGNoZXIpIHtcclxuICAgICAgICAgICAgICAgIC8vIHdlIGtub3cgdGhlIG1hdGNoZXIgd29ya3MgYmVjYXVzZSB3ZSB0ZXN0ZWQgdGhlIHJlZ2V4cFxyXG4gICAgICAgICAgICAgICAgcGFyYW1zID0gbWF0Y2hlci5wYXJzZShwYXRoKTtcclxuICAgICAgICAgICAgICAgIG5hbWUgPSBtYXRjaGVyLnJlY29yZC5uYW1lO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIGxvY2F0aW9uIGlzIGEgcmVsYXRpdmUgcGF0aFxyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgLy8gbWF0Y2ggYnkgbmFtZSBvciBwYXRoIG9mIGN1cnJlbnQgcm91dGVcclxuICAgICAgICAgICAgbWF0Y2hlciA9IGN1cnJlbnRMb2NhdGlvbi5uYW1lXHJcbiAgICAgICAgICAgICAgICA/IG1hdGNoZXJNYXAuZ2V0KGN1cnJlbnRMb2NhdGlvbi5uYW1lKVxyXG4gICAgICAgICAgICAgICAgOiBtYXRjaGVycy5maW5kKG0gPT4gbS5yZS50ZXN0KGN1cnJlbnRMb2NhdGlvbi5wYXRoKSk7XHJcbiAgICAgICAgICAgIGlmICghbWF0Y2hlcilcclxuICAgICAgICAgICAgICAgIHRocm93IGNyZWF0ZVJvdXRlckVycm9yKDEgLyogRXJyb3JUeXBlcy5NQVRDSEVSX05PVF9GT1VORCAqLywge1xyXG4gICAgICAgICAgICAgICAgICAgIGxvY2F0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRMb2NhdGlvbixcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBuYW1lID0gbWF0Y2hlci5yZWNvcmQubmFtZTtcclxuICAgICAgICAgICAgLy8gc2luY2Ugd2UgYXJlIG5hdmlnYXRpbmcgdG8gdGhlIHNhbWUgbG9jYXRpb24sIHdlIGRvbid0IG5lZWQgdG8gcGljayB0aGVcclxuICAgICAgICAgICAgLy8gcGFyYW1zIGxpa2Ugd2hlbiBgbmFtZWAgaXMgcHJvdmlkZWRcclxuICAgICAgICAgICAgcGFyYW1zID0gYXNzaWduKHt9LCBjdXJyZW50TG9jYXRpb24ucGFyYW1zLCBsb2NhdGlvbi5wYXJhbXMpO1xyXG4gICAgICAgICAgICBwYXRoID0gbWF0Y2hlci5zdHJpbmdpZnkocGFyYW1zKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY29uc3QgbWF0Y2hlZCA9IFtdO1xyXG4gICAgICAgIGxldCBwYXJlbnRNYXRjaGVyID0gbWF0Y2hlcjtcclxuICAgICAgICB3aGlsZSAocGFyZW50TWF0Y2hlcikge1xyXG4gICAgICAgICAgICAvLyByZXZlcnNlZCBvcmRlciBzbyBwYXJlbnRzIGFyZSBhdCB0aGUgYmVnaW5uaW5nXHJcbiAgICAgICAgICAgIG1hdGNoZWQudW5zaGlmdChwYXJlbnRNYXRjaGVyLnJlY29yZCk7XHJcbiAgICAgICAgICAgIHBhcmVudE1hdGNoZXIgPSBwYXJlbnRNYXRjaGVyLnBhcmVudDtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgbmFtZSxcclxuICAgICAgICAgICAgcGF0aCxcclxuICAgICAgICAgICAgcGFyYW1zLFxyXG4gICAgICAgICAgICBtYXRjaGVkLFxyXG4gICAgICAgICAgICBtZXRhOiBtZXJnZU1ldGFGaWVsZHMobWF0Y2hlZCksXHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuICAgIC8vIGFkZCBpbml0aWFsIHJvdXRlc1xyXG4gICAgcm91dGVzLmZvckVhY2gocm91dGUgPT4gYWRkUm91dGUocm91dGUpKTtcclxuICAgIHJldHVybiB7IGFkZFJvdXRlLCByZXNvbHZlLCByZW1vdmVSb3V0ZSwgZ2V0Um91dGVzLCBnZXRSZWNvcmRNYXRjaGVyIH07XHJcbn1cclxuZnVuY3Rpb24gcGFyYW1zRnJvbUxvY2F0aW9uKHBhcmFtcywga2V5cykge1xyXG4gICAgY29uc3QgbmV3UGFyYW1zID0ge307XHJcbiAgICBmb3IgKGNvbnN0IGtleSBvZiBrZXlzKSB7XHJcbiAgICAgICAgaWYgKGtleSBpbiBwYXJhbXMpXHJcbiAgICAgICAgICAgIG5ld1BhcmFtc1trZXldID0gcGFyYW1zW2tleV07XHJcbiAgICB9XHJcbiAgICByZXR1cm4gbmV3UGFyYW1zO1xyXG59XHJcbi8qKlxyXG4gKiBOb3JtYWxpemVzIGEgUm91dGVSZWNvcmRSYXcuIENyZWF0ZXMgYSBjb3B5XHJcbiAqXHJcbiAqIEBwYXJhbSByZWNvcmRcclxuICogQHJldHVybnMgdGhlIG5vcm1hbGl6ZWQgdmVyc2lvblxyXG4gKi9cclxuZnVuY3Rpb24gbm9ybWFsaXplUm91dGVSZWNvcmQocmVjb3JkKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIHBhdGg6IHJlY29yZC5wYXRoLFxyXG4gICAgICAgIHJlZGlyZWN0OiByZWNvcmQucmVkaXJlY3QsXHJcbiAgICAgICAgbmFtZTogcmVjb3JkLm5hbWUsXHJcbiAgICAgICAgbWV0YTogcmVjb3JkLm1ldGEgfHwge30sXHJcbiAgICAgICAgYWxpYXNPZjogdW5kZWZpbmVkLFxyXG4gICAgICAgIGJlZm9yZUVudGVyOiByZWNvcmQuYmVmb3JlRW50ZXIsXHJcbiAgICAgICAgcHJvcHM6IG5vcm1hbGl6ZVJlY29yZFByb3BzKHJlY29yZCksXHJcbiAgICAgICAgY2hpbGRyZW46IHJlY29yZC5jaGlsZHJlbiB8fCBbXSxcclxuICAgICAgICBpbnN0YW5jZXM6IHt9LFxyXG4gICAgICAgIGxlYXZlR3VhcmRzOiBuZXcgU2V0KCksXHJcbiAgICAgICAgdXBkYXRlR3VhcmRzOiBuZXcgU2V0KCksXHJcbiAgICAgICAgZW50ZXJDYWxsYmFja3M6IHt9LFxyXG4gICAgICAgIGNvbXBvbmVudHM6ICdjb21wb25lbnRzJyBpbiByZWNvcmRcclxuICAgICAgICAgICAgPyByZWNvcmQuY29tcG9uZW50cyB8fCBudWxsXHJcbiAgICAgICAgICAgIDogcmVjb3JkLmNvbXBvbmVudCAmJiB7IGRlZmF1bHQ6IHJlY29yZC5jb21wb25lbnQgfSxcclxuICAgIH07XHJcbn1cclxuLyoqXHJcbiAqIE5vcm1hbGl6ZSB0aGUgb3B0aW9uYWwgYHByb3BzYCBpbiBhIHJlY29yZCB0byBhbHdheXMgYmUgYW4gb2JqZWN0IHNpbWlsYXIgdG9cclxuICogY29tcG9uZW50cy4gQWxzbyBhY2NlcHQgYSBib29sZWFuIGZvciBjb21wb25lbnRzLlxyXG4gKiBAcGFyYW0gcmVjb3JkXHJcbiAqL1xyXG5mdW5jdGlvbiBub3JtYWxpemVSZWNvcmRQcm9wcyhyZWNvcmQpIHtcclxuICAgIGNvbnN0IHByb3BzT2JqZWN0ID0ge307XHJcbiAgICAvLyBwcm9wcyBkb2VzIG5vdCBleGlzdCBvbiByZWRpcmVjdCByZWNvcmRzLCBidXQgd2UgY2FuIHNldCBmYWxzZSBkaXJlY3RseVxyXG4gICAgY29uc3QgcHJvcHMgPSByZWNvcmQucHJvcHMgfHwgZmFsc2U7XHJcbiAgICBpZiAoJ2NvbXBvbmVudCcgaW4gcmVjb3JkKSB7XHJcbiAgICAgICAgcHJvcHNPYmplY3QuZGVmYXVsdCA9IHByb3BzO1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgICAgLy8gTk9URTogd2UgY291bGQgYWxzbyBhbGxvdyBhIGZ1bmN0aW9uIHRvIGJlIGFwcGxpZWQgdG8gZXZlcnkgY29tcG9uZW50LlxyXG4gICAgICAgIC8vIFdvdWxkIG5lZWQgdXNlciBmZWVkYmFjayBmb3IgdXNlIGNhc2VzXHJcbiAgICAgICAgZm9yIChjb25zdCBuYW1lIGluIHJlY29yZC5jb21wb25lbnRzKVxyXG4gICAgICAgICAgICBwcm9wc09iamVjdFtuYW1lXSA9IHR5cGVvZiBwcm9wcyA9PT0gJ2Jvb2xlYW4nID8gcHJvcHMgOiBwcm9wc1tuYW1lXTtcclxuICAgIH1cclxuICAgIHJldHVybiBwcm9wc09iamVjdDtcclxufVxyXG4vKipcclxuICogQ2hlY2tzIGlmIGEgcmVjb3JkIG9yIGFueSBvZiBpdHMgcGFyZW50IGlzIGFuIGFsaWFzXHJcbiAqIEBwYXJhbSByZWNvcmRcclxuICovXHJcbmZ1bmN0aW9uIGlzQWxpYXNSZWNvcmQocmVjb3JkKSB7XHJcbiAgICB3aGlsZSAocmVjb3JkKSB7XHJcbiAgICAgICAgaWYgKHJlY29yZC5yZWNvcmQuYWxpYXNPZilcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgcmVjb3JkID0gcmVjb3JkLnBhcmVudDtcclxuICAgIH1cclxuICAgIHJldHVybiBmYWxzZTtcclxufVxyXG4vKipcclxuICogTWVyZ2UgbWV0YSBmaWVsZHMgb2YgYW4gYXJyYXkgb2YgcmVjb3Jkc1xyXG4gKlxyXG4gKiBAcGFyYW0gbWF0Y2hlZCAtIGFycmF5IG9mIG1hdGNoZWQgcmVjb3Jkc1xyXG4gKi9cclxuZnVuY3Rpb24gbWVyZ2VNZXRhRmllbGRzKG1hdGNoZWQpIHtcclxuICAgIHJldHVybiBtYXRjaGVkLnJlZHVjZSgobWV0YSwgcmVjb3JkKSA9PiBhc3NpZ24obWV0YSwgcmVjb3JkLm1ldGEpLCB7fSk7XHJcbn1cclxuZnVuY3Rpb24gbWVyZ2VPcHRpb25zKGRlZmF1bHRzLCBwYXJ0aWFsT3B0aW9ucykge1xyXG4gICAgY29uc3Qgb3B0aW9ucyA9IHt9O1xyXG4gICAgZm9yIChjb25zdCBrZXkgaW4gZGVmYXVsdHMpIHtcclxuICAgICAgICBvcHRpb25zW2tleV0gPSBrZXkgaW4gcGFydGlhbE9wdGlvbnMgPyBwYXJ0aWFsT3B0aW9uc1trZXldIDogZGVmYXVsdHNba2V5XTtcclxuICAgIH1cclxuICAgIHJldHVybiBvcHRpb25zO1xyXG59XHJcbmZ1bmN0aW9uIGlzU2FtZVBhcmFtKGEsIGIpIHtcclxuICAgIHJldHVybiAoYS5uYW1lID09PSBiLm5hbWUgJiZcclxuICAgICAgICBhLm9wdGlvbmFsID09PSBiLm9wdGlvbmFsICYmXHJcbiAgICAgICAgYS5yZXBlYXRhYmxlID09PSBiLnJlcGVhdGFibGUpO1xyXG59XHJcbi8qKlxyXG4gKiBDaGVjayBpZiBhIHBhdGggYW5kIGl0cyBhbGlhcyBoYXZlIHRoZSBzYW1lIHJlcXVpcmVkIHBhcmFtc1xyXG4gKlxyXG4gKiBAcGFyYW0gYSAtIG9yaWdpbmFsIHJlY29yZFxyXG4gKiBAcGFyYW0gYiAtIGFsaWFzIHJlY29yZFxyXG4gKi9cclxuZnVuY3Rpb24gY2hlY2tTYW1lUGFyYW1zKGEsIGIpIHtcclxuICAgIGZvciAoY29uc3Qga2V5IG9mIGEua2V5cykge1xyXG4gICAgICAgIGlmICgha2V5Lm9wdGlvbmFsICYmICFiLmtleXMuZmluZChpc1NhbWVQYXJhbS5iaW5kKG51bGwsIGtleSkpKVxyXG4gICAgICAgICAgICByZXR1cm4gd2FybihgQWxpYXMgXCIke2IucmVjb3JkLnBhdGh9XCIgYW5kIHRoZSBvcmlnaW5hbCByZWNvcmQ6IFwiJHthLnJlY29yZC5wYXRofVwiIG11c3QgaGF2ZSB0aGUgZXhhY3Qgc2FtZSBwYXJhbSBuYW1lZCBcIiR7a2V5Lm5hbWV9XCJgKTtcclxuICAgIH1cclxuICAgIGZvciAoY29uc3Qga2V5IG9mIGIua2V5cykge1xyXG4gICAgICAgIGlmICgha2V5Lm9wdGlvbmFsICYmICFhLmtleXMuZmluZChpc1NhbWVQYXJhbS5iaW5kKG51bGwsIGtleSkpKVxyXG4gICAgICAgICAgICByZXR1cm4gd2FybihgQWxpYXMgXCIke2IucmVjb3JkLnBhdGh9XCIgYW5kIHRoZSBvcmlnaW5hbCByZWNvcmQ6IFwiJHthLnJlY29yZC5wYXRofVwiIG11c3QgaGF2ZSB0aGUgZXhhY3Qgc2FtZSBwYXJhbSBuYW1lZCBcIiR7a2V5Lm5hbWV9XCJgKTtcclxuICAgIH1cclxufVxyXG4vKipcclxuICogQSByb3V0ZSB3aXRoIGEgbmFtZSBhbmQgYSBjaGlsZCB3aXRoIGFuIGVtcHR5IHBhdGggd2l0aG91dCBhIG5hbWUgc2hvdWxkIHdhcm4gd2hlbiBhZGRpbmcgdGhlIHJvdXRlXHJcbiAqXHJcbiAqIEBwYXJhbSBtYWluTm9ybWFsaXplZFJlY29yZCAtIFJvdXRlUmVjb3JkTm9ybWFsaXplZFxyXG4gKiBAcGFyYW0gcGFyZW50IC0gUm91dGVSZWNvcmRNYXRjaGVyXHJcbiAqL1xyXG5mdW5jdGlvbiBjaGVja0NoaWxkTWlzc2luZ05hbWVXaXRoRW1wdHlQYXRoKG1haW5Ob3JtYWxpemVkUmVjb3JkLCBwYXJlbnQpIHtcclxuICAgIGlmIChwYXJlbnQgJiZcclxuICAgICAgICBwYXJlbnQucmVjb3JkLm5hbWUgJiZcclxuICAgICAgICAhbWFpbk5vcm1hbGl6ZWRSZWNvcmQubmFtZSAmJlxyXG4gICAgICAgICFtYWluTm9ybWFsaXplZFJlY29yZC5wYXRoKSB7XHJcbiAgICAgICAgd2FybihgVGhlIHJvdXRlIG5hbWVkIFwiJHtTdHJpbmcocGFyZW50LnJlY29yZC5uYW1lKX1cIiBoYXMgYSBjaGlsZCB3aXRob3V0IGEgbmFtZSBhbmQgYW4gZW1wdHkgcGF0aC4gVXNpbmcgdGhhdCBuYW1lIHdvbid0IHJlbmRlciB0aGUgZW1wdHkgcGF0aCBjaGlsZCBzbyB5b3UgcHJvYmFibHkgd2FudCB0byBtb3ZlIHRoZSBuYW1lIHRvIHRoZSBjaGlsZCBpbnN0ZWFkLiBJZiB0aGlzIGlzIGludGVudGlvbmFsLCBhZGQgYSBuYW1lIHRvIHRoZSBjaGlsZCByb3V0ZSB0byByZW1vdmUgdGhlIHdhcm5pbmcuYCk7XHJcbiAgICB9XHJcbn1cclxuZnVuY3Rpb24gY2hlY2tNaXNzaW5nUGFyYW1zSW5BYnNvbHV0ZVBhdGgocmVjb3JkLCBwYXJlbnQpIHtcclxuICAgIGZvciAoY29uc3Qga2V5IG9mIHBhcmVudC5rZXlzKSB7XHJcbiAgICAgICAgaWYgKCFyZWNvcmQua2V5cy5maW5kKGlzU2FtZVBhcmFtLmJpbmQobnVsbCwga2V5KSkpXHJcbiAgICAgICAgICAgIHJldHVybiB3YXJuKGBBYnNvbHV0ZSBwYXRoIFwiJHtyZWNvcmQucmVjb3JkLnBhdGh9XCIgbXVzdCBoYXZlIHRoZSBleGFjdCBzYW1lIHBhcmFtIG5hbWVkIFwiJHtrZXkubmFtZX1cIiBhcyBpdHMgcGFyZW50IFwiJHtwYXJlbnQucmVjb3JkLnBhdGh9XCIuYCk7XHJcbiAgICB9XHJcbn1cclxuZnVuY3Rpb24gaXNSZWNvcmRDaGlsZE9mKHJlY29yZCwgcGFyZW50KSB7XHJcbiAgICByZXR1cm4gcGFyZW50LmNoaWxkcmVuLnNvbWUoY2hpbGQgPT4gY2hpbGQgPT09IHJlY29yZCB8fCBpc1JlY29yZENoaWxkT2YocmVjb3JkLCBjaGlsZCkpO1xyXG59XG5cbi8qKlxyXG4gKiBFbmNvZGluZyBSdWxlcyDikKMgPSBTcGFjZSBQYXRoOiDikKMgXCIgPCA+ICMgPyB7IH0gUXVlcnk6IOKQoyBcIiA8ID4gIyAmID0gSGFzaDog4pCjIFwiXHJcbiAqIDwgPiBgXHJcbiAqXHJcbiAqIE9uIHRvcCBvZiB0aGF0LCB0aGUgUkZDMzk4NiAoaHR0cHM6Ly90b29scy5pZXRmLm9yZy9odG1sL3JmYzM5ODYjc2VjdGlvbi0yLjIpXHJcbiAqIGRlZmluZXMgc29tZSBleHRyYSBjaGFyYWN0ZXJzIHRvIGJlIGVuY29kZWQuIE1vc3QgYnJvd3NlcnMgZG8gbm90IGVuY29kZSB0aGVtXHJcbiAqIGluIGVuY29kZVVSSSBodHRwczovL2dpdGh1Yi5jb20vd2hhdHdnL3VybC9pc3N1ZXMvMzY5LCBzbyBpdCBtYXkgYmUgc2FmZXIgdG9cclxuICogYWxzbyBlbmNvZGUgYCEnKCkqYC4gTGVhdmluZyB1bi1lbmNvZGVkIG9ubHkgQVNDSUkgYWxwaGFudW1lcmljKGBhLXpBLVowLTlgKVxyXG4gKiBwbHVzIGAtLl9+YC4gVGhpcyBleHRyYSBzYWZldHkgc2hvdWxkIGJlIGFwcGxpZWQgdG8gcXVlcnkgYnkgcGF0Y2hpbmcgdGhlXHJcbiAqIHN0cmluZyByZXR1cm5lZCBieSBlbmNvZGVVUklDb21wb25lbnQgZW5jb2RlVVJJIGFsc28gZW5jb2RlcyBgW1xcXV5gLiBgXFxgXHJcbiAqIHNob3VsZCBiZSBlbmNvZGVkIHRvIGF2b2lkIGFtYmlndWl0eS4gQnJvd3NlcnMgKElFLCBGRiwgQykgdHJhbnNmb3JtIGEgYFxcYFxyXG4gKiBpbnRvIGEgYC9gIGlmIGRpcmVjdGx5IHR5cGVkIGluLiBUaGUgX2JhY2t0aWNrXyAoYGBgYGApIHNob3VsZCBhbHNvIGJlXHJcbiAqIGVuY29kZWQgZXZlcnl3aGVyZSBiZWNhdXNlIHNvbWUgYnJvd3NlcnMgbGlrZSBGRiBlbmNvZGUgaXQgd2hlbiBkaXJlY3RseVxyXG4gKiB3cml0dGVuIHdoaWxlIG90aGVycyBkb24ndC4gU2FmYXJpIGFuZCBJRSBkb24ndCBlbmNvZGUgYGBcIjw+e31gYGAgaW4gaGFzaC5cclxuICovXHJcbi8vIGNvbnN0IEVYVFJBX1JFU0VSVkVEX1JFID0gL1shJygpKl0vZ1xyXG4vLyBjb25zdCBlbmNvZGVSZXNlcnZlZFJlcGxhY2VyID0gKGM6IHN0cmluZykgPT4gJyUnICsgYy5jaGFyQ29kZUF0KDApLnRvU3RyaW5nKDE2KVxyXG5jb25zdCBIQVNIX1JFID0gLyMvZzsgLy8gJTIzXHJcbmNvbnN0IEFNUEVSU0FORF9SRSA9IC8mL2c7IC8vICUyNlxyXG5jb25zdCBTTEFTSF9SRSA9IC9cXC8vZzsgLy8gJTJGXHJcbmNvbnN0IEVRVUFMX1JFID0gLz0vZzsgLy8gJTNEXHJcbmNvbnN0IElNX1JFID0gL1xcPy9nOyAvLyAlM0ZcclxuY29uc3QgUExVU19SRSA9IC9cXCsvZzsgLy8gJTJCXHJcbi8qKlxyXG4gKiBOT1RFOiBJdCdzIG5vdCBjbGVhciB0byBtZSBpZiB3ZSBzaG91bGQgZW5jb2RlIHRoZSArIHN5bWJvbCBpbiBxdWVyaWVzLCBpdFxyXG4gKiBzZWVtcyB0byBiZSBsZXNzIGZsZXhpYmxlIHRoYW4gbm90IGRvaW5nIHNvIGFuZCBJIGNhbid0IGZpbmQgb3V0IHRoZSBsZWdhY3lcclxuICogc3lzdGVtcyByZXF1aXJpbmcgdGhpcyBmb3IgcmVndWxhciByZXF1ZXN0cyBsaWtlIHRleHQvaHRtbC4gSW4gdGhlIHN0YW5kYXJkLFxyXG4gKiB0aGUgZW5jb2Rpbmcgb2YgdGhlIHBsdXMgY2hhcmFjdGVyIGlzIG9ubHkgbWVudGlvbmVkIGZvclxyXG4gKiBhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWRcclxuICogKGh0dHBzOi8vdXJsLnNwZWMud2hhdHdnLm9yZy8jdXJsZW5jb2RlZC1wYXJzaW5nKSBhbmQgbW9zdCBicm93c2VycyBzZWVtcyBsb1xyXG4gKiBsZWF2ZSB0aGUgcGx1cyBjaGFyYWN0ZXIgYXMgaXMgaW4gcXVlcmllcy4gVG8gYmUgbW9yZSBmbGV4aWJsZSwgd2UgYWxsb3cgdGhlXHJcbiAqIHBsdXMgY2hhcmFjdGVyIG9uIHRoZSBxdWVyeSwgYnV0IGl0IGNhbiBhbHNvIGJlIG1hbnVhbGx5IGVuY29kZWQgYnkgdGhlIHVzZXIuXHJcbiAqXHJcbiAqIFJlc291cmNlczpcclxuICogLSBodHRwczovL3VybC5zcGVjLndoYXR3Zy5vcmcvI3VybGVuY29kZWQtcGFyc2luZ1xyXG4gKiAtIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzE2MzQyNzEvdXJsLWVuY29kaW5nLXRoZS1zcGFjZS1jaGFyYWN0ZXItb3ItMjBcclxuICovXHJcbmNvbnN0IEVOQ19CUkFDS0VUX09QRU5fUkUgPSAvJTVCL2c7IC8vIFtcclxuY29uc3QgRU5DX0JSQUNLRVRfQ0xPU0VfUkUgPSAvJTVEL2c7IC8vIF1cclxuY29uc3QgRU5DX0NBUkVUX1JFID0gLyU1RS9nOyAvLyBeXHJcbmNvbnN0IEVOQ19CQUNLVElDS19SRSA9IC8lNjAvZzsgLy8gYFxyXG5jb25zdCBFTkNfQ1VSTFlfT1BFTl9SRSA9IC8lN0IvZzsgLy8ge1xyXG5jb25zdCBFTkNfUElQRV9SRSA9IC8lN0MvZzsgLy8gfFxyXG5jb25zdCBFTkNfQ1VSTFlfQ0xPU0VfUkUgPSAvJTdEL2c7IC8vIH1cclxuY29uc3QgRU5DX1NQQUNFX1JFID0gLyUyMC9nOyAvLyB9XHJcbi8qKlxyXG4gKiBFbmNvZGUgY2hhcmFjdGVycyB0aGF0IG5lZWQgdG8gYmUgZW5jb2RlZCBvbiB0aGUgcGF0aCwgc2VhcmNoIGFuZCBoYXNoXHJcbiAqIHNlY3Rpb25zIG9mIHRoZSBVUkwuXHJcbiAqXHJcbiAqIEBpbnRlcm5hbFxyXG4gKiBAcGFyYW0gdGV4dCAtIHN0cmluZyB0byBlbmNvZGVcclxuICogQHJldHVybnMgZW5jb2RlZCBzdHJpbmdcclxuICovXHJcbmZ1bmN0aW9uIGNvbW1vbkVuY29kZSh0ZXh0KSB7XHJcbiAgICByZXR1cm4gZW5jb2RlVVJJKCcnICsgdGV4dClcclxuICAgICAgICAucmVwbGFjZShFTkNfUElQRV9SRSwgJ3wnKVxyXG4gICAgICAgIC5yZXBsYWNlKEVOQ19CUkFDS0VUX09QRU5fUkUsICdbJylcclxuICAgICAgICAucmVwbGFjZShFTkNfQlJBQ0tFVF9DTE9TRV9SRSwgJ10nKTtcclxufVxyXG4vKipcclxuICogRW5jb2RlIGNoYXJhY3RlcnMgdGhhdCBuZWVkIHRvIGJlIGVuY29kZWQgb24gdGhlIGhhc2ggc2VjdGlvbiBvZiB0aGUgVVJMLlxyXG4gKlxyXG4gKiBAcGFyYW0gdGV4dCAtIHN0cmluZyB0byBlbmNvZGVcclxuICogQHJldHVybnMgZW5jb2RlZCBzdHJpbmdcclxuICovXHJcbmZ1bmN0aW9uIGVuY29kZUhhc2godGV4dCkge1xyXG4gICAgcmV0dXJuIGNvbW1vbkVuY29kZSh0ZXh0KVxyXG4gICAgICAgIC5yZXBsYWNlKEVOQ19DVVJMWV9PUEVOX1JFLCAneycpXHJcbiAgICAgICAgLnJlcGxhY2UoRU5DX0NVUkxZX0NMT1NFX1JFLCAnfScpXHJcbiAgICAgICAgLnJlcGxhY2UoRU5DX0NBUkVUX1JFLCAnXicpO1xyXG59XHJcbi8qKlxyXG4gKiBFbmNvZGUgY2hhcmFjdGVycyB0aGF0IG5lZWQgdG8gYmUgZW5jb2RlZCBxdWVyeSB2YWx1ZXMgb24gdGhlIHF1ZXJ5XHJcbiAqIHNlY3Rpb24gb2YgdGhlIFVSTC5cclxuICpcclxuICogQHBhcmFtIHRleHQgLSBzdHJpbmcgdG8gZW5jb2RlXHJcbiAqIEByZXR1cm5zIGVuY29kZWQgc3RyaW5nXHJcbiAqL1xyXG5mdW5jdGlvbiBlbmNvZGVRdWVyeVZhbHVlKHRleHQpIHtcclxuICAgIHJldHVybiAoY29tbW9uRW5jb2RlKHRleHQpXHJcbiAgICAgICAgLy8gRW5jb2RlIHRoZSBzcGFjZSBhcyArLCBlbmNvZGUgdGhlICsgdG8gZGlmZmVyZW50aWF0ZSBpdCBmcm9tIHRoZSBzcGFjZVxyXG4gICAgICAgIC5yZXBsYWNlKFBMVVNfUkUsICclMkInKVxyXG4gICAgICAgIC5yZXBsYWNlKEVOQ19TUEFDRV9SRSwgJysnKVxyXG4gICAgICAgIC5yZXBsYWNlKEhBU0hfUkUsICclMjMnKVxyXG4gICAgICAgIC5yZXBsYWNlKEFNUEVSU0FORF9SRSwgJyUyNicpXHJcbiAgICAgICAgLnJlcGxhY2UoRU5DX0JBQ0tUSUNLX1JFLCAnYCcpXHJcbiAgICAgICAgLnJlcGxhY2UoRU5DX0NVUkxZX09QRU5fUkUsICd7JylcclxuICAgICAgICAucmVwbGFjZShFTkNfQ1VSTFlfQ0xPU0VfUkUsICd9JylcclxuICAgICAgICAucmVwbGFjZShFTkNfQ0FSRVRfUkUsICdeJykpO1xyXG59XHJcbi8qKlxyXG4gKiBMaWtlIGBlbmNvZGVRdWVyeVZhbHVlYCBidXQgYWxzbyBlbmNvZGVzIHRoZSBgPWAgY2hhcmFjdGVyLlxyXG4gKlxyXG4gKiBAcGFyYW0gdGV4dCAtIHN0cmluZyB0byBlbmNvZGVcclxuICovXHJcbmZ1bmN0aW9uIGVuY29kZVF1ZXJ5S2V5KHRleHQpIHtcclxuICAgIHJldHVybiBlbmNvZGVRdWVyeVZhbHVlKHRleHQpLnJlcGxhY2UoRVFVQUxfUkUsICclM0QnKTtcclxufVxyXG4vKipcclxuICogRW5jb2RlIGNoYXJhY3RlcnMgdGhhdCBuZWVkIHRvIGJlIGVuY29kZWQgb24gdGhlIHBhdGggc2VjdGlvbiBvZiB0aGUgVVJMLlxyXG4gKlxyXG4gKiBAcGFyYW0gdGV4dCAtIHN0cmluZyB0byBlbmNvZGVcclxuICogQHJldHVybnMgZW5jb2RlZCBzdHJpbmdcclxuICovXHJcbmZ1bmN0aW9uIGVuY29kZVBhdGgodGV4dCkge1xyXG4gICAgcmV0dXJuIGNvbW1vbkVuY29kZSh0ZXh0KS5yZXBsYWNlKEhBU0hfUkUsICclMjMnKS5yZXBsYWNlKElNX1JFLCAnJTNGJyk7XHJcbn1cclxuLyoqXHJcbiAqIEVuY29kZSBjaGFyYWN0ZXJzIHRoYXQgbmVlZCB0byBiZSBlbmNvZGVkIG9uIHRoZSBwYXRoIHNlY3Rpb24gb2YgdGhlIFVSTCBhcyBhXHJcbiAqIHBhcmFtLiBUaGlzIGZ1bmN0aW9uIGVuY29kZXMgZXZlcnl0aGluZyB7QGxpbmsgZW5jb2RlUGF0aH0gZG9lcyBwbHVzIHRoZVxyXG4gKiBzbGFzaCAoYC9gKSBjaGFyYWN0ZXIuIElmIGB0ZXh0YCBpcyBgbnVsbGAgb3IgYHVuZGVmaW5lZGAsIHJldHVybnMgYW4gZW1wdHlcclxuICogc3RyaW5nIGluc3RlYWQuXHJcbiAqXHJcbiAqIEBwYXJhbSB0ZXh0IC0gc3RyaW5nIHRvIGVuY29kZVxyXG4gKiBAcmV0dXJucyBlbmNvZGVkIHN0cmluZ1xyXG4gKi9cclxuZnVuY3Rpb24gZW5jb2RlUGFyYW0odGV4dCkge1xyXG4gICAgcmV0dXJuIHRleHQgPT0gbnVsbCA/ICcnIDogZW5jb2RlUGF0aCh0ZXh0KS5yZXBsYWNlKFNMQVNIX1JFLCAnJTJGJyk7XHJcbn1cclxuLyoqXHJcbiAqIERlY29kZSB0ZXh0IHVzaW5nIGBkZWNvZGVVUklDb21wb25lbnRgLiBSZXR1cm5zIHRoZSBvcmlnaW5hbCB0ZXh0IGlmIGl0XHJcbiAqIGZhaWxzLlxyXG4gKlxyXG4gKiBAcGFyYW0gdGV4dCAtIHN0cmluZyB0byBkZWNvZGVcclxuICogQHJldHVybnMgZGVjb2RlZCBzdHJpbmdcclxuICovXHJcbmZ1bmN0aW9uIGRlY29kZSh0ZXh0KSB7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIHJldHVybiBkZWNvZGVVUklDb21wb25lbnQoJycgKyB0ZXh0KTtcclxuICAgIH1cclxuICAgIGNhdGNoIChlcnIpIHtcclxuICAgICAgICAocHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJykgJiYgd2FybihgRXJyb3IgZGVjb2RpbmcgXCIke3RleHR9XCIuIFVzaW5nIG9yaWdpbmFsIHZhbHVlYCk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gJycgKyB0ZXh0O1xyXG59XG5cbi8qKlxyXG4gKiBUcmFuc2Zvcm1zIGEgcXVlcnlTdHJpbmcgaW50byBhIHtAbGluayBMb2NhdGlvblF1ZXJ5fSBvYmplY3QuIEFjY2VwdCBib3RoLCBhXHJcbiAqIHZlcnNpb24gd2l0aCB0aGUgbGVhZGluZyBgP2AgYW5kIHdpdGhvdXQgU2hvdWxkIHdvcmsgYXMgVVJMU2VhcmNoUGFyYW1zXHJcblxuICogQGludGVybmFsXHJcbiAqXHJcbiAqIEBwYXJhbSBzZWFyY2ggLSBzZWFyY2ggc3RyaW5nIHRvIHBhcnNlXHJcbiAqIEByZXR1cm5zIGEgcXVlcnkgb2JqZWN0XHJcbiAqL1xyXG5mdW5jdGlvbiBwYXJzZVF1ZXJ5KHNlYXJjaCkge1xyXG4gICAgY29uc3QgcXVlcnkgPSB7fTtcclxuICAgIC8vIGF2b2lkIGNyZWF0aW5nIGFuIG9iamVjdCB3aXRoIGFuIGVtcHR5IGtleSBhbmQgZW1wdHkgdmFsdWVcclxuICAgIC8vIGJlY2F1c2Ugb2Ygc3BsaXQoJyYnKVxyXG4gICAgaWYgKHNlYXJjaCA9PT0gJycgfHwgc2VhcmNoID09PSAnPycpXHJcbiAgICAgICAgcmV0dXJuIHF1ZXJ5O1xyXG4gICAgY29uc3QgaGFzTGVhZGluZ0lNID0gc2VhcmNoWzBdID09PSAnPyc7XHJcbiAgICBjb25zdCBzZWFyY2hQYXJhbXMgPSAoaGFzTGVhZGluZ0lNID8gc2VhcmNoLnNsaWNlKDEpIDogc2VhcmNoKS5zcGxpdCgnJicpO1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzZWFyY2hQYXJhbXMubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICAvLyBwcmUgZGVjb2RlIHRoZSArIGludG8gc3BhY2VcclxuICAgICAgICBjb25zdCBzZWFyY2hQYXJhbSA9IHNlYXJjaFBhcmFtc1tpXS5yZXBsYWNlKFBMVVNfUkUsICcgJyk7XHJcbiAgICAgICAgLy8gYWxsb3cgdGhlID0gY2hhcmFjdGVyXHJcbiAgICAgICAgY29uc3QgZXFQb3MgPSBzZWFyY2hQYXJhbS5pbmRleE9mKCc9Jyk7XHJcbiAgICAgICAgY29uc3Qga2V5ID0gZGVjb2RlKGVxUG9zIDwgMCA/IHNlYXJjaFBhcmFtIDogc2VhcmNoUGFyYW0uc2xpY2UoMCwgZXFQb3MpKTtcclxuICAgICAgICBjb25zdCB2YWx1ZSA9IGVxUG9zIDwgMCA/IG51bGwgOiBkZWNvZGUoc2VhcmNoUGFyYW0uc2xpY2UoZXFQb3MgKyAxKSk7XHJcbiAgICAgICAgaWYgKGtleSBpbiBxdWVyeSkge1xyXG4gICAgICAgICAgICAvLyBhbiBleHRyYSB2YXJpYWJsZSBmb3IgdHMgdHlwZXNcclxuICAgICAgICAgICAgbGV0IGN1cnJlbnRWYWx1ZSA9IHF1ZXJ5W2tleV07XHJcbiAgICAgICAgICAgIGlmICghaXNBcnJheShjdXJyZW50VmFsdWUpKSB7XHJcbiAgICAgICAgICAgICAgICBjdXJyZW50VmFsdWUgPSBxdWVyeVtrZXldID0gW2N1cnJlbnRWYWx1ZV07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY3VycmVudFZhbHVlLnB1c2godmFsdWUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgcXVlcnlba2V5XSA9IHZhbHVlO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiBxdWVyeTtcclxufVxyXG4vKipcclxuICogU3RyaW5naWZpZXMgYSB7QGxpbmsgTG9jYXRpb25RdWVyeVJhd30gb2JqZWN0LiBMaWtlIGBVUkxTZWFyY2hQYXJhbXNgLCBpdFxyXG4gKiBkb2Vzbid0IHByZXBlbmQgYSBgP2BcclxuICpcclxuICogQGludGVybmFsXHJcbiAqXHJcbiAqIEBwYXJhbSBxdWVyeSAtIHF1ZXJ5IG9iamVjdCB0byBzdHJpbmdpZnlcclxuICogQHJldHVybnMgc3RyaW5nIHZlcnNpb24gb2YgdGhlIHF1ZXJ5IHdpdGhvdXQgdGhlIGxlYWRpbmcgYD9gXHJcbiAqL1xyXG5mdW5jdGlvbiBzdHJpbmdpZnlRdWVyeShxdWVyeSkge1xyXG4gICAgbGV0IHNlYXJjaCA9ICcnO1xyXG4gICAgZm9yIChsZXQga2V5IGluIHF1ZXJ5KSB7XHJcbiAgICAgICAgY29uc3QgdmFsdWUgPSBxdWVyeVtrZXldO1xyXG4gICAgICAgIGtleSA9IGVuY29kZVF1ZXJ5S2V5KGtleSk7XHJcbiAgICAgICAgaWYgKHZhbHVlID09IG51bGwpIHtcclxuICAgICAgICAgICAgLy8gb25seSBudWxsIGFkZHMgdGhlIHZhbHVlXHJcbiAgICAgICAgICAgIGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICBzZWFyY2ggKz0gKHNlYXJjaC5sZW5ndGggPyAnJicgOiAnJykgKyBrZXk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIGtlZXAgbnVsbCB2YWx1ZXNcclxuICAgICAgICBjb25zdCB2YWx1ZXMgPSBpc0FycmF5KHZhbHVlKVxyXG4gICAgICAgICAgICA/IHZhbHVlLm1hcCh2ID0+IHYgJiYgZW5jb2RlUXVlcnlWYWx1ZSh2KSlcclxuICAgICAgICAgICAgOiBbdmFsdWUgJiYgZW5jb2RlUXVlcnlWYWx1ZSh2YWx1ZSldO1xyXG4gICAgICAgIHZhbHVlcy5mb3JFYWNoKHZhbHVlID0+IHtcclxuICAgICAgICAgICAgLy8gc2tpcCB1bmRlZmluZWQgdmFsdWVzIGluIGFycmF5cyBhcyBpZiB0aGV5IHdlcmUgbm90IHByZXNlbnRcclxuICAgICAgICAgICAgLy8gc21hbGxlciBjb2RlIHRoYW4gdXNpbmcgZmlsdGVyXHJcbiAgICAgICAgICAgIGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBvbmx5IGFwcGVuZCAmIHdpdGggbm9uLWVtcHR5IHNlYXJjaFxyXG4gICAgICAgICAgICAgICAgc2VhcmNoICs9IChzZWFyY2gubGVuZ3RoID8gJyYnIDogJycpICsga2V5O1xyXG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlICE9IG51bGwpXHJcbiAgICAgICAgICAgICAgICAgICAgc2VhcmNoICs9ICc9JyArIHZhbHVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gc2VhcmNoO1xyXG59XHJcbi8qKlxyXG4gKiBUcmFuc2Zvcm1zIGEge0BsaW5rIExvY2F0aW9uUXVlcnlSYXd9IGludG8gYSB7QGxpbmsgTG9jYXRpb25RdWVyeX0gYnkgY2FzdGluZ1xyXG4gKiBudW1iZXJzIGludG8gc3RyaW5ncywgcmVtb3Zpbmcga2V5cyB3aXRoIGFuIHVuZGVmaW5lZCB2YWx1ZSBhbmQgcmVwbGFjaW5nXHJcbiAqIHVuZGVmaW5lZCB3aXRoIG51bGwgaW4gYXJyYXlzXHJcbiAqXHJcbiAqIEBwYXJhbSBxdWVyeSAtIHF1ZXJ5IG9iamVjdCB0byBub3JtYWxpemVcclxuICogQHJldHVybnMgYSBub3JtYWxpemVkIHF1ZXJ5IG9iamVjdFxyXG4gKi9cclxuZnVuY3Rpb24gbm9ybWFsaXplUXVlcnkocXVlcnkpIHtcclxuICAgIGNvbnN0IG5vcm1hbGl6ZWRRdWVyeSA9IHt9O1xyXG4gICAgZm9yIChjb25zdCBrZXkgaW4gcXVlcnkpIHtcclxuICAgICAgICBjb25zdCB2YWx1ZSA9IHF1ZXJ5W2tleV07XHJcbiAgICAgICAgaWYgKHZhbHVlICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgbm9ybWFsaXplZFF1ZXJ5W2tleV0gPSBpc0FycmF5KHZhbHVlKVxyXG4gICAgICAgICAgICAgICAgPyB2YWx1ZS5tYXAodiA9PiAodiA9PSBudWxsID8gbnVsbCA6ICcnICsgdikpXHJcbiAgICAgICAgICAgICAgICA6IHZhbHVlID09IG51bGxcclxuICAgICAgICAgICAgICAgICAgICA/IHZhbHVlXHJcbiAgICAgICAgICAgICAgICAgICAgOiAnJyArIHZhbHVlO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiBub3JtYWxpemVkUXVlcnk7XHJcbn1cblxuLyoqXHJcbiAqIFJvdXRlUmVjb3JkIGJlaW5nIHJlbmRlcmVkIGJ5IHRoZSBjbG9zZXN0IGFuY2VzdG9yIFJvdXRlciBWaWV3LiBVc2VkIGZvclxyXG4gKiBgb25CZWZvcmVSb3V0ZVVwZGF0ZWAgYW5kIGBvbkJlZm9yZVJvdXRlTGVhdmVgLiBydmxtIHN0YW5kcyBmb3IgUm91dGVyIFZpZXdcclxuICogTG9jYXRpb24gTWF0Y2hlZFxyXG4gKlxyXG4gKiBAaW50ZXJuYWxcclxuICovXHJcbmNvbnN0IG1hdGNoZWRSb3V0ZUtleSA9IFN5bWJvbCgocHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJykgPyAncm91dGVyIHZpZXcgbG9jYXRpb24gbWF0Y2hlZCcgOiAnJyk7XHJcbi8qKlxyXG4gKiBBbGxvd3Mgb3ZlcnJpZGluZyB0aGUgcm91dGVyIHZpZXcgZGVwdGggdG8gY29udHJvbCB3aGljaCBjb21wb25lbnQgaW5cclxuICogYG1hdGNoZWRgIGlzIHJlbmRlcmVkLiBydmQgc3RhbmRzIGZvciBSb3V0ZXIgVmlldyBEZXB0aFxyXG4gKlxyXG4gKiBAaW50ZXJuYWxcclxuICovXHJcbmNvbnN0IHZpZXdEZXB0aEtleSA9IFN5bWJvbCgocHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJykgPyAncm91dGVyIHZpZXcgZGVwdGgnIDogJycpO1xyXG4vKipcclxuICogQWxsb3dzIG92ZXJyaWRpbmcgdGhlIHJvdXRlciBpbnN0YW5jZSByZXR1cm5lZCBieSBgdXNlUm91dGVyYCBpbiB0ZXN0cy4gclxyXG4gKiBzdGFuZHMgZm9yIHJvdXRlclxyXG4gKlxyXG4gKiBAaW50ZXJuYWxcclxuICovXHJcbmNvbnN0IHJvdXRlcktleSA9IFN5bWJvbCgocHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJykgPyAncm91dGVyJyA6ICcnKTtcclxuLyoqXHJcbiAqIEFsbG93cyBvdmVycmlkaW5nIHRoZSBjdXJyZW50IHJvdXRlIHJldHVybmVkIGJ5IGB1c2VSb3V0ZWAgaW4gdGVzdHMuIHJsXHJcbiAqIHN0YW5kcyBmb3Igcm91dGUgbG9jYXRpb25cclxuICpcclxuICogQGludGVybmFsXHJcbiAqL1xyXG5jb25zdCByb3V0ZUxvY2F0aW9uS2V5ID0gU3ltYm9sKChwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nKSA/ICdyb3V0ZSBsb2NhdGlvbicgOiAnJyk7XHJcbi8qKlxyXG4gKiBBbGxvd3Mgb3ZlcnJpZGluZyB0aGUgY3VycmVudCByb3V0ZSB1c2VkIGJ5IHJvdXRlci12aWV3LiBJbnRlcm5hbGx5IHRoaXMgaXNcclxuICogdXNlZCB3aGVuIHRoZSBgcm91dGVgIHByb3AgaXMgcGFzc2VkLlxyXG4gKlxyXG4gKiBAaW50ZXJuYWxcclxuICovXHJcbmNvbnN0IHJvdXRlclZpZXdMb2NhdGlvbktleSA9IFN5bWJvbCgocHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJykgPyAncm91dGVyIHZpZXcgbG9jYXRpb24nIDogJycpO1xuXG4vKipcclxuICogQ3JlYXRlIGEgbGlzdCBvZiBjYWxsYmFja3MgdGhhdCBjYW4gYmUgcmVzZXQuIFVzZWQgdG8gY3JlYXRlIGJlZm9yZSBhbmQgYWZ0ZXIgbmF2aWdhdGlvbiBndWFyZHMgbGlzdFxyXG4gKi9cclxuZnVuY3Rpb24gdXNlQ2FsbGJhY2tzKCkge1xyXG4gICAgbGV0IGhhbmRsZXJzID0gW107XHJcbiAgICBmdW5jdGlvbiBhZGQoaGFuZGxlcikge1xyXG4gICAgICAgIGhhbmRsZXJzLnB1c2goaGFuZGxlcik7XHJcbiAgICAgICAgcmV0dXJuICgpID0+IHtcclxuICAgICAgICAgICAgY29uc3QgaSA9IGhhbmRsZXJzLmluZGV4T2YoaGFuZGxlcik7XHJcbiAgICAgICAgICAgIGlmIChpID4gLTEpXHJcbiAgICAgICAgICAgICAgICBoYW5kbGVycy5zcGxpY2UoaSwgMSk7XHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuICAgIGZ1bmN0aW9uIHJlc2V0KCkge1xyXG4gICAgICAgIGhhbmRsZXJzID0gW107XHJcbiAgICB9XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIGFkZCxcclxuICAgICAgICBsaXN0OiAoKSA9PiBoYW5kbGVycyxcclxuICAgICAgICByZXNldCxcclxuICAgIH07XHJcbn1cblxuZnVuY3Rpb24gcmVnaXN0ZXJHdWFyZChyZWNvcmQsIG5hbWUsIGd1YXJkKSB7XHJcbiAgICBjb25zdCByZW1vdmVGcm9tTGlzdCA9ICgpID0+IHtcclxuICAgICAgICByZWNvcmRbbmFtZV0uZGVsZXRlKGd1YXJkKTtcclxuICAgIH07XHJcbiAgICBvblVubW91bnRlZChyZW1vdmVGcm9tTGlzdCk7XHJcbiAgICBvbkRlYWN0aXZhdGVkKHJlbW92ZUZyb21MaXN0KTtcclxuICAgIG9uQWN0aXZhdGVkKCgpID0+IHtcclxuICAgICAgICByZWNvcmRbbmFtZV0uYWRkKGd1YXJkKTtcclxuICAgIH0pO1xyXG4gICAgcmVjb3JkW25hbWVdLmFkZChndWFyZCk7XHJcbn1cclxuLyoqXHJcbiAqIEFkZCBhIG5hdmlnYXRpb24gZ3VhcmQgdGhhdCB0cmlnZ2VycyB3aGVuZXZlciB0aGUgY29tcG9uZW50IGZvciB0aGUgY3VycmVudFxyXG4gKiBsb2NhdGlvbiBpcyBhYm91dCB0byBiZSBsZWZ0LiBTaW1pbGFyIHRvIHtAbGluayBiZWZvcmVSb3V0ZUxlYXZlfSBidXQgY2FuIGJlXHJcbiAqIHVzZWQgaW4gYW55IGNvbXBvbmVudC4gVGhlIGd1YXJkIGlzIHJlbW92ZWQgd2hlbiB0aGUgY29tcG9uZW50IGlzIHVubW91bnRlZC5cclxuICpcclxuICogQHBhcmFtIGxlYXZlR3VhcmQgLSB7QGxpbmsgTmF2aWdhdGlvbkd1YXJkfVxyXG4gKi9cclxuZnVuY3Rpb24gb25CZWZvcmVSb3V0ZUxlYXZlKGxlYXZlR3VhcmQpIHtcclxuICAgIGlmICgocHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJykgJiYgIWdldEN1cnJlbnRJbnN0YW5jZSgpKSB7XHJcbiAgICAgICAgd2FybignZ2V0Q3VycmVudEluc3RhbmNlKCkgcmV0dXJuZWQgbnVsbC4gb25CZWZvcmVSb3V0ZUxlYXZlKCkgbXVzdCBiZSBjYWxsZWQgYXQgdGhlIHRvcCBvZiBhIHNldHVwIGZ1bmN0aW9uJyk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgY29uc3QgYWN0aXZlUmVjb3JkID0gaW5qZWN0KG1hdGNoZWRSb3V0ZUtleSwgXHJcbiAgICAvLyB0byBhdm9pZCB3YXJuaW5nXHJcbiAgICB7fSkudmFsdWU7XHJcbiAgICBpZiAoIWFjdGl2ZVJlY29yZCkge1xyXG4gICAgICAgIChwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nKSAmJlxyXG4gICAgICAgICAgICB3YXJuKCdObyBhY3RpdmUgcm91dGUgcmVjb3JkIHdhcyBmb3VuZCB3aGVuIGNhbGxpbmcgYG9uQmVmb3JlUm91dGVMZWF2ZSgpYC4gTWFrZSBzdXJlIHlvdSBjYWxsIHRoaXMgZnVuY3Rpb24gaW5zaWRlIGEgY29tcG9uZW50IGNoaWxkIG9mIDxyb3V0ZXItdmlldz4uIE1heWJlIHlvdSBjYWxsZWQgaXQgaW5zaWRlIG9mIEFwcC52dWU/Jyk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgcmVnaXN0ZXJHdWFyZChhY3RpdmVSZWNvcmQsICdsZWF2ZUd1YXJkcycsIGxlYXZlR3VhcmQpO1xyXG59XHJcbi8qKlxyXG4gKiBBZGQgYSBuYXZpZ2F0aW9uIGd1YXJkIHRoYXQgdHJpZ2dlcnMgd2hlbmV2ZXIgdGhlIGN1cnJlbnQgbG9jYXRpb24gaXMgYWJvdXRcclxuICogdG8gYmUgdXBkYXRlZC4gU2ltaWxhciB0byB7QGxpbmsgYmVmb3JlUm91dGVVcGRhdGV9IGJ1dCBjYW4gYmUgdXNlZCBpbiBhbnlcclxuICogY29tcG9uZW50LiBUaGUgZ3VhcmQgaXMgcmVtb3ZlZCB3aGVuIHRoZSBjb21wb25lbnQgaXMgdW5tb3VudGVkLlxyXG4gKlxyXG4gKiBAcGFyYW0gdXBkYXRlR3VhcmQgLSB7QGxpbmsgTmF2aWdhdGlvbkd1YXJkfVxyXG4gKi9cclxuZnVuY3Rpb24gb25CZWZvcmVSb3V0ZVVwZGF0ZSh1cGRhdGVHdWFyZCkge1xyXG4gICAgaWYgKChwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nKSAmJiAhZ2V0Q3VycmVudEluc3RhbmNlKCkpIHtcclxuICAgICAgICB3YXJuKCdnZXRDdXJyZW50SW5zdGFuY2UoKSByZXR1cm5lZCBudWxsLiBvbkJlZm9yZVJvdXRlVXBkYXRlKCkgbXVzdCBiZSBjYWxsZWQgYXQgdGhlIHRvcCBvZiBhIHNldHVwIGZ1bmN0aW9uJyk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgY29uc3QgYWN0aXZlUmVjb3JkID0gaW5qZWN0KG1hdGNoZWRSb3V0ZUtleSwgXHJcbiAgICAvLyB0byBhdm9pZCB3YXJuaW5nXHJcbiAgICB7fSkudmFsdWU7XHJcbiAgICBpZiAoIWFjdGl2ZVJlY29yZCkge1xyXG4gICAgICAgIChwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nKSAmJlxyXG4gICAgICAgICAgICB3YXJuKCdObyBhY3RpdmUgcm91dGUgcmVjb3JkIHdhcyBmb3VuZCB3aGVuIGNhbGxpbmcgYG9uQmVmb3JlUm91dGVVcGRhdGUoKWAuIE1ha2Ugc3VyZSB5b3UgY2FsbCB0aGlzIGZ1bmN0aW9uIGluc2lkZSBhIGNvbXBvbmVudCBjaGlsZCBvZiA8cm91dGVyLXZpZXc+LiBNYXliZSB5b3UgY2FsbGVkIGl0IGluc2lkZSBvZiBBcHAudnVlPycpO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIHJlZ2lzdGVyR3VhcmQoYWN0aXZlUmVjb3JkLCAndXBkYXRlR3VhcmRzJywgdXBkYXRlR3VhcmQpO1xyXG59XHJcbmZ1bmN0aW9uIGd1YXJkVG9Qcm9taXNlRm4oZ3VhcmQsIHRvLCBmcm9tLCByZWNvcmQsIG5hbWUpIHtcclxuICAgIC8vIGtlZXAgYSByZWZlcmVuY2UgdG8gdGhlIGVudGVyQ2FsbGJhY2tBcnJheSB0byBwcmV2ZW50IHB1c2hpbmcgY2FsbGJhY2tzIGlmIGEgbmV3IG5hdmlnYXRpb24gdG9vayBwbGFjZVxyXG4gICAgY29uc3QgZW50ZXJDYWxsYmFja0FycmF5ID0gcmVjb3JkICYmXHJcbiAgICAgICAgLy8gbmFtZSBpcyBkZWZpbmVkIGlmIHJlY29yZCBpcyBiZWNhdXNlIG9mIHRoZSBmdW5jdGlvbiBvdmVybG9hZFxyXG4gICAgICAgIChyZWNvcmQuZW50ZXJDYWxsYmFja3NbbmFtZV0gPSByZWNvcmQuZW50ZXJDYWxsYmFja3NbbmFtZV0gfHwgW10pO1xyXG4gICAgcmV0dXJuICgpID0+IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICBjb25zdCBuZXh0ID0gKHZhbGlkKSA9PiB7XHJcbiAgICAgICAgICAgIGlmICh2YWxpZCA9PT0gZmFsc2UpIHtcclxuICAgICAgICAgICAgICAgIHJlamVjdChjcmVhdGVSb3V0ZXJFcnJvcig0IC8qIEVycm9yVHlwZXMuTkFWSUdBVElPTl9BQk9SVEVEICovLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgZnJvbSxcclxuICAgICAgICAgICAgICAgICAgICB0byxcclxuICAgICAgICAgICAgICAgIH0pKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIGlmICh2YWxpZCBpbnN0YW5jZW9mIEVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICByZWplY3QodmFsaWQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKGlzUm91dGVMb2NhdGlvbih2YWxpZCkpIHtcclxuICAgICAgICAgICAgICAgIHJlamVjdChjcmVhdGVSb3V0ZXJFcnJvcigyIC8qIEVycm9yVHlwZXMuTkFWSUdBVElPTl9HVUFSRF9SRURJUkVDVCAqLywge1xyXG4gICAgICAgICAgICAgICAgICAgIGZyb206IHRvLFxyXG4gICAgICAgICAgICAgICAgICAgIHRvOiB2YWxpZCxcclxuICAgICAgICAgICAgICAgIH0pKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGlmIChlbnRlckNhbGxiYWNrQXJyYXkgJiZcclxuICAgICAgICAgICAgICAgICAgICAvLyBzaW5jZSBlbnRlckNhbGxiYWNrQXJyYXkgaXMgdHJ1dGh5LCBib3RoIHJlY29yZCBhbmQgbmFtZSBhbHNvIGFyZVxyXG4gICAgICAgICAgICAgICAgICAgIHJlY29yZC5lbnRlckNhbGxiYWNrc1tuYW1lXSA9PT0gZW50ZXJDYWxsYmFja0FycmF5ICYmXHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZW9mIHZhbGlkID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZW50ZXJDYWxsYmFja0FycmF5LnB1c2godmFsaWQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgICAgICAvLyB3cmFwcGluZyB3aXRoIFByb21pc2UucmVzb2x2ZSBhbGxvd3MgaXQgdG8gd29yayB3aXRoIGJvdGggYXN5bmMgYW5kIHN5bmMgZ3VhcmRzXHJcbiAgICAgICAgY29uc3QgZ3VhcmRSZXR1cm4gPSBndWFyZC5jYWxsKHJlY29yZCAmJiByZWNvcmQuaW5zdGFuY2VzW25hbWVdLCB0bywgZnJvbSwgKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicpID8gY2FuT25seUJlQ2FsbGVkT25jZShuZXh0LCB0bywgZnJvbSkgOiBuZXh0KTtcclxuICAgICAgICBsZXQgZ3VhcmRDYWxsID0gUHJvbWlzZS5yZXNvbHZlKGd1YXJkUmV0dXJuKTtcclxuICAgICAgICBpZiAoZ3VhcmQubGVuZ3RoIDwgMylcclxuICAgICAgICAgICAgZ3VhcmRDYWxsID0gZ3VhcmRDYWxsLnRoZW4obmV4dCk7XHJcbiAgICAgICAgaWYgKChwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nKSAmJiBndWFyZC5sZW5ndGggPiAyKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBgVGhlIFwibmV4dFwiIGNhbGxiYWNrIHdhcyBuZXZlciBjYWxsZWQgaW5zaWRlIG9mICR7Z3VhcmQubmFtZSA/ICdcIicgKyBndWFyZC5uYW1lICsgJ1wiJyA6ICcnfTpcXG4ke2d1YXJkLnRvU3RyaW5nKCl9XFxuLiBJZiB5b3UgYXJlIHJldHVybmluZyBhIHZhbHVlIGluc3RlYWQgb2YgY2FsbGluZyBcIm5leHRcIiwgbWFrZSBzdXJlIHRvIHJlbW92ZSB0aGUgXCJuZXh0XCIgcGFyYW1ldGVyIGZyb20geW91ciBmdW5jdGlvbi5gO1xyXG4gICAgICAgICAgICBpZiAodHlwZW9mIGd1YXJkUmV0dXJuID09PSAnb2JqZWN0JyAmJiAndGhlbicgaW4gZ3VhcmRSZXR1cm4pIHtcclxuICAgICAgICAgICAgICAgIGd1YXJkQ2FsbCA9IGd1YXJkQ2FsbC50aGVuKHJlc29sdmVkVmFsdWUgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIEB0cy1leHBlY3QtZXJyb3I6IF9jYWxsZWQgaXMgYWRkZWQgYXQgY2FuT25seUJlQ2FsbGVkT25jZVxyXG4gICAgICAgICAgICAgICAgICAgIGlmICghbmV4dC5fY2FsbGVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHdhcm4obWVzc2FnZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoJ0ludmFsaWQgbmF2aWdhdGlvbiBndWFyZCcpKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc29sdmVkVmFsdWU7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIGlmIChndWFyZFJldHVybiAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBAdHMtZXhwZWN0LWVycm9yOiBfY2FsbGVkIGlzIGFkZGVkIGF0IGNhbk9ubHlCZUNhbGxlZE9uY2VcclxuICAgICAgICAgICAgICAgIGlmICghbmV4dC5fY2FsbGVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgd2FybihtZXNzYWdlKTtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QobmV3IEVycm9yKCdJbnZhbGlkIG5hdmlnYXRpb24gZ3VhcmQnKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGd1YXJkQ2FsbC5jYXRjaChlcnIgPT4gcmVqZWN0KGVycikpO1xyXG4gICAgfSk7XHJcbn1cclxuZnVuY3Rpb24gY2FuT25seUJlQ2FsbGVkT25jZShuZXh0LCB0bywgZnJvbSkge1xyXG4gICAgbGV0IGNhbGxlZCA9IDA7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIGlmIChjYWxsZWQrKyA9PT0gMSlcclxuICAgICAgICAgICAgd2FybihgVGhlIFwibmV4dFwiIGNhbGxiYWNrIHdhcyBjYWxsZWQgbW9yZSB0aGFuIG9uY2UgaW4gb25lIG5hdmlnYXRpb24gZ3VhcmQgd2hlbiBnb2luZyBmcm9tIFwiJHtmcm9tLmZ1bGxQYXRofVwiIHRvIFwiJHt0by5mdWxsUGF0aH1cIi4gSXQgc2hvdWxkIGJlIGNhbGxlZCBleGFjdGx5IG9uZSB0aW1lIGluIGVhY2ggbmF2aWdhdGlvbiBndWFyZC4gVGhpcyB3aWxsIGZhaWwgaW4gcHJvZHVjdGlvbi5gKTtcclxuICAgICAgICAvLyBAdHMtZXhwZWN0LWVycm9yOiB3ZSBwdXQgaXQgaW4gdGhlIG9yaWdpbmFsIG9uZSBiZWNhdXNlIGl0J3MgZWFzaWVyIHRvIGNoZWNrXHJcbiAgICAgICAgbmV4dC5fY2FsbGVkID0gdHJ1ZTtcclxuICAgICAgICBpZiAoY2FsbGVkID09PSAxKVxyXG4gICAgICAgICAgICBuZXh0LmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XHJcbiAgICB9O1xyXG59XHJcbmZ1bmN0aW9uIGV4dHJhY3RDb21wb25lbnRzR3VhcmRzKG1hdGNoZWQsIGd1YXJkVHlwZSwgdG8sIGZyb20pIHtcclxuICAgIGNvbnN0IGd1YXJkcyA9IFtdO1xyXG4gICAgZm9yIChjb25zdCByZWNvcmQgb2YgbWF0Y2hlZCkge1xyXG4gICAgICAgIGlmICgocHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJykgJiYgIXJlY29yZC5jb21wb25lbnRzICYmICFyZWNvcmQuY2hpbGRyZW4ubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgIHdhcm4oYFJlY29yZCB3aXRoIHBhdGggXCIke3JlY29yZC5wYXRofVwiIGlzIGVpdGhlciBtaXNzaW5nIGEgXCJjb21wb25lbnQocylcImAgK1xyXG4gICAgICAgICAgICAgICAgYCBvciBcImNoaWxkcmVuXCIgcHJvcGVydHkuYCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGZvciAoY29uc3QgbmFtZSBpbiByZWNvcmQuY29tcG9uZW50cykge1xyXG4gICAgICAgICAgICBsZXQgcmF3Q29tcG9uZW50ID0gcmVjb3JkLmNvbXBvbmVudHNbbmFtZV07XHJcbiAgICAgICAgICAgIGlmICgocHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJykpIHtcclxuICAgICAgICAgICAgICAgIGlmICghcmF3Q29tcG9uZW50IHx8XHJcbiAgICAgICAgICAgICAgICAgICAgKHR5cGVvZiByYXdDb21wb25lbnQgIT09ICdvYmplY3QnICYmXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGVvZiByYXdDb21wb25lbnQgIT09ICdmdW5jdGlvbicpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgd2FybihgQ29tcG9uZW50IFwiJHtuYW1lfVwiIGluIHJlY29yZCB3aXRoIHBhdGggXCIke3JlY29yZC5wYXRofVwiIGlzIG5vdGAgK1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBgIGEgdmFsaWQgY29tcG9uZW50LiBSZWNlaXZlZCBcIiR7U3RyaW5nKHJhd0NvbXBvbmVudCl9XCIuYCk7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gdGhyb3cgdG8gZW5zdXJlIHdlIHN0b3AgaGVyZSBidXQgd2FybiB0byBlbnN1cmUgdGhlIG1lc3NhZ2UgaXNuJ3RcclxuICAgICAgICAgICAgICAgICAgICAvLyBtaXNzZWQgYnkgdGhlIHVzZXJcclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgcm91dGUgY29tcG9uZW50Jyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIGlmICgndGhlbicgaW4gcmF3Q29tcG9uZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gd2FybiBpZiB1c2VyIHdyb3RlIGltcG9ydCgnL2NvbXBvbmVudC52dWUnKSBpbnN0ZWFkIG9mICgpID0+XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gaW1wb3J0KCcuL2NvbXBvbmVudC52dWUnKVxyXG4gICAgICAgICAgICAgICAgICAgIHdhcm4oYENvbXBvbmVudCBcIiR7bmFtZX1cIiBpbiByZWNvcmQgd2l0aCBwYXRoIFwiJHtyZWNvcmQucGF0aH1cIiBpcyBhIGAgK1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBgUHJvbWlzZSBpbnN0ZWFkIG9mIGEgZnVuY3Rpb24gdGhhdCByZXR1cm5zIGEgUHJvbWlzZS4gRGlkIHlvdSBgICtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYHdyaXRlIFwiaW1wb3J0KCcuL015UGFnZS52dWUnKVwiIGluc3RlYWQgb2YgYCArXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGBcIigpID0+IGltcG9ydCgnLi9NeVBhZ2UudnVlJylcIiA/IFRoaXMgd2lsbCBicmVhayBpbiBgICtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYHByb2R1Y3Rpb24gaWYgbm90IGZpeGVkLmApO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHByb21pc2UgPSByYXdDb21wb25lbnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgcmF3Q29tcG9uZW50ID0gKCkgPT4gcHJvbWlzZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKHJhd0NvbXBvbmVudC5fX2FzeW5jTG9hZGVyICYmXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gd2FybiBvbmx5IG9uY2UgcGVyIGNvbXBvbmVudFxyXG4gICAgICAgICAgICAgICAgICAgICFyYXdDb21wb25lbnQuX193YXJuZWREZWZpbmVBc3luYykge1xyXG4gICAgICAgICAgICAgICAgICAgIHJhd0NvbXBvbmVudC5fX3dhcm5lZERlZmluZUFzeW5jID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB3YXJuKGBDb21wb25lbnQgXCIke25hbWV9XCIgaW4gcmVjb3JkIHdpdGggcGF0aCBcIiR7cmVjb3JkLnBhdGh9XCIgaXMgZGVmaW5lZCBgICtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYHVzaW5nIFwiZGVmaW5lQXN5bmNDb21wb25lbnQoKVwiLiBgICtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYFdyaXRlIFwiKCkgPT4gaW1wb3J0KCcuL015UGFnZS52dWUnKVwiIGluc3RlYWQgb2YgYCArXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGBcImRlZmluZUFzeW5jQ29tcG9uZW50KCgpID0+IGltcG9ydCgnLi9NeVBhZ2UudnVlJykpXCIuYCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8gc2tpcCB1cGRhdGUgYW5kIGxlYXZlIGd1YXJkcyBpZiB0aGUgcm91dGUgY29tcG9uZW50IGlzIG5vdCBtb3VudGVkXHJcbiAgICAgICAgICAgIGlmIChndWFyZFR5cGUgIT09ICdiZWZvcmVSb3V0ZUVudGVyJyAmJiAhcmVjb3JkLmluc3RhbmNlc1tuYW1lXSlcclxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICBpZiAoaXNSb3V0ZUNvbXBvbmVudChyYXdDb21wb25lbnQpKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBfX3ZjY09wdHMgaXMgYWRkZWQgYnkgdnVlLWNsYXNzLWNvbXBvbmVudCBhbmQgY29udGFpbiB0aGUgcmVndWxhciBvcHRpb25zXHJcbiAgICAgICAgICAgICAgICBjb25zdCBvcHRpb25zID0gcmF3Q29tcG9uZW50Ll9fdmNjT3B0cyB8fCByYXdDb21wb25lbnQ7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBndWFyZCA9IG9wdGlvbnNbZ3VhcmRUeXBlXTtcclxuICAgICAgICAgICAgICAgIGd1YXJkICYmIGd1YXJkcy5wdXNoKGd1YXJkVG9Qcm9taXNlRm4oZ3VhcmQsIHRvLCBmcm9tLCByZWNvcmQsIG5hbWUpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIC8vIHN0YXJ0IHJlcXVlc3RpbmcgdGhlIGNodW5rIGFscmVhZHlcclxuICAgICAgICAgICAgICAgIGxldCBjb21wb25lbnRQcm9taXNlID0gcmF3Q29tcG9uZW50KCk7XHJcbiAgICAgICAgICAgICAgICBpZiAoKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicpICYmICEoJ2NhdGNoJyBpbiBjb21wb25lbnRQcm9taXNlKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHdhcm4oYENvbXBvbmVudCBcIiR7bmFtZX1cIiBpbiByZWNvcmQgd2l0aCBwYXRoIFwiJHtyZWNvcmQucGF0aH1cIiBpcyBhIGZ1bmN0aW9uIHRoYXQgZG9lcyBub3QgcmV0dXJuIGEgUHJvbWlzZS4gSWYgeW91IHdlcmUgcGFzc2luZyBhIGZ1bmN0aW9uYWwgY29tcG9uZW50LCBtYWtlIHN1cmUgdG8gYWRkIGEgXCJkaXNwbGF5TmFtZVwiIHRvIHRoZSBjb21wb25lbnQuIFRoaXMgd2lsbCBicmVhayBpbiBwcm9kdWN0aW9uIGlmIG5vdCBmaXhlZC5gKTtcclxuICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRQcm9taXNlID0gUHJvbWlzZS5yZXNvbHZlKGNvbXBvbmVudFByb21pc2UpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZ3VhcmRzLnB1c2goKCkgPT4gY29tcG9uZW50UHJvbWlzZS50aGVuKHJlc29sdmVkID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXJlc29sdmVkKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKGBDb3VsZG4ndCByZXNvbHZlIGNvbXBvbmVudCBcIiR7bmFtZX1cIiBhdCBcIiR7cmVjb3JkLnBhdGh9XCJgKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzb2x2ZWRDb21wb25lbnQgPSBpc0VTTW9kdWxlKHJlc29sdmVkKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICA/IHJlc29sdmVkLmRlZmF1bHRcclxuICAgICAgICAgICAgICAgICAgICAgICAgOiByZXNvbHZlZDtcclxuICAgICAgICAgICAgICAgICAgICAvLyByZXBsYWNlIHRoZSBmdW5jdGlvbiB3aXRoIHRoZSByZXNvbHZlZCBjb21wb25lbnRcclxuICAgICAgICAgICAgICAgICAgICAvLyBjYW5ub3QgYmUgbnVsbCBvciB1bmRlZmluZWQgYmVjYXVzZSB3ZSB3ZW50IGludG8gdGhlIGZvciBsb29wXHJcbiAgICAgICAgICAgICAgICAgICAgcmVjb3JkLmNvbXBvbmVudHNbbmFtZV0gPSByZXNvbHZlZENvbXBvbmVudDtcclxuICAgICAgICAgICAgICAgICAgICAvLyBfX3ZjY09wdHMgaXMgYWRkZWQgYnkgdnVlLWNsYXNzLWNvbXBvbmVudCBhbmQgY29udGFpbiB0aGUgcmVndWxhciBvcHRpb25zXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgb3B0aW9ucyA9IHJlc29sdmVkQ29tcG9uZW50Ll9fdmNjT3B0cyB8fCByZXNvbHZlZENvbXBvbmVudDtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBndWFyZCA9IG9wdGlvbnNbZ3VhcmRUeXBlXTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ3VhcmQgJiYgZ3VhcmRUb1Byb21pc2VGbihndWFyZCwgdG8sIGZyb20sIHJlY29yZCwgbmFtZSkoKTtcclxuICAgICAgICAgICAgICAgIH0pKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiBndWFyZHM7XHJcbn1cclxuLyoqXHJcbiAqIEFsbG93cyBkaWZmZXJlbnRpYXRpbmcgbGF6eSBjb21wb25lbnRzIGZyb20gZnVuY3Rpb25hbCBjb21wb25lbnRzIGFuZCB2dWUtY2xhc3MtY29tcG9uZW50XHJcbiAqIEBpbnRlcm5hbFxyXG4gKlxyXG4gKiBAcGFyYW0gY29tcG9uZW50XHJcbiAqL1xyXG5mdW5jdGlvbiBpc1JvdXRlQ29tcG9uZW50KGNvbXBvbmVudCkge1xyXG4gICAgcmV0dXJuICh0eXBlb2YgY29tcG9uZW50ID09PSAnb2JqZWN0JyB8fFxyXG4gICAgICAgICdkaXNwbGF5TmFtZScgaW4gY29tcG9uZW50IHx8XHJcbiAgICAgICAgJ3Byb3BzJyBpbiBjb21wb25lbnQgfHxcclxuICAgICAgICAnX192Y2NPcHRzJyBpbiBjb21wb25lbnQpO1xyXG59XHJcbi8qKlxyXG4gKiBFbnN1cmVzIGEgcm91dGUgaXMgbG9hZGVkLCBzbyBpdCBjYW4gYmUgcGFzc2VkIGFzIG8gcHJvcCB0byBgPFJvdXRlclZpZXc+YC5cclxuICpcclxuICogQHBhcmFtIHJvdXRlIC0gcmVzb2x2ZWQgcm91dGUgdG8gbG9hZFxyXG4gKi9cclxuZnVuY3Rpb24gbG9hZFJvdXRlTG9jYXRpb24ocm91dGUpIHtcclxuICAgIHJldHVybiByb3V0ZS5tYXRjaGVkLmV2ZXJ5KHJlY29yZCA9PiByZWNvcmQucmVkaXJlY3QpXHJcbiAgICAgICAgPyBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoJ0Nhbm5vdCBsb2FkIGEgcm91dGUgdGhhdCByZWRpcmVjdHMuJykpXHJcbiAgICAgICAgOiBQcm9taXNlLmFsbChyb3V0ZS5tYXRjaGVkLm1hcChyZWNvcmQgPT4gcmVjb3JkLmNvbXBvbmVudHMgJiZcclxuICAgICAgICAgICAgUHJvbWlzZS5hbGwoT2JqZWN0LmtleXMocmVjb3JkLmNvbXBvbmVudHMpLnJlZHVjZSgocHJvbWlzZXMsIG5hbWUpID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJhd0NvbXBvbmVudCA9IHJlY29yZC5jb21wb25lbnRzW25hbWVdO1xyXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiByYXdDb21wb25lbnQgPT09ICdmdW5jdGlvbicgJiZcclxuICAgICAgICAgICAgICAgICAgICAhKCdkaXNwbGF5TmFtZScgaW4gcmF3Q29tcG9uZW50KSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHByb21pc2VzLnB1c2gocmF3Q29tcG9uZW50KCkudGhlbihyZXNvbHZlZCA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghcmVzb2x2ZWQpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKGBDb3VsZG4ndCByZXNvbHZlIGNvbXBvbmVudCBcIiR7bmFtZX1cIiBhdCBcIiR7cmVjb3JkLnBhdGh9XCIuIEVuc3VyZSB5b3UgcGFzc2VkIGEgZnVuY3Rpb24gdGhhdCByZXR1cm5zIGEgcHJvbWlzZS5gKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc29sdmVkQ29tcG9uZW50ID0gaXNFU01vZHVsZShyZXNvbHZlZClcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgID8gcmVzb2x2ZWQuZGVmYXVsdFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgOiByZXNvbHZlZDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gcmVwbGFjZSB0aGUgZnVuY3Rpb24gd2l0aCB0aGUgcmVzb2x2ZWQgY29tcG9uZW50XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNhbm5vdCBiZSBudWxsIG9yIHVuZGVmaW5lZCBiZWNhdXNlIHdlIHdlbnQgaW50byB0aGUgZm9yIGxvb3BcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVjb3JkLmNvbXBvbmVudHNbbmFtZV0gPSByZXNvbHZlZENvbXBvbmVudDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiBwcm9taXNlcztcclxuICAgICAgICAgICAgfSwgW10pKSkpLnRoZW4oKCkgPT4gcm91dGUpO1xyXG59XG5cbi8vIFRPRE86IHdlIGNvdWxkIGFsbG93IGN1cnJlbnRSb3V0ZSBhcyBhIHByb3AgdG8gZXhwb3NlIGBpc0FjdGl2ZWAgYW5kXHJcbi8vIGBpc0V4YWN0QWN0aXZlYCBiZWhhdmlvciBzaG91bGQgZ28gdGhyb3VnaCBhbiBSRkNcclxuZnVuY3Rpb24gdXNlTGluayhwcm9wcykge1xyXG4gICAgY29uc3Qgcm91dGVyID0gaW5qZWN0KHJvdXRlcktleSk7XHJcbiAgICBjb25zdCBjdXJyZW50Um91dGUgPSBpbmplY3Qocm91dGVMb2NhdGlvbktleSk7XHJcbiAgICBjb25zdCByb3V0ZSA9IGNvbXB1dGVkKCgpID0+IHJvdXRlci5yZXNvbHZlKHVucmVmKHByb3BzLnRvKSkpO1xyXG4gICAgY29uc3QgYWN0aXZlUmVjb3JkSW5kZXggPSBjb21wdXRlZCgoKSA9PiB7XHJcbiAgICAgICAgY29uc3QgeyBtYXRjaGVkIH0gPSByb3V0ZS52YWx1ZTtcclxuICAgICAgICBjb25zdCB7IGxlbmd0aCB9ID0gbWF0Y2hlZDtcclxuICAgICAgICBjb25zdCByb3V0ZU1hdGNoZWQgPSBtYXRjaGVkW2xlbmd0aCAtIDFdO1xyXG4gICAgICAgIGNvbnN0IGN1cnJlbnRNYXRjaGVkID0gY3VycmVudFJvdXRlLm1hdGNoZWQ7XHJcbiAgICAgICAgaWYgKCFyb3V0ZU1hdGNoZWQgfHwgIWN1cnJlbnRNYXRjaGVkLmxlbmd0aClcclxuICAgICAgICAgICAgcmV0dXJuIC0xO1xyXG4gICAgICAgIGNvbnN0IGluZGV4ID0gY3VycmVudE1hdGNoZWQuZmluZEluZGV4KGlzU2FtZVJvdXRlUmVjb3JkLmJpbmQobnVsbCwgcm91dGVNYXRjaGVkKSk7XHJcbiAgICAgICAgaWYgKGluZGV4ID4gLTEpXHJcbiAgICAgICAgICAgIHJldHVybiBpbmRleDtcclxuICAgICAgICAvLyBwb3NzaWJsZSBwYXJlbnQgcmVjb3JkXHJcbiAgICAgICAgY29uc3QgcGFyZW50UmVjb3JkUGF0aCA9IGdldE9yaWdpbmFsUGF0aChtYXRjaGVkW2xlbmd0aCAtIDJdKTtcclxuICAgICAgICByZXR1cm4gKFxyXG4gICAgICAgIC8vIHdlIGFyZSBkZWFsaW5nIHdpdGggbmVzdGVkIHJvdXRlc1xyXG4gICAgICAgIGxlbmd0aCA+IDEgJiZcclxuICAgICAgICAgICAgLy8gaWYgdGhlIHBhcmVudCBhbmQgbWF0Y2hlZCByb3V0ZSBoYXZlIHRoZSBzYW1lIHBhdGgsIHRoaXMgbGluayBpc1xyXG4gICAgICAgICAgICAvLyByZWZlcnJpbmcgdG8gdGhlIGVtcHR5IGNoaWxkLiBPciB3ZSBjdXJyZW50bHkgYXJlIG9uIGEgZGlmZmVyZW50XHJcbiAgICAgICAgICAgIC8vIGNoaWxkIG9mIHRoZSBzYW1lIHBhcmVudFxyXG4gICAgICAgICAgICBnZXRPcmlnaW5hbFBhdGgocm91dGVNYXRjaGVkKSA9PT0gcGFyZW50UmVjb3JkUGF0aCAmJlxyXG4gICAgICAgICAgICAvLyBhdm9pZCBjb21wYXJpbmcgdGhlIGNoaWxkIHdpdGggaXRzIHBhcmVudFxyXG4gICAgICAgICAgICBjdXJyZW50TWF0Y2hlZFtjdXJyZW50TWF0Y2hlZC5sZW5ndGggLSAxXS5wYXRoICE9PSBwYXJlbnRSZWNvcmRQYXRoXHJcbiAgICAgICAgICAgID8gY3VycmVudE1hdGNoZWQuZmluZEluZGV4KGlzU2FtZVJvdXRlUmVjb3JkLmJpbmQobnVsbCwgbWF0Y2hlZFtsZW5ndGggLSAyXSkpXHJcbiAgICAgICAgICAgIDogaW5kZXgpO1xyXG4gICAgfSk7XHJcbiAgICBjb25zdCBpc0FjdGl2ZSA9IGNvbXB1dGVkKCgpID0+IGFjdGl2ZVJlY29yZEluZGV4LnZhbHVlID4gLTEgJiZcclxuICAgICAgICBpbmNsdWRlc1BhcmFtcyhjdXJyZW50Um91dGUucGFyYW1zLCByb3V0ZS52YWx1ZS5wYXJhbXMpKTtcclxuICAgIGNvbnN0IGlzRXhhY3RBY3RpdmUgPSBjb21wdXRlZCgoKSA9PiBhY3RpdmVSZWNvcmRJbmRleC52YWx1ZSA+IC0xICYmXHJcbiAgICAgICAgYWN0aXZlUmVjb3JkSW5kZXgudmFsdWUgPT09IGN1cnJlbnRSb3V0ZS5tYXRjaGVkLmxlbmd0aCAtIDEgJiZcclxuICAgICAgICBpc1NhbWVSb3V0ZUxvY2F0aW9uUGFyYW1zKGN1cnJlbnRSb3V0ZS5wYXJhbXMsIHJvdXRlLnZhbHVlLnBhcmFtcykpO1xyXG4gICAgZnVuY3Rpb24gbmF2aWdhdGUoZSA9IHt9KSB7XHJcbiAgICAgICAgaWYgKGd1YXJkRXZlbnQoZSkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHJvdXRlclt1bnJlZihwcm9wcy5yZXBsYWNlKSA/ICdyZXBsYWNlJyA6ICdwdXNoJ10odW5yZWYocHJvcHMudG8pXHJcbiAgICAgICAgICAgIC8vIGF2b2lkIHVuY2F1Z2h0IGVycm9ycyBhcmUgdGhleSBhcmUgbG9nZ2VkIGFueXdheVxyXG4gICAgICAgICAgICApLmNhdGNoKG5vb3ApO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XHJcbiAgICB9XHJcbiAgICAvLyBkZXZ0b29scyBvbmx5XHJcbiAgICBpZiAoKChwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nKSB8fCBfX1ZVRV9QUk9EX0RFVlRPT0xTX18pICYmIGlzQnJvd3Nlcikge1xyXG4gICAgICAgIGNvbnN0IGluc3RhbmNlID0gZ2V0Q3VycmVudEluc3RhbmNlKCk7XHJcbiAgICAgICAgaWYgKGluc3RhbmNlKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGxpbmtDb250ZXh0RGV2dG9vbHMgPSB7XHJcbiAgICAgICAgICAgICAgICByb3V0ZTogcm91dGUudmFsdWUsXHJcbiAgICAgICAgICAgICAgICBpc0FjdGl2ZTogaXNBY3RpdmUudmFsdWUsXHJcbiAgICAgICAgICAgICAgICBpc0V4YWN0QWN0aXZlOiBpc0V4YWN0QWN0aXZlLnZhbHVlLFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAvLyBAdHMtZXhwZWN0LWVycm9yOiB0aGlzIGlzIGludGVybmFsXHJcbiAgICAgICAgICAgIGluc3RhbmNlLl9fdnJsX2RldnRvb2xzID0gaW5zdGFuY2UuX192cmxfZGV2dG9vbHMgfHwgW107XHJcbiAgICAgICAgICAgIC8vIEB0cy1leHBlY3QtZXJyb3I6IHRoaXMgaXMgaW50ZXJuYWxcclxuICAgICAgICAgICAgaW5zdGFuY2UuX192cmxfZGV2dG9vbHMucHVzaChsaW5rQ29udGV4dERldnRvb2xzKTtcclxuICAgICAgICAgICAgd2F0Y2hFZmZlY3QoKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgbGlua0NvbnRleHREZXZ0b29scy5yb3V0ZSA9IHJvdXRlLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGlua0NvbnRleHREZXZ0b29scy5pc0FjdGl2ZSA9IGlzQWN0aXZlLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgbGlua0NvbnRleHREZXZ0b29scy5pc0V4YWN0QWN0aXZlID0gaXNFeGFjdEFjdGl2ZS52YWx1ZTtcclxuICAgICAgICAgICAgfSwgeyBmbHVzaDogJ3Bvc3QnIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgcm91dGUsXHJcbiAgICAgICAgaHJlZjogY29tcHV0ZWQoKCkgPT4gcm91dGUudmFsdWUuaHJlZiksXHJcbiAgICAgICAgaXNBY3RpdmUsXHJcbiAgICAgICAgaXNFeGFjdEFjdGl2ZSxcclxuICAgICAgICBuYXZpZ2F0ZSxcclxuICAgIH07XHJcbn1cclxuY29uc3QgUm91dGVyTGlua0ltcGwgPSAvKiNfX1BVUkVfXyovIGRlZmluZUNvbXBvbmVudCh7XHJcbiAgICBuYW1lOiAnUm91dGVyTGluaycsXHJcbiAgICBjb21wYXRDb25maWc6IHsgTU9ERTogMyB9LFxyXG4gICAgcHJvcHM6IHtcclxuICAgICAgICB0bzoge1xyXG4gICAgICAgICAgICB0eXBlOiBbU3RyaW5nLCBPYmplY3RdLFxyXG4gICAgICAgICAgICByZXF1aXJlZDogdHJ1ZSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHJlcGxhY2U6IEJvb2xlYW4sXHJcbiAgICAgICAgYWN0aXZlQ2xhc3M6IFN0cmluZyxcclxuICAgICAgICAvLyBpbmFjdGl2ZUNsYXNzOiBTdHJpbmcsXHJcbiAgICAgICAgZXhhY3RBY3RpdmVDbGFzczogU3RyaW5nLFxyXG4gICAgICAgIGN1c3RvbTogQm9vbGVhbixcclxuICAgICAgICBhcmlhQ3VycmVudFZhbHVlOiB7XHJcbiAgICAgICAgICAgIHR5cGU6IFN0cmluZyxcclxuICAgICAgICAgICAgZGVmYXVsdDogJ3BhZ2UnLFxyXG4gICAgICAgIH0sXHJcbiAgICB9LFxyXG4gICAgdXNlTGluayxcclxuICAgIHNldHVwKHByb3BzLCB7IHNsb3RzIH0pIHtcclxuICAgICAgICBjb25zdCBsaW5rID0gcmVhY3RpdmUodXNlTGluayhwcm9wcykpO1xyXG4gICAgICAgIGNvbnN0IHsgb3B0aW9ucyB9ID0gaW5qZWN0KHJvdXRlcktleSk7XHJcbiAgICAgICAgY29uc3QgZWxDbGFzcyA9IGNvbXB1dGVkKCgpID0+ICh7XHJcbiAgICAgICAgICAgIFtnZXRMaW5rQ2xhc3MocHJvcHMuYWN0aXZlQ2xhc3MsIG9wdGlvbnMubGlua0FjdGl2ZUNsYXNzLCAncm91dGVyLWxpbmstYWN0aXZlJyldOiBsaW5rLmlzQWN0aXZlLFxyXG4gICAgICAgICAgICAvLyBbZ2V0TGlua0NsYXNzKFxyXG4gICAgICAgICAgICAvLyAgIHByb3BzLmluYWN0aXZlQ2xhc3MsXHJcbiAgICAgICAgICAgIC8vICAgb3B0aW9ucy5saW5rSW5hY3RpdmVDbGFzcyxcclxuICAgICAgICAgICAgLy8gICAncm91dGVyLWxpbmstaW5hY3RpdmUnXHJcbiAgICAgICAgICAgIC8vICldOiAhbGluay5pc0V4YWN0QWN0aXZlLFxyXG4gICAgICAgICAgICBbZ2V0TGlua0NsYXNzKHByb3BzLmV4YWN0QWN0aXZlQ2xhc3MsIG9wdGlvbnMubGlua0V4YWN0QWN0aXZlQ2xhc3MsICdyb3V0ZXItbGluay1leGFjdC1hY3RpdmUnKV06IGxpbmsuaXNFeGFjdEFjdGl2ZSxcclxuICAgICAgICB9KSk7XHJcbiAgICAgICAgcmV0dXJuICgpID0+IHtcclxuICAgICAgICAgICAgY29uc3QgY2hpbGRyZW4gPSBzbG90cy5kZWZhdWx0ICYmIHNsb3RzLmRlZmF1bHQobGluayk7XHJcbiAgICAgICAgICAgIHJldHVybiBwcm9wcy5jdXN0b21cclxuICAgICAgICAgICAgICAgID8gY2hpbGRyZW5cclxuICAgICAgICAgICAgICAgIDogaCgnYScsIHtcclxuICAgICAgICAgICAgICAgICAgICAnYXJpYS1jdXJyZW50JzogbGluay5pc0V4YWN0QWN0aXZlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgID8gcHJvcHMuYXJpYUN1cnJlbnRWYWx1ZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICA6IG51bGwsXHJcbiAgICAgICAgICAgICAgICAgICAgaHJlZjogbGluay5ocmVmLFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIHRoaXMgd291bGQgb3ZlcnJpZGUgdXNlciBhZGRlZCBhdHRycyBidXQgVnVlIHdpbGwgc3RpbGwgYWRkXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gdGhlIGxpc3RlbmVyLCBzbyB3ZSBlbmQgdXAgdHJpZ2dlcmluZyBib3RoXHJcbiAgICAgICAgICAgICAgICAgICAgb25DbGljazogbGluay5uYXZpZ2F0ZSxcclxuICAgICAgICAgICAgICAgICAgICBjbGFzczogZWxDbGFzcy52YWx1ZSxcclxuICAgICAgICAgICAgICAgIH0sIGNoaWxkcmVuKTtcclxuICAgICAgICB9O1xyXG4gICAgfSxcclxufSk7XHJcbi8vIGV4cG9ydCB0aGUgcHVibGljIHR5cGUgZm9yIGgvdHN4IGluZmVyZW5jZVxyXG4vLyBhbHNvIHRvIGF2b2lkIGlubGluZSBpbXBvcnQoKSBpbiBnZW5lcmF0ZWQgZC50cyBmaWxlc1xyXG4vKipcclxuICogQ29tcG9uZW50IHRvIHJlbmRlciBhIGxpbmsgdGhhdCB0cmlnZ2VycyBhIG5hdmlnYXRpb24gb24gY2xpY2suXHJcbiAqL1xyXG5jb25zdCBSb3V0ZXJMaW5rID0gUm91dGVyTGlua0ltcGw7XHJcbmZ1bmN0aW9uIGd1YXJkRXZlbnQoZSkge1xyXG4gICAgLy8gZG9uJ3QgcmVkaXJlY3Qgd2l0aCBjb250cm9sIGtleXNcclxuICAgIGlmIChlLm1ldGFLZXkgfHwgZS5hbHRLZXkgfHwgZS5jdHJsS2V5IHx8IGUuc2hpZnRLZXkpXHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgLy8gZG9uJ3QgcmVkaXJlY3Qgd2hlbiBwcmV2ZW50RGVmYXVsdCBjYWxsZWRcclxuICAgIGlmIChlLmRlZmF1bHRQcmV2ZW50ZWQpXHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgLy8gZG9uJ3QgcmVkaXJlY3Qgb24gcmlnaHQgY2xpY2tcclxuICAgIGlmIChlLmJ1dHRvbiAhPT0gdW5kZWZpbmVkICYmIGUuYnV0dG9uICE9PSAwKVxyXG4gICAgICAgIHJldHVybjtcclxuICAgIC8vIGRvbid0IHJlZGlyZWN0IGlmIGB0YXJnZXQ9XCJfYmxhbmtcImBcclxuICAgIC8vIEB0cy1leHBlY3QtZXJyb3IgZ2V0QXR0cmlidXRlIGRvZXMgZXhpc3RcclxuICAgIGlmIChlLmN1cnJlbnRUYXJnZXQgJiYgZS5jdXJyZW50VGFyZ2V0LmdldEF0dHJpYnV0ZSkge1xyXG4gICAgICAgIC8vIEB0cy1leHBlY3QtZXJyb3IgZ2V0QXR0cmlidXRlIGV4aXN0c1xyXG4gICAgICAgIGNvbnN0IHRhcmdldCA9IGUuY3VycmVudFRhcmdldC5nZXRBdHRyaWJ1dGUoJ3RhcmdldCcpO1xyXG4gICAgICAgIGlmICgvXFxiX2JsYW5rXFxiL2kudGVzdCh0YXJnZXQpKVxyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICAvLyB0aGlzIG1heSBiZSBhIFdlZXggZXZlbnQgd2hpY2ggZG9lc24ndCBoYXZlIHRoaXMgbWV0aG9kXHJcbiAgICBpZiAoZS5wcmV2ZW50RGVmYXVsdClcclxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICByZXR1cm4gdHJ1ZTtcclxufVxyXG5mdW5jdGlvbiBpbmNsdWRlc1BhcmFtcyhvdXRlciwgaW5uZXIpIHtcclxuICAgIGZvciAoY29uc3Qga2V5IGluIGlubmVyKSB7XHJcbiAgICAgICAgY29uc3QgaW5uZXJWYWx1ZSA9IGlubmVyW2tleV07XHJcbiAgICAgICAgY29uc3Qgb3V0ZXJWYWx1ZSA9IG91dGVyW2tleV07XHJcbiAgICAgICAgaWYgKHR5cGVvZiBpbm5lclZhbHVlID09PSAnc3RyaW5nJykge1xyXG4gICAgICAgICAgICBpZiAoaW5uZXJWYWx1ZSAhPT0gb3V0ZXJWYWx1ZSlcclxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIGlmICghaXNBcnJheShvdXRlclZhbHVlKSB8fFxyXG4gICAgICAgICAgICAgICAgb3V0ZXJWYWx1ZS5sZW5ndGggIT09IGlubmVyVmFsdWUubGVuZ3RoIHx8XHJcbiAgICAgICAgICAgICAgICBpbm5lclZhbHVlLnNvbWUoKHZhbHVlLCBpKSA9PiB2YWx1ZSAhPT0gb3V0ZXJWYWx1ZVtpXSkpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIHRydWU7XHJcbn1cclxuLyoqXHJcbiAqIEdldCB0aGUgb3JpZ2luYWwgcGF0aCB2YWx1ZSBvZiBhIHJlY29yZCBieSBmb2xsb3dpbmcgaXRzIGFsaWFzT2ZcclxuICogQHBhcmFtIHJlY29yZFxyXG4gKi9cclxuZnVuY3Rpb24gZ2V0T3JpZ2luYWxQYXRoKHJlY29yZCkge1xyXG4gICAgcmV0dXJuIHJlY29yZCA/IChyZWNvcmQuYWxpYXNPZiA/IHJlY29yZC5hbGlhc09mLnBhdGggOiByZWNvcmQucGF0aCkgOiAnJztcclxufVxyXG4vKipcclxuICogVXRpbGl0eSBjbGFzcyB0byBnZXQgdGhlIGFjdGl2ZSBjbGFzcyBiYXNlZCBvbiBkZWZhdWx0cy5cclxuICogQHBhcmFtIHByb3BDbGFzc1xyXG4gKiBAcGFyYW0gZ2xvYmFsQ2xhc3NcclxuICogQHBhcmFtIGRlZmF1bHRDbGFzc1xyXG4gKi9cclxuY29uc3QgZ2V0TGlua0NsYXNzID0gKHByb3BDbGFzcywgZ2xvYmFsQ2xhc3MsIGRlZmF1bHRDbGFzcykgPT4gcHJvcENsYXNzICE9IG51bGxcclxuICAgID8gcHJvcENsYXNzXHJcbiAgICA6IGdsb2JhbENsYXNzICE9IG51bGxcclxuICAgICAgICA/IGdsb2JhbENsYXNzXHJcbiAgICAgICAgOiBkZWZhdWx0Q2xhc3M7XG5cbmNvbnN0IFJvdXRlclZpZXdJbXBsID0gLyojX19QVVJFX18qLyBkZWZpbmVDb21wb25lbnQoe1xyXG4gICAgbmFtZTogJ1JvdXRlclZpZXcnLFxyXG4gICAgLy8gIzY3NCB3ZSBtYW51YWxseSBpbmhlcml0IHRoZW1cclxuICAgIGluaGVyaXRBdHRyczogZmFsc2UsXHJcbiAgICBwcm9wczoge1xyXG4gICAgICAgIG5hbWU6IHtcclxuICAgICAgICAgICAgdHlwZTogU3RyaW5nLFxyXG4gICAgICAgICAgICBkZWZhdWx0OiAnZGVmYXVsdCcsXHJcbiAgICAgICAgfSxcclxuICAgICAgICByb3V0ZTogT2JqZWN0LFxyXG4gICAgfSxcclxuICAgIC8vIEJldHRlciBjb21wYXQgZm9yIEB2dWUvY29tcGF0IHVzZXJzXHJcbiAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vdnVlanMvcm91dGVyL2lzc3Vlcy8xMzE1XHJcbiAgICBjb21wYXRDb25maWc6IHsgTU9ERTogMyB9LFxyXG4gICAgc2V0dXAocHJvcHMsIHsgYXR0cnMsIHNsb3RzIH0pIHtcclxuICAgICAgICAocHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJykgJiYgd2FybkRlcHJlY2F0ZWRVc2FnZSgpO1xyXG4gICAgICAgIGNvbnN0IGluamVjdGVkUm91dGUgPSBpbmplY3Qocm91dGVyVmlld0xvY2F0aW9uS2V5KTtcclxuICAgICAgICBjb25zdCByb3V0ZVRvRGlzcGxheSA9IGNvbXB1dGVkKCgpID0+IHByb3BzLnJvdXRlIHx8IGluamVjdGVkUm91dGUudmFsdWUpO1xyXG4gICAgICAgIGNvbnN0IGluamVjdGVkRGVwdGggPSBpbmplY3Qodmlld0RlcHRoS2V5LCAwKTtcclxuICAgICAgICAvLyBUaGUgZGVwdGggY2hhbmdlcyBiYXNlZCBvbiBlbXB0eSBjb21wb25lbnRzIG9wdGlvbiwgd2hpY2ggYWxsb3dzIHBhc3N0aHJvdWdoIHJvdXRlcyBlLmcuIHJvdXRlcyB3aXRoIGNoaWxkcmVuXHJcbiAgICAgICAgLy8gdGhhdCBhcmUgdXNlZCB0byByZXVzZSB0aGUgYHBhdGhgIHByb3BlcnR5XHJcbiAgICAgICAgY29uc3QgZGVwdGggPSBjb21wdXRlZCgoKSA9PiB7XHJcbiAgICAgICAgICAgIGxldCBpbml0aWFsRGVwdGggPSB1bnJlZihpbmplY3RlZERlcHRoKTtcclxuICAgICAgICAgICAgY29uc3QgeyBtYXRjaGVkIH0gPSByb3V0ZVRvRGlzcGxheS52YWx1ZTtcclxuICAgICAgICAgICAgbGV0IG1hdGNoZWRSb3V0ZTtcclxuICAgICAgICAgICAgd2hpbGUgKChtYXRjaGVkUm91dGUgPSBtYXRjaGVkW2luaXRpYWxEZXB0aF0pICYmXHJcbiAgICAgICAgICAgICAgICAhbWF0Y2hlZFJvdXRlLmNvbXBvbmVudHMpIHtcclxuICAgICAgICAgICAgICAgIGluaXRpYWxEZXB0aCsrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBpbml0aWFsRGVwdGg7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgY29uc3QgbWF0Y2hlZFJvdXRlUmVmID0gY29tcHV0ZWQoKCkgPT4gcm91dGVUb0Rpc3BsYXkudmFsdWUubWF0Y2hlZFtkZXB0aC52YWx1ZV0pO1xyXG4gICAgICAgIHByb3ZpZGUodmlld0RlcHRoS2V5LCBjb21wdXRlZCgoKSA9PiBkZXB0aC52YWx1ZSArIDEpKTtcclxuICAgICAgICBwcm92aWRlKG1hdGNoZWRSb3V0ZUtleSwgbWF0Y2hlZFJvdXRlUmVmKTtcclxuICAgICAgICBwcm92aWRlKHJvdXRlclZpZXdMb2NhdGlvbktleSwgcm91dGVUb0Rpc3BsYXkpO1xyXG4gICAgICAgIGNvbnN0IHZpZXdSZWYgPSByZWYoKTtcclxuICAgICAgICAvLyB3YXRjaCBhdCB0aGUgc2FtZSB0aW1lIHRoZSBjb21wb25lbnQgaW5zdGFuY2UsIHRoZSByb3V0ZSByZWNvcmQgd2UgYXJlXHJcbiAgICAgICAgLy8gcmVuZGVyaW5nLCBhbmQgdGhlIG5hbWVcclxuICAgICAgICB3YXRjaCgoKSA9PiBbdmlld1JlZi52YWx1ZSwgbWF0Y2hlZFJvdXRlUmVmLnZhbHVlLCBwcm9wcy5uYW1lXSwgKFtpbnN0YW5jZSwgdG8sIG5hbWVdLCBbb2xkSW5zdGFuY2UsIGZyb20sIG9sZE5hbWVdKSA9PiB7XHJcbiAgICAgICAgICAgIC8vIGNvcHkgcmV1c2VkIGluc3RhbmNlc1xyXG4gICAgICAgICAgICBpZiAodG8pIHtcclxuICAgICAgICAgICAgICAgIC8vIHRoaXMgd2lsbCB1cGRhdGUgdGhlIGluc3RhbmNlIGZvciBuZXcgaW5zdGFuY2VzIGFzIHdlbGwgYXMgcmV1c2VkXHJcbiAgICAgICAgICAgICAgICAvLyBpbnN0YW5jZXMgd2hlbiBuYXZpZ2F0aW5nIHRvIGEgbmV3IHJvdXRlXHJcbiAgICAgICAgICAgICAgICB0by5pbnN0YW5jZXNbbmFtZV0gPSBpbnN0YW5jZTtcclxuICAgICAgICAgICAgICAgIC8vIHRoZSBjb21wb25lbnQgaW5zdGFuY2UgaXMgcmV1c2VkIGZvciBhIGRpZmZlcmVudCByb3V0ZSBvciBuYW1lLCBzb1xyXG4gICAgICAgICAgICAgICAgLy8gd2UgY29weSBhbnkgc2F2ZWQgdXBkYXRlIG9yIGxlYXZlIGd1YXJkcy4gV2l0aCBhc3luYyBzZXR1cCwgdGhlXHJcbiAgICAgICAgICAgICAgICAvLyBtb3VudGluZyBjb21wb25lbnQgd2lsbCBtb3VudCBiZWZvcmUgdGhlIG1hdGNoZWRSb3V0ZSBjaGFuZ2VzLFxyXG4gICAgICAgICAgICAgICAgLy8gbWFraW5nIGluc3RhbmNlID09PSBvbGRJbnN0YW5jZSwgc28gd2UgY2hlY2sgaWYgZ3VhcmRzIGhhdmUgYmVlblxyXG4gICAgICAgICAgICAgICAgLy8gYWRkZWQgYmVmb3JlLiBUaGlzIHdvcmtzIGJlY2F1c2Ugd2UgcmVtb3ZlIGd1YXJkcyB3aGVuXHJcbiAgICAgICAgICAgICAgICAvLyB1bm1vdW50aW5nL2RlYWN0aXZhdGluZyBjb21wb25lbnRzXHJcbiAgICAgICAgICAgICAgICBpZiAoZnJvbSAmJiBmcm9tICE9PSB0byAmJiBpbnN0YW5jZSAmJiBpbnN0YW5jZSA9PT0gb2xkSW5zdGFuY2UpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXRvLmxlYXZlR3VhcmRzLnNpemUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdG8ubGVhdmVHdWFyZHMgPSBmcm9tLmxlYXZlR3VhcmRzO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXRvLnVwZGF0ZUd1YXJkcy5zaXplKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvLnVwZGF0ZUd1YXJkcyA9IGZyb20udXBkYXRlR3VhcmRzO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyB0cmlnZ2VyIGJlZm9yZVJvdXRlRW50ZXIgbmV4dCBjYWxsYmFja3NcclxuICAgICAgICAgICAgaWYgKGluc3RhbmNlICYmXHJcbiAgICAgICAgICAgICAgICB0byAmJlxyXG4gICAgICAgICAgICAgICAgLy8gaWYgdGhlcmUgaXMgbm8gaW5zdGFuY2UgYnV0IHRvIGFuZCBmcm9tIGFyZSB0aGUgc2FtZSB0aGlzIG1pZ2h0IGJlXHJcbiAgICAgICAgICAgICAgICAvLyB0aGUgZmlyc3QgdmlzaXRcclxuICAgICAgICAgICAgICAgICghZnJvbSB8fCAhaXNTYW1lUm91dGVSZWNvcmQodG8sIGZyb20pIHx8ICFvbGRJbnN0YW5jZSkpIHtcclxuICAgICAgICAgICAgICAgICh0by5lbnRlckNhbGxiYWNrc1tuYW1lXSB8fCBbXSkuZm9yRWFjaChjYWxsYmFjayA9PiBjYWxsYmFjayhpbnN0YW5jZSkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSwgeyBmbHVzaDogJ3Bvc3QnIH0pO1xyXG4gICAgICAgIHJldHVybiAoKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJvdXRlID0gcm91dGVUb0Rpc3BsYXkudmFsdWU7XHJcbiAgICAgICAgICAgIC8vIHdlIG5lZWQgdGhlIHZhbHVlIGF0IHRoZSB0aW1lIHdlIHJlbmRlciBiZWNhdXNlIHdoZW4gd2UgdW5tb3VudCwgd2VcclxuICAgICAgICAgICAgLy8gbmF2aWdhdGVkIHRvIGEgZGlmZmVyZW50IGxvY2F0aW9uIHNvIHRoZSB2YWx1ZSBpcyBkaWZmZXJlbnRcclxuICAgICAgICAgICAgY29uc3QgY3VycmVudE5hbWUgPSBwcm9wcy5uYW1lO1xyXG4gICAgICAgICAgICBjb25zdCBtYXRjaGVkUm91dGUgPSBtYXRjaGVkUm91dGVSZWYudmFsdWU7XHJcbiAgICAgICAgICAgIGNvbnN0IFZpZXdDb21wb25lbnQgPSBtYXRjaGVkUm91dGUgJiYgbWF0Y2hlZFJvdXRlLmNvbXBvbmVudHNbY3VycmVudE5hbWVdO1xyXG4gICAgICAgICAgICBpZiAoIVZpZXdDb21wb25lbnQpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBub3JtYWxpemVTbG90KHNsb3RzLmRlZmF1bHQsIHsgQ29tcG9uZW50OiBWaWV3Q29tcG9uZW50LCByb3V0ZSB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyBwcm9wcyBmcm9tIHJvdXRlIGNvbmZpZ3VyYXRpb25cclxuICAgICAgICAgICAgY29uc3Qgcm91dGVQcm9wc09wdGlvbiA9IG1hdGNoZWRSb3V0ZS5wcm9wc1tjdXJyZW50TmFtZV07XHJcbiAgICAgICAgICAgIGNvbnN0IHJvdXRlUHJvcHMgPSByb3V0ZVByb3BzT3B0aW9uXHJcbiAgICAgICAgICAgICAgICA/IHJvdXRlUHJvcHNPcHRpb24gPT09IHRydWVcclxuICAgICAgICAgICAgICAgICAgICA/IHJvdXRlLnBhcmFtc1xyXG4gICAgICAgICAgICAgICAgICAgIDogdHlwZW9mIHJvdXRlUHJvcHNPcHRpb24gPT09ICdmdW5jdGlvbidcclxuICAgICAgICAgICAgICAgICAgICAgICAgPyByb3V0ZVByb3BzT3B0aW9uKHJvdXRlKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICA6IHJvdXRlUHJvcHNPcHRpb25cclxuICAgICAgICAgICAgICAgIDogbnVsbDtcclxuICAgICAgICAgICAgY29uc3Qgb25Wbm9kZVVubW91bnRlZCA9IHZub2RlID0+IHtcclxuICAgICAgICAgICAgICAgIC8vIHJlbW92ZSB0aGUgaW5zdGFuY2UgcmVmZXJlbmNlIHRvIHByZXZlbnQgbGVha1xyXG4gICAgICAgICAgICAgICAgaWYgKHZub2RlLmNvbXBvbmVudC5pc1VubW91bnRlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIG1hdGNoZWRSb3V0ZS5pbnN0YW5jZXNbY3VycmVudE5hbWVdID0gbnVsbDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgY29uc3QgY29tcG9uZW50ID0gaChWaWV3Q29tcG9uZW50LCBhc3NpZ24oe30sIHJvdXRlUHJvcHMsIGF0dHJzLCB7XHJcbiAgICAgICAgICAgICAgICBvblZub2RlVW5tb3VudGVkLFxyXG4gICAgICAgICAgICAgICAgcmVmOiB2aWV3UmVmLFxyXG4gICAgICAgICAgICB9KSk7XHJcbiAgICAgICAgICAgIGlmICgoKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicpIHx8IF9fVlVFX1BST0RfREVWVE9PTFNfXykgJiZcclxuICAgICAgICAgICAgICAgIGlzQnJvd3NlciAmJlxyXG4gICAgICAgICAgICAgICAgY29tcG9uZW50LnJlZikge1xyXG4gICAgICAgICAgICAgICAgLy8gVE9ETzogY2FuIGRpc3BsYXkgaWYgaXQncyBhbiBhbGlhcywgaXRzIHByb3BzXHJcbiAgICAgICAgICAgICAgICBjb25zdCBpbmZvID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIGRlcHRoOiBkZXB0aC52YWx1ZSxcclxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBtYXRjaGVkUm91dGUubmFtZSxcclxuICAgICAgICAgICAgICAgICAgICBwYXRoOiBtYXRjaGVkUm91dGUucGF0aCxcclxuICAgICAgICAgICAgICAgICAgICBtZXRhOiBtYXRjaGVkUm91dGUubWV0YSxcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICBjb25zdCBpbnRlcm5hbEluc3RhbmNlcyA9IGlzQXJyYXkoY29tcG9uZW50LnJlZilcclxuICAgICAgICAgICAgICAgICAgICA/IGNvbXBvbmVudC5yZWYubWFwKHIgPT4gci5pKVxyXG4gICAgICAgICAgICAgICAgICAgIDogW2NvbXBvbmVudC5yZWYuaV07XHJcbiAgICAgICAgICAgICAgICBpbnRlcm5hbEluc3RhbmNlcy5mb3JFYWNoKGluc3RhbmNlID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBAdHMtZXhwZWN0LWVycm9yXHJcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UuX192cnZfZGV2dG9vbHMgPSBpbmZvO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIChcclxuICAgICAgICAgICAgLy8gcGFzcyB0aGUgdm5vZGUgdG8gdGhlIHNsb3QgYXMgYSBwcm9wLlxyXG4gICAgICAgICAgICAvLyBoIGFuZCA8Y29tcG9uZW50IDppcz1cIi4uLlwiPiBib3RoIGFjY2VwdCB2bm9kZXNcclxuICAgICAgICAgICAgbm9ybWFsaXplU2xvdChzbG90cy5kZWZhdWx0LCB7IENvbXBvbmVudDogY29tcG9uZW50LCByb3V0ZSB9KSB8fFxyXG4gICAgICAgICAgICAgICAgY29tcG9uZW50KTtcclxuICAgICAgICB9O1xyXG4gICAgfSxcclxufSk7XHJcbmZ1bmN0aW9uIG5vcm1hbGl6ZVNsb3Qoc2xvdCwgZGF0YSkge1xyXG4gICAgaWYgKCFzbG90KVxyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgY29uc3Qgc2xvdENvbnRlbnQgPSBzbG90KGRhdGEpO1xyXG4gICAgcmV0dXJuIHNsb3RDb250ZW50Lmxlbmd0aCA9PT0gMSA/IHNsb3RDb250ZW50WzBdIDogc2xvdENvbnRlbnQ7XHJcbn1cclxuLy8gZXhwb3J0IHRoZSBwdWJsaWMgdHlwZSBmb3IgaC90c3ggaW5mZXJlbmNlXHJcbi8vIGFsc28gdG8gYXZvaWQgaW5saW5lIGltcG9ydCgpIGluIGdlbmVyYXRlZCBkLnRzIGZpbGVzXHJcbi8qKlxyXG4gKiBDb21wb25lbnQgdG8gZGlzcGxheSB0aGUgY3VycmVudCByb3V0ZSB0aGUgdXNlciBpcyBhdC5cclxuICovXHJcbmNvbnN0IFJvdXRlclZpZXcgPSBSb3V0ZXJWaWV3SW1wbDtcclxuLy8gd2FybiBhZ2FpbnN0IGRlcHJlY2F0ZWQgdXNhZ2Ugd2l0aCA8dHJhbnNpdGlvbj4gJiA8a2VlcC1hbGl2ZT5cclxuLy8gZHVlIHRvIGZ1bmN0aW9uYWwgY29tcG9uZW50IGJlaW5nIG5vIGxvbmdlciBlYWdlciBpbiBWdWUgM1xyXG5mdW5jdGlvbiB3YXJuRGVwcmVjYXRlZFVzYWdlKCkge1xyXG4gICAgY29uc3QgaW5zdGFuY2UgPSBnZXRDdXJyZW50SW5zdGFuY2UoKTtcclxuICAgIGNvbnN0IHBhcmVudE5hbWUgPSBpbnN0YW5jZS5wYXJlbnQgJiYgaW5zdGFuY2UucGFyZW50LnR5cGUubmFtZTtcclxuICAgIGlmIChwYXJlbnROYW1lICYmXHJcbiAgICAgICAgKHBhcmVudE5hbWUgPT09ICdLZWVwQWxpdmUnIHx8IHBhcmVudE5hbWUuaW5jbHVkZXMoJ1RyYW5zaXRpb24nKSkpIHtcclxuICAgICAgICBjb25zdCBjb21wID0gcGFyZW50TmFtZSA9PT0gJ0tlZXBBbGl2ZScgPyAna2VlcC1hbGl2ZScgOiAndHJhbnNpdGlvbic7XHJcbiAgICAgICAgd2FybihgPHJvdXRlci12aWV3PiBjYW4gbm8gbG9uZ2VyIGJlIHVzZWQgZGlyZWN0bHkgaW5zaWRlIDx0cmFuc2l0aW9uPiBvciA8a2VlcC1hbGl2ZT4uXFxuYCArXHJcbiAgICAgICAgICAgIGBVc2Ugc2xvdCBwcm9wcyBpbnN0ZWFkOlxcblxcbmAgK1xyXG4gICAgICAgICAgICBgPHJvdXRlci12aWV3IHYtc2xvdD1cInsgQ29tcG9uZW50IH1cIj5cXG5gICtcclxuICAgICAgICAgICAgYCAgPCR7Y29tcH0+XFxuYCArXHJcbiAgICAgICAgICAgIGAgICAgPGNvbXBvbmVudCA6aXM9XCJDb21wb25lbnRcIiAvPlxcbmAgK1xyXG4gICAgICAgICAgICBgICA8LyR7Y29tcH0+XFxuYCArXHJcbiAgICAgICAgICAgIGA8L3JvdXRlci12aWV3PmApO1xyXG4gICAgfVxyXG59XG5cbi8qKlxyXG4gKiBDb3BpZXMgYSByb3V0ZSBsb2NhdGlvbiBhbmQgcmVtb3ZlcyBhbnkgcHJvYmxlbWF0aWMgcHJvcGVydGllcyB0aGF0IGNhbm5vdCBiZSBzaG93biBpbiBkZXZ0b29scyAoZS5nLiBWdWUgaW5zdGFuY2VzKS5cclxuICpcclxuICogQHBhcmFtIHJvdXRlTG9jYXRpb24gLSByb3V0ZUxvY2F0aW9uIHRvIGZvcm1hdFxyXG4gKiBAcGFyYW0gdG9vbHRpcCAtIG9wdGlvbmFsIHRvb2x0aXBcclxuICogQHJldHVybnMgYSBjb3B5IG9mIHRoZSByb3V0ZUxvY2F0aW9uXHJcbiAqL1xyXG5mdW5jdGlvbiBmb3JtYXRSb3V0ZUxvY2F0aW9uKHJvdXRlTG9jYXRpb24sIHRvb2x0aXApIHtcclxuICAgIGNvbnN0IGNvcHkgPSBhc3NpZ24oe30sIHJvdXRlTG9jYXRpb24sIHtcclxuICAgICAgICAvLyByZW1vdmUgdmFyaWFibGVzIHRoYXQgY2FuIGNvbnRhaW4gdnVlIGluc3RhbmNlc1xyXG4gICAgICAgIG1hdGNoZWQ6IHJvdXRlTG9jYXRpb24ubWF0Y2hlZC5tYXAobWF0Y2hlZCA9PiBvbWl0KG1hdGNoZWQsIFsnaW5zdGFuY2VzJywgJ2NoaWxkcmVuJywgJ2FsaWFzT2YnXSkpLFxyXG4gICAgfSk7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIF9jdXN0b206IHtcclxuICAgICAgICAgICAgdHlwZTogbnVsbCxcclxuICAgICAgICAgICAgcmVhZE9ubHk6IHRydWUsXHJcbiAgICAgICAgICAgIGRpc3BsYXk6IHJvdXRlTG9jYXRpb24uZnVsbFBhdGgsXHJcbiAgICAgICAgICAgIHRvb2x0aXAsXHJcbiAgICAgICAgICAgIHZhbHVlOiBjb3B5LFxyXG4gICAgICAgIH0sXHJcbiAgICB9O1xyXG59XHJcbmZ1bmN0aW9uIGZvcm1hdERpc3BsYXkoZGlzcGxheSkge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBfY3VzdG9tOiB7XHJcbiAgICAgICAgICAgIGRpc3BsYXksXHJcbiAgICAgICAgfSxcclxuICAgIH07XHJcbn1cclxuLy8gdG8gc3VwcG9ydCBtdWx0aXBsZSByb3V0ZXIgaW5zdGFuY2VzXHJcbmxldCByb3V0ZXJJZCA9IDA7XHJcbmZ1bmN0aW9uIGFkZERldnRvb2xzKGFwcCwgcm91dGVyLCBtYXRjaGVyKSB7XHJcbiAgICAvLyBUYWtlIG92ZXIgcm91dGVyLmJlZm9yZUVhY2ggYW5kIGFmdGVyRWFjaFxyXG4gICAgLy8gbWFrZSBzdXJlIHdlIGFyZSBub3QgcmVnaXN0ZXJpbmcgdGhlIGRldnRvb2wgdHdpY2VcclxuICAgIGlmIChyb3V0ZXIuX19oYXNEZXZ0b29scylcclxuICAgICAgICByZXR1cm47XHJcbiAgICByb3V0ZXIuX19oYXNEZXZ0b29scyA9IHRydWU7XHJcbiAgICAvLyBpbmNyZW1lbnQgdG8gc3VwcG9ydCBtdWx0aXBsZSByb3V0ZXIgaW5zdGFuY2VzXHJcbiAgICBjb25zdCBpZCA9IHJvdXRlcklkKys7XHJcbiAgICBzZXR1cERldnRvb2xzUGx1Z2luKHtcclxuICAgICAgICBpZDogJ29yZy52dWVqcy5yb3V0ZXInICsgKGlkID8gJy4nICsgaWQgOiAnJyksXHJcbiAgICAgICAgbGFiZWw6ICdWdWUgUm91dGVyJyxcclxuICAgICAgICBwYWNrYWdlTmFtZTogJ3Z1ZS1yb3V0ZXInLFxyXG4gICAgICAgIGhvbWVwYWdlOiAnaHR0cHM6Ly9yb3V0ZXIudnVlanMub3JnJyxcclxuICAgICAgICBsb2dvOiAnaHR0cHM6Ly9yb3V0ZXIudnVlanMub3JnL2xvZ28ucG5nJyxcclxuICAgICAgICBjb21wb25lbnRTdGF0ZVR5cGVzOiBbJ1JvdXRpbmcnXSxcclxuICAgICAgICBhcHAsXHJcbiAgICB9LCBhcGkgPT4ge1xyXG4gICAgICAgIGlmICh0eXBlb2YgYXBpLm5vdyAhPT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ1tWdWUgUm91dGVyXTogWW91IHNlZW0gdG8gYmUgdXNpbmcgYW4gb3V0ZGF0ZWQgdmVyc2lvbiBvZiBWdWUgRGV2dG9vbHMuIEFyZSB5b3Ugc3RpbGwgdXNpbmcgdGhlIEJldGEgcmVsZWFzZSBpbnN0ZWFkIG9mIHRoZSBzdGFibGUgb25lPyBZb3UgY2FuIGZpbmQgdGhlIGxpbmtzIGF0IGh0dHBzOi8vZGV2dG9vbHMudnVlanMub3JnL2d1aWRlL2luc3RhbGxhdGlvbi5odG1sLicpO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBkaXNwbGF5IHN0YXRlIGFkZGVkIGJ5IHRoZSByb3V0ZXJcclxuICAgICAgICBhcGkub24uaW5zcGVjdENvbXBvbmVudCgocGF5bG9hZCwgY3R4KSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChwYXlsb2FkLmluc3RhbmNlRGF0YSkge1xyXG4gICAgICAgICAgICAgICAgcGF5bG9hZC5pbnN0YW5jZURhdGEuc3RhdGUucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ1JvdXRpbmcnLFxyXG4gICAgICAgICAgICAgICAgICAgIGtleTogJyRyb3V0ZScsXHJcbiAgICAgICAgICAgICAgICAgICAgZWRpdGFibGU6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBmb3JtYXRSb3V0ZUxvY2F0aW9uKHJvdXRlci5jdXJyZW50Um91dGUudmFsdWUsICdDdXJyZW50IFJvdXRlJyksXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIC8vIG1hcmsgcm91dGVyLWxpbmsgYXMgYWN0aXZlIGFuZCBkaXNwbGF5IHRhZ3Mgb24gcm91dGVyIHZpZXdzXHJcbiAgICAgICAgYXBpLm9uLnZpc2l0Q29tcG9uZW50VHJlZSgoeyB0cmVlTm9kZTogbm9kZSwgY29tcG9uZW50SW5zdGFuY2UgfSkgPT4ge1xyXG4gICAgICAgICAgICBpZiAoY29tcG9uZW50SW5zdGFuY2UuX192cnZfZGV2dG9vbHMpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGluZm8gPSBjb21wb25lbnRJbnN0YW5jZS5fX3Zydl9kZXZ0b29scztcclxuICAgICAgICAgICAgICAgIG5vZGUudGFncy5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICBsYWJlbDogKGluZm8ubmFtZSA/IGAke2luZm8ubmFtZS50b1N0cmluZygpfTogYCA6ICcnKSArIGluZm8ucGF0aCxcclxuICAgICAgICAgICAgICAgICAgICB0ZXh0Q29sb3I6IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgdG9vbHRpcDogJ1RoaXMgY29tcG9uZW50IGlzIHJlbmRlcmVkIGJ5ICZsdDtyb3V0ZXItdmlldyZndDsnLFxyXG4gICAgICAgICAgICAgICAgICAgIGJhY2tncm91bmRDb2xvcjogUElOS181MDAsXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyBpZiBtdWx0aXBsZSB1c2VMaW5rIGFyZSB1c2VkXHJcbiAgICAgICAgICAgIGlmIChpc0FycmF5KGNvbXBvbmVudEluc3RhbmNlLl9fdnJsX2RldnRvb2xzKSkge1xyXG4gICAgICAgICAgICAgICAgY29tcG9uZW50SW5zdGFuY2UuX19kZXZ0b29sc0FwaSA9IGFwaTtcclxuICAgICAgICAgICAgICAgIGNvbXBvbmVudEluc3RhbmNlLl9fdnJsX2RldnRvb2xzLmZvckVhY2goZGV2dG9vbHNEYXRhID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgYmFja2dyb3VuZENvbG9yID0gT1JBTkdFXzQwMDtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgdG9vbHRpcCA9ICcnO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChkZXZ0b29sc0RhdGEuaXNFeGFjdEFjdGl2ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kQ29sb3IgPSBMSU1FXzUwMDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdG9vbHRpcCA9ICdUaGlzIGlzIGV4YWN0bHkgYWN0aXZlJztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoZGV2dG9vbHNEYXRhLmlzQWN0aXZlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJhY2tncm91bmRDb2xvciA9IEJMVUVfNjAwO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0b29sdGlwID0gJ1RoaXMgbGluayBpcyBhY3RpdmUnO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBub2RlLnRhZ3MucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxhYmVsOiBkZXZ0b29sc0RhdGEucm91dGUucGF0aCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dENvbG9yOiAwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0b29sdGlwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kQ29sb3IsXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHdhdGNoKHJvdXRlci5jdXJyZW50Um91dGUsICgpID0+IHtcclxuICAgICAgICAgICAgLy8gcmVmcmVzaCBhY3RpdmUgc3RhdGVcclxuICAgICAgICAgICAgcmVmcmVzaFJvdXRlc1ZpZXcoKTtcclxuICAgICAgICAgICAgYXBpLm5vdGlmeUNvbXBvbmVudFVwZGF0ZSgpO1xyXG4gICAgICAgICAgICBhcGkuc2VuZEluc3BlY3RvclRyZWUocm91dGVySW5zcGVjdG9ySWQpO1xyXG4gICAgICAgICAgICBhcGkuc2VuZEluc3BlY3RvclN0YXRlKHJvdXRlckluc3BlY3RvcklkKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICBjb25zdCBuYXZpZ2F0aW9uc0xheWVySWQgPSAncm91dGVyOm5hdmlnYXRpb25zOicgKyBpZDtcclxuICAgICAgICBhcGkuYWRkVGltZWxpbmVMYXllcih7XHJcbiAgICAgICAgICAgIGlkOiBuYXZpZ2F0aW9uc0xheWVySWQsXHJcbiAgICAgICAgICAgIGxhYmVsOiBgUm91dGVyJHtpZCA/ICcgJyArIGlkIDogJyd9IE5hdmlnYXRpb25zYCxcclxuICAgICAgICAgICAgY29sb3I6IDB4NDBhOGM0LFxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIC8vIGNvbnN0IGVycm9yc0xheWVySWQgPSAncm91dGVyOmVycm9ycydcclxuICAgICAgICAvLyBhcGkuYWRkVGltZWxpbmVMYXllcih7XHJcbiAgICAgICAgLy8gICBpZDogZXJyb3JzTGF5ZXJJZCxcclxuICAgICAgICAvLyAgIGxhYmVsOiAnUm91dGVyIEVycm9ycycsXHJcbiAgICAgICAgLy8gICBjb2xvcjogMHhlYTU0NTUsXHJcbiAgICAgICAgLy8gfSlcclxuICAgICAgICByb3V0ZXIub25FcnJvcigoZXJyb3IsIHRvKSA9PiB7XHJcbiAgICAgICAgICAgIGFwaS5hZGRUaW1lbGluZUV2ZW50KHtcclxuICAgICAgICAgICAgICAgIGxheWVySWQ6IG5hdmlnYXRpb25zTGF5ZXJJZCxcclxuICAgICAgICAgICAgICAgIGV2ZW50OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGl0bGU6ICdFcnJvciBkdXJpbmcgTmF2aWdhdGlvbicsXHJcbiAgICAgICAgICAgICAgICAgICAgc3VidGl0bGU6IHRvLmZ1bGxQYXRoLFxyXG4gICAgICAgICAgICAgICAgICAgIGxvZ1R5cGU6ICdlcnJvcicsXHJcbiAgICAgICAgICAgICAgICAgICAgdGltZTogYXBpLm5vdygpLFxyXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHsgZXJyb3IgfSxcclxuICAgICAgICAgICAgICAgICAgICBncm91cElkOiB0by5tZXRhLl9fbmF2aWdhdGlvbklkLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgLy8gYXR0YWNoZWQgdG8gYG1ldGFgIGFuZCB1c2VkIHRvIGdyb3VwIGV2ZW50c1xyXG4gICAgICAgIGxldCBuYXZpZ2F0aW9uSWQgPSAwO1xyXG4gICAgICAgIHJvdXRlci5iZWZvcmVFYWNoKCh0bywgZnJvbSkgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBkYXRhID0ge1xyXG4gICAgICAgICAgICAgICAgZ3VhcmQ6IGZvcm1hdERpc3BsYXkoJ2JlZm9yZUVhY2gnKSxcclxuICAgICAgICAgICAgICAgIGZyb206IGZvcm1hdFJvdXRlTG9jYXRpb24oZnJvbSwgJ0N1cnJlbnQgTG9jYXRpb24gZHVyaW5nIHRoaXMgbmF2aWdhdGlvbicpLFxyXG4gICAgICAgICAgICAgICAgdG86IGZvcm1hdFJvdXRlTG9jYXRpb24odG8sICdUYXJnZXQgbG9jYXRpb24nKSxcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgLy8gVXNlZCB0byBncm91cCBuYXZpZ2F0aW9ucyB0b2dldGhlciwgaGlkZSBmcm9tIGRldnRvb2xzXHJcbiAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0by5tZXRhLCAnX19uYXZpZ2F0aW9uSWQnLCB7XHJcbiAgICAgICAgICAgICAgICB2YWx1ZTogbmF2aWdhdGlvbklkKyssXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBhcGkuYWRkVGltZWxpbmVFdmVudCh7XHJcbiAgICAgICAgICAgICAgICBsYXllcklkOiBuYXZpZ2F0aW9uc0xheWVySWQsXHJcbiAgICAgICAgICAgICAgICBldmVudDoge1xyXG4gICAgICAgICAgICAgICAgICAgIHRpbWU6IGFwaS5ub3coKSxcclxuICAgICAgICAgICAgICAgICAgICB0aXRsZTogJ1N0YXJ0IG9mIG5hdmlnYXRpb24nLFxyXG4gICAgICAgICAgICAgICAgICAgIHN1YnRpdGxlOiB0by5mdWxsUGF0aCxcclxuICAgICAgICAgICAgICAgICAgICBkYXRhLFxyXG4gICAgICAgICAgICAgICAgICAgIGdyb3VwSWQ6IHRvLm1ldGEuX19uYXZpZ2F0aW9uSWQsXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgICAgICByb3V0ZXIuYWZ0ZXJFYWNoKCh0bywgZnJvbSwgZmFpbHVyZSkgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBkYXRhID0ge1xyXG4gICAgICAgICAgICAgICAgZ3VhcmQ6IGZvcm1hdERpc3BsYXkoJ2FmdGVyRWFjaCcpLFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICBpZiAoZmFpbHVyZSkge1xyXG4gICAgICAgICAgICAgICAgZGF0YS5mYWlsdXJlID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIF9jdXN0b206IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogRXJyb3IsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlYWRPbmx5OiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkaXNwbGF5OiBmYWlsdXJlID8gZmFpbHVyZS5tZXNzYWdlIDogJycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvb2x0aXA6ICdOYXZpZ2F0aW9uIEZhaWx1cmUnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogZmFpbHVyZSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIGRhdGEuc3RhdHVzID0gZm9ybWF0RGlzcGxheSgn4p2MJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBkYXRhLnN0YXR1cyA9IGZvcm1hdERpc3BsYXkoJ+KchScpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIHdlIHNldCBoZXJlIHRvIGhhdmUgdGhlIHJpZ2h0IG9yZGVyXHJcbiAgICAgICAgICAgIGRhdGEuZnJvbSA9IGZvcm1hdFJvdXRlTG9jYXRpb24oZnJvbSwgJ0N1cnJlbnQgTG9jYXRpb24gZHVyaW5nIHRoaXMgbmF2aWdhdGlvbicpO1xyXG4gICAgICAgICAgICBkYXRhLnRvID0gZm9ybWF0Um91dGVMb2NhdGlvbih0bywgJ1RhcmdldCBsb2NhdGlvbicpO1xyXG4gICAgICAgICAgICBhcGkuYWRkVGltZWxpbmVFdmVudCh7XHJcbiAgICAgICAgICAgICAgICBsYXllcklkOiBuYXZpZ2F0aW9uc0xheWVySWQsXHJcbiAgICAgICAgICAgICAgICBldmVudDoge1xyXG4gICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnRW5kIG9mIG5hdmlnYXRpb24nLFxyXG4gICAgICAgICAgICAgICAgICAgIHN1YnRpdGxlOiB0by5mdWxsUGF0aCxcclxuICAgICAgICAgICAgICAgICAgICB0aW1lOiBhcGkubm93KCksXHJcbiAgICAgICAgICAgICAgICAgICAgZGF0YSxcclxuICAgICAgICAgICAgICAgICAgICBsb2dUeXBlOiBmYWlsdXJlID8gJ3dhcm5pbmcnIDogJ2RlZmF1bHQnLFxyXG4gICAgICAgICAgICAgICAgICAgIGdyb3VwSWQ6IHRvLm1ldGEuX19uYXZpZ2F0aW9uSWQsXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBJbnNwZWN0b3Igb2YgRXhpc3Rpbmcgcm91dGVzXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgY29uc3Qgcm91dGVySW5zcGVjdG9ySWQgPSAncm91dGVyLWluc3BlY3RvcjonICsgaWQ7XHJcbiAgICAgICAgYXBpLmFkZEluc3BlY3Rvcih7XHJcbiAgICAgICAgICAgIGlkOiByb3V0ZXJJbnNwZWN0b3JJZCxcclxuICAgICAgICAgICAgbGFiZWw6ICdSb3V0ZXMnICsgKGlkID8gJyAnICsgaWQgOiAnJyksXHJcbiAgICAgICAgICAgIGljb246ICdib29rJyxcclxuICAgICAgICAgICAgdHJlZUZpbHRlclBsYWNlaG9sZGVyOiAnU2VhcmNoIHJvdXRlcycsXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgZnVuY3Rpb24gcmVmcmVzaFJvdXRlc1ZpZXcoKSB7XHJcbiAgICAgICAgICAgIC8vIHRoZSByb3V0ZXMgdmlldyBpc24ndCBhY3RpdmVcclxuICAgICAgICAgICAgaWYgKCFhY3RpdmVSb3V0ZXNQYXlsb2FkKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICBjb25zdCBwYXlsb2FkID0gYWN0aXZlUm91dGVzUGF5bG9hZDtcclxuICAgICAgICAgICAgLy8gY2hpbGRyZW4gcm91dGVzIHdpbGwgYXBwZWFyIGFzIG5lc3RlZFxyXG4gICAgICAgICAgICBsZXQgcm91dGVzID0gbWF0Y2hlci5nZXRSb3V0ZXMoKS5maWx0ZXIocm91dGUgPT4gIXJvdXRlLnBhcmVudCk7XHJcbiAgICAgICAgICAgIC8vIHJlc2V0IG1hdGNoIHN0YXRlIHRvIGZhbHNlXHJcbiAgICAgICAgICAgIHJvdXRlcy5mb3JFYWNoKHJlc2V0TWF0Y2hTdGF0ZU9uUm91dGVSZWNvcmQpO1xyXG4gICAgICAgICAgICAvLyBhcHBseSBhIG1hdGNoIHN0YXRlIGlmIHRoZXJlIGlzIGEgcGF5bG9hZFxyXG4gICAgICAgICAgICBpZiAocGF5bG9hZC5maWx0ZXIpIHtcclxuICAgICAgICAgICAgICAgIHJvdXRlcyA9IHJvdXRlcy5maWx0ZXIocm91dGUgPT4gXHJcbiAgICAgICAgICAgICAgICAvLyBzYXZlIG1hdGNoZXMgc3RhdGUgYmFzZWQgb24gdGhlIHBheWxvYWRcclxuICAgICAgICAgICAgICAgIGlzUm91dGVNYXRjaGluZyhyb3V0ZSwgcGF5bG9hZC5maWx0ZXIudG9Mb3dlckNhc2UoKSkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIG1hcmsgYWN0aXZlIHJvdXRlc1xyXG4gICAgICAgICAgICByb3V0ZXMuZm9yRWFjaChyb3V0ZSA9PiBtYXJrUm91dGVSZWNvcmRBY3RpdmUocm91dGUsIHJvdXRlci5jdXJyZW50Um91dGUudmFsdWUpKTtcclxuICAgICAgICAgICAgcGF5bG9hZC5yb290Tm9kZXMgPSByb3V0ZXMubWFwKGZvcm1hdFJvdXRlUmVjb3JkRm9ySW5zcGVjdG9yKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgbGV0IGFjdGl2ZVJvdXRlc1BheWxvYWQ7XHJcbiAgICAgICAgYXBpLm9uLmdldEluc3BlY3RvclRyZWUocGF5bG9hZCA9PiB7XHJcbiAgICAgICAgICAgIGFjdGl2ZVJvdXRlc1BheWxvYWQgPSBwYXlsb2FkO1xyXG4gICAgICAgICAgICBpZiAocGF5bG9hZC5hcHAgPT09IGFwcCAmJiBwYXlsb2FkLmluc3BlY3RvcklkID09PSByb3V0ZXJJbnNwZWN0b3JJZCkge1xyXG4gICAgICAgICAgICAgICAgcmVmcmVzaFJvdXRlc1ZpZXcoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIERpc3BsYXkgaW5mb3JtYXRpb24gYWJvdXQgdGhlIGN1cnJlbnRseSBzZWxlY3RlZCByb3V0ZSByZWNvcmRcclxuICAgICAgICAgKi9cclxuICAgICAgICBhcGkub24uZ2V0SW5zcGVjdG9yU3RhdGUocGF5bG9hZCA9PiB7XHJcbiAgICAgICAgICAgIGlmIChwYXlsb2FkLmFwcCA9PT0gYXBwICYmIHBheWxvYWQuaW5zcGVjdG9ySWQgPT09IHJvdXRlckluc3BlY3RvcklkKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCByb3V0ZXMgPSBtYXRjaGVyLmdldFJvdXRlcygpO1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgcm91dGUgPSByb3V0ZXMuZmluZChyb3V0ZSA9PiByb3V0ZS5yZWNvcmQuX192ZF9pZCA9PT0gcGF5bG9hZC5ub2RlSWQpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHJvdXRlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcGF5bG9hZC5zdGF0ZSA9IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9uczogZm9ybWF0Um91dGVSZWNvcmRNYXRjaGVyRm9yU3RhdGVJbnNwZWN0b3Iocm91dGUpLFxyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgICBhcGkuc2VuZEluc3BlY3RvclRyZWUocm91dGVySW5zcGVjdG9ySWQpO1xyXG4gICAgICAgIGFwaS5zZW5kSW5zcGVjdG9yU3RhdGUocm91dGVySW5zcGVjdG9ySWQpO1xyXG4gICAgfSk7XHJcbn1cclxuZnVuY3Rpb24gbW9kaWZpZXJGb3JLZXkoa2V5KSB7XHJcbiAgICBpZiAoa2V5Lm9wdGlvbmFsKSB7XHJcbiAgICAgICAgcmV0dXJuIGtleS5yZXBlYXRhYmxlID8gJyonIDogJz8nO1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgICAgcmV0dXJuIGtleS5yZXBlYXRhYmxlID8gJysnIDogJyc7XHJcbiAgICB9XHJcbn1cclxuZnVuY3Rpb24gZm9ybWF0Um91dGVSZWNvcmRNYXRjaGVyRm9yU3RhdGVJbnNwZWN0b3Iocm91dGUpIHtcclxuICAgIGNvbnN0IHsgcmVjb3JkIH0gPSByb3V0ZTtcclxuICAgIGNvbnN0IGZpZWxkcyA9IFtcclxuICAgICAgICB7IGVkaXRhYmxlOiBmYWxzZSwga2V5OiAncGF0aCcsIHZhbHVlOiByZWNvcmQucGF0aCB9LFxyXG4gICAgXTtcclxuICAgIGlmIChyZWNvcmQubmFtZSAhPSBudWxsKSB7XHJcbiAgICAgICAgZmllbGRzLnB1c2goe1xyXG4gICAgICAgICAgICBlZGl0YWJsZTogZmFsc2UsXHJcbiAgICAgICAgICAgIGtleTogJ25hbWUnLFxyXG4gICAgICAgICAgICB2YWx1ZTogcmVjb3JkLm5hbWUsXHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBmaWVsZHMucHVzaCh7IGVkaXRhYmxlOiBmYWxzZSwga2V5OiAncmVnZXhwJywgdmFsdWU6IHJvdXRlLnJlIH0pO1xyXG4gICAgaWYgKHJvdXRlLmtleXMubGVuZ3RoKSB7XHJcbiAgICAgICAgZmllbGRzLnB1c2goe1xyXG4gICAgICAgICAgICBlZGl0YWJsZTogZmFsc2UsXHJcbiAgICAgICAgICAgIGtleTogJ2tleXMnLFxyXG4gICAgICAgICAgICB2YWx1ZToge1xyXG4gICAgICAgICAgICAgICAgX2N1c3RvbToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IG51bGwsXHJcbiAgICAgICAgICAgICAgICAgICAgcmVhZE9ubHk6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgZGlzcGxheTogcm91dGUua2V5c1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAubWFwKGtleSA9PiBgJHtrZXkubmFtZX0ke21vZGlmaWVyRm9yS2V5KGtleSl9YClcclxuICAgICAgICAgICAgICAgICAgICAgICAgLmpvaW4oJyAnKSxcclxuICAgICAgICAgICAgICAgICAgICB0b29sdGlwOiAnUGFyYW0ga2V5cycsXHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHJvdXRlLmtleXMsXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgaWYgKHJlY29yZC5yZWRpcmVjdCAhPSBudWxsKSB7XHJcbiAgICAgICAgZmllbGRzLnB1c2goe1xyXG4gICAgICAgICAgICBlZGl0YWJsZTogZmFsc2UsXHJcbiAgICAgICAgICAgIGtleTogJ3JlZGlyZWN0JyxcclxuICAgICAgICAgICAgdmFsdWU6IHJlY29yZC5yZWRpcmVjdCxcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGlmIChyb3V0ZS5hbGlhcy5sZW5ndGgpIHtcclxuICAgICAgICBmaWVsZHMucHVzaCh7XHJcbiAgICAgICAgICAgIGVkaXRhYmxlOiBmYWxzZSxcclxuICAgICAgICAgICAga2V5OiAnYWxpYXNlcycsXHJcbiAgICAgICAgICAgIHZhbHVlOiByb3V0ZS5hbGlhcy5tYXAoYWxpYXMgPT4gYWxpYXMucmVjb3JkLnBhdGgpLFxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgaWYgKE9iamVjdC5rZXlzKHJvdXRlLnJlY29yZC5tZXRhKS5sZW5ndGgpIHtcclxuICAgICAgICBmaWVsZHMucHVzaCh7XHJcbiAgICAgICAgICAgIGVkaXRhYmxlOiBmYWxzZSxcclxuICAgICAgICAgICAga2V5OiAnbWV0YScsXHJcbiAgICAgICAgICAgIHZhbHVlOiByb3V0ZS5yZWNvcmQubWV0YSxcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGZpZWxkcy5wdXNoKHtcclxuICAgICAgICBrZXk6ICdzY29yZScsXHJcbiAgICAgICAgZWRpdGFibGU6IGZhbHNlLFxyXG4gICAgICAgIHZhbHVlOiB7XHJcbiAgICAgICAgICAgIF9jdXN0b206IHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IG51bGwsXHJcbiAgICAgICAgICAgICAgICByZWFkT25seTogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIGRpc3BsYXk6IHJvdXRlLnNjb3JlLm1hcChzY29yZSA9PiBzY29yZS5qb2luKCcsICcpKS5qb2luKCcgfCAnKSxcclxuICAgICAgICAgICAgICAgIHRvb2x0aXA6ICdTY29yZSB1c2VkIHRvIHNvcnQgcm91dGVzJyxcclxuICAgICAgICAgICAgICAgIHZhbHVlOiByb3V0ZS5zY29yZSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICB9LFxyXG4gICAgfSk7XHJcbiAgICByZXR1cm4gZmllbGRzO1xyXG59XHJcbi8qKlxyXG4gKiBFeHRyYWN0ZWQgZnJvbSB0YWlsd2luZCBwYWxldHRlXHJcbiAqL1xyXG5jb25zdCBQSU5LXzUwMCA9IDB4ZWM0ODk5O1xyXG5jb25zdCBCTFVFXzYwMCA9IDB4MjU2M2ViO1xyXG5jb25zdCBMSU1FXzUwMCA9IDB4ODRjYzE2O1xyXG5jb25zdCBDWUFOXzQwMCA9IDB4MjJkM2VlO1xyXG5jb25zdCBPUkFOR0VfNDAwID0gMHhmYjkyM2M7XHJcbi8vIGNvbnN0IEdSQVlfMTAwID0gMHhmNGY0ZjVcclxuY29uc3QgREFSSyA9IDB4NjY2NjY2O1xyXG5mdW5jdGlvbiBmb3JtYXRSb3V0ZVJlY29yZEZvckluc3BlY3Rvcihyb3V0ZSkge1xyXG4gICAgY29uc3QgdGFncyA9IFtdO1xyXG4gICAgY29uc3QgeyByZWNvcmQgfSA9IHJvdXRlO1xyXG4gICAgaWYgKHJlY29yZC5uYW1lICE9IG51bGwpIHtcclxuICAgICAgICB0YWdzLnB1c2goe1xyXG4gICAgICAgICAgICBsYWJlbDogU3RyaW5nKHJlY29yZC5uYW1lKSxcclxuICAgICAgICAgICAgdGV4dENvbG9yOiAwLFxyXG4gICAgICAgICAgICBiYWNrZ3JvdW5kQ29sb3I6IENZQU5fNDAwLFxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgaWYgKHJlY29yZC5hbGlhc09mKSB7XHJcbiAgICAgICAgdGFncy5wdXNoKHtcclxuICAgICAgICAgICAgbGFiZWw6ICdhbGlhcycsXHJcbiAgICAgICAgICAgIHRleHRDb2xvcjogMCxcclxuICAgICAgICAgICAgYmFja2dyb3VuZENvbG9yOiBPUkFOR0VfNDAwLFxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgaWYgKHJvdXRlLl9fdmRfbWF0Y2gpIHtcclxuICAgICAgICB0YWdzLnB1c2goe1xyXG4gICAgICAgICAgICBsYWJlbDogJ21hdGNoZXMnLFxyXG4gICAgICAgICAgICB0ZXh0Q29sb3I6IDAsXHJcbiAgICAgICAgICAgIGJhY2tncm91bmRDb2xvcjogUElOS181MDAsXHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBpZiAocm91dGUuX192ZF9leGFjdEFjdGl2ZSkge1xyXG4gICAgICAgIHRhZ3MucHVzaCh7XHJcbiAgICAgICAgICAgIGxhYmVsOiAnZXhhY3QnLFxyXG4gICAgICAgICAgICB0ZXh0Q29sb3I6IDAsXHJcbiAgICAgICAgICAgIGJhY2tncm91bmRDb2xvcjogTElNRV81MDAsXHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBpZiAocm91dGUuX192ZF9hY3RpdmUpIHtcclxuICAgICAgICB0YWdzLnB1c2goe1xyXG4gICAgICAgICAgICBsYWJlbDogJ2FjdGl2ZScsXHJcbiAgICAgICAgICAgIHRleHRDb2xvcjogMCxcclxuICAgICAgICAgICAgYmFja2dyb3VuZENvbG9yOiBCTFVFXzYwMCxcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGlmIChyZWNvcmQucmVkaXJlY3QpIHtcclxuICAgICAgICB0YWdzLnB1c2goe1xyXG4gICAgICAgICAgICBsYWJlbDogdHlwZW9mIHJlY29yZC5yZWRpcmVjdCA9PT0gJ3N0cmluZydcclxuICAgICAgICAgICAgICAgID8gYHJlZGlyZWN0OiAke3JlY29yZC5yZWRpcmVjdH1gXHJcbiAgICAgICAgICAgICAgICA6ICdyZWRpcmVjdHMnLFxyXG4gICAgICAgICAgICB0ZXh0Q29sb3I6IDB4ZmZmZmZmLFxyXG4gICAgICAgICAgICBiYWNrZ3JvdW5kQ29sb3I6IERBUkssXHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICAvLyBhZGQgYW4gaWQgdG8gYmUgYWJsZSB0byBzZWxlY3QgaXQuIFVzaW5nIHRoZSBgcGF0aGAgaXMgbm90IHBvc3NpYmxlIGJlY2F1c2VcclxuICAgIC8vIGVtcHR5IHBhdGggY2hpbGRyZW4gd291bGQgY29sbGlkZSB3aXRoIHRoZWlyIHBhcmVudHNcclxuICAgIGxldCBpZCA9IHJlY29yZC5fX3ZkX2lkO1xyXG4gICAgaWYgKGlkID09IG51bGwpIHtcclxuICAgICAgICBpZCA9IFN0cmluZyhyb3V0ZVJlY29yZElkKyspO1xyXG4gICAgICAgIHJlY29yZC5fX3ZkX2lkID0gaWQ7XHJcbiAgICB9XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIGlkLFxyXG4gICAgICAgIGxhYmVsOiByZWNvcmQucGF0aCxcclxuICAgICAgICB0YWdzLFxyXG4gICAgICAgIGNoaWxkcmVuOiByb3V0ZS5jaGlsZHJlbi5tYXAoZm9ybWF0Um91dGVSZWNvcmRGb3JJbnNwZWN0b3IpLFxyXG4gICAgfTtcclxufVxyXG4vLyAgaW5jcmVtZW50YWwgaWQgZm9yIHJvdXRlIHJlY29yZHMgYW5kIGluc3BlY3RvciBzdGF0ZVxyXG5sZXQgcm91dGVSZWNvcmRJZCA9IDA7XHJcbmNvbnN0IEVYVFJBQ1RfUkVHRVhQX1JFID0gL15cXC8oLiopXFwvKFthLXpdKikkLztcclxuZnVuY3Rpb24gbWFya1JvdXRlUmVjb3JkQWN0aXZlKHJvdXRlLCBjdXJyZW50Um91dGUpIHtcclxuICAgIC8vIG5vIHJvdXRlIHdpbGwgYmUgYWN0aXZlIGlmIG1hdGNoZWQgaXMgZW1wdHlcclxuICAgIC8vIHJlc2V0IHRoZSBtYXRjaGluZyBzdGF0ZVxyXG4gICAgY29uc3QgaXNFeGFjdEFjdGl2ZSA9IGN1cnJlbnRSb3V0ZS5tYXRjaGVkLmxlbmd0aCAmJlxyXG4gICAgICAgIGlzU2FtZVJvdXRlUmVjb3JkKGN1cnJlbnRSb3V0ZS5tYXRjaGVkW2N1cnJlbnRSb3V0ZS5tYXRjaGVkLmxlbmd0aCAtIDFdLCByb3V0ZS5yZWNvcmQpO1xyXG4gICAgcm91dGUuX192ZF9leGFjdEFjdGl2ZSA9IHJvdXRlLl9fdmRfYWN0aXZlID0gaXNFeGFjdEFjdGl2ZTtcclxuICAgIGlmICghaXNFeGFjdEFjdGl2ZSkge1xyXG4gICAgICAgIHJvdXRlLl9fdmRfYWN0aXZlID0gY3VycmVudFJvdXRlLm1hdGNoZWQuc29tZShtYXRjaCA9PiBpc1NhbWVSb3V0ZVJlY29yZChtYXRjaCwgcm91dGUucmVjb3JkKSk7XHJcbiAgICB9XHJcbiAgICByb3V0ZS5jaGlsZHJlbi5mb3JFYWNoKGNoaWxkUm91dGUgPT4gbWFya1JvdXRlUmVjb3JkQWN0aXZlKGNoaWxkUm91dGUsIGN1cnJlbnRSb3V0ZSkpO1xyXG59XHJcbmZ1bmN0aW9uIHJlc2V0TWF0Y2hTdGF0ZU9uUm91dGVSZWNvcmQocm91dGUpIHtcclxuICAgIHJvdXRlLl9fdmRfbWF0Y2ggPSBmYWxzZTtcclxuICAgIHJvdXRlLmNoaWxkcmVuLmZvckVhY2gocmVzZXRNYXRjaFN0YXRlT25Sb3V0ZVJlY29yZCk7XHJcbn1cclxuZnVuY3Rpb24gaXNSb3V0ZU1hdGNoaW5nKHJvdXRlLCBmaWx0ZXIpIHtcclxuICAgIGNvbnN0IGZvdW5kID0gU3RyaW5nKHJvdXRlLnJlKS5tYXRjaChFWFRSQUNUX1JFR0VYUF9SRSk7XHJcbiAgICByb3V0ZS5fX3ZkX21hdGNoID0gZmFsc2U7XHJcbiAgICBpZiAoIWZvdW5kIHx8IGZvdW5kLmxlbmd0aCA8IDMpIHtcclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcbiAgICAvLyB1c2UgYSByZWdleHAgd2l0aG91dCAkIGF0IHRoZSBlbmQgdG8gbWF0Y2ggbmVzdGVkIHJvdXRlcyBiZXR0ZXJcclxuICAgIGNvbnN0IG5vbkVuZGluZ1JFID0gbmV3IFJlZ0V4cChmb3VuZFsxXS5yZXBsYWNlKC9cXCQkLywgJycpLCBmb3VuZFsyXSk7XHJcbiAgICBpZiAobm9uRW5kaW5nUkUudGVzdChmaWx0ZXIpKSB7XHJcbiAgICAgICAgLy8gbWFyayBjaGlsZHJlbiBhcyBtYXRjaGVzXHJcbiAgICAgICAgcm91dGUuY2hpbGRyZW4uZm9yRWFjaChjaGlsZCA9PiBpc1JvdXRlTWF0Y2hpbmcoY2hpbGQsIGZpbHRlcikpO1xyXG4gICAgICAgIC8vIGV4Y2VwdGlvbiBjYXNlOiBgL2BcclxuICAgICAgICBpZiAocm91dGUucmVjb3JkLnBhdGggIT09ICcvJyB8fCBmaWx0ZXIgPT09ICcvJykge1xyXG4gICAgICAgICAgICByb3V0ZS5fX3ZkX21hdGNoID0gcm91dGUucmUudGVzdChmaWx0ZXIpO1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gaGlkZSB0aGUgLyByb3V0ZVxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuICAgIGNvbnN0IHBhdGggPSByb3V0ZS5yZWNvcmQucGF0aC50b0xvd2VyQ2FzZSgpO1xyXG4gICAgY29uc3QgZGVjb2RlZFBhdGggPSBkZWNvZGUocGF0aCk7XHJcbiAgICAvLyBhbHNvIGFsbG93IHBhcnRpYWwgbWF0Y2hpbmcgb24gdGhlIHBhdGhcclxuICAgIGlmICghZmlsdGVyLnN0YXJ0c1dpdGgoJy8nKSAmJlxyXG4gICAgICAgIChkZWNvZGVkUGF0aC5pbmNsdWRlcyhmaWx0ZXIpIHx8IHBhdGguaW5jbHVkZXMoZmlsdGVyKSkpXHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICBpZiAoZGVjb2RlZFBhdGguc3RhcnRzV2l0aChmaWx0ZXIpIHx8IHBhdGguc3RhcnRzV2l0aChmaWx0ZXIpKVxyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgaWYgKHJvdXRlLnJlY29yZC5uYW1lICYmIFN0cmluZyhyb3V0ZS5yZWNvcmQubmFtZSkuaW5jbHVkZXMoZmlsdGVyKSlcclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIHJldHVybiByb3V0ZS5jaGlsZHJlbi5zb21lKGNoaWxkID0+IGlzUm91dGVNYXRjaGluZyhjaGlsZCwgZmlsdGVyKSk7XHJcbn1cclxuZnVuY3Rpb24gb21pdChvYmosIGtleXMpIHtcclxuICAgIGNvbnN0IHJldCA9IHt9O1xyXG4gICAgZm9yIChjb25zdCBrZXkgaW4gb2JqKSB7XHJcbiAgICAgICAgaWYgKCFrZXlzLmluY2x1ZGVzKGtleSkpIHtcclxuICAgICAgICAgICAgLy8gQHRzLWV4cGVjdC1lcnJvclxyXG4gICAgICAgICAgICByZXRba2V5XSA9IG9ialtrZXldO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiByZXQ7XHJcbn1cblxuLyoqXHJcbiAqIENyZWF0ZXMgYSBSb3V0ZXIgaW5zdGFuY2UgdGhhdCBjYW4gYmUgdXNlZCBieSBhIFZ1ZSBhcHAuXHJcbiAqXHJcbiAqIEBwYXJhbSBvcHRpb25zIC0ge0BsaW5rIFJvdXRlck9wdGlvbnN9XHJcbiAqL1xyXG5mdW5jdGlvbiBjcmVhdGVSb3V0ZXIob3B0aW9ucykge1xyXG4gICAgY29uc3QgbWF0Y2hlciA9IGNyZWF0ZVJvdXRlck1hdGNoZXIob3B0aW9ucy5yb3V0ZXMsIG9wdGlvbnMpO1xyXG4gICAgY29uc3QgcGFyc2VRdWVyeSQxID0gb3B0aW9ucy5wYXJzZVF1ZXJ5IHx8IHBhcnNlUXVlcnk7XHJcbiAgICBjb25zdCBzdHJpbmdpZnlRdWVyeSQxID0gb3B0aW9ucy5zdHJpbmdpZnlRdWVyeSB8fCBzdHJpbmdpZnlRdWVyeTtcclxuICAgIGNvbnN0IHJvdXRlckhpc3RvcnkgPSBvcHRpb25zLmhpc3Rvcnk7XHJcbiAgICBpZiAoKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicpICYmICFyb3V0ZXJIaXN0b3J5KVxyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignUHJvdmlkZSB0aGUgXCJoaXN0b3J5XCIgb3B0aW9uIHdoZW4gY2FsbGluZyBcImNyZWF0ZVJvdXRlcigpXCI6JyArXHJcbiAgICAgICAgICAgICcgaHR0cHM6Ly9uZXh0LnJvdXRlci52dWVqcy5vcmcvYXBpLyNoaXN0b3J5LicpO1xyXG4gICAgY29uc3QgYmVmb3JlR3VhcmRzID0gdXNlQ2FsbGJhY2tzKCk7XHJcbiAgICBjb25zdCBiZWZvcmVSZXNvbHZlR3VhcmRzID0gdXNlQ2FsbGJhY2tzKCk7XHJcbiAgICBjb25zdCBhZnRlckd1YXJkcyA9IHVzZUNhbGxiYWNrcygpO1xyXG4gICAgY29uc3QgY3VycmVudFJvdXRlID0gc2hhbGxvd1JlZihTVEFSVF9MT0NBVElPTl9OT1JNQUxJWkVEKTtcclxuICAgIGxldCBwZW5kaW5nTG9jYXRpb24gPSBTVEFSVF9MT0NBVElPTl9OT1JNQUxJWkVEO1xyXG4gICAgLy8gbGVhdmUgdGhlIHNjcm9sbFJlc3RvcmF0aW9uIGlmIG5vIHNjcm9sbEJlaGF2aW9yIGlzIHByb3ZpZGVkXHJcbiAgICBpZiAoaXNCcm93c2VyICYmIG9wdGlvbnMuc2Nyb2xsQmVoYXZpb3IgJiYgJ3Njcm9sbFJlc3RvcmF0aW9uJyBpbiBoaXN0b3J5KSB7XHJcbiAgICAgICAgaGlzdG9yeS5zY3JvbGxSZXN0b3JhdGlvbiA9ICdtYW51YWwnO1xyXG4gICAgfVxyXG4gICAgY29uc3Qgbm9ybWFsaXplUGFyYW1zID0gYXBwbHlUb1BhcmFtcy5iaW5kKG51bGwsIHBhcmFtVmFsdWUgPT4gJycgKyBwYXJhbVZhbHVlKTtcclxuICAgIGNvbnN0IGVuY29kZVBhcmFtcyA9IGFwcGx5VG9QYXJhbXMuYmluZChudWxsLCBlbmNvZGVQYXJhbSk7XHJcbiAgICBjb25zdCBkZWNvZGVQYXJhbXMgPSBcclxuICAgIC8vIEB0cy1leHBlY3QtZXJyb3I6IGludGVudGlvbmFsbHkgYXZvaWQgdGhlIHR5cGUgY2hlY2tcclxuICAgIGFwcGx5VG9QYXJhbXMuYmluZChudWxsLCBkZWNvZGUpO1xyXG4gICAgZnVuY3Rpb24gYWRkUm91dGUocGFyZW50T3JSb3V0ZSwgcm91dGUpIHtcclxuICAgICAgICBsZXQgcGFyZW50O1xyXG4gICAgICAgIGxldCByZWNvcmQ7XHJcbiAgICAgICAgaWYgKGlzUm91dGVOYW1lKHBhcmVudE9yUm91dGUpKSB7XHJcbiAgICAgICAgICAgIHBhcmVudCA9IG1hdGNoZXIuZ2V0UmVjb3JkTWF0Y2hlcihwYXJlbnRPclJvdXRlKTtcclxuICAgICAgICAgICAgcmVjb3JkID0gcm91dGU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICByZWNvcmQgPSBwYXJlbnRPclJvdXRlO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gbWF0Y2hlci5hZGRSb3V0ZShyZWNvcmQsIHBhcmVudCk7XHJcbiAgICB9XHJcbiAgICBmdW5jdGlvbiByZW1vdmVSb3V0ZShuYW1lKSB7XHJcbiAgICAgICAgY29uc3QgcmVjb3JkTWF0Y2hlciA9IG1hdGNoZXIuZ2V0UmVjb3JkTWF0Y2hlcihuYW1lKTtcclxuICAgICAgICBpZiAocmVjb3JkTWF0Y2hlcikge1xyXG4gICAgICAgICAgICBtYXRjaGVyLnJlbW92ZVJvdXRlKHJlY29yZE1hdGNoZXIpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIGlmICgocHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJykpIHtcclxuICAgICAgICAgICAgd2FybihgQ2Fubm90IHJlbW92ZSBub24tZXhpc3RlbnQgcm91dGUgXCIke1N0cmluZyhuYW1lKX1cImApO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGZ1bmN0aW9uIGdldFJvdXRlcygpIHtcclxuICAgICAgICByZXR1cm4gbWF0Y2hlci5nZXRSb3V0ZXMoKS5tYXAocm91dGVNYXRjaGVyID0+IHJvdXRlTWF0Y2hlci5yZWNvcmQpO1xyXG4gICAgfVxyXG4gICAgZnVuY3Rpb24gaGFzUm91dGUobmFtZSkge1xyXG4gICAgICAgIHJldHVybiAhIW1hdGNoZXIuZ2V0UmVjb3JkTWF0Y2hlcihuYW1lKTtcclxuICAgIH1cclxuICAgIGZ1bmN0aW9uIHJlc29sdmUocmF3TG9jYXRpb24sIGN1cnJlbnRMb2NhdGlvbikge1xyXG4gICAgICAgIC8vIGNvbnN0IG9iamVjdExvY2F0aW9uID0gcm91dGVyTG9jYXRpb25Bc09iamVjdChyYXdMb2NhdGlvbilcclxuICAgICAgICAvLyB3ZSBjcmVhdGUgYSBjb3B5IHRvIG1vZGlmeSBpdCBsYXRlclxyXG4gICAgICAgIGN1cnJlbnRMb2NhdGlvbiA9IGFzc2lnbih7fSwgY3VycmVudExvY2F0aW9uIHx8IGN1cnJlbnRSb3V0ZS52YWx1ZSk7XHJcbiAgICAgICAgaWYgKHR5cGVvZiByYXdMb2NhdGlvbiA9PT0gJ3N0cmluZycpIHtcclxuICAgICAgICAgICAgY29uc3QgbG9jYXRpb25Ob3JtYWxpemVkID0gcGFyc2VVUkwocGFyc2VRdWVyeSQxLCByYXdMb2NhdGlvbiwgY3VycmVudExvY2F0aW9uLnBhdGgpO1xyXG4gICAgICAgICAgICBjb25zdCBtYXRjaGVkUm91dGUgPSBtYXRjaGVyLnJlc29sdmUoeyBwYXRoOiBsb2NhdGlvbk5vcm1hbGl6ZWQucGF0aCB9LCBjdXJyZW50TG9jYXRpb24pO1xyXG4gICAgICAgICAgICBjb25zdCBocmVmID0gcm91dGVySGlzdG9yeS5jcmVhdGVIcmVmKGxvY2F0aW9uTm9ybWFsaXplZC5mdWxsUGF0aCk7XHJcbiAgICAgICAgICAgIGlmICgocHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJykpIHtcclxuICAgICAgICAgICAgICAgIGlmIChocmVmLnN0YXJ0c1dpdGgoJy8vJykpXHJcbiAgICAgICAgICAgICAgICAgICAgd2FybihgTG9jYXRpb24gXCIke3Jhd0xvY2F0aW9ufVwiIHJlc29sdmVkIHRvIFwiJHtocmVmfVwiLiBBIHJlc29sdmVkIGxvY2F0aW9uIGNhbm5vdCBzdGFydCB3aXRoIG11bHRpcGxlIHNsYXNoZXMuYCk7XHJcbiAgICAgICAgICAgICAgICBlbHNlIGlmICghbWF0Y2hlZFJvdXRlLm1hdGNoZWQubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgd2FybihgTm8gbWF0Y2ggZm91bmQgZm9yIGxvY2F0aW9uIHdpdGggcGF0aCBcIiR7cmF3TG9jYXRpb259XCJgKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyBsb2NhdGlvbk5vcm1hbGl6ZWQgaXMgYWx3YXlzIGEgbmV3IG9iamVjdFxyXG4gICAgICAgICAgICByZXR1cm4gYXNzaWduKGxvY2F0aW9uTm9ybWFsaXplZCwgbWF0Y2hlZFJvdXRlLCB7XHJcbiAgICAgICAgICAgICAgICBwYXJhbXM6IGRlY29kZVBhcmFtcyhtYXRjaGVkUm91dGUucGFyYW1zKSxcclxuICAgICAgICAgICAgICAgIGhhc2g6IGRlY29kZShsb2NhdGlvbk5vcm1hbGl6ZWQuaGFzaCksXHJcbiAgICAgICAgICAgICAgICByZWRpcmVjdGVkRnJvbTogdW5kZWZpbmVkLFxyXG4gICAgICAgICAgICAgICAgaHJlZixcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGxldCBtYXRjaGVyTG9jYXRpb247XHJcbiAgICAgICAgLy8gcGF0aCBjb3VsZCBiZSByZWxhdGl2ZSBpbiBvYmplY3QgYXMgd2VsbFxyXG4gICAgICAgIGlmICgncGF0aCcgaW4gcmF3TG9jYXRpb24pIHtcclxuICAgICAgICAgICAgaWYgKChwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nKSAmJlxyXG4gICAgICAgICAgICAgICAgJ3BhcmFtcycgaW4gcmF3TG9jYXRpb24gJiZcclxuICAgICAgICAgICAgICAgICEoJ25hbWUnIGluIHJhd0xvY2F0aW9uKSAmJlxyXG4gICAgICAgICAgICAgICAgLy8gQHRzLWV4cGVjdC1lcnJvcjogdGhlIHR5cGUgaXMgbmV2ZXJcclxuICAgICAgICAgICAgICAgIE9iamVjdC5rZXlzKHJhd0xvY2F0aW9uLnBhcmFtcykubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgICAgICB3YXJuKGBQYXRoIFwiJHtcclxuICAgICAgICAgICAgICAgIC8vIEB0cy1leHBlY3QtZXJyb3I6IHRoZSB0eXBlIGlzIG5ldmVyXHJcbiAgICAgICAgICAgICAgICByYXdMb2NhdGlvbi5wYXRofVwiIHdhcyBwYXNzZWQgd2l0aCBwYXJhbXMgYnV0IHRoZXkgd2lsbCBiZSBpZ25vcmVkLiBVc2UgYSBuYW1lZCByb3V0ZSBhbG9uZ3NpZGUgcGFyYW1zIGluc3RlYWQuYCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgbWF0Y2hlckxvY2F0aW9uID0gYXNzaWduKHt9LCByYXdMb2NhdGlvbiwge1xyXG4gICAgICAgICAgICAgICAgcGF0aDogcGFyc2VVUkwocGFyc2VRdWVyeSQxLCByYXdMb2NhdGlvbi5wYXRoLCBjdXJyZW50TG9jYXRpb24ucGF0aCkucGF0aCxcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAvLyByZW1vdmUgYW55IG51bGxpc2ggcGFyYW1cclxuICAgICAgICAgICAgY29uc3QgdGFyZ2V0UGFyYW1zID0gYXNzaWduKHt9LCByYXdMb2NhdGlvbi5wYXJhbXMpO1xyXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGtleSBpbiB0YXJnZXRQYXJhbXMpIHtcclxuICAgICAgICAgICAgICAgIGlmICh0YXJnZXRQYXJhbXNba2V5XSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHRhcmdldFBhcmFtc1trZXldO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIHBhc3MgZW5jb2RlZCB2YWx1ZXMgdG8gdGhlIG1hdGNoZXIsIHNvIGl0IGNhbiBwcm9kdWNlIGVuY29kZWQgcGF0aCBhbmQgZnVsbFBhdGhcclxuICAgICAgICAgICAgbWF0Y2hlckxvY2F0aW9uID0gYXNzaWduKHt9LCByYXdMb2NhdGlvbiwge1xyXG4gICAgICAgICAgICAgICAgcGFyYW1zOiBlbmNvZGVQYXJhbXMocmF3TG9jYXRpb24ucGFyYW1zKSxcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIC8vIGN1cnJlbnQgbG9jYXRpb24gcGFyYW1zIGFyZSBkZWNvZGVkLCB3ZSBuZWVkIHRvIGVuY29kZSB0aGVtIGluIGNhc2UgdGhlXHJcbiAgICAgICAgICAgIC8vIG1hdGNoZXIgbWVyZ2VzIHRoZSBwYXJhbXNcclxuICAgICAgICAgICAgY3VycmVudExvY2F0aW9uLnBhcmFtcyA9IGVuY29kZVBhcmFtcyhjdXJyZW50TG9jYXRpb24ucGFyYW1zKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY29uc3QgbWF0Y2hlZFJvdXRlID0gbWF0Y2hlci5yZXNvbHZlKG1hdGNoZXJMb2NhdGlvbiwgY3VycmVudExvY2F0aW9uKTtcclxuICAgICAgICBjb25zdCBoYXNoID0gcmF3TG9jYXRpb24uaGFzaCB8fCAnJztcclxuICAgICAgICBpZiAoKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicpICYmIGhhc2ggJiYgIWhhc2guc3RhcnRzV2l0aCgnIycpKSB7XHJcbiAgICAgICAgICAgIHdhcm4oYEEgXFxgaGFzaFxcYCBzaG91bGQgYWx3YXlzIHN0YXJ0IHdpdGggdGhlIGNoYXJhY3RlciBcIiNcIi4gUmVwbGFjZSBcIiR7aGFzaH1cIiB3aXRoIFwiIyR7aGFzaH1cIi5gKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gdGhlIG1hdGNoZXIgbWlnaHQgaGF2ZSBtZXJnZWQgY3VycmVudCBsb2NhdGlvbiBwYXJhbXMsIHNvXHJcbiAgICAgICAgLy8gd2UgbmVlZCB0byBydW4gdGhlIGRlY29kaW5nIGFnYWluXHJcbiAgICAgICAgbWF0Y2hlZFJvdXRlLnBhcmFtcyA9IG5vcm1hbGl6ZVBhcmFtcyhkZWNvZGVQYXJhbXMobWF0Y2hlZFJvdXRlLnBhcmFtcykpO1xyXG4gICAgICAgIGNvbnN0IGZ1bGxQYXRoID0gc3RyaW5naWZ5VVJMKHN0cmluZ2lmeVF1ZXJ5JDEsIGFzc2lnbih7fSwgcmF3TG9jYXRpb24sIHtcclxuICAgICAgICAgICAgaGFzaDogZW5jb2RlSGFzaChoYXNoKSxcclxuICAgICAgICAgICAgcGF0aDogbWF0Y2hlZFJvdXRlLnBhdGgsXHJcbiAgICAgICAgfSkpO1xyXG4gICAgICAgIGNvbnN0IGhyZWYgPSByb3V0ZXJIaXN0b3J5LmNyZWF0ZUhyZWYoZnVsbFBhdGgpO1xyXG4gICAgICAgIGlmICgocHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJykpIHtcclxuICAgICAgICAgICAgaWYgKGhyZWYuc3RhcnRzV2l0aCgnLy8nKSkge1xyXG4gICAgICAgICAgICAgICAgd2FybihgTG9jYXRpb24gXCIke3Jhd0xvY2F0aW9ufVwiIHJlc29sdmVkIHRvIFwiJHtocmVmfVwiLiBBIHJlc29sdmVkIGxvY2F0aW9uIGNhbm5vdCBzdGFydCB3aXRoIG11bHRpcGxlIHNsYXNoZXMuYCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSBpZiAoIW1hdGNoZWRSb3V0ZS5tYXRjaGVkLmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgd2FybihgTm8gbWF0Y2ggZm91bmQgZm9yIGxvY2F0aW9uIHdpdGggcGF0aCBcIiR7J3BhdGgnIGluIHJhd0xvY2F0aW9uID8gcmF3TG9jYXRpb24ucGF0aCA6IHJhd0xvY2F0aW9ufVwiYCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGFzc2lnbih7XHJcbiAgICAgICAgICAgIGZ1bGxQYXRoLFxyXG4gICAgICAgICAgICAvLyBrZWVwIHRoZSBoYXNoIGVuY29kZWQgc28gZnVsbFBhdGggaXMgZWZmZWN0aXZlbHkgcGF0aCArIGVuY29kZWRRdWVyeSArXHJcbiAgICAgICAgICAgIC8vIGhhc2hcclxuICAgICAgICAgICAgaGFzaCxcclxuICAgICAgICAgICAgcXVlcnk6IFxyXG4gICAgICAgICAgICAvLyBpZiB0aGUgdXNlciBpcyB1c2luZyBhIGN1c3RvbSBxdWVyeSBsaWIgbGlrZSBxcywgd2UgbWlnaHQgaGF2ZVxyXG4gICAgICAgICAgICAvLyBuZXN0ZWQgb2JqZWN0cywgc28gd2Uga2VlcCB0aGUgcXVlcnkgYXMgaXMsIG1lYW5pbmcgaXQgY2FuIGNvbnRhaW5cclxuICAgICAgICAgICAgLy8gbnVtYmVycyBhdCBgJHJvdXRlLnF1ZXJ5YCwgYnV0IGF0IHRoZSBwb2ludCwgdGhlIHVzZXIgd2lsbCBoYXZlIHRvXHJcbiAgICAgICAgICAgIC8vIHVzZSB0aGVpciBvd24gdHlwZSBhbnl3YXkuXHJcbiAgICAgICAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS92dWVqcy9yb3V0ZXIvaXNzdWVzLzMyOCNpc3N1ZWNvbW1lbnQtNjQ5NDgxNTY3XHJcbiAgICAgICAgICAgIHN0cmluZ2lmeVF1ZXJ5JDEgPT09IHN0cmluZ2lmeVF1ZXJ5XHJcbiAgICAgICAgICAgICAgICA/IG5vcm1hbGl6ZVF1ZXJ5KHJhd0xvY2F0aW9uLnF1ZXJ5KVxyXG4gICAgICAgICAgICAgICAgOiAocmF3TG9jYXRpb24ucXVlcnkgfHwge30pLFxyXG4gICAgICAgIH0sIG1hdGNoZWRSb3V0ZSwge1xyXG4gICAgICAgICAgICByZWRpcmVjdGVkRnJvbTogdW5kZWZpbmVkLFxyXG4gICAgICAgICAgICBocmVmLFxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgZnVuY3Rpb24gbG9jYXRpb25Bc09iamVjdCh0bykge1xyXG4gICAgICAgIHJldHVybiB0eXBlb2YgdG8gPT09ICdzdHJpbmcnXHJcbiAgICAgICAgICAgID8gcGFyc2VVUkwocGFyc2VRdWVyeSQxLCB0bywgY3VycmVudFJvdXRlLnZhbHVlLnBhdGgpXHJcbiAgICAgICAgICAgIDogYXNzaWduKHt9LCB0byk7XHJcbiAgICB9XHJcbiAgICBmdW5jdGlvbiBjaGVja0NhbmNlbGVkTmF2aWdhdGlvbih0bywgZnJvbSkge1xyXG4gICAgICAgIGlmIChwZW5kaW5nTG9jYXRpb24gIT09IHRvKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBjcmVhdGVSb3V0ZXJFcnJvcig4IC8qIEVycm9yVHlwZXMuTkFWSUdBVElPTl9DQU5DRUxMRUQgKi8sIHtcclxuICAgICAgICAgICAgICAgIGZyb20sXHJcbiAgICAgICAgICAgICAgICB0byxcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZnVuY3Rpb24gcHVzaCh0bykge1xyXG4gICAgICAgIHJldHVybiBwdXNoV2l0aFJlZGlyZWN0KHRvKTtcclxuICAgIH1cclxuICAgIGZ1bmN0aW9uIHJlcGxhY2UodG8pIHtcclxuICAgICAgICByZXR1cm4gcHVzaChhc3NpZ24obG9jYXRpb25Bc09iamVjdCh0byksIHsgcmVwbGFjZTogdHJ1ZSB9KSk7XHJcbiAgICB9XHJcbiAgICBmdW5jdGlvbiBoYW5kbGVSZWRpcmVjdFJlY29yZCh0bykge1xyXG4gICAgICAgIGNvbnN0IGxhc3RNYXRjaGVkID0gdG8ubWF0Y2hlZFt0by5tYXRjaGVkLmxlbmd0aCAtIDFdO1xyXG4gICAgICAgIGlmIChsYXN0TWF0Y2hlZCAmJiBsYXN0TWF0Y2hlZC5yZWRpcmVjdCkge1xyXG4gICAgICAgICAgICBjb25zdCB7IHJlZGlyZWN0IH0gPSBsYXN0TWF0Y2hlZDtcclxuICAgICAgICAgICAgbGV0IG5ld1RhcmdldExvY2F0aW9uID0gdHlwZW9mIHJlZGlyZWN0ID09PSAnZnVuY3Rpb24nID8gcmVkaXJlY3QodG8pIDogcmVkaXJlY3Q7XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2YgbmV3VGFyZ2V0TG9jYXRpb24gPT09ICdzdHJpbmcnKSB7XHJcbiAgICAgICAgICAgICAgICBuZXdUYXJnZXRMb2NhdGlvbiA9XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3VGFyZ2V0TG9jYXRpb24uaW5jbHVkZXMoJz8nKSB8fCBuZXdUYXJnZXRMb2NhdGlvbi5pbmNsdWRlcygnIycpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgID8gKG5ld1RhcmdldExvY2F0aW9uID0gbG9jYXRpb25Bc09iamVjdChuZXdUYXJnZXRMb2NhdGlvbikpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDogLy8gZm9yY2UgZW1wdHkgcGFyYW1zXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7IHBhdGg6IG5ld1RhcmdldExvY2F0aW9uIH07XHJcbiAgICAgICAgICAgICAgICAvLyBAdHMtZXhwZWN0LWVycm9yOiBmb3JjZSBlbXB0eSBwYXJhbXMgd2hlbiBhIHN0cmluZyBpcyBwYXNzZWQgdG8gbGV0XHJcbiAgICAgICAgICAgICAgICAvLyB0aGUgcm91dGVyIHBhcnNlIHRoZW0gYWdhaW5cclxuICAgICAgICAgICAgICAgIG5ld1RhcmdldExvY2F0aW9uLnBhcmFtcyA9IHt9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICgocHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJykgJiZcclxuICAgICAgICAgICAgICAgICEoJ3BhdGgnIGluIG5ld1RhcmdldExvY2F0aW9uKSAmJlxyXG4gICAgICAgICAgICAgICAgISgnbmFtZScgaW4gbmV3VGFyZ2V0TG9jYXRpb24pKSB7XHJcbiAgICAgICAgICAgICAgICB3YXJuKGBJbnZhbGlkIHJlZGlyZWN0IGZvdW5kOlxcbiR7SlNPTi5zdHJpbmdpZnkobmV3VGFyZ2V0TG9jYXRpb24sIG51bGwsIDIpfVxcbiB3aGVuIG5hdmlnYXRpbmcgdG8gXCIke3RvLmZ1bGxQYXRofVwiLiBBIHJlZGlyZWN0IG11c3QgY29udGFpbiBhIG5hbWUgb3IgcGF0aC4gVGhpcyB3aWxsIGJyZWFrIGluIHByb2R1Y3Rpb24uYCk7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgcmVkaXJlY3QnKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gYXNzaWduKHtcclxuICAgICAgICAgICAgICAgIHF1ZXJ5OiB0by5xdWVyeSxcclxuICAgICAgICAgICAgICAgIGhhc2g6IHRvLmhhc2gsXHJcbiAgICAgICAgICAgICAgICAvLyBhdm9pZCB0cmFuc2ZlcnJpbmcgcGFyYW1zIGlmIHRoZSByZWRpcmVjdCBoYXMgYSBwYXRoXHJcbiAgICAgICAgICAgICAgICBwYXJhbXM6ICdwYXRoJyBpbiBuZXdUYXJnZXRMb2NhdGlvbiA/IHt9IDogdG8ucGFyYW1zLFxyXG4gICAgICAgICAgICB9LCBuZXdUYXJnZXRMb2NhdGlvbik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZnVuY3Rpb24gcHVzaFdpdGhSZWRpcmVjdCh0bywgcmVkaXJlY3RlZEZyb20pIHtcclxuICAgICAgICBjb25zdCB0YXJnZXRMb2NhdGlvbiA9IChwZW5kaW5nTG9jYXRpb24gPSByZXNvbHZlKHRvKSk7XHJcbiAgICAgICAgY29uc3QgZnJvbSA9IGN1cnJlbnRSb3V0ZS52YWx1ZTtcclxuICAgICAgICBjb25zdCBkYXRhID0gdG8uc3RhdGU7XHJcbiAgICAgICAgY29uc3QgZm9yY2UgPSB0by5mb3JjZTtcclxuICAgICAgICAvLyB0byBjb3VsZCBiZSBhIHN0cmluZyB3aGVyZSBgcmVwbGFjZWAgaXMgYSBmdW5jdGlvblxyXG4gICAgICAgIGNvbnN0IHJlcGxhY2UgPSB0by5yZXBsYWNlID09PSB0cnVlO1xyXG4gICAgICAgIGNvbnN0IHNob3VsZFJlZGlyZWN0ID0gaGFuZGxlUmVkaXJlY3RSZWNvcmQodGFyZ2V0TG9jYXRpb24pO1xyXG4gICAgICAgIGlmIChzaG91bGRSZWRpcmVjdClcclxuICAgICAgICAgICAgcmV0dXJuIHB1c2hXaXRoUmVkaXJlY3QoYXNzaWduKGxvY2F0aW9uQXNPYmplY3Qoc2hvdWxkUmVkaXJlY3QpLCB7XHJcbiAgICAgICAgICAgICAgICBzdGF0ZTogdHlwZW9mIHNob3VsZFJlZGlyZWN0ID09PSAnb2JqZWN0J1xyXG4gICAgICAgICAgICAgICAgICAgID8gYXNzaWduKHt9LCBkYXRhLCBzaG91bGRSZWRpcmVjdC5zdGF0ZSlcclxuICAgICAgICAgICAgICAgICAgICA6IGRhdGEsXHJcbiAgICAgICAgICAgICAgICBmb3JjZSxcclxuICAgICAgICAgICAgICAgIHJlcGxhY2UsXHJcbiAgICAgICAgICAgIH0pLCBcclxuICAgICAgICAgICAgLy8ga2VlcCBvcmlnaW5hbCByZWRpcmVjdGVkRnJvbSBpZiBpdCBleGlzdHNcclxuICAgICAgICAgICAgcmVkaXJlY3RlZEZyb20gfHwgdGFyZ2V0TG9jYXRpb24pO1xyXG4gICAgICAgIC8vIGlmIGl0IHdhcyBhIHJlZGlyZWN0IHdlIGFscmVhZHkgY2FsbGVkIGBwdXNoV2l0aFJlZGlyZWN0YCBhYm92ZVxyXG4gICAgICAgIGNvbnN0IHRvTG9jYXRpb24gPSB0YXJnZXRMb2NhdGlvbjtcclxuICAgICAgICB0b0xvY2F0aW9uLnJlZGlyZWN0ZWRGcm9tID0gcmVkaXJlY3RlZEZyb207XHJcbiAgICAgICAgbGV0IGZhaWx1cmU7XHJcbiAgICAgICAgaWYgKCFmb3JjZSAmJiBpc1NhbWVSb3V0ZUxvY2F0aW9uKHN0cmluZ2lmeVF1ZXJ5JDEsIGZyb20sIHRhcmdldExvY2F0aW9uKSkge1xyXG4gICAgICAgICAgICBmYWlsdXJlID0gY3JlYXRlUm91dGVyRXJyb3IoMTYgLyogRXJyb3JUeXBlcy5OQVZJR0FUSU9OX0RVUExJQ0FURUQgKi8sIHsgdG86IHRvTG9jYXRpb24sIGZyb20gfSk7XHJcbiAgICAgICAgICAgIC8vIHRyaWdnZXIgc2Nyb2xsIHRvIGFsbG93IHNjcm9sbGluZyB0byB0aGUgc2FtZSBhbmNob3JcclxuICAgICAgICAgICAgaGFuZGxlU2Nyb2xsKGZyb20sIGZyb20sIFxyXG4gICAgICAgICAgICAvLyB0aGlzIGlzIGEgcHVzaCwgdGhlIG9ubHkgd2F5IGZvciBpdCB0byBiZSB0cmlnZ2VyZWQgZnJvbSBhXHJcbiAgICAgICAgICAgIC8vIGhpc3RvcnkubGlzdGVuIGlzIHdpdGggYSByZWRpcmVjdCwgd2hpY2ggbWFrZXMgaXQgYmVjb21lIGEgcHVzaFxyXG4gICAgICAgICAgICB0cnVlLCBcclxuICAgICAgICAgICAgLy8gVGhpcyBjYW5ub3QgYmUgdGhlIGZpcnN0IG5hdmlnYXRpb24gYmVjYXVzZSB0aGUgaW5pdGlhbCBsb2NhdGlvblxyXG4gICAgICAgICAgICAvLyBjYW5ub3QgYmUgbWFudWFsbHkgbmF2aWdhdGVkIHRvXHJcbiAgICAgICAgICAgIGZhbHNlKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIChmYWlsdXJlID8gUHJvbWlzZS5yZXNvbHZlKGZhaWx1cmUpIDogbmF2aWdhdGUodG9Mb2NhdGlvbiwgZnJvbSkpXHJcbiAgICAgICAgICAgIC5jYXRjaCgoZXJyb3IpID0+IGlzTmF2aWdhdGlvbkZhaWx1cmUoZXJyb3IpXHJcbiAgICAgICAgICAgID8gLy8gbmF2aWdhdGlvbiByZWRpcmVjdHMgc3RpbGwgbWFyayB0aGUgcm91dGVyIGFzIHJlYWR5XHJcbiAgICAgICAgICAgICAgICBpc05hdmlnYXRpb25GYWlsdXJlKGVycm9yLCAyIC8qIEVycm9yVHlwZXMuTkFWSUdBVElPTl9HVUFSRF9SRURJUkVDVCAqLylcclxuICAgICAgICAgICAgICAgICAgICA/IGVycm9yXHJcbiAgICAgICAgICAgICAgICAgICAgOiBtYXJrQXNSZWFkeShlcnJvcikgLy8gYWxzbyByZXR1cm5zIHRoZSBlcnJvclxyXG4gICAgICAgICAgICA6IC8vIHJlamVjdCBhbnkgdW5rbm93biBlcnJvclxyXG4gICAgICAgICAgICAgICAgdHJpZ2dlckVycm9yKGVycm9yLCB0b0xvY2F0aW9uLCBmcm9tKSlcclxuICAgICAgICAgICAgLnRoZW4oKGZhaWx1cmUpID0+IHtcclxuICAgICAgICAgICAgaWYgKGZhaWx1cmUpIHtcclxuICAgICAgICAgICAgICAgIGlmIChpc05hdmlnYXRpb25GYWlsdXJlKGZhaWx1cmUsIDIgLyogRXJyb3JUeXBlcy5OQVZJR0FUSU9OX0dVQVJEX1JFRElSRUNUICovKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICgocHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJykgJiZcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gd2UgYXJlIHJlZGlyZWN0aW5nIHRvIHRoZSBzYW1lIGxvY2F0aW9uIHdlIHdlcmUgYWxyZWFkeSBhdFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpc1NhbWVSb3V0ZUxvY2F0aW9uKHN0cmluZ2lmeVF1ZXJ5JDEsIHJlc29sdmUoZmFpbHVyZS50byksIHRvTG9jYXRpb24pICYmXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGFuZCB3ZSBoYXZlIGRvbmUgaXQgYSBjb3VwbGUgb2YgdGltZXNcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVkaXJlY3RlZEZyb20gJiZcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQHRzLWV4cGVjdC1lcnJvcjogYWRkZWQgb25seSBpbiBkZXZcclxuICAgICAgICAgICAgICAgICAgICAgICAgKHJlZGlyZWN0ZWRGcm9tLl9jb3VudCA9IHJlZGlyZWN0ZWRGcm9tLl9jb3VudFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPyAvLyBAdHMtZXhwZWN0LWVycm9yXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVkaXJlY3RlZEZyb20uX2NvdW50ICsgMVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgOiAxKSA+IDEwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHdhcm4oYERldGVjdGVkIGFuIGluZmluaXRlIHJlZGlyZWN0aW9uIGluIGEgbmF2aWdhdGlvbiBndWFyZCB3aGVuIGdvaW5nIGZyb20gXCIke2Zyb20uZnVsbFBhdGh9XCIgdG8gXCIke3RvTG9jYXRpb24uZnVsbFBhdGh9XCIuIEFib3J0aW5nIHRvIGF2b2lkIGEgU3RhY2sgT3ZlcmZsb3cuIFRoaXMgd2lsbCBicmVhayBpbiBwcm9kdWN0aW9uIGlmIG5vdCBmaXhlZC5gKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBFcnJvcignSW5maW5pdGUgcmVkaXJlY3QgaW4gbmF2aWdhdGlvbiBndWFyZCcpKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHB1c2hXaXRoUmVkaXJlY3QoXHJcbiAgICAgICAgICAgICAgICAgICAgLy8ga2VlcCBvcHRpb25zXHJcbiAgICAgICAgICAgICAgICAgICAgYXNzaWduKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gcHJlc2VydmUgYW4gZXhpc3RpbmcgcmVwbGFjZW1lbnQgYnV0IGFsbG93IHRoZSByZWRpcmVjdCB0byBvdmVycmlkZSBpdFxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXBsYWNlLFxyXG4gICAgICAgICAgICAgICAgICAgIH0sIGxvY2F0aW9uQXNPYmplY3QoZmFpbHVyZS50byksIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGU6IHR5cGVvZiBmYWlsdXJlLnRvID09PSAnb2JqZWN0J1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPyBhc3NpZ24oe30sIGRhdGEsIGZhaWx1cmUudG8uc3RhdGUpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA6IGRhdGEsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvcmNlLFxyXG4gICAgICAgICAgICAgICAgICAgIH0pLCBcclxuICAgICAgICAgICAgICAgICAgICAvLyBwcmVzZXJ2ZSB0aGUgb3JpZ2luYWwgcmVkaXJlY3RlZEZyb20gaWYgYW55XHJcbiAgICAgICAgICAgICAgICAgICAgcmVkaXJlY3RlZEZyb20gfHwgdG9Mb2NhdGlvbik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAvLyBpZiB3ZSBmYWlsIHdlIGRvbid0IGZpbmFsaXplIHRoZSBuYXZpZ2F0aW9uXHJcbiAgICAgICAgICAgICAgICBmYWlsdXJlID0gZmluYWxpemVOYXZpZ2F0aW9uKHRvTG9jYXRpb24sIGZyb20sIHRydWUsIHJlcGxhY2UsIGRhdGEpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRyaWdnZXJBZnRlckVhY2godG9Mb2NhdGlvbiwgZnJvbSwgZmFpbHVyZSk7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWlsdXJlO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgLyoqXHJcbiAgICAgKiBIZWxwZXIgdG8gcmVqZWN0IGFuZCBza2lwIGFsbCBuYXZpZ2F0aW9uIGd1YXJkcyBpZiBhIG5ldyBuYXZpZ2F0aW9uIGhhcHBlbmVkXHJcbiAgICAgKiBAcGFyYW0gdG9cclxuICAgICAqIEBwYXJhbSBmcm9tXHJcbiAgICAgKi9cclxuICAgIGZ1bmN0aW9uIGNoZWNrQ2FuY2VsZWROYXZpZ2F0aW9uQW5kUmVqZWN0KHRvLCBmcm9tKSB7XHJcbiAgICAgICAgY29uc3QgZXJyb3IgPSBjaGVja0NhbmNlbGVkTmF2aWdhdGlvbih0bywgZnJvbSk7XHJcbiAgICAgICAgcmV0dXJuIGVycm9yID8gUHJvbWlzZS5yZWplY3QoZXJyb3IpIDogUHJvbWlzZS5yZXNvbHZlKCk7XHJcbiAgICB9XHJcbiAgICAvLyBUT0RPOiByZWZhY3RvciB0aGUgd2hvbGUgYmVmb3JlIGd1YXJkcyBieSBpbnRlcm5hbGx5IHVzaW5nIHJvdXRlci5iZWZvcmVFYWNoXHJcbiAgICBmdW5jdGlvbiBuYXZpZ2F0ZSh0bywgZnJvbSkge1xyXG4gICAgICAgIGxldCBndWFyZHM7XHJcbiAgICAgICAgY29uc3QgW2xlYXZpbmdSZWNvcmRzLCB1cGRhdGluZ1JlY29yZHMsIGVudGVyaW5nUmVjb3Jkc10gPSBleHRyYWN0Q2hhbmdpbmdSZWNvcmRzKHRvLCBmcm9tKTtcclxuICAgICAgICAvLyBhbGwgY29tcG9uZW50cyBoZXJlIGhhdmUgYmVlbiByZXNvbHZlZCBvbmNlIGJlY2F1c2Ugd2UgYXJlIGxlYXZpbmdcclxuICAgICAgICBndWFyZHMgPSBleHRyYWN0Q29tcG9uZW50c0d1YXJkcyhsZWF2aW5nUmVjb3Jkcy5yZXZlcnNlKCksICdiZWZvcmVSb3V0ZUxlYXZlJywgdG8sIGZyb20pO1xyXG4gICAgICAgIC8vIGxlYXZpbmdSZWNvcmRzIGlzIGFscmVhZHkgcmV2ZXJzZWRcclxuICAgICAgICBmb3IgKGNvbnN0IHJlY29yZCBvZiBsZWF2aW5nUmVjb3Jkcykge1xyXG4gICAgICAgICAgICByZWNvcmQubGVhdmVHdWFyZHMuZm9yRWFjaChndWFyZCA9PiB7XHJcbiAgICAgICAgICAgICAgICBndWFyZHMucHVzaChndWFyZFRvUHJvbWlzZUZuKGd1YXJkLCB0bywgZnJvbSkpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY29uc3QgY2FuY2VsZWROYXZpZ2F0aW9uQ2hlY2sgPSBjaGVja0NhbmNlbGVkTmF2aWdhdGlvbkFuZFJlamVjdC5iaW5kKG51bGwsIHRvLCBmcm9tKTtcclxuICAgICAgICBndWFyZHMucHVzaChjYW5jZWxlZE5hdmlnYXRpb25DaGVjayk7XHJcbiAgICAgICAgLy8gcnVuIHRoZSBxdWV1ZSBvZiBwZXIgcm91dGUgYmVmb3JlUm91dGVMZWF2ZSBndWFyZHNcclxuICAgICAgICByZXR1cm4gKHJ1bkd1YXJkUXVldWUoZ3VhcmRzKVxyXG4gICAgICAgICAgICAudGhlbigoKSA9PiB7XHJcbiAgICAgICAgICAgIC8vIGNoZWNrIGdsb2JhbCBndWFyZHMgYmVmb3JlRWFjaFxyXG4gICAgICAgICAgICBndWFyZHMgPSBbXTtcclxuICAgICAgICAgICAgZm9yIChjb25zdCBndWFyZCBvZiBiZWZvcmVHdWFyZHMubGlzdCgpKSB7XHJcbiAgICAgICAgICAgICAgICBndWFyZHMucHVzaChndWFyZFRvUHJvbWlzZUZuKGd1YXJkLCB0bywgZnJvbSkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGd1YXJkcy5wdXNoKGNhbmNlbGVkTmF2aWdhdGlvbkNoZWNrKTtcclxuICAgICAgICAgICAgcmV0dXJuIHJ1bkd1YXJkUXVldWUoZ3VhcmRzKTtcclxuICAgICAgICB9KVxyXG4gICAgICAgICAgICAudGhlbigoKSA9PiB7XHJcbiAgICAgICAgICAgIC8vIGNoZWNrIGluIGNvbXBvbmVudHMgYmVmb3JlUm91dGVVcGRhdGVcclxuICAgICAgICAgICAgZ3VhcmRzID0gZXh0cmFjdENvbXBvbmVudHNHdWFyZHModXBkYXRpbmdSZWNvcmRzLCAnYmVmb3JlUm91dGVVcGRhdGUnLCB0bywgZnJvbSk7XHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgcmVjb3JkIG9mIHVwZGF0aW5nUmVjb3Jkcykge1xyXG4gICAgICAgICAgICAgICAgcmVjb3JkLnVwZGF0ZUd1YXJkcy5mb3JFYWNoKGd1YXJkID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBndWFyZHMucHVzaChndWFyZFRvUHJvbWlzZUZuKGd1YXJkLCB0bywgZnJvbSkpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZ3VhcmRzLnB1c2goY2FuY2VsZWROYXZpZ2F0aW9uQ2hlY2spO1xyXG4gICAgICAgICAgICAvLyBydW4gdGhlIHF1ZXVlIG9mIHBlciByb3V0ZSBiZWZvcmVFbnRlciBndWFyZHNcclxuICAgICAgICAgICAgcmV0dXJuIHJ1bkd1YXJkUXVldWUoZ3VhcmRzKTtcclxuICAgICAgICB9KVxyXG4gICAgICAgICAgICAudGhlbigoKSA9PiB7XHJcbiAgICAgICAgICAgIC8vIGNoZWNrIHRoZSByb3V0ZSBiZWZvcmVFbnRlclxyXG4gICAgICAgICAgICBndWFyZHMgPSBbXTtcclxuICAgICAgICAgICAgZm9yIChjb25zdCByZWNvcmQgb2YgdG8ubWF0Y2hlZCkge1xyXG4gICAgICAgICAgICAgICAgLy8gZG8gbm90IHRyaWdnZXIgYmVmb3JlRW50ZXIgb24gcmV1c2VkIHZpZXdzXHJcbiAgICAgICAgICAgICAgICBpZiAocmVjb3JkLmJlZm9yZUVudGVyICYmICFmcm9tLm1hdGNoZWQuaW5jbHVkZXMocmVjb3JkKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpc0FycmF5KHJlY29yZC5iZWZvcmVFbnRlcikpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBiZWZvcmVFbnRlciBvZiByZWNvcmQuYmVmb3JlRW50ZXIpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBndWFyZHMucHVzaChndWFyZFRvUHJvbWlzZUZuKGJlZm9yZUVudGVyLCB0bywgZnJvbSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZ3VhcmRzLnB1c2goZ3VhcmRUb1Byb21pc2VGbihyZWNvcmQuYmVmb3JlRW50ZXIsIHRvLCBmcm9tKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGd1YXJkcy5wdXNoKGNhbmNlbGVkTmF2aWdhdGlvbkNoZWNrKTtcclxuICAgICAgICAgICAgLy8gcnVuIHRoZSBxdWV1ZSBvZiBwZXIgcm91dGUgYmVmb3JlRW50ZXIgZ3VhcmRzXHJcbiAgICAgICAgICAgIHJldHVybiBydW5HdWFyZFF1ZXVlKGd1YXJkcyk7XHJcbiAgICAgICAgfSlcclxuICAgICAgICAgICAgLnRoZW4oKCkgPT4ge1xyXG4gICAgICAgICAgICAvLyBOT1RFOiBhdCB0aGlzIHBvaW50IHRvLm1hdGNoZWQgaXMgbm9ybWFsaXplZCBhbmQgZG9lcyBub3QgY29udGFpbiBhbnkgKCkgPT4gUHJvbWlzZTxDb21wb25lbnQ+XHJcbiAgICAgICAgICAgIC8vIGNsZWFyIGV4aXN0aW5nIGVudGVyQ2FsbGJhY2tzLCB0aGVzZSBhcmUgYWRkZWQgYnkgZXh0cmFjdENvbXBvbmVudHNHdWFyZHNcclxuICAgICAgICAgICAgdG8ubWF0Y2hlZC5mb3JFYWNoKHJlY29yZCA9PiAocmVjb3JkLmVudGVyQ2FsbGJhY2tzID0ge30pKTtcclxuICAgICAgICAgICAgLy8gY2hlY2sgaW4tY29tcG9uZW50IGJlZm9yZVJvdXRlRW50ZXJcclxuICAgICAgICAgICAgZ3VhcmRzID0gZXh0cmFjdENvbXBvbmVudHNHdWFyZHMoZW50ZXJpbmdSZWNvcmRzLCAnYmVmb3JlUm91dGVFbnRlcicsIHRvLCBmcm9tKTtcclxuICAgICAgICAgICAgZ3VhcmRzLnB1c2goY2FuY2VsZWROYXZpZ2F0aW9uQ2hlY2spO1xyXG4gICAgICAgICAgICAvLyBydW4gdGhlIHF1ZXVlIG9mIHBlciByb3V0ZSBiZWZvcmVFbnRlciBndWFyZHNcclxuICAgICAgICAgICAgcmV0dXJuIHJ1bkd1YXJkUXVldWUoZ3VhcmRzKTtcclxuICAgICAgICB9KVxyXG4gICAgICAgICAgICAudGhlbigoKSA9PiB7XHJcbiAgICAgICAgICAgIC8vIGNoZWNrIGdsb2JhbCBndWFyZHMgYmVmb3JlUmVzb2x2ZVxyXG4gICAgICAgICAgICBndWFyZHMgPSBbXTtcclxuICAgICAgICAgICAgZm9yIChjb25zdCBndWFyZCBvZiBiZWZvcmVSZXNvbHZlR3VhcmRzLmxpc3QoKSkge1xyXG4gICAgICAgICAgICAgICAgZ3VhcmRzLnB1c2goZ3VhcmRUb1Byb21pc2VGbihndWFyZCwgdG8sIGZyb20pKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBndWFyZHMucHVzaChjYW5jZWxlZE5hdmlnYXRpb25DaGVjayk7XHJcbiAgICAgICAgICAgIHJldHVybiBydW5HdWFyZFF1ZXVlKGd1YXJkcyk7XHJcbiAgICAgICAgfSlcclxuICAgICAgICAgICAgLy8gY2F0Y2ggYW55IG5hdmlnYXRpb24gY2FuY2VsZWRcclxuICAgICAgICAgICAgLmNhdGNoKGVyciA9PiBpc05hdmlnYXRpb25GYWlsdXJlKGVyciwgOCAvKiBFcnJvclR5cGVzLk5BVklHQVRJT05fQ0FOQ0VMTEVEICovKVxyXG4gICAgICAgICAgICA/IGVyclxyXG4gICAgICAgICAgICA6IFByb21pc2UucmVqZWN0KGVycikpKTtcclxuICAgIH1cclxuICAgIGZ1bmN0aW9uIHRyaWdnZXJBZnRlckVhY2godG8sIGZyb20sIGZhaWx1cmUpIHtcclxuICAgICAgICAvLyBuYXZpZ2F0aW9uIGlzIGNvbmZpcm1lZCwgY2FsbCBhZnRlckd1YXJkc1xyXG4gICAgICAgIC8vIFRPRE86IHdyYXAgd2l0aCBlcnJvciBoYW5kbGVyc1xyXG4gICAgICAgIGZvciAoY29uc3QgZ3VhcmQgb2YgYWZ0ZXJHdWFyZHMubGlzdCgpKVxyXG4gICAgICAgICAgICBndWFyZCh0bywgZnJvbSwgZmFpbHVyZSk7XHJcbiAgICB9XHJcbiAgICAvKipcclxuICAgICAqIC0gQ2xlYW5zIHVwIGFueSBuYXZpZ2F0aW9uIGd1YXJkc1xyXG4gICAgICogLSBDaGFuZ2VzIHRoZSB1cmwgaWYgbmVjZXNzYXJ5XHJcbiAgICAgKiAtIENhbGxzIHRoZSBzY3JvbGxCZWhhdmlvclxyXG4gICAgICovXHJcbiAgICBmdW5jdGlvbiBmaW5hbGl6ZU5hdmlnYXRpb24odG9Mb2NhdGlvbiwgZnJvbSwgaXNQdXNoLCByZXBsYWNlLCBkYXRhKSB7XHJcbiAgICAgICAgLy8gYSBtb3JlIHJlY2VudCBuYXZpZ2F0aW9uIHRvb2sgcGxhY2VcclxuICAgICAgICBjb25zdCBlcnJvciA9IGNoZWNrQ2FuY2VsZWROYXZpZ2F0aW9uKHRvTG9jYXRpb24sIGZyb20pO1xyXG4gICAgICAgIGlmIChlcnJvcilcclxuICAgICAgICAgICAgcmV0dXJuIGVycm9yO1xyXG4gICAgICAgIC8vIG9ubHkgY29uc2lkZXIgYXMgcHVzaCBpZiBpdCdzIG5vdCB0aGUgZmlyc3QgbmF2aWdhdGlvblxyXG4gICAgICAgIGNvbnN0IGlzRmlyc3ROYXZpZ2F0aW9uID0gZnJvbSA9PT0gU1RBUlRfTE9DQVRJT05fTk9STUFMSVpFRDtcclxuICAgICAgICBjb25zdCBzdGF0ZSA9ICFpc0Jyb3dzZXIgPyB7fSA6IGhpc3Rvcnkuc3RhdGU7XHJcbiAgICAgICAgLy8gY2hhbmdlIFVSTCBvbmx5IGlmIHRoZSB1c2VyIGRpZCBhIHB1c2gvcmVwbGFjZSBhbmQgaWYgaXQncyBub3QgdGhlIGluaXRpYWwgbmF2aWdhdGlvbiBiZWNhdXNlXHJcbiAgICAgICAgLy8gaXQncyBqdXN0IHJlZmxlY3RpbmcgdGhlIHVybFxyXG4gICAgICAgIGlmIChpc1B1c2gpIHtcclxuICAgICAgICAgICAgLy8gb24gdGhlIGluaXRpYWwgbmF2aWdhdGlvbiwgd2Ugd2FudCB0byByZXVzZSB0aGUgc2Nyb2xsIHBvc2l0aW9uIGZyb21cclxuICAgICAgICAgICAgLy8gaGlzdG9yeSBzdGF0ZSBpZiBpdCBleGlzdHNcclxuICAgICAgICAgICAgaWYgKHJlcGxhY2UgfHwgaXNGaXJzdE5hdmlnYXRpb24pXHJcbiAgICAgICAgICAgICAgICByb3V0ZXJIaXN0b3J5LnJlcGxhY2UodG9Mb2NhdGlvbi5mdWxsUGF0aCwgYXNzaWduKHtcclxuICAgICAgICAgICAgICAgICAgICBzY3JvbGw6IGlzRmlyc3ROYXZpZ2F0aW9uICYmIHN0YXRlICYmIHN0YXRlLnNjcm9sbCxcclxuICAgICAgICAgICAgICAgIH0sIGRhdGEpKTtcclxuICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgcm91dGVySGlzdG9yeS5wdXNoKHRvTG9jYXRpb24uZnVsbFBhdGgsIGRhdGEpO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBhY2NlcHQgY3VycmVudCBuYXZpZ2F0aW9uXHJcbiAgICAgICAgY3VycmVudFJvdXRlLnZhbHVlID0gdG9Mb2NhdGlvbjtcclxuICAgICAgICBoYW5kbGVTY3JvbGwodG9Mb2NhdGlvbiwgZnJvbSwgaXNQdXNoLCBpc0ZpcnN0TmF2aWdhdGlvbik7XHJcbiAgICAgICAgbWFya0FzUmVhZHkoKTtcclxuICAgIH1cclxuICAgIGxldCByZW1vdmVIaXN0b3J5TGlzdGVuZXI7XHJcbiAgICAvLyBhdHRhY2ggbGlzdGVuZXIgdG8gaGlzdG9yeSB0byB0cmlnZ2VyIG5hdmlnYXRpb25zXHJcbiAgICBmdW5jdGlvbiBzZXR1cExpc3RlbmVycygpIHtcclxuICAgICAgICAvLyBhdm9pZCBzZXR0aW5nIHVwIGxpc3RlbmVycyB0d2ljZSBkdWUgdG8gYW4gaW52YWxpZCBmaXJzdCBuYXZpZ2F0aW9uXHJcbiAgICAgICAgaWYgKHJlbW92ZUhpc3RvcnlMaXN0ZW5lcilcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIHJlbW92ZUhpc3RvcnlMaXN0ZW5lciA9IHJvdXRlckhpc3RvcnkubGlzdGVuKCh0bywgX2Zyb20sIGluZm8pID0+IHtcclxuICAgICAgICAgICAgaWYgKCFyb3V0ZXIubGlzdGVuaW5nKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAvLyBjYW5ub3QgYmUgYSByZWRpcmVjdCByb3V0ZSBiZWNhdXNlIGl0IHdhcyBpbiBoaXN0b3J5XHJcbiAgICAgICAgICAgIGNvbnN0IHRvTG9jYXRpb24gPSByZXNvbHZlKHRvKTtcclxuICAgICAgICAgICAgLy8gZHVlIHRvIGR5bmFtaWMgcm91dGluZywgYW5kIHRvIGhhc2ggaGlzdG9yeSB3aXRoIG1hbnVhbCBuYXZpZ2F0aW9uXHJcbiAgICAgICAgICAgIC8vIChtYW51YWxseSBjaGFuZ2luZyB0aGUgdXJsIG9yIGNhbGxpbmcgaGlzdG9yeS5oYXNoID0gJyMvc29tZXdoZXJlJyksXHJcbiAgICAgICAgICAgIC8vIHRoZXJlIGNvdWxkIGJlIGEgcmVkaXJlY3QgcmVjb3JkIGluIGhpc3RvcnlcclxuICAgICAgICAgICAgY29uc3Qgc2hvdWxkUmVkaXJlY3QgPSBoYW5kbGVSZWRpcmVjdFJlY29yZCh0b0xvY2F0aW9uKTtcclxuICAgICAgICAgICAgaWYgKHNob3VsZFJlZGlyZWN0KSB7XHJcbiAgICAgICAgICAgICAgICBwdXNoV2l0aFJlZGlyZWN0KGFzc2lnbihzaG91bGRSZWRpcmVjdCwgeyByZXBsYWNlOiB0cnVlIH0pLCB0b0xvY2F0aW9uKS5jYXRjaChub29wKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBwZW5kaW5nTG9jYXRpb24gPSB0b0xvY2F0aW9uO1xyXG4gICAgICAgICAgICBjb25zdCBmcm9tID0gY3VycmVudFJvdXRlLnZhbHVlO1xyXG4gICAgICAgICAgICAvLyBUT0RPOiBzaG91bGQgYmUgbW92ZWQgdG8gd2ViIGhpc3Rvcnk/XHJcbiAgICAgICAgICAgIGlmIChpc0Jyb3dzZXIpIHtcclxuICAgICAgICAgICAgICAgIHNhdmVTY3JvbGxQb3NpdGlvbihnZXRTY3JvbGxLZXkoZnJvbS5mdWxsUGF0aCwgaW5mby5kZWx0YSksIGNvbXB1dGVTY3JvbGxQb3NpdGlvbigpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBuYXZpZ2F0ZSh0b0xvY2F0aW9uLCBmcm9tKVxyXG4gICAgICAgICAgICAgICAgLmNhdGNoKChlcnJvcikgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKGlzTmF2aWdhdGlvbkZhaWx1cmUoZXJyb3IsIDQgLyogRXJyb3JUeXBlcy5OQVZJR0FUSU9OX0FCT1JURUQgKi8gfCA4IC8qIEVycm9yVHlwZXMuTkFWSUdBVElPTl9DQU5DRUxMRUQgKi8pKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGVycm9yO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKGlzTmF2aWdhdGlvbkZhaWx1cmUoZXJyb3IsIDIgLyogRXJyb3JUeXBlcy5OQVZJR0FUSU9OX0dVQVJEX1JFRElSRUNUICovKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIEhlcmUgd2UgY291bGQgY2FsbCBpZiAoaW5mby5kZWx0YSkgcm91dGVySGlzdG9yeS5nbygtaW5mby5kZWx0YSxcclxuICAgICAgICAgICAgICAgICAgICAvLyBmYWxzZSkgYnV0IHRoaXMgaXMgYnVnIHByb25lIGFzIHdlIGhhdmUgbm8gd2F5IHRvIHdhaXQgdGhlXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gbmF2aWdhdGlvbiB0byBiZSBmaW5pc2hlZCBiZWZvcmUgY2FsbGluZyBwdXNoV2l0aFJlZGlyZWN0LiBVc2luZ1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGEgc2V0VGltZW91dCBvZiAxNm1zIHNlZW1zIHRvIHdvcmsgYnV0IHRoZXJlIGlzIG5vIGd1YXJhbnRlZSBmb3JcclxuICAgICAgICAgICAgICAgICAgICAvLyBpdCB0byB3b3JrIG9uIGV2ZXJ5IGJyb3dzZXIuIFNvIGluc3RlYWQgd2UgZG8gbm90IHJlc3RvcmUgdGhlXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gaGlzdG9yeSBlbnRyeSBhbmQgdHJpZ2dlciBhIG5ldyBuYXZpZ2F0aW9uIGFzIHJlcXVlc3RlZCBieSB0aGVcclxuICAgICAgICAgICAgICAgICAgICAvLyBuYXZpZ2F0aW9uIGd1YXJkLlxyXG4gICAgICAgICAgICAgICAgICAgIC8vIHRoZSBlcnJvciBpcyBhbHJlYWR5IGhhbmRsZWQgYnkgcm91dGVyLnB1c2ggd2UganVzdCB3YW50IHRvIGF2b2lkXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gbG9nZ2luZyB0aGUgZXJyb3JcclxuICAgICAgICAgICAgICAgICAgICBwdXNoV2l0aFJlZGlyZWN0KGVycm9yLnRvLCB0b0xvY2F0aW9uXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gYXZvaWQgYW4gdW5jYXVnaHQgcmVqZWN0aW9uLCBsZXQgcHVzaCBjYWxsIHRyaWdnZXJFcnJvclxyXG4gICAgICAgICAgICAgICAgICAgIClcclxuICAgICAgICAgICAgICAgICAgICAgICAgLnRoZW4oZmFpbHVyZSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIG1hbnVhbCBjaGFuZ2UgaW4gaGFzaCBoaXN0b3J5ICM5MTYgZW5kaW5nIHVwIGluIHRoZSBVUkwgbm90XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNoYW5naW5nLCBidXQgaXQgd2FzIGNoYW5nZWQgYnkgdGhlIG1hbnVhbCB1cmwgY2hhbmdlLCBzbyB3ZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBuZWVkIHRvIG1hbnVhbGx5IGNoYW5nZSBpdCBvdXJzZWx2ZXNcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlzTmF2aWdhdGlvbkZhaWx1cmUoZmFpbHVyZSwgNCAvKiBFcnJvclR5cGVzLk5BVklHQVRJT05fQUJPUlRFRCAqLyB8XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAxNiAvKiBFcnJvclR5cGVzLk5BVklHQVRJT05fRFVQTElDQVRFRCAqLykgJiZcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICFpbmZvLmRlbHRhICYmXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbmZvLnR5cGUgPT09IE5hdmlnYXRpb25UeXBlLnBvcCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcm91dGVySGlzdG9yeS5nbygtMSwgZmFsc2UpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgLmNhdGNoKG5vb3ApO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGF2b2lkIHRoZSB0aGVuIGJyYW5jaFxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdCgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgLy8gZG8gbm90IHJlc3RvcmUgaGlzdG9yeSBvbiB1bmtub3duIGRpcmVjdGlvblxyXG4gICAgICAgICAgICAgICAgaWYgKGluZm8uZGVsdGEpIHtcclxuICAgICAgICAgICAgICAgICAgICByb3V0ZXJIaXN0b3J5LmdvKC1pbmZvLmRlbHRhLCBmYWxzZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAvLyB1bnJlY29nbml6ZWQgZXJyb3IsIHRyYW5zZmVyIHRvIHRoZSBnbG9iYWwgaGFuZGxlclxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRyaWdnZXJFcnJvcihlcnJvciwgdG9Mb2NhdGlvbiwgZnJvbSk7XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAudGhlbigoZmFpbHVyZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgZmFpbHVyZSA9XHJcbiAgICAgICAgICAgICAgICAgICAgZmFpbHVyZSB8fFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBmaW5hbGl6ZU5hdmlnYXRpb24oXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGFmdGVyIG5hdmlnYXRpb24sIGFsbCBtYXRjaGVkIGNvbXBvbmVudHMgYXJlIHJlc29sdmVkXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvTG9jYXRpb24sIGZyb20sIGZhbHNlKTtcclxuICAgICAgICAgICAgICAgIC8vIHJldmVydCB0aGUgbmF2aWdhdGlvblxyXG4gICAgICAgICAgICAgICAgaWYgKGZhaWx1cmUpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaW5mby5kZWx0YSAmJlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBhIG5ldyBuYXZpZ2F0aW9uIGhhcyBiZWVuIHRyaWdnZXJlZCwgc28gd2UgZG8gbm90IHdhbnQgdG8gcmV2ZXJ0LCB0aGF0IHdpbGwgY2hhbmdlIHRoZSBjdXJyZW50IGhpc3RvcnlcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZW50cnkgd2hpbGUgYSBkaWZmZXJlbnQgcm91dGUgaXMgZGlzcGxheWVkXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICFpc05hdmlnYXRpb25GYWlsdXJlKGZhaWx1cmUsIDggLyogRXJyb3JUeXBlcy5OQVZJR0FUSU9OX0NBTkNFTExFRCAqLykpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcm91dGVySGlzdG9yeS5nbygtaW5mby5kZWx0YSwgZmFsc2UpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmIChpbmZvLnR5cGUgPT09IE5hdmlnYXRpb25UeXBlLnBvcCAmJlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpc05hdmlnYXRpb25GYWlsdXJlKGZhaWx1cmUsIDQgLyogRXJyb3JUeXBlcy5OQVZJR0FUSU9OX0FCT1JURUQgKi8gfCAxNiAvKiBFcnJvclR5cGVzLk5BVklHQVRJT05fRFVQTElDQVRFRCAqLykpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gbWFudWFsIGNoYW5nZSBpbiBoYXNoIGhpc3RvcnkgIzkxNlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBpdCdzIGxpa2UgYSBwdXNoIGJ1dCBsYWNrcyB0aGUgaW5mb3JtYXRpb24gb2YgdGhlIGRpcmVjdGlvblxyXG4gICAgICAgICAgICAgICAgICAgICAgICByb3V0ZXJIaXN0b3J5LmdvKC0xLCBmYWxzZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdHJpZ2dlckFmdGVyRWFjaCh0b0xvY2F0aW9uLCBmcm9tLCBmYWlsdXJlKTtcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgIC5jYXRjaChub29wKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIC8vIEluaXRpYWxpemF0aW9uIGFuZCBFcnJvcnNcclxuICAgIGxldCByZWFkeUhhbmRsZXJzID0gdXNlQ2FsbGJhY2tzKCk7XHJcbiAgICBsZXQgZXJyb3JIYW5kbGVycyA9IHVzZUNhbGxiYWNrcygpO1xyXG4gICAgbGV0IHJlYWR5O1xyXG4gICAgLyoqXHJcbiAgICAgKiBUcmlnZ2VyIGVycm9ySGFuZGxlcnMgYWRkZWQgdmlhIG9uRXJyb3IgYW5kIHRocm93cyB0aGUgZXJyb3IgYXMgd2VsbFxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSBlcnJvciAtIGVycm9yIHRvIHRocm93XHJcbiAgICAgKiBAcGFyYW0gdG8gLSBsb2NhdGlvbiB3ZSB3ZXJlIG5hdmlnYXRpbmcgdG8gd2hlbiB0aGUgZXJyb3IgaGFwcGVuZWRcclxuICAgICAqIEBwYXJhbSBmcm9tIC0gbG9jYXRpb24gd2Ugd2VyZSBuYXZpZ2F0aW5nIGZyb20gd2hlbiB0aGUgZXJyb3IgaGFwcGVuZWRcclxuICAgICAqIEByZXR1cm5zIHRoZSBlcnJvciBhcyBhIHJlamVjdGVkIHByb21pc2VcclxuICAgICAqL1xyXG4gICAgZnVuY3Rpb24gdHJpZ2dlckVycm9yKGVycm9yLCB0bywgZnJvbSkge1xyXG4gICAgICAgIG1hcmtBc1JlYWR5KGVycm9yKTtcclxuICAgICAgICBjb25zdCBsaXN0ID0gZXJyb3JIYW5kbGVycy5saXN0KCk7XHJcbiAgICAgICAgaWYgKGxpc3QubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgIGxpc3QuZm9yRWFjaChoYW5kbGVyID0+IGhhbmRsZXIoZXJyb3IsIHRvLCBmcm9tKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBpZiAoKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicpKSB7XHJcbiAgICAgICAgICAgICAgICB3YXJuKCd1bmNhdWdodCBlcnJvciBkdXJpbmcgcm91dGUgbmF2aWdhdGlvbjonKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KGVycm9yKTtcclxuICAgIH1cclxuICAgIGZ1bmN0aW9uIGlzUmVhZHkoKSB7XHJcbiAgICAgICAgaWYgKHJlYWR5ICYmIGN1cnJlbnRSb3V0ZS52YWx1ZSAhPT0gU1RBUlRfTE9DQVRJT05fTk9STUFMSVpFRClcclxuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgIHJlYWR5SGFuZGxlcnMuYWRkKFtyZXNvbHZlLCByZWplY3RdKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGZ1bmN0aW9uIG1hcmtBc1JlYWR5KGVycikge1xyXG4gICAgICAgIGlmICghcmVhZHkpIHtcclxuICAgICAgICAgICAgLy8gc3RpbGwgbm90IHJlYWR5IGlmIGFuIGVycm9yIGhhcHBlbmVkXHJcbiAgICAgICAgICAgIHJlYWR5ID0gIWVycjtcclxuICAgICAgICAgICAgc2V0dXBMaXN0ZW5lcnMoKTtcclxuICAgICAgICAgICAgcmVhZHlIYW5kbGVyc1xyXG4gICAgICAgICAgICAgICAgLmxpc3QoKVxyXG4gICAgICAgICAgICAgICAgLmZvckVhY2goKFtyZXNvbHZlLCByZWplY3RdKSA9PiAoZXJyID8gcmVqZWN0KGVycikgOiByZXNvbHZlKCkpKTtcclxuICAgICAgICAgICAgcmVhZHlIYW5kbGVycy5yZXNldCgpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gZXJyO1xyXG4gICAgfVxyXG4gICAgLy8gU2Nyb2xsIGJlaGF2aW9yXHJcbiAgICBmdW5jdGlvbiBoYW5kbGVTY3JvbGwodG8sIGZyb20sIGlzUHVzaCwgaXNGaXJzdE5hdmlnYXRpb24pIHtcclxuICAgICAgICBjb25zdCB7IHNjcm9sbEJlaGF2aW9yIH0gPSBvcHRpb25zO1xyXG4gICAgICAgIGlmICghaXNCcm93c2VyIHx8ICFzY3JvbGxCZWhhdmlvcilcclxuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xyXG4gICAgICAgIGNvbnN0IHNjcm9sbFBvc2l0aW9uID0gKCFpc1B1c2ggJiYgZ2V0U2F2ZWRTY3JvbGxQb3NpdGlvbihnZXRTY3JvbGxLZXkodG8uZnVsbFBhdGgsIDApKSkgfHxcclxuICAgICAgICAgICAgKChpc0ZpcnN0TmF2aWdhdGlvbiB8fCAhaXNQdXNoKSAmJlxyXG4gICAgICAgICAgICAgICAgaGlzdG9yeS5zdGF0ZSAmJlxyXG4gICAgICAgICAgICAgICAgaGlzdG9yeS5zdGF0ZS5zY3JvbGwpIHx8XHJcbiAgICAgICAgICAgIG51bGw7XHJcbiAgICAgICAgcmV0dXJuIG5leHRUaWNrKClcclxuICAgICAgICAgICAgLnRoZW4oKCkgPT4gc2Nyb2xsQmVoYXZpb3IodG8sIGZyb20sIHNjcm9sbFBvc2l0aW9uKSlcclxuICAgICAgICAgICAgLnRoZW4ocG9zaXRpb24gPT4gcG9zaXRpb24gJiYgc2Nyb2xsVG9Qb3NpdGlvbihwb3NpdGlvbikpXHJcbiAgICAgICAgICAgIC5jYXRjaChlcnIgPT4gdHJpZ2dlckVycm9yKGVyciwgdG8sIGZyb20pKTtcclxuICAgIH1cclxuICAgIGNvbnN0IGdvID0gKGRlbHRhKSA9PiByb3V0ZXJIaXN0b3J5LmdvKGRlbHRhKTtcclxuICAgIGxldCBzdGFydGVkO1xyXG4gICAgY29uc3QgaW5zdGFsbGVkQXBwcyA9IG5ldyBTZXQoKTtcclxuICAgIGNvbnN0IHJvdXRlciA9IHtcclxuICAgICAgICBjdXJyZW50Um91dGUsXHJcbiAgICAgICAgbGlzdGVuaW5nOiB0cnVlLFxyXG4gICAgICAgIGFkZFJvdXRlLFxyXG4gICAgICAgIHJlbW92ZVJvdXRlLFxyXG4gICAgICAgIGhhc1JvdXRlLFxyXG4gICAgICAgIGdldFJvdXRlcyxcclxuICAgICAgICByZXNvbHZlLFxyXG4gICAgICAgIG9wdGlvbnMsXHJcbiAgICAgICAgcHVzaCxcclxuICAgICAgICByZXBsYWNlLFxyXG4gICAgICAgIGdvLFxyXG4gICAgICAgIGJhY2s6ICgpID0+IGdvKC0xKSxcclxuICAgICAgICBmb3J3YXJkOiAoKSA9PiBnbygxKSxcclxuICAgICAgICBiZWZvcmVFYWNoOiBiZWZvcmVHdWFyZHMuYWRkLFxyXG4gICAgICAgIGJlZm9yZVJlc29sdmU6IGJlZm9yZVJlc29sdmVHdWFyZHMuYWRkLFxyXG4gICAgICAgIGFmdGVyRWFjaDogYWZ0ZXJHdWFyZHMuYWRkLFxyXG4gICAgICAgIG9uRXJyb3I6IGVycm9ySGFuZGxlcnMuYWRkLFxyXG4gICAgICAgIGlzUmVhZHksXHJcbiAgICAgICAgaW5zdGFsbChhcHApIHtcclxuICAgICAgICAgICAgY29uc3Qgcm91dGVyID0gdGhpcztcclxuICAgICAgICAgICAgYXBwLmNvbXBvbmVudCgnUm91dGVyTGluaycsIFJvdXRlckxpbmspO1xyXG4gICAgICAgICAgICBhcHAuY29tcG9uZW50KCdSb3V0ZXJWaWV3JywgUm91dGVyVmlldyk7XHJcbiAgICAgICAgICAgIGFwcC5jb25maWcuZ2xvYmFsUHJvcGVydGllcy4kcm91dGVyID0gcm91dGVyO1xyXG4gICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoYXBwLmNvbmZpZy5nbG9iYWxQcm9wZXJ0aWVzLCAnJHJvdXRlJywge1xyXG4gICAgICAgICAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIGdldDogKCkgPT4gdW5yZWYoY3VycmVudFJvdXRlKSxcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIC8vIHRoaXMgaW5pdGlhbCBuYXZpZ2F0aW9uIGlzIG9ubHkgbmVjZXNzYXJ5IG9uIGNsaWVudCwgb24gc2VydmVyIGl0IGRvZXNuJ3RcclxuICAgICAgICAgICAgLy8gbWFrZSBzZW5zZSBiZWNhdXNlIGl0IHdpbGwgY3JlYXRlIGFuIGV4dHJhIHVubmVjZXNzYXJ5IG5hdmlnYXRpb24gYW5kIGNvdWxkXHJcbiAgICAgICAgICAgIC8vIGxlYWQgdG8gcHJvYmxlbXNcclxuICAgICAgICAgICAgaWYgKGlzQnJvd3NlciAmJlxyXG4gICAgICAgICAgICAgICAgLy8gdXNlZCBmb3IgdGhlIGluaXRpYWwgbmF2aWdhdGlvbiBjbGllbnQgc2lkZSB0byBhdm9pZCBwdXNoaW5nXHJcbiAgICAgICAgICAgICAgICAvLyBtdWx0aXBsZSB0aW1lcyB3aGVuIHRoZSByb3V0ZXIgaXMgdXNlZCBpbiBtdWx0aXBsZSBhcHBzXHJcbiAgICAgICAgICAgICAgICAhc3RhcnRlZCAmJlxyXG4gICAgICAgICAgICAgICAgY3VycmVudFJvdXRlLnZhbHVlID09PSBTVEFSVF9MT0NBVElPTl9OT1JNQUxJWkVEKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBzZWUgYWJvdmVcclxuICAgICAgICAgICAgICAgIHN0YXJ0ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgcHVzaChyb3V0ZXJIaXN0b3J5LmxvY2F0aW9uKS5jYXRjaChlcnIgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICgocHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJykpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHdhcm4oJ1VuZXhwZWN0ZWQgZXJyb3Igd2hlbiBzdGFydGluZyB0aGUgcm91dGVyOicsIGVycik7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb25zdCByZWFjdGl2ZVJvdXRlID0ge307XHJcbiAgICAgICAgICAgIGZvciAoY29uc3Qga2V5IGluIFNUQVJUX0xPQ0FUSU9OX05PUk1BTElaRUQpIHtcclxuICAgICAgICAgICAgICAgIC8vIEB0cy1leHBlY3QtZXJyb3I6IHRoZSBrZXkgbWF0Y2hlc1xyXG4gICAgICAgICAgICAgICAgcmVhY3RpdmVSb3V0ZVtrZXldID0gY29tcHV0ZWQoKCkgPT4gY3VycmVudFJvdXRlLnZhbHVlW2tleV0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGFwcC5wcm92aWRlKHJvdXRlcktleSwgcm91dGVyKTtcclxuICAgICAgICAgICAgYXBwLnByb3ZpZGUocm91dGVMb2NhdGlvbktleSwgcmVhY3RpdmUocmVhY3RpdmVSb3V0ZSkpO1xyXG4gICAgICAgICAgICBhcHAucHJvdmlkZShyb3V0ZXJWaWV3TG9jYXRpb25LZXksIGN1cnJlbnRSb3V0ZSk7XHJcbiAgICAgICAgICAgIGNvbnN0IHVubW91bnRBcHAgPSBhcHAudW5tb3VudDtcclxuICAgICAgICAgICAgaW5zdGFsbGVkQXBwcy5hZGQoYXBwKTtcclxuICAgICAgICAgICAgYXBwLnVubW91bnQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICBpbnN0YWxsZWRBcHBzLmRlbGV0ZShhcHApO1xyXG4gICAgICAgICAgICAgICAgLy8gdGhlIHJvdXRlciBpcyBub3QgYXR0YWNoZWQgdG8gYW4gYXBwIGFueW1vcmVcclxuICAgICAgICAgICAgICAgIGlmIChpbnN0YWxsZWRBcHBzLnNpemUgPCAxKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gaW52YWxpZGF0ZSB0aGUgY3VycmVudCBuYXZpZ2F0aW9uXHJcbiAgICAgICAgICAgICAgICAgICAgcGVuZGluZ0xvY2F0aW9uID0gU1RBUlRfTE9DQVRJT05fTk9STUFMSVpFRDtcclxuICAgICAgICAgICAgICAgICAgICByZW1vdmVIaXN0b3J5TGlzdGVuZXIgJiYgcmVtb3ZlSGlzdG9yeUxpc3RlbmVyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVtb3ZlSGlzdG9yeUxpc3RlbmVyID0gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICBjdXJyZW50Um91dGUudmFsdWUgPSBTVEFSVF9MT0NBVElPTl9OT1JNQUxJWkVEO1xyXG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0ZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICByZWFkeSA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdW5tb3VudEFwcCgpO1xyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAvLyBUT0RPOiB0aGlzIHByb2JhYmx5IG5lZWRzIHRvIGJlIHVwZGF0ZWQgc28gaXQgY2FuIGJlIHVzZWQgYnkgdnVlLXRlcm11aVxyXG4gICAgICAgICAgICBpZiAoKChwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nKSB8fCBfX1ZVRV9QUk9EX0RFVlRPT0xTX18pICYmIGlzQnJvd3Nlcikge1xyXG4gICAgICAgICAgICAgICAgYWRkRGV2dG9vbHMoYXBwLCByb3V0ZXIsIG1hdGNoZXIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuICAgIH07XHJcbiAgICByZXR1cm4gcm91dGVyO1xyXG59XHJcbmZ1bmN0aW9uIHJ1bkd1YXJkUXVldWUoZ3VhcmRzKSB7XHJcbiAgICByZXR1cm4gZ3VhcmRzLnJlZHVjZSgocHJvbWlzZSwgZ3VhcmQpID0+IHByb21pc2UudGhlbigoKSA9PiBndWFyZCgpKSwgUHJvbWlzZS5yZXNvbHZlKCkpO1xyXG59XHJcbmZ1bmN0aW9uIGV4dHJhY3RDaGFuZ2luZ1JlY29yZHModG8sIGZyb20pIHtcclxuICAgIGNvbnN0IGxlYXZpbmdSZWNvcmRzID0gW107XHJcbiAgICBjb25zdCB1cGRhdGluZ1JlY29yZHMgPSBbXTtcclxuICAgIGNvbnN0IGVudGVyaW5nUmVjb3JkcyA9IFtdO1xyXG4gICAgY29uc3QgbGVuID0gTWF0aC5tYXgoZnJvbS5tYXRjaGVkLmxlbmd0aCwgdG8ubWF0Y2hlZC5sZW5ndGgpO1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW47IGkrKykge1xyXG4gICAgICAgIGNvbnN0IHJlY29yZEZyb20gPSBmcm9tLm1hdGNoZWRbaV07XHJcbiAgICAgICAgaWYgKHJlY29yZEZyb20pIHtcclxuICAgICAgICAgICAgaWYgKHRvLm1hdGNoZWQuZmluZChyZWNvcmQgPT4gaXNTYW1lUm91dGVSZWNvcmQocmVjb3JkLCByZWNvcmRGcm9tKSkpXHJcbiAgICAgICAgICAgICAgICB1cGRhdGluZ1JlY29yZHMucHVzaChyZWNvcmRGcm9tKTtcclxuICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgbGVhdmluZ1JlY29yZHMucHVzaChyZWNvcmRGcm9tKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY29uc3QgcmVjb3JkVG8gPSB0by5tYXRjaGVkW2ldO1xyXG4gICAgICAgIGlmIChyZWNvcmRUbykge1xyXG4gICAgICAgICAgICAvLyB0aGUgdHlwZSBkb2Vzbid0IG1hdHRlciBiZWNhdXNlIHdlIGFyZSBjb21wYXJpbmcgcGVyIHJlZmVyZW5jZVxyXG4gICAgICAgICAgICBpZiAoIWZyb20ubWF0Y2hlZC5maW5kKHJlY29yZCA9PiBpc1NhbWVSb3V0ZVJlY29yZChyZWNvcmQsIHJlY29yZFRvKSkpIHtcclxuICAgICAgICAgICAgICAgIGVudGVyaW5nUmVjb3Jkcy5wdXNoKHJlY29yZFRvKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiBbbGVhdmluZ1JlY29yZHMsIHVwZGF0aW5nUmVjb3JkcywgZW50ZXJpbmdSZWNvcmRzXTtcclxufVxuXG4vKipcclxuICogUmV0dXJucyB0aGUgcm91dGVyIGluc3RhbmNlLiBFcXVpdmFsZW50IHRvIHVzaW5nIGAkcm91dGVyYCBpbnNpZGVcclxuICogdGVtcGxhdGVzLlxyXG4gKi9cclxuZnVuY3Rpb24gdXNlUm91dGVyKCkge1xyXG4gICAgcmV0dXJuIGluamVjdChyb3V0ZXJLZXkpO1xyXG59XHJcbi8qKlxyXG4gKiBSZXR1cm5zIHRoZSBjdXJyZW50IHJvdXRlIGxvY2F0aW9uLiBFcXVpdmFsZW50IHRvIHVzaW5nIGAkcm91dGVgIGluc2lkZVxyXG4gKiB0ZW1wbGF0ZXMuXHJcbiAqL1xyXG5mdW5jdGlvbiB1c2VSb3V0ZSgpIHtcclxuICAgIHJldHVybiBpbmplY3Qocm91dGVMb2NhdGlvbktleSk7XHJcbn1cblxuZXhwb3J0IHsgTmF2aWdhdGlvbkZhaWx1cmVUeXBlLCBSb3V0ZXJMaW5rLCBSb3V0ZXJWaWV3LCBTVEFSVF9MT0NBVElPTl9OT1JNQUxJWkVEIGFzIFNUQVJUX0xPQ0FUSU9OLCBjcmVhdGVNZW1vcnlIaXN0b3J5LCBjcmVhdGVSb3V0ZXIsIGNyZWF0ZVJvdXRlck1hdGNoZXIsIGNyZWF0ZVdlYkhhc2hIaXN0b3J5LCBjcmVhdGVXZWJIaXN0b3J5LCBpc05hdmlnYXRpb25GYWlsdXJlLCBsb2FkUm91dGVMb2NhdGlvbiwgbWF0Y2hlZFJvdXRlS2V5LCBvbkJlZm9yZVJvdXRlTGVhdmUsIG9uQmVmb3JlUm91dGVVcGRhdGUsIHBhcnNlUXVlcnksIHJvdXRlTG9jYXRpb25LZXksIHJvdXRlcktleSwgcm91dGVyVmlld0xvY2F0aW9uS2V5LCBzdHJpbmdpZnlRdWVyeSwgdXNlTGluaywgdXNlUm91dGUsIHVzZVJvdXRlciwgdmlld0RlcHRoS2V5IH07XG4iLCI8dGVtcGxhdGU+XG4gIDxkaXYgY2xhc3M9XCJob21lXCI+XG4gICAgPHA+6L+Z6YeM5piv5Li75qGG5p625qih5p2/5bel56iL6aG16Z2iPC9wPlxuICA8L2Rpdj5cbjwvdGVtcGxhdGU+XG4iLCJpbXBvcnQgeyBjcmVhdGVSb3V0ZXIsIGNyZWF0ZVdlYkhhc2hIaXN0b3J5IH0gZnJvbSBcInZ1ZS1yb3V0ZXJcIjtcbmltcG9ydCBIb21lIGZyb20gXCIuL3BhZ2VzL0hvbWUudnVlXCI7XG5leHBvcnQgZGVmYXVsdCBjcmVhdGVSb3V0ZXIoe1xuICBoaXN0b3J5OiBjcmVhdGVXZWJIYXNoSGlzdG9yeSgpLFxuICByb3V0ZXM6IFtcbiAgICB7XG4gICAgICBwYXRoOiBcIi9cIixcbiAgICAgIG5hbWU6IFwiaG9tZVwiLFxuICAgICAgY29tcG9uZW50OiBIb21lXG4gICAgfSxcbiAgXSxcbn0pO1xuIiwiZXhwb3J0IGRlZmF1bHQgXCJkYXRhOmltYWdlL3N2Zyt4bWw7YmFzZTY0LFBITjJaeUIzYVdSMGFEMGlNekkwSWlCb1pXbG5hSFE5SWpFeE1DSWdkbWxsZDBKdmVEMGlNQ0F3SURNeU5DQXhNVEFpSUdacGJHdzlJbTV2Ym1VaUlIaHRiRzV6UFNKb2RIUndPaTh2ZDNkM0xuY3pMbTl5Wnk4eU1EQXdMM04yWnlJK0NqeG5JR1pwYkhSbGNqMGlkWEpzS0NObWFXeDBaWEl3WDJsZk1sOHlLU0krQ2p4d1lYUm9JR1E5SWsweU5TNHlPRGdnTVRBNUxqSXpNa015TXk0ek1qVXpJREV3T1M0eU16SWdNakV1TnpRMk55QXhNRGd1T0RRNElESXdMalUxTWlBeE1EZ3VNRGhETVRrdU16VTNNeUF4TURjdU16azNJREU0TGpNM05pQXhNRFl1TVRFM0lERTNMall3T0NBeE1EUXVNalJNTlM0d05qUWdOekl1T0RoRE5DNHlPVFlnTnpBdU9URTNNeUF6TGpZeE16TXpJRFk1TGpJMU16TWdNeTR3TVRZZ05qY3VPRGc0UXpJdU5UQTBJRFkyTGpRek56TWdNaTR3Tnpjek15QTJOUzR3TnpJZ01TNDNNellnTmpNdU56a3lRekV1TXprME5qY2dOakl1TkRJMk55QXhMakV6T0RZM0lEWXhMakF4T0RjZ01DNDVOamdnTlRrdU5UWTRRekF1T0RneU5qWTNJRFU0TGpBek1pQXdMamcwSURVMkxqSTBJREF1T0RRZ05UUXVNVGt5VmpJd0xqUkRNQzQ0TkNBeE9TNHlPVEEzSURBdU9UWTRJREU0TGpNMU1pQXhMakl5TkNBeE55NDFPRFJETVM0MU5qVXpNeUF4Tmk0NE1UWWdNaTR3TXpRMk55QXhOaTR4TnpZZ01pNDJNeklnTVRVdU5qWTBUREU1TGpFME5DQXhMamN4TWtNeE9TNDFOekEzSURFdU16Y3dOallnTWpBdU1USTFNeUF4TGpFeE5EWTJJREl3TGpnd09DQXdMamswTXprNU0wTXlNUzQxTnpZZ01DNDJPRGM1T1RZZ01qSXVNemcyTnlBd0xqVTFPVGs1T0NBeU15NHlOQ0F3TGpVMU9UazVPRWcwTXk0MU9USkRORFV1TmpRZ01DNDFOVGs1T1RnZ05EY3VNVGMySURFdU1EY3lJRFE0TGpJZ01pNHdPVFU1T1VNME9TNHpNRGt6SURNdU1ETTBOallnTkRrdU9EWTBJRFF1TkRnMU16TWdORGt1T0RZMElEWXVORFE0VmpReExqYzNOa00wT1M0NE5qUWdOREl1TmpJNU15QTBPUzQ1TkRreklEUXpMalEwSURVd0xqRXlJRFEwTGpJd09FTTFNQzR5T1RBM0lEUTBMamszTmlBMU1DNDFNRFFnTkRVdU56ZzJOeUExTUM0M05pQTBOaTQyTkV3MU1TNHhORFFnTkRjdU5UTTJWakl3TGpSRE5URXVNVFEwSURFNUxqSTVNRGNnTlRFdU1qY3lJREU0TGpNMU1pQTFNUzQxTWpnZ01UY3VOVGcwUXpVeExqZzJPVE1nTVRZdU9ERTJJRFV5TGpNek9EY2dNVFl1TVRjMklEVXlMamt6TmlBeE5TNDJOalJNTmprdU5EUTRJREV1TnpFeVF6WTVMamczTkRjZ01TNHpOekEyTmlBM01DNDBNamt6SURFdU1URTBOallnTnpFdU1URXlJREF1T1RRek9Ua3pRemN4TGpnNElEQXVOamczT1RrMklEY3lMalk1TURjZ01DNDFOVGs1T1RnZ056TXVOVFEwSURBdU5UVTVPVGs0U0RrekxqWTBRemsxTGpjM016TWdNQzQxTlRrNU9UZ2dPVGN1TWpZMk55QXhMakF5T1RNeklEazRMakV5SURFdU9UWTNPVGxET1RrdU1EVTROeUF5TGprd05qWTJJRGs1TGpVeU9DQTBMalFnT1RrdU5USTRJRFl1TkRRNFZqUXdMakkwUXprNUxqVXlPQ0EwTWk0eU9EZ2dPVGt1TkRReU55QTBOQzR3T0NBNU9TNHlOeklnTkRVdU5qRTJRems1TGpFNE5qY2dORGN1TURZMk55QTVPQzQ1TnpNeklEUTRMalEzTkRjZ09UZ3VOak15SURRNUxqZzBRems0TGpJNU1EY2dOVEV1TVRJZ09UY3VPREl4TXlBMU1pNDBPRFV6SURrM0xqSXlOQ0ExTXk0NU16WkRPVFl1TnpFeUlEVTFMak13TVRNZ09UWXVNRGN5SURVMkxqazJOVE1nT1RVdU16QTBJRFU0TGpreU9FdzRNaTQzTmlBNU1DNHlPRGhET0RJdU5UQTBJRGt4TGpBMU5pQTRNaTR4TmpJM0lEa3hMamN6T0RjZ09ERXVOek0ySURreUxqTXpOa000TVM0ek1Ea3pJRGt5TGprek16TWdPREF1T0RneU55QTVNeTQwTURJM0lEZ3dMalExTmlBNU15NDNORFJNTmpNdU9UUTBJREV3Tnk0ME5FTTJNeTR5TmpFeklERXdPQzR3TXpjZ05qSXVORFV3TnlBeE1EZ3VORFkwSURZeExqVXhNaUF4TURndU56SkROakF1TmpVNE55QXhNRGt1TURZeElEVTVMalkzTnpNZ01UQTVMakl6TWlBMU9DNDFOamdnTVRBNUxqSXpNa2d5TlM0eU9EaGFUVGMxTGpBNElEazBRemMyTGpjd01UTWdPVFFnTnpndU1ESTBJRGt6TGpjd01UTWdOemt1TURRNElEa3pMakV3TkVNNE1DNHhOVGN6SURreUxqVXdOamNnT0RFdU1ERXdOeUE1TVM0ek9UY3pJRGd4TGpZd09DQTRPUzQzTnpaTU9UUXVNVFV5SURVNExqUXhOa001TkM0NU1pQTFOaTQxTXpnM0lEazFMalUySURVMExqa3hOek1nT1RZdU1EY3lJRFV6TGpVMU1rTTVOaTQxT0RRZ05USXVNVEF4TXlBNU55NHdNVEEzSURVd0xqY3pOaUE1Tnk0ek5USWdORGt1TkRVMlF6azNMalk1TXpNZ05EZ3VNVGMySURrM0xqa3dOamNnTkRZdU9EVXpNeUE1Tnk0NU9USWdORFV1TkRnNFF6azRMakUyTWpjZ05EUXVNRE0zTXlBNU9DNHlORGdnTkRJdU1qZzRJRGs0TGpJME9DQTBNQzR5TkZZMkxqUTBPRU01T0M0eU5EZ2dOQzQ0TWpZMk55QTVOeTQ0TmpRZ015NDJOelEyTmlBNU55NHdPVFlnTWk0NU9USkRPVFl1TkRFek15QXlMakl5TkNBNU5TNHlOakV6SURFdU9EUWdPVE11TmpRZ01TNDRORWczTXk0MU5EUkROekV1T1RJeU55QXhMamcwSURjd0xqY3lPQ0F5TGpJeU5DQTJPUzQ1TmlBeUxqazVNa00yT1M0eU56Y3pJRE11TmpjME5qWWdOamd1T1RNMklEUXVPREkyTmpjZ05qZ3VPVE0ySURZdU5EUTRWalF4TGpZME9FTTJPQzQ1TXpZZ05ESXVOVEF4TXlBMk9DNDROVEEzSURRekxqTTFORGNnTmpndU5qZ2dORFF1TWpBNFF6WTRMalV3T1RNZ05EVXVNRFl4TXlBMk9DNHlOVE16SURRMUxqazFOek1nTmpjdU9URXlJRFEyTGpnNU5rdzJNUzQ0T1RZZ05qUXVPVFEwUXpZeExqWTBJRFkxTGpjNU56TWdOakV1TXpReE15QTJOaTR6T1RRM0lEWXhJRFkyTGpjek5rTTJNQzQyTlRnM0lEWTJMams1TWlBMk1DNHhORFkzSURZM0xqRXlJRFU1TGpRMk5DQTJOeTR4TWtnMU9DNHdOVFpETlRjdU16Y3pNeUEyTnk0eE1pQTFOaTQ0TmpFeklEWTJMams1TWlBMU5pNDFNaUEyTmk0M016WkROVFl1TVRjNE55QTJOaTR6T1RRM0lEVTFMamc0SURZMUxqYzVOek1nTlRVdU5qSTBJRFkwTGprME5FdzBPUzQyTURnZ05EY3VNREkwUXpRNUxqSTJOamNnTkRZdU1EZzFNeUEwT1M0d01UQTNJRFExTGpFNE9UTWdORGd1T0RRZ05EUXVNek0yUXpRNExqWTJPVE1nTkRNdU5EZ3lOeUEwT0M0MU9EUWdOREl1TmpJNU15QTBPQzQxT0RRZ05ERXVOemMyVmpZdU5EUTRRelE0TGpVNE5DQTBMamd5TmpZM0lEUTRMakUxTnpNZ015NDJOelEyTmlBME55NHpNRFFnTWk0NU9USkRORFl1TkRVd055QXlMakl5TkNBME5TNHlNVE16SURFdU9EUWdORE11TlRreUlERXVPRFJJTWpNdU1qUkRNakV1TmpFNE55QXhMamcwSURJd0xqUXlOQ0F5TGpJeU5DQXhPUzQyTlRZZ01pNDVPVEpETVRndU9UY3pNeUF6TGpZM05EWTJJREU0TGpZek1pQTBMamd5TmpZM0lERTRMall6TWlBMkxqUTBPRlkwTUM0eU5FTXhPQzQyTXpJZ05ESXVNamc0SURFNExqWTNORGNnTkRRdU1ETTNNeUF4T0M0M05pQTBOUzQwT0RoRE1UZ3VPVE13TnlBME5pNDROVE16SURFNUxqRTROamNnTkRndU1UYzJJREU1TGpVeU9DQTBPUzQwTlRaRE1Ua3VPRFk1TXlBMU1DNDNNellnTWpBdU1qazJJRFV5TGpFd01UTWdNakF1T0RBNElEVXpMalUxTWtNeU1TNHpNaUExTkM0NU1UY3pJREl4TGprMklEVTJMalV6T0RjZ01qSXVOekk0SURVNExqUXhOa3d6TlM0eU56SWdPRGt1TnpjMlF6TTFMamcyT1RNZ09URXVNemszTXlBek5pNDJPQ0E1TWk0MU1EWTNJRE0zTGpjd05DQTVNeTR4TURSRE16Z3VPREV6TXlBNU15NDNNREV6SURRd0xqRTNPRGNnT1RRZ05ERXVPQ0E1TkVnM05TNHdPRnBOTXpNdU1EazJJREV6TGpNMlNETTBMak0zTmxZME1TNHdNRGhETXpRdU16YzJJRFF6TGpJeU5qY2dNelF1TlRRMk55QTBOUzR6TmlBek5DNDRPRGdnTkRjdU5EQTRRek0xTGpJeU9UTWdORGt1TXpjd055QXpOUzQzTkRFeklEVXhMakl3TlRNZ016WXVOREkwSURVeUxqa3hNa3cwTkM0NE56SWdOek11TXpreVF6UTFMamN5TlRNZ056VXVOakV3TnlBME5pNDJOalFnTnpjdU5EZzRJRFEzTGpZNE9DQTNPUzR3TWpSRE5EZ3VOemszTXlBNE1DNDBOelEzSURVd0xqVTBOamNnT0RFdU1pQTFNaTQ1TXpZZ09ERXVNa2cyTkM0eVF6WTJMalU0T1RNZ09ERXVNaUEyT0M0eU9UWWdPREF1TkRjME55QTJPUzR6TWlBM09TNHdNalJETnpBdU5ESTVNeUEzTnk0ME9EZ2dOekV1TkRFd055QTNOUzQyTVRBM0lEY3lMakkyTkNBM015NHpPVEpNT0RBdU56RXlJRFV5TGpreE1rTTRNUzR6T1RRM0lEVXhMakl3TlRNZ09ERXVPVEEyTnlBME9TNHpOekEzSURneUxqSTBPQ0EwTnk0ME1EaERPREl1TlRnNU15QTBOUzR6TmlBNE1pNDNOaUEwTXk0eU1qWTNJRGd5TGpjMklEUXhMakF3T0ZZeE15NHpOa2c0TkM0d05GWTBNUzR3TURoRE9EUXVNRFFnTkRNdU16azNNeUE0TXk0NE5qa3pJRFExTGpZeE5pQTRNeTQxTWpnZ05EY3VOalkwUXpnekxqSTNNaUEwT1M0Mk1qWTNJRGd5TGpjMklEVXhMalUwTmpjZ09ERXVPVGt5SURVekxqUXlORXczTXk0MU5EUWdOek11T1RBMFF6Y3lMalV5SURjMkxqTTNPRGNnTnpFdU16WTRJRGM0TGpReU5qY2dOekF1TURnNElEZ3dMakEwT0VNMk9DNDRNRGdnT0RFdU5qWTVNeUEyTmk0NE5EVXpJRGd5TGpRNElEWTBMaklnT0RJdU5EaElOVEl1T1RNMlF6VXdMakk1TURjZ09ESXVORGdnTkRndU16STRJRGd4TGpZMk9UTWdORGN1TURRNElEZ3dMakEwT0VNME5TNDNOamdnTnpndU5ESTJOeUEwTkM0Mk1UWWdOell1TXpjNE55QTBNeTQxT1RJZ056TXVPVEEwVERNMUxqRTBOQ0ExTXk0ME1qUkRNelF1TXpjMklEVXhMalUwTmpjZ016TXVPREl4TXlBME9TNDJNalkzSURNekxqUTRJRFEzTGpZMk5FTXpNeTR5TWpRZ05EVXVOakUySURNekxqQTVOaUEwTXk0ek9UY3pJRE16TGpBNU5pQTBNUzR3TURoV01UTXVNelphVFRFM01TNDROVGdnTkRRdU56SkRNVGN6TGpNNU5DQTBOQzQzTWlBeE56UXVOVEF6SURRMExqTTNPRGNnTVRjMUxqRTROaUEwTXk0Mk9UWkRNVGMxTGpnMk9TQTBNeTR3TVRNeklERTNOaTQ1TXpVZ05ERXVOVFl5TnlBeE56Z3VNemcySURNNUxqTTBORXd4T1RRdU1EQXlJREUxTGpVek5rTXhPVFF1TlRFMElERTBMalk0TWpjZ01UazFMakEyT1NBeE5DNHhNamdnTVRrMUxqWTJOaUF4TXk0NE56SkRNVGsyTGpNME9TQXhNeTQxTXpBM0lERTVOeTR3TXpFZ01UTXVNellnTVRrM0xqY3hOQ0F4TXk0ek5rZ3hPVGt1T0RsRE1qQXhMakE0TlNBeE15NHpOaUF5TURFdU9UTTRJREV6TGpjd01UTWdNakF5TGpRMUlERTBMak00TkVNeU1ETXVNRFEzSURFMExqazRNVE1nTWpBekxqTTBOaUF4TlM0NU5qSTNJREl3TXk0ek5EWWdNVGN1TXpJNFZqZ3lMalE0U0RJd01pNHdOalpXTVRjdU16STRRekl3TWk0d05qWWdNVFl1TmpRMU15QXlNREV1T0RrMUlERTJMakEwT0NBeU1ERXVOVFUwSURFMUxqVXpOa015TURFdU1qazRJREUwTGprek9EY2dNakF3TGpjME15QXhOQzQyTkNBeE9Ua3VPRGtnTVRRdU5qUklNVGszTGprM1F6RTVOeTR6TnpNZ01UUXVOalFnTVRrMkxqZzJNU0F4TkM0M01qVXpJREU1Tmk0ME16UWdNVFF1T0RrMlF6RTVOaTR3TURjZ01UVXVNRFkyTnlBeE9UVXVOVE00SURFMUxqVTNPRGNnTVRrMUxqQXlOaUF4Tmk0ME16Sk1NVGM1TGpReElETTVMams0TkVNeE56Y3VPRGMwSURReUxqSTRPQ0F4TnpZdU5qYzVJRFF6TGpnMk5qY2dNVGMxTGpneU5pQTBOQzQzTWtNeE56VXVNRFU0SURRMUxqVTNNek1nTVRjekxqY3pOU0EwTmlBeE56RXVPRFU0SURRMlF6RTJPUzQ1T0RFZ05EWWdNVFk0TGpZeE5TQTBOUzQxTnpNeklERTJOeTQzTmpJZ05EUXVOekpETVRZMkxqazVOQ0EwTXk0NE5qWTNJREUyTlM0NE5ESWdOREl1TWpnNElERTJOQzR6TURZZ016a3VPVGcwVERFME9DNDJPU0F4Tmk0ME16SkRNVFE0TGpFM09DQXhOUzQxTnpnM0lERTBOeTQyTmpZZ01UVXVNRFkyTnlBeE5EY3VNVFUwSURFMExqZzVOa014TkRZdU56STNJREUwTGpjeU5UTWdNVFEyTGpJeE5TQXhOQzQyTkNBeE5EVXVOakU0SURFMExqWTBTREUwTXk0Mk9UaERNVFF5TGpnME5TQXhOQzQyTkNBeE5ESXVNamtnTVRRdU9UTTROeUF4TkRJdU1ETTBJREUxTGpVek5rTXhOREV1TnpjNElERTJMakEwT0NBeE5ERXVOalVnTVRZdU5qUTFNeUF4TkRFdU5qVWdNVGN1TXpJNFZqZ3lMalE0U0RFME1DNHpOMVl4Tnk0ek1qaERNVFF3TGpNM0lERTFMamsyTWpjZ01UUXdMall5TmlBeE5DNDVPREV6SURFME1TNHhNemdnTVRRdU16ZzBRekUwTVM0M016VWdNVE11TnpBeE15QXhOREl1TlRnNUlERXpMak0ySURFME15NDJPVGdnTVRNdU16WklNVFExTGpnM05FTXhORFl1TlRVM0lERXpMak0ySURFME55NHlNemtnTVRNdU5UTXdOeUF4TkRjdU9USXlJREV6TGpnM01rTXhORGd1TmpBMUlERTBMakV5T0NBeE5Ea3VNakF5SURFMExqWTRNamNnTVRRNUxqY3hOQ0F4TlM0MU16Wk1NVFkxTGpNeklETTVMak0wTkVNeE5qWXVOemd4SURReExqVTJNamNnTVRZM0xqZzBOeUEwTXk0d01UTXpJREUyT0M0MU15QTBNeTQyT1RaRE1UWTVMakl4TXlBME5DNHpOemczSURFM01DNHpNaklnTkRRdU56SWdNVGN4TGpnMU9DQTBOQzQzTWxwTk1UVXdMalE0TWlBNU5FTXhOVEl1TVRBeklEazBJREUxTXk0eU5UVWdPVE11TmpVNE55QXhOVE11T1RNNElEa3lMamszTmtNeE5UUXVOekEySURreUxqSXdPQ0F4TlRVdU1Ea2dPVEV1TURFek15QXhOVFV1TURrZ09Ea3VNemt5VmpRMExqTXpOa3d4TmpJdU5qUXlJRFU0TGpJNE9FTXhOak11TkRFZ05Ua3VOek00TnlBeE5qUXVNekEySURZd0xqZ3dOVE1nTVRZMUxqTXpJRFl4TGpRNE9FTXhOall1TkRNNUlEWXlMakE0TlRNZ01UWTNMamd3TlNBMk1pNHpPRFFnTVRZNUxqUXlOaUEyTWk0ek9EUklNVGMwTGpVME5rTXhOell1TVRZM0lEWXlMak00TkNBeE56Y3VORGtnTmpJdU1EZzFNeUF4TnpndU5URTBJRFl4TGpRNE9FTXhOemt1TmpJeklEWXdMamd3TlRNZ01UZ3dMalUyTWlBMU9TNDNNemczSURFNE1TNHpNeUExT0M0eU9EaE1NVGc0TGpnNE1pQTBOQzR6TXpaV09Ea3VNemt5UXpFNE9DNDRPRElnT1RFdU1ERXpNeUF4T0RrdU1qSXpJRGt5TGpJd09DQXhPRGt1T1RBMklEa3lMamszTmtNeE9UQXVOamMwSURrekxqWTFPRGNnTVRreExqZzJPU0E1TkNBeE9UTXVORGtnT1RSSU1qRXpMakl3TWtNeU1UUXVPREl6SURrMElESXhOUzQ1TnpVZ09UTXVOalU0TnlBeU1UWXVOalU0SURreUxqazNOa015TVRjdU5ESTJJRGt5TGpJd09DQXlNVGN1T0RFZ09URXVNREV6TXlBeU1UY3VPREVnT0RrdU16a3lWall1TkRRNFF6SXhOeTQ0TVNBMExqZ3lOalkzSURJeE55NDBNallnTXk0Mk56UTJOaUF5TVRZdU5qVTRJREl1T1RreVF6SXhOUzQ1TnpVZ01pNHlNalFnTWpFMExqZ3lNeUF4TGpnMElESXhNeTR5TURJZ01TNDRORWd4T1RJdU5EWTJRekU1TVM0eE1ERWdNUzQ0TkNBeE9Ea3VPVFE1SURJdU1UTTROallnTVRnNUxqQXhJREl1TnpNMU9UbERNVGc0TGpFMU55QXpMak16TXpNeklERTROeTR6TkRZZ05DNHpNVFEyTmlBeE9EWXVOVGM0SURVdU5qYzVPVGxNTVRjMUxqRTROaUF5Tmk0MU5EUkRNVGMwTGpjMU9TQXlOeTR6TVRJZ01UYzBMak0zTlNBeU55NDROalkzSURFM05DNHdNelFnTWpndU1qQTRRekUzTXk0M056Z2dNamd1TlRRNU15QXhOek11TXprMElESTRMamN5SURFM01pNDRPRElnTWpndU56SklNVGN4TGpjelF6RTNNUzR5TVRnZ01qZ3VOeklnTVRjd0xqYzVNU0F5T0M0MU5Ea3pJREUzTUM0ME5TQXlPQzR5TURoRE1UY3dMakU1TkNBeU55NDROalkzSURFMk9TNDROVE1nTWpjdU16RXlJREUyT1M0ME1qWWdNall1TlRRMFRERTFOeTQ1TURZZ05TNDJOems1T1VNeE5UY3VNVE00SURRdU16RTBOallnTVRVMkxqSTROU0F6TGpNek16TXpJREUxTlM0ek5EWWdNaTQzTXpVNU9VTXhOVFF1TkRreklESXVNVE00TmpZZ01UVXpMak00TXlBeExqZzBJREUxTWk0d01UZ2dNUzQ0TkVneE16RXVOREZETVRJNUxqYzRPU0F4TGpnMElERXlPQzQxT1RRZ01pNHlNalFnTVRJM0xqZ3lOaUF5TGprNU1rTXhNamN1TVRReklETXVOamMwTmpZZ01USTJMamd3TWlBMExqZ3lOalkzSURFeU5pNDRNRElnTmk0ME5EaFdPRGt1TXpreVF6RXlOaTQ0TURJZ09URXVNREV6TXlBeE1qY3VNVFF6SURreUxqSXdPQ0F4TWpjdU9ESTJJRGt5TGprM05rTXhNamd1TlRrMElEa3pMalkxT0RjZ01USTVMamM0T1NBNU5DQXhNekV1TkRFZ09UUklNVFV3TGpRNE1scE5NVFUwTGpVM09DQTVOQzR4TWpoTU1UTTNMamt6T0NBeE1EY3VPVFV5UXpFek55NDFPVGNnTVRBNExqSTVNeUF4TXpjdU1EUXlJREV3T0M0MU9USWdNVE0yTGpJM05DQXhNRGd1T0RRNFF6RXpOUzQxT1RFZ01UQTVMakV3TkNBeE16UXVPREl6SURFd09TNHlNeklnTVRNekxqazNJREV3T1M0eU16SklNVEUwTGpnNU9FTXhNVEl1T0RVZ01UQTVMakl6TWlBeE1URXVNelUzSURFd09DNDNOak1nTVRFd0xqUXhPQ0F4TURjdU9ESTBRekV3T1M0ME56a2dNVEEyTGpnNE5TQXhNRGt1TURFZ01UQTFMak01TWlBeE1Ea3VNREVnTVRBekxqTTBORll5TUM0MFF6RXdPUzR3TVNBeE9TNHlPVEEzSURFd09TNHhNemdnTVRndU16VXlJREV3T1M0ek9UUWdNVGN1TlRnMFF6RXdPUzQzTXpVZ01UWXVPREUySURFeE1DNHlNRFVnTVRZdU1UYzJJREV4TUM0NE1ESWdNVFV1TmpZMFRERXlOeTR6TVRRZ01TNDNNVEpETVRJM0xqYzBNU0F4TGpNM01EWTJJREV5T0M0eU9UVWdNUzR4TVRRMk5pQXhNamd1T1RjNElEQXVPVFF6T1RrelF6RXlPUzQzTkRZZ01DNDJPRGM1T1RZZ01UTXdMalUxTnlBd0xqVTFPVGs1T0NBeE16RXVOREVnTUM0MU5UazVPVGhJTVRVeUxqQXhPRU14TlRNdU5qTTVJREF1TlRVNU9UazRJREUxTkM0NU5qSWdNQzQ1TURFek1qa2dNVFUxTGprNE5pQXhMalU0TXprNVF6RTFOeTR3T1RVZ01pNHlOalkyTmlBeE5UZ3VNVEU1SURNdU5ERTROallnTVRVNUxqQTFPQ0ExTGpBek9UazVUREUyTnk0M05qSWdNakV1TURSTU1UWTRMamt4TkNBeE9DNDVPVEpETVRZNUxqSTFOU0F4T0M0ek9UUTNJREUyT1M0MU9UY2dNVGN1T0RRZ01UWTVMamt6T0NBeE55NHpNamhETVRjd0xqTTJOU0F4Tmk0M016QTNJREUzTUM0M09URWdNVFl1TWpZeE15QXhOekV1TWpFNElERTFMamt5VERFNE55NDNNeUF5TGpBNU5UazVRekU0T0M0ME1UTWdNUzQxT0RNNU9TQXhPRGt1TURrMUlERXVNVGs1T1RrZ01UZzVMamMzT0NBd0xqazBNems1TTBNeE9UQXVOVFEySURBdU5qZzNPVGsySURFNU1TNDBORElnTUM0MU5UazVPVGdnTVRreUxqUTJOaUF3TGpVMU9UazVPRWd5TVRNdU1qQXlRekl4TlM0eU5TQXdMalUxT1RrNU9DQXlNVFl1TnpReklERXVNREk1TXpNZ01qRTNMalk0TWlBeExqazJOems1UXpJeE9DNDJNakVnTWk0NU1EWTJOaUF5TVRrdU1Ea2dOQzQwSURJeE9TNHdPU0EyTGpRME9GWTRPUzR6T1RKRE1qRTVMakE1SURrd0xqVXdNVE1nTWpFNExqa3hPU0E1TVM0ME5DQXlNVGd1TlRjNElEa3lMakl3T0VNeU1UZ3VNekl5SURreUxqazNOaUF5TVRjdU9EazFJRGt6TGpZeE5pQXlNVGN1TWprNElEazBMakV5T0V3eU1EQXVOalU0SURFd055NDVOVEpETWpBd0xqTXhOeUF4TURndU1qa3pJREU1T1M0M05qSWdNVEE0TGpVNU1pQXhPVGd1T1RrMElERXdPQzQ0TkRoRE1UazRMak14TVNBeE1Ea3VNVEEwSURFNU55NDFORE1nTVRBNUxqSXpNaUF4T1RZdU5qa2dNVEE1TGpJek1rZ3hOell1T1RjNFF6RTNOQzQ0TkRVZ01UQTVMakl6TWlBeE56TXVNekE1SURFd09DNDNOak1nTVRjeUxqTTNJREV3Tnk0NE1qUkRNVGN4TGpVeE55QXhNRFl1T0RnMUlERTNNUzR3T1NBeE1EVXVNemt5SURFM01TNHdPU0F4TURNdU16UTBWalk1TGpVMU1rd3hOak11TlRNNElEYzFMamd5TkVNeE5qSXVPRFUxSURjMkxqUXlNVE1nTVRZeUxqQTBOU0EzTmk0NE9UQTNJREUyTVM0eE1EWWdOemN1TWpNeVF6RTJNQzR5TlRNZ056Y3VORGc0SURFMU9TNHlNamtnTnpjdU5qRTJJREUxT0M0d016UWdOemN1TmpFMlNERTFOaTR6TjFZNE9TNHpPVEpETVRVMkxqTTNJRGt3TGpVd01UTWdNVFUyTGpFNU9TQTVNUzQwTkNBeE5UVXVPRFU0SURreUxqSXdPRU14TlRVdU5qQXlJRGt5TGprM05pQXhOVFV1TVRjMUlEa3pMall4TmlBeE5UUXVOVGM0SURrMExqRXlPRnBOTXpBeExqVTFJREV3T1M0eU16SklNak0yTGpNNU9FTXlNelF1TXpVZ01UQTVMakl6TWlBeU16SXVPRFUzSURFd09DNDNOak1nTWpNeExqa3hPQ0F4TURjdU9ESTBRekl6TUM0NU56a2dNVEEyTGpnNE5TQXlNekF1TlRFZ01UQTFMak01TWlBeU16QXVOVEVnTVRBekxqTTBORll5TUM0MFF6SXpNQzQxTVNBeE9TNHlPVEEzSURJek1DNDJNemdnTVRndU16VXlJREl6TUM0NE9UUWdNVGN1TlRnMFF6SXpNUzR5TXpVZ01UWXVPREUySURJek1TNDNNRFVnTVRZdU1UYzJJREl6TWk0ek1ESWdNVFV1TmpZMFRESTBPQzQ0TVRRZ01TNDNNVEpETWpRNUxqSTBNU0F4TGpNM01EWTJJREkwT1M0M09UVWdNUzR4TVRRMk5pQXlOVEF1TkRjNElEQXVPVFF6T1RrelF6STFNUzR5TkRZZ01DNDJPRGM1T1RZZ01qVXlMakExTnlBd0xqVTFPVGs1T0NBeU5USXVPVEVnTUM0MU5UazVPVGhJTWpjeUxqYzFRekkzTkM0M09UZ2dNQzQxTlRrNU9UZ2dNamMyTGpJNU1TQXhMakF5T1RNeklESTNOeTR5TXlBeExqazJOems1UXpJM09DNHhOamtnTWk0NU1EWTJOaUF5TnpndU5qTTRJRFF1TkNBeU56Z3VOak00SURZdU5EUTRWalU0TGpVME5Fd3lOemd1T0RrMElEVTRMakk0T0V3eU9UVXVOREEySURRMExqTXpOa015T1RVdU9ETXpJRFF6TGprNU5EY2dNamsyTGpNNE55QTBNeTQzTXpnM0lESTVOeTR3TnlBME15NDFOamhETWprM0xqZ3pPQ0EwTXk0ek1USWdNams0TGpZME9TQTBNeTR4T0RRZ01qazVMalV3TWlBME15NHhPRFJJTXpFNExqQTJNa016TWpBdU1URWdORE11TVRnMElETXlNUzQyTURNZ05ETXVOalV6TXlBek1qSXVOVFF5SURRMExqVTVNa016TWpNdU5EZ3hJRFExTGpVek1EY2dNekl6TGprMUlEUTNMakF5TkNBek1qTXVPVFVnTkRrdU1EY3lWamc1TGpNNU1rTXpNak11T1RVZ09UQXVOVEF4TXlBek1qTXVOemM1SURreExqUTBJRE15TXk0ME16Z2dPVEl1TWpBNFF6TXlNeTR4T0RJZ09USXVPVGMySURNeU1pNDNOVFVnT1RNdU5qRTJJRE15TWk0eE5UZ2dPVFF1TVRJNFRETXdOUzQxTVRnZ01UQTNMamsxTWtNek1EVXVNVGMzSURFd09DNHlPVE1nTXpBMExqWXlNaUF4TURndU5Ua3lJRE13TXk0NE5UUWdNVEE0TGpnME9FTXpNRE11TVRjeElERXdPUzR4TURRZ016QXlMalF3TXlBeE1Ea3VNak15SURNd01TNDFOU0F4TURrdU1qTXlXazB6TVRndU1EWXlJRGswUXpNeE9TNDJPRE1nT1RRZ016SXdMamd6TlNBNU15NDJOVGczSURNeU1TNDFNVGdnT1RJdU9UYzJRek15TWk0eU9EWWdPVEl1TWpBNElETXlNaTQyTnlBNU1TNHdNVE16SURNeU1pNDJOeUE0T1M0ek9USldORGt1TURjeVF6TXlNaTQyTnlBME55NDBOVEEzSURNeU1pNHlPRFlnTkRZdU1qazROeUF6TWpFdU5URTRJRFExTGpZeE5rTXpNakF1T0RNMUlEUTBMamcwT0NBek1Ua3VOamd6SURRMExqUTJOQ0F6TVRndU1EWXlJRFEwTGpRMk5FZ3lPVGt1TlRBeVF6STVOeTQ0T0RFZ05EUXVORFkwSURJNU5pNDJPRFlnTkRRdU9EUTRJREk1TlM0NU1UZ2dORFV1TmpFMlF6STVOUzR5TXpVZ05EWXVNams0TnlBeU9UUXVPRGswSURRM0xqUTFNRGNnTWprMExqZzVOQ0EwT1M0d056SldOamt1T0RBNFNESTNOeTR6TlRoV05pNDBORGhETWpjM0xqTTFPQ0EwTGpneU5qWTNJREkzTmk0NU56UWdNeTQyTnpRMk5pQXlOell1TWpBMklESXVPVGt5UXpJM05TNDFNak1nTWk0eU1qUWdNamMwTGpNM01TQXhMamcwSURJM01pNDNOU0F4TGpnMFNESTFNaTQ1TVVNeU5URXVNamc1SURFdU9EUWdNalV3TGpBNU5DQXlMakl5TkNBeU5Ea3VNekkySURJdU9Ua3lRekkwT0M0Mk5ETWdNeTQyTnpRMk5pQXlORGd1TXpBeUlEUXVPREkyTmpjZ01qUTRMak13TWlBMkxqUTBPRlk0T1M0ek9USkRNalE0TGpNd01pQTVNUzR3TVRNeklESTBPQzQyTkRNZ09USXVNakE0SURJME9TNHpNallnT1RJdU9UYzJRekkxTUM0d09UUWdPVE11TmpVNE55QXlOVEV1TWpnNUlEazBJREkxTWk0NU1TQTVORWd6TVRndU1EWXlXazB5TmpJdU1qVTBJRGd5TGpRNFZqRXpMak0yU0RJMk15NDFNelJXT0RFdU1rZ3pNRGd1TURjNFZqVTFMams0TkVnek1Ea3VNelU0VmpneUxqUTRTREkyTWk0eU5UUmFJaUJtYVd4c1BTSWpORUZDT0RneklpOCtDand2Wno0S1BHUmxabk0rQ2p4bWFXeDBaWElnYVdROUltWnBiSFJsY2pCZmFWOHlYeklpSUhnOUlqQXVPRE01T1RrMklpQjVQU0l3TGpVMU9UazVPQ0lnZDJsa2RHZzlJak15TXk0eE1TSWdhR1ZwWjJoMFBTSXhNVEl1TmpjeUlpQm1hV3gwWlhKVmJtbDBjejBpZFhObGNsTndZV05sVDI1VmMyVWlJR052Ykc5eUxXbHVkR1Z5Y0c5c1lYUnBiMjR0Wm1sc2RHVnljejBpYzFKSFFpSStDanhtWlVac2IyOWtJR1pzYjI5a0xXOXdZV05wZEhrOUlqQWlJSEpsYzNWc2REMGlRbUZqYTJkeWIzVnVaRWx0WVdkbFJtbDRJaTgrQ2p4bVpVSnNaVzVrSUcxdlpHVTlJbTV2Y20xaGJDSWdhVzQ5SWxOdmRYSmpaVWR5WVhCb2FXTWlJR2x1TWowaVFtRmphMmR5YjNWdVpFbHRZV2RsUm1sNElpQnlaWE4xYkhROUluTm9ZWEJsSWk4K0NqeG1aVU52Ykc5eVRXRjBjbWw0SUdsdVBTSlRiM1Z5WTJWQmJIQm9ZU0lnZEhsd1pUMGliV0YwY21sNElpQjJZV3gxWlhNOUlqQWdNQ0F3SURBZ01DQXdJREFnTUNBd0lEQWdNQ0F3SURBZ01DQXdJREFnTUNBd0lERXlOeUF3SWlCeVpYTjFiSFE5SW1oaGNtUkJiSEJvWVNJdlBnbzhabVZQWm1aelpYUWdaSGs5SWpRaUx6NEtQR1psUjJGMWMzTnBZVzVDYkhWeUlITjBaRVJsZG1saGRHbHZiajBpTWlJdlBnbzhabVZEYjIxd2IzTnBkR1VnYVc0eVBTSm9ZWEprUVd4d2FHRWlJRzl3WlhKaGRHOXlQU0poY21sMGFHMWxkR2xqSWlCck1qMGlMVEVpSUdzelBTSXhJaTgrQ2p4bVpVTnZiRzl5VFdGMGNtbDRJSFI1Y0dVOUltMWhkSEpwZUNJZ2RtRnNkV1Z6UFNJd0lEQWdNQ0F3SURBZ01DQXdJREFnTUNBd0lEQWdNQ0F3SURBZ01DQXdJREFnTUNBd0xqSTFJREFpTHo0S1BHWmxRbXhsYm1RZ2JXOWtaVDBpYm05eWJXRnNJaUJwYmpJOUluTm9ZWEJsSWlCeVpYTjFiSFE5SW1WbVptVmpkREZmYVc1dVpYSlRhR0ZrYjNkZk1sOHlJaTgrQ2p3dlptbHNkR1Z5UGdvOEwyUmxabk0rQ2p3dmMzWm5QZ289XCIiLCI8dGVtcGxhdGU+XG4gIDxkaXYgY2xhc3M9XCJmcmFtZVwiPlxuICAgIDxoZWFkZXI+XG4gICAgICA8aW1nIHNyYz1cIi4vYXNzZXRzL1ZNTC5zdmdcIiAvPlxuICAgICAgPGgxPnZ1ZS1tb2R1bGUtbG9hZGVyPC9oMT5cbiAgICAgIDxoMj7lvq7liY3nq6/mnrbmnoQ8L2gyPlxuICAgICAgPGJ1dHRvbiBAY2xpY2s9XCIkcm91dGVyLnB1c2goJy8nKVwiPuacrOWcsOaooeWdlzwvYnV0dG9uPiB8XG4gICAgICA8YnV0dG9uIEBjbGljaz1cIiRyb3V0ZXIucHVzaCgnL21vZHVsZS1wYWdlJylcIj7ov5znqIvmqKHlnZc8L2J1dHRvbj5cbiAgICA8L2hlYWRlcj5cblxuICAgIDxyb3V0ZXItdmlldz48L3JvdXRlci12aWV3PlxuICA8L2Rpdj5cbjwvdGVtcGxhdGU+XG48c3R5bGU+XG5ib2R5IHtcbiAgbWFyZ2luOiAwO1xufVxuLmZyYW1lIHtcbiAgdGV4dC1hbGlnbjogY2VudGVyO1xufVxuLmZyYW1lIGltZyB7XG4gIHdpZHRoOiAzMDBweDtcbn1cbi5mcmFtZSBhIHtcbiAgY29sb3I6ICM0OWI4ODM7XG59XG5oZWFkZXIge1xuICBwYWRkaW5nOiAxMDBweCAwO1xuICBiYWNrZ3JvdW5kOiAjZmZmO1xufVxuPC9zdHlsZT5cbiIsImltcG9ydCAqIGFzIFZ1ZSBmcm9tIFwidnVlXCI7XG5pbXBvcnQgeyBuYW1lIH0gZnJvbSBcIi4uL3BhY2thZ2UuanNvblwiO1xuaW1wb3J0IHsgdXNlTW9kdWxlIH0gZnJvbSBcInZ1ZS1tb2R1bGUtbG9hZGVyXCI7XG5pbXBvcnQgcm91dGVyIGZyb20gXCIuL3JvdXRlclwiO1xuaW1wb3J0IEFwcCBmcm9tIFwiLi9BcHAudnVlXCI7XG4vLyDlr7zlh7rmqKHlnZflrprkuYnlr7nosaFcbmV4cG9ydCBkZWZhdWx0IHtcbiAgbmFtZSxcbiAgaW5zdGFsbChcbiAgICAvKipcbiAgICAgKiBAdHlwZSB7aW1wb3J0KCd2dWUtbW9kdWxlLWxvYWRlci9zcmMvaW50ZXJmYWNlcycpLkNvbnRleHR9XG4gICAgICovXG4gICAgY3R4XG4gICkge1xuICAgIGN0eC5WdWUgPSBWdWU7XG4gICAgY29uc3QgYXBwID0gVnVlLmNyZWF0ZUFwcChBcHApO1xuICAgIC8vIOS4u+ahhuaetuWunuS+i+WMluWQjuW6lOWtmOWCqOWcqOS4iuS4i+aWh+WvueixoeS4reS+m+WFtuS7luaooeWdl+WuieijheaXtuS9v+eUqFxuICAgIGN0eC5hcHAgPSBhcHA7XG4gICAgYXBwLnVzZShyb3V0ZXIpO1xuICAgIGFwcC5tb3VudChcIiNhcHBcIik7XG4gICAgLy8g5Yqg6L296L+c56iL5qih5Z2XXG4gICAgdXNlTW9kdWxlKFxuICAgICAgXCJodHRwOi8vc3RhdGljLm1lbmdxaW5naGUuY29tL3ZtbC9tb2R1bGUvdnVlLW1vZHVsZS1tb2R1bGUuaWlmZS5qc1wiXG4gICAgKTtcbiAgfSxcbn07XG4iXSwibmFtZXMiOlsicGFyc2VRdWVyeSIsImxvY2F0aW9uIiwic3RyaW5naWZ5UXVlcnkiLCJOYXZpZ2F0aW9uVHlwZSIsIk5hdmlnYXRpb25EaXJlY3Rpb24iLCJoaXN0b3J5IiwicmVwbGFjZSIsIm5hbWUiLCJOYXZpZ2F0aW9uRmFpbHVyZVR5cGUiLCJyZSIsInZhbHVlIiwicm91dGVyIiwiaW5qZWN0IiwiY29tcHV0ZWQiLCJ1bnJlZiIsImdldEN1cnJlbnRJbnN0YW5jZSIsIndhdGNoRWZmZWN0IiwiZGVmaW5lQ29tcG9uZW50IiwicmVhY3RpdmUiLCJoIiwicHJvdmlkZSIsInJlZiIsIndhdGNoIiwicm91dGUiLCJzaGFsbG93UmVmIiwibWF0Y2hlZFJvdXRlIiwiaHJlZiIsImZhaWx1cmUiLCJyZXNvbHZlIiwibmV4dFRpY2siLCJfaG9pc3RlZF8xIiwiX2hvaXN0ZWRfMyIsIl9zZmNfcmVuZGVyIiwiX2NyZWF0ZUVsZW1lbnRWTm9kZSIsIl9vcGVuQmxvY2siLCJfY3JlYXRlRWxlbWVudEJsb2NrIiwiX2NyZWF0ZVRleHRWTm9kZSIsIlZ1ZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQWdCQSxNQUFJLFVBQVUsQ0FBQyxRQUFRLGFBQWEsY0FBYztBQUNoRCxXQUFPLElBQUksUUFBUSxDQUFDLFNBQVMsV0FBVztBQUN0QyxVQUFJLFlBQVksQ0FBQyxVQUFVO0FBQ3pCLFlBQUk7QUFDRixlQUFLLFVBQVUsS0FBSyxLQUFLLENBQUM7QUFBQSxRQUMzQixTQUFRLEdBQVA7QUFDQSxpQkFBTyxDQUFDO0FBQUEsUUFDVDtBQUFBLE1BQ1A7QUFDSSxVQUFJLFdBQVcsQ0FBQyxVQUFVO0FBQ3hCLFlBQUk7QUFDRixlQUFLLFVBQVUsTUFBTSxLQUFLLENBQUM7QUFBQSxRQUM1QixTQUFRLEdBQVA7QUFDQSxpQkFBTyxDQUFDO0FBQUEsUUFDVDtBQUFBLE1BQ1A7QUFDSSxVQUFJLE9BQU8sQ0FBQyxNQUFNLEVBQUUsT0FBTyxRQUFRLEVBQUUsS0FBSyxJQUFJLFFBQVEsUUFBUSxFQUFFLEtBQUssRUFBRSxLQUFLLFdBQVcsUUFBUTtBQUMvRixZQUFNLFlBQVksVUFBVSxNQUFNLFFBQVEsV0FBVyxHQUFHLEtBQUksQ0FBRTtBQUFBLElBQ2xFLENBQUc7QUFBQSxFQUNIO0FBQ0EsV0FBUyxnQkFBZ0Is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
