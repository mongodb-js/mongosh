/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "./";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var _stitch_browser_transport__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1);\nvar cov_1tflbw8el4=function(){var path='/Users/modetojoy/work/mongodb-js/mongosh/packages/transport-browser/src/index.js',hash='75148e6724d4a4c706ec8bfe49f69c81f9a332a8',Function=function(){}.constructor,global=new Function('return this')(),gcv='__coverage__',coverageData={path:'/Users/modetojoy/work/mongodb-js/mongosh/packages/transport-browser/src/index.js',statementMap:{},fnMap:{},branchMap:{},s:{},f:{},b:{},inputSourceMap:{version:3,sources:['/Users/modetojoy/work/mongodb-js/mongosh/packages/transport-browser/src/index.js'],names:['StitchBrowserTransport'],mappings:'AAAA,OAAOA,sBAAP,MAAmC,4BAAnC;AACA,eAAeA,sBAAf',sourcesContent:['import StitchBrowserTransport from \\'./stitch-browser-transport\\';\\nexport default StitchBrowserTransport;\\n']},_coverageSchema:'332fd63041d2c1bcb487cc26dd0d5f7d97098a6c'},coverage=global[gcv]||(global[gcv]={});if(coverage[path]&&coverage[path].hash===hash){return coverage[path];}coverageData.hash=hash;return coverage[path]=coverageData;}();/* harmony default export */ __webpack_exports__[\"default\"] = (_stitch_browser_transport__WEBPACK_IMPORTED_MODULE_0__[\"default\"]);//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vLi9zcmMvaW5kZXguanM/YjYzNSJdLCJuYW1lcyI6WyJTdGl0Y2hCcm93c2VyVHJhbnNwb3J0Il0sIm1hcHBpbmdzIjoiOzt5OUJBQ2VBLGdJQUFmIiwiZmlsZSI6IjAuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgU3RpdGNoQnJvd3NlclRyYW5zcG9ydCBmcm9tICcuL3N0aXRjaC1icm93c2VyLXRyYW5zcG9ydCc7XG5leHBvcnQgZGVmYXVsdCBTdGl0Y2hCcm93c2VyVHJhbnNwb3J0OyJdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///0\n");

/***/ }),
/* 1 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\nvar cov_1a168uizp8=function(){var path='/Users/modetojoy/work/mongodb-js/mongosh/packages/transport-browser/src/stitch-browser-transport.js',hash='67a88c25675fbbf59670baa2a6d5eebe6a86f5ab',Function=function(){}.constructor,global=new Function('return this')(),gcv='__coverage__',coverageData={path:'/Users/modetojoy/work/mongodb-js/mongosh/packages/transport-browser/src/stitch-browser-transport.js',statementMap:{'0':{start:{line:1,column:24},end:{line:1,column:70}},'1':{start:{line:15,column:4},end:{line:15,column:36}},'2':{start:{line:25,column:4},end:{line:25,column:82}}},fnMap:{'0':{name:'(anonymous_0)',decl:{start:{line:14,column:2},end:{line:14,column:3}},loc:{start:{line:14,column:28},end:{line:16,column:3}},line:14},'1':{name:'(anonymous_1)',decl:{start:{line:24,column:2},end:{line:24,column:3}},loc:{start:{line:24,column:15},end:{line:26,column:3}},line:24}},branchMap:{},s:{'0':0,'1':0,'2':0},f:{'0':0,'1':0},b:{},inputSourceMap:{version:3,sources:['/Users/modetojoy/work/mongodb-js/mongosh/packages/transport-browser/src/stitch-browser-transport.js'],names:['NOT_IMPLEMENTED','StitchBrowserTransport','constructor','stitchClient','stichClient','runCommand','Promise','reject'],mappings:'AAAA,MAAMA,eAAe,GAAG,8CAAxB;AAEA;;;;;AAIA,MAAMC,sBAAN,CAA6B;AAC3B;;;;;;AAMAC,EAAAA,WAAW,CAACC,YAAD,EAAe;AACxB,SAAKC,WAAL,GAAmBD,YAAnB;AACD;AAED;;;;;;;AAKAE,EAAAA,UAAU,GAAG;AACX,WAAOC,OAAO,CAACC,MAAR,CAAgB,qCAAoCP,eAAgB,EAApE,CAAP;AACD;;AAlB0B;;AAqB7B,eAAeC,sBAAf',sourcesContent:['const NOT_IMPLEMENTED = \\'is not implemented in the Stitch browser SDK\\';\\n\\n/**\\n * Encapsulates logic for communicating with a MongoDB instance via\\n * Stitch in the browser.\\n */\\nclass StitchBrowserTransport {\\n  /**\\n   * Instantiate a new Stitch browser transport with a connected stitch\\n   * client instance.\\n   *\\n   * @param {Client} stitchClient - The Stitch client instance.\\n   */\\n  constructor(stitchClient) {\\n    this.stichClient = stitchClient;\\n  }\\n\\n  /**\\n   * Run a command against the database.\\n   *\\n   * @returns {Promise} The promise of command results.\\n   */\\n  runCommand() {\\n    return Promise.reject(`StitchBrowserTransport#runCommand ${NOT_IMPLEMENTED}`);\\n  }\\n}\\n\\nexport default StitchBrowserTransport;\\n']},_coverageSchema:'332fd63041d2c1bcb487cc26dd0d5f7d97098a6c'},coverage=global[gcv]||(global[gcv]={});if(coverage[path]&&coverage[path].hash===hash){return coverage[path];}coverageData.hash=hash;return coverage[path]=coverageData;}();const NOT_IMPLEMENTED=(cov_1a168uizp8.s[0]++,'is not implemented in the Stitch browser SDK');class StitchBrowserTransport{constructor(stitchClient){cov_1a168uizp8.f[0]++;cov_1a168uizp8.s[1]++;this.stichClient=stitchClient;}runCommand(){cov_1a168uizp8.f[1]++;cov_1a168uizp8.s[2]++;return Promise.reject(`StitchBrowserTransport#runCommand ${NOT_IMPLEMENTED}`);}}/* harmony default export */ __webpack_exports__[\"default\"] = (StitchBrowserTransport);//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vLi9zcmMvc3RpdGNoLWJyb3dzZXItdHJhbnNwb3J0LmpzPzhjZDIiXSwibmFtZXMiOlsiTk9UX0lNUExFTUVOVEVEIiwiU3RpdGNoQnJvd3NlclRyYW5zcG9ydCIsImNvbnN0cnVjdG9yIiwic3RpdGNoQ2xpZW50Iiwic3RpY2hDbGllbnQiLCJydW5Db21tYW5kIiwiUHJvbWlzZSIsInJlamVjdCJdLCJtYXBwaW5ncyI6IjtrNkVBQUEsS0FBTUEsd0NBQWtCLDhDQUFsQixDQUFOLENBTUEsS0FBTUMsdUJBQXVCLENBTzNCQyxZQUFZQyxZQUFaLENBQTBCLDZDQUN4QixLQUFLQyxXQUFMLENBQW1CRCxZQUFuQixDQUNELENBUURFLFlBQWEsNkNBQ1gsTUFBT0MsU0FBUUMsTUFBUixDQUFnQixxQ0FBb0NQLGVBQWdCLEVBQXBFLENBQVAsQ0FDRCxDQW5CMEIsQ0F1QmRDLHFGQUFmIiwiZmlsZSI6IjEuanMiLCJzb3VyY2VzQ29udGVudCI6WyJjb25zdCBOT1RfSU1QTEVNRU5URUQgPSAnaXMgbm90IGltcGxlbWVudGVkIGluIHRoZSBTdGl0Y2ggYnJvd3NlciBTREsnO1xuLyoqXG4gKiBFbmNhcHN1bGF0ZXMgbG9naWMgZm9yIGNvbW11bmljYXRpbmcgd2l0aCBhIE1vbmdvREIgaW5zdGFuY2UgdmlhXG4gKiBTdGl0Y2ggaW4gdGhlIGJyb3dzZXIuXG4gKi9cblxuY2xhc3MgU3RpdGNoQnJvd3NlclRyYW5zcG9ydCB7XG4gIC8qKlxuICAgKiBJbnN0YW50aWF0ZSBhIG5ldyBTdGl0Y2ggYnJvd3NlciB0cmFuc3BvcnQgd2l0aCBhIGNvbm5lY3RlZCBzdGl0Y2hcbiAgICogY2xpZW50IGluc3RhbmNlLlxuICAgKlxuICAgKiBAcGFyYW0ge0NsaWVudH0gc3RpdGNoQ2xpZW50IC0gVGhlIFN0aXRjaCBjbGllbnQgaW5zdGFuY2UuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihzdGl0Y2hDbGllbnQpIHtcbiAgICB0aGlzLnN0aWNoQ2xpZW50ID0gc3RpdGNoQ2xpZW50O1xuICB9XG4gIC8qKlxuICAgKiBSdW4gYSBjb21tYW5kIGFnYWluc3QgdGhlIGRhdGFiYXNlLlxuICAgKlxuICAgKiBAcmV0dXJucyB7UHJvbWlzZX0gVGhlIHByb21pc2Ugb2YgY29tbWFuZCByZXN1bHRzLlxuICAgKi9cblxuXG4gIHJ1bkNvbW1hbmQoKSB7XG4gICAgcmV0dXJuIFByb21pc2UucmVqZWN0KGBTdGl0Y2hCcm93c2VyVHJhbnNwb3J0I3J1bkNvbW1hbmQgJHtOT1RfSU1QTEVNRU5URUR9YCk7XG4gIH1cblxufVxuXG5leHBvcnQgZGVmYXVsdCBTdGl0Y2hCcm93c2VyVHJhbnNwb3J0OyJdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///1\n");

/***/ })
/******/ ]);