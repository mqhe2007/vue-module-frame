var vueModuleFrame = function(vue2) {
  "use strict";
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
    return window[Symbol.for("___VML_CONTEXT___")];
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
        console.error(
          `[vue-module-loader]: \u6A21\u5757\u300C${moduleData.name}\u300D\u52A0\u8F7D\u9519\u8BEF\uFF01`,
          error
        );
        installReturn = error;
      }
      return installReturn;
    });
  }
  function useModule(moduleData, ctx) {
    return __async(this, null, function* () {
      const existingContext = window[Symbol.for("___VML_CONTEXT___")] || createContext$1(ctx);
      if (typeof moduleData === "object") {
        return yield fireModule(moduleData);
      } else if (typeof moduleData === "string") {
        const res = yield fetch(moduleData);
        const moduleString = yield res.text();
        const moduleCode = moduleString.replace("var", "return");
        const moduleStringFun = Function(`return function(vue){${moduleCode}}`)();
        const moduleDataFromUrl = moduleStringFun(existingContext.Vue);
        return yield fireModule(moduleDataFromUrl, moduleData.match(/\S*\//)[0]);
      }
    });
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
      const el = typeof positionEl === "string" ? isIdSelector ? document.getElementById(positionEl.slice(1)) : document.querySelector(positionEl) : positionEl;
      if (!el) {
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
        {
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
  const NavigationFailureSymbol = Symbol("");
  var NavigationFailureType;
  (function(NavigationFailureType2) {
    NavigationFailureType2[NavigationFailureType2["aborted"] = 4] = "aborted";
    NavigationFailureType2[NavigationFailureType2["cancelled"] = 8] = "cancelled";
    NavigationFailureType2[NavigationFailureType2["duplicated"] = 16] = "duplicated";
  })(NavigationFailureType || (NavigationFailureType = {}));
  function createRouterError(type, params) {
    {
      return assign(new Error(), {
        type,
        [NavigationFailureSymbol]: true
      }, params);
    }
  }
  function isNavigationFailure(error, type) {
    return error instanceof Error && NavigationFailureSymbol in error && (type == null || !!(error.type & type));
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
      throw new Error(`Invalid path "${path}"`);
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
        matcher = createRouteRecordMatcher(normalizedRecord, parent, options);
        if (originalRecord) {
          originalRecord.alias.push(matcher);
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
  const matchedRouteKey = Symbol("");
  const viewDepthKey = Symbol("");
  const routerKey = Symbol("");
  const routeLocationKey = Symbol("");
  const routerViewLocationKey = Symbol("");
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
      const guardReturn = guard.call(record && record.instances[name2], to, from, next);
      let guardCall = Promise.resolve(guardReturn);
      if (guard.length < 3)
        guardCall = guardCall.then(next);
      guardCall.catch((err) => reject(err));
    });
  }
  function extractComponentsGuards(matched, guardType, to, from) {
    const guards = [];
    for (const record of matched) {
      for (const name2 in record.components) {
        let rawComponent = record.components[name2];
        if (guardType !== "beforeRouteEnter" && !record.instances[name2])
          continue;
        if (isRouteComponent(rawComponent)) {
          const options = rawComponent.__vccOpts || rawComponent;
          const guard = options[guardType];
          guard && guards.push(guardToPromiseFn(guard, to, from, record, name2));
        } else {
          let componentPromise = rawComponent();
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
    const router2 = vue2.inject(routerKey);
    const currentRoute = vue2.inject(routeLocationKey);
    const route = vue2.computed(() => router2.resolve(vue2.unref(props.to)));
    const activeRecordIndex = vue2.computed(() => {
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
    const isActive = vue2.computed(() => activeRecordIndex.value > -1 && includesParams(currentRoute.params, route.value.params));
    const isExactActive = vue2.computed(() => activeRecordIndex.value > -1 && activeRecordIndex.value === currentRoute.matched.length - 1 && isSameRouteLocationParams(currentRoute.params, route.value.params));
    function navigate(e = {}) {
      if (guardEvent(e)) {
        return router2[vue2.unref(props.replace) ? "replace" : "push"](
          vue2.unref(props.to)
        ).catch(noop);
      }
      return Promise.resolve();
    }
    return {
      route,
      href: vue2.computed(() => route.value.href),
      isActive,
      isExactActive,
      navigate
    };
  }
  const RouterLinkImpl = /* @__PURE__ */ vue2.defineComponent({
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
      const link = vue2.reactive(useLink(props));
      const { options } = vue2.inject(routerKey);
      const elClass = vue2.computed(() => ({
        [getLinkClass(props.activeClass, options.linkActiveClass, "router-link-active")]: link.isActive,
        [getLinkClass(props.exactActiveClass, options.linkExactActiveClass, "router-link-exact-active")]: link.isExactActive
      }));
      return () => {
        const children = slots.default && slots.default(link);
        return props.custom ? children : vue2.h("a", {
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
  const RouterViewImpl = /* @__PURE__ */ vue2.defineComponent({
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
      const injectedRoute = vue2.inject(routerViewLocationKey);
      const routeToDisplay = vue2.computed(() => props.route || injectedRoute.value);
      const injectedDepth = vue2.inject(viewDepthKey, 0);
      const depth = vue2.computed(() => {
        let initialDepth = vue2.unref(injectedDepth);
        const { matched } = routeToDisplay.value;
        let matchedRoute;
        while ((matchedRoute = matched[initialDepth]) && !matchedRoute.components) {
          initialDepth++;
        }
        return initialDepth;
      });
      const matchedRouteRef = vue2.computed(() => routeToDisplay.value.matched[depth.value]);
      vue2.provide(viewDepthKey, vue2.computed(() => depth.value + 1));
      vue2.provide(matchedRouteKey, matchedRouteRef);
      vue2.provide(routerViewLocationKey, routeToDisplay);
      const viewRef = vue2.ref();
      vue2.watch(() => [viewRef.value, matchedRouteRef.value, props.name], ([instance, to, name2], [oldInstance, from, oldName]) => {
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
        const component = vue2.h(ViewComponent, assign({}, routeProps, attrs, {
          onVnodeUnmounted,
          ref: viewRef
        }));
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
  function createRouter(options) {
    const matcher = createRouterMatcher(options.routes, options);
    const parseQuery$1 = options.parseQuery || parseQuery;
    const stringifyQuery$1 = options.stringifyQuery || stringifyQuery;
    const routerHistory = options.history;
    const beforeGuards = useCallbacks();
    const beforeResolveGuards = useCallbacks();
    const afterGuards = useCallbacks();
    const currentRoute = vue2.shallowRef(START_LOCATION_NORMALIZED);
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
        return assign(locationNormalized, matchedRoute2, {
          params: decodeParams(matchedRoute2.params),
          hash: decode(locationNormalized.hash),
          redirectedFrom: void 0,
          href: href2
        });
      }
      let matcherLocation;
      if ("path" in rawLocation) {
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
      matchedRoute.params = normalizeParams(decodeParams(matchedRoute.params));
      const fullPath = stringifyURL(stringifyQuery$1, assign({}, rawLocation, {
        hash: encodeHash(hash),
        path: matchedRoute.path
      }));
      const href = routerHistory.createHref(fullPath);
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
      return vue2.nextTick().then(() => scrollBehavior(to, from, scrollPosition)).then((position) => position && scrollToPosition(position)).catch((err) => triggerError(err, to, from));
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
          get: () => vue2.unref(currentRoute)
        });
        if (isBrowser && !started && currentRoute.value === START_LOCATION_NORMALIZED) {
          started = true;
          push(routerHistory.location).catch((err) => {
          });
        }
        const reactiveRoute = {};
        for (const key in START_LOCATION_NORMALIZED) {
          reactiveRoute[key] = vue2.computed(() => currentRoute.value[key]);
        }
        app.provide(routerKey, router3);
        app.provide(routeLocationKey, vue2.reactive(reactiveRoute));
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
  const _hoisted_2$1 = /* @__PURE__ */ vue2.createElementVNode("p", null, "\u8FD9\u91CC\u662F\u4E3B\u6846\u67B6\u6A21\u677F\u5DE5\u7A0B\u9875\u9762", -1);
  const _hoisted_3$1 = [
    _hoisted_2$1
  ];
  function _sfc_render$1(_ctx, _cache) {
    return vue2.openBlock(), vue2.createElementBlock("div", _hoisted_1$1, _hoisted_3$1);
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
  const _hoisted_2 = /* @__PURE__ */ vue2.createElementVNode("img", { src: _imports_0 }, null, -1);
  const _hoisted_3 = /* @__PURE__ */ vue2.createElementVNode("h1", null, "vue-module-loader", -1);
  const _hoisted_4 = /* @__PURE__ */ vue2.createElementVNode("h2", null, "\u5FAE\u524D\u7AEF\u67B6\u6784", -1);
  function _sfc_render(_ctx, _cache) {
    const _component_router_view = vue2.resolveComponent("router-view");
    return vue2.openBlock(), vue2.createElementBlock("div", _hoisted_1, [
      vue2.createElementVNode("header", null, [
        _hoisted_2,
        _hoisted_3,
        _hoisted_4,
        vue2.createElementVNode("button", {
          onClick: _cache[0] || (_cache[0] = ($event) => _ctx.$router.push("/"))
        }, "\u672C\u5730\u6A21\u5757"),
        vue2.createTextVNode(" | "),
        vue2.createElementVNode("button", {
          onClick: _cache[1] || (_cache[1] = ($event) => _ctx.$router.push("/module-page"))
        }, "\u8FDC\u7A0B\u6A21\u5757")
      ]),
      vue2.createVNode(_component_router_view)
    ]);
  }
  const App = /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render]]);
  const module = {
    name,
    install(ctx) {
      const app = vue2.createApp(App);
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
