(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.peerplays_ws = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.Manager = exports.ChainConfig = exports.Apis = undefined;

var _ApiInstances = require('./src/ApiInstances');

var _ApiInstances2 = _interopRequireDefault(_ApiInstances);

var _ConnectionManager = require('./src/ConnectionManager');

var _ConnectionManager2 = _interopRequireDefault(_ConnectionManager);

var _ChainConfig = require('./src/ChainConfig');

var _ChainConfig2 = _interopRequireDefault(_ChainConfig);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.Apis = _ApiInstances2.default;
exports.ChainConfig = _ChainConfig2.default;
exports.Manager = _ConnectionManager2.default;
},{"./src/ApiInstances":2,"./src/ChainConfig":3,"./src/ConnectionManager":5}],2:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _ChainWebSocket = require('./ChainWebSocket');

var _ChainWebSocket2 = _interopRequireDefault(_ChainWebSocket);

var _GrapheneApi = require('./GrapheneApi');

var _GrapheneApi2 = _interopRequireDefault(_GrapheneApi);

var _ChainConfig = require('./ChainConfig');

var _ChainConfig2 = _interopRequireDefault(_ChainConfig);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var inst = void 0;

var ApisInstance = function () {
  function ApisInstance() {
    _classCallCheck(this, ApisInstance);
  }

  /** @arg {string} connection .. */
  ApisInstance.prototype.connect = function connect(cs, connectTimeout) {
    var _this = this;

    var rpc_user = '';
    var rpc_password = '';

    if (typeof window !== 'undefined' && window.location && window.location.protocol === 'https:' && cs.indexOf('wss://') < 0) {
      throw new Error('Secure domains require wss connection');
    }

    this.ws_rpc = new _ChainWebSocket2.default(cs, this.statusCb, connectTimeout);

    this.init_promise = this.ws_rpc.login(rpc_user, rpc_password).then(function () {
      console.log('Connected to API node:', cs);
      _this._db = new _GrapheneApi2.default(_this.ws_rpc, 'database');
      _this._net = new _GrapheneApi2.default(_this.ws_rpc, 'network_broadcast');
      _this._hist = new _GrapheneApi2.default(_this.ws_rpc, 'history');
      _this._crypto = new _GrapheneApi2.default(_this.ws_rpc, 'crypto');
      _this._bookie = new _GrapheneApi2.default(_this.ws_rpc, 'bookie');
      var db_promise = _this._db.init().then(function () {
        return _this._db.exec('get_chain_id', []).then(function (_chain_id) {
          _this.chain_id = _chain_id;
          return _ChainConfig2.default.setChainId(_chain_id);
        });
      });

      _this.ws_rpc.on_reconnect = function () {
        _this.ws_rpc.login('', '').then(function () {
          _this._db.init().then(function () {
            if (_this.statusCb) {
              _this.statusCb(_ChainWebSocket2.default.status.RECONNECTED);
            }
          });
          _this._net.init();
          _this._hist.init();
          _this._crypto.init();
          _this._bookie.init();
        });
      };

      return Promise.all([db_promise, _this._net.init(), _this._hist.init(),
      // Temporary squash crypto API error until the API is upgraded everywhere
      _this._crypto.init().catch(function (e) {
        return console.error('ApiInstance\tCrypto API Error', e);
      }), _this._bookie.init()]);
    });
  };

  ApisInstance.prototype.close = function close() {
    if (this.ws_rpc) {
      this.ws_rpc.close();
    }

    this.ws_rpc = null;
  };

  ApisInstance.prototype.db_api = function db_api() {
    return this._db;
  };

  ApisInstance.prototype.network_api = function network_api() {
    return this._net;
  };

  ApisInstance.prototype.history_api = function history_api() {
    return this._hist;
  };

  ApisInstance.prototype.crypto_api = function crypto_api() {
    return this._crypto;
  };

  ApisInstance.prototype.bookie_api = function bookie_api() {
    return this._bookie;
  };

  ApisInstance.prototype.setRpcConnectionStatusCallback = function setRpcConnectionStatusCallback(callback) {
    this.statusCb = callback;
  };

  return ApisInstance;
}();

/**
    Configure: configure as follows `Apis.instance("ws://localhost:8090").init_promise`.  This
    returns a promise, once resolved the connection is ready.

    Import: import { Apis } from "@graphene/chain"

    Short-hand: Apis.db("method", "parm1", 2, 3, ...).  Returns a promise with results.

    Additional usage: Apis.instance().db_api().exec("method", ["method", "parm1", 2, 3, ...]).
    Returns a promise with results.
*/

exports.default = {
  setRpcConnectionStatusCallback: function setRpcConnectionStatusCallback(callback) {
    this.statusCb = callback;

    if (inst) {
      inst.setRpcConnectionStatusCallback(callback);
    }
  },

  /**
        @arg {string} cs is only provided in the first call
        @return {Apis} singleton .. Check Apis.instance().init_promise to
        know when the connection is established
    */
  reset: function reset() {
    var cs = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'ws://localhost:8090';
    var connect = arguments[1];
    var connectTimeout = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 4000;

    if (inst) {
      inst.close();
      inst = null;
    }

    inst = new ApisInstance();
    inst.setRpcConnectionStatusCallback(this.statusCb);

    if (inst && connect) {
      inst.connect(cs, connectTimeout);
    }

    return inst;
  },
  instance: function instance() {
    var cs = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'ws://localhost:8090';
    var connect = arguments[1];
    var connectTimeout = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 4000;

    if (!inst) {
      inst = new ApisInstance(_ChainConfig2.default);
      inst.setRpcConnectionStatusCallback(this.statusCb);
    }

    if (inst && connect) {
      inst.connect(cs, connectTimeout);
    }

    return inst;
  },
  chainId: function chainId() {
    return this.instance().chain_id;
  },
  close: function close() {
    if (inst) {
      inst.close();
      inst = null;
    }
  }
  // db: (method, ...args) => Apis.instance().db_api().exec(method, toStrings(args)),
  // network: (method, ...args) => Apis.instance().network_api().exec(method, toStrings(args)),
  // history: (method, ...args) => Apis.instance().history_api().exec(method, toStrings(args)),
  // crypto: (method, ...args) => Apis.instance().crypto_api().exec(method, toStrings(args))

};
},{"./ChainConfig":3,"./ChainWebSocket":4,"./GrapheneApi":6}],3:[function(require,module,exports){
'use strict';

exports.__esModule = true;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var defaults = {
  core_asset: 'PPY',
  address_prefix: 'PPY',
  expire_in_secs: 15,
  expire_in_secs_proposal: 24 * 60 * 60,
  review_in_secs_committee: 24 * 60 * 60
};

var networks = {
  networks: {
    Peerplays: {
      core_asset: 'PPY',
      address_prefix: 'PPY',
      chain_id: '6b6b5f0ce7a36d323768e534f3edb41c6d6332a541a95725b98e28d140850134'
    },
    PeerplaysTestnet: {
      core_asset: 'PPYTEST',
      address_prefix: 'PPYTEST',
      chain_id: 'be6b79295e728406cbb7494bcb626e62ad278fa4018699cf8f75739f4c1a81fd'
    },
    PeerplaysBeatrice: {
      core_asset: "TEST",
      address_prefix: "TEST",
      chain_id: "b3f7fe1e5ad0d2deca40a626a4404524f78e65c3a48137551c33ea4e7c365672"
    }

  }
};

var ChainConfig = function () {
  function ChainConfig() {
    _classCallCheck(this, ChainConfig);

    this.reset();
  }

  ChainConfig.prototype.reset = function reset() {
    Object.assign(this, defaults);
  };

  ChainConfig.prototype.setChainId = function setChainId(chainID) {
    var ref = Object.keys(networks);

    for (var i = 0, len = ref.length; i < len; i++) {
      var network_name = ref[i];
      var network = networks[network_name];

      if (network.chain_id === chainID) {
        this.network_name = network_name;

        if (network.address_prefix) {
          this.address_prefix = network.address_prefix;
        }

        return {
          network_name: network_name,
          network: network
        };
      }
    }

    if (!this.network_name) {
      console.log('Unknown chain id (this may be a testnet)', chainID);
    }
  };

  ChainConfig.prototype.setPrefix = function setPrefix() {
    var prefix = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'PPY';

    this.address_prefix = prefix;
  };

  return ChainConfig;
}();

exports.default = new ChainConfig();
},{}],4:[function(require,module,exports){
'use strict';

exports.__esModule = true;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var SOCKET_DEBUG = false;
var WebSocketClient = null;

if (typeof WebSocket !== 'undefined') {
  WebSocketClient = WebSocket;
} else {
  WebSocketClient = require('ws'); // eslint-disable-line global-require
}

var SUBSCRIBE_OPERATIONS = ['set_subscribe_callback', 'subscribe_to_market', 'broadcast_transaction_with_callback', 'set_pending_transaction_callback'];

var UNSUBSCRIBE_OPERATIONS = ['unsubscribe_from_market', 'unsubscribe_from_accounts'];

var HEALTH_CHECK_INTERVAL = 10000;

var ChainWebSocket = function () {
  /**
   *Creates an instance of ChainWebSocket.
   * @param {string}    serverAddress           The address of the websocket to connect to.
   * @param {function}  statusCb                Called when status events occur.
   * @param {number}    [connectTimeout=10000]  The time for a connection attempt to complete.
   * @memberof ChainWebSocket
   */
  function ChainWebSocket(serverAddress, statusCb) {
    var connectTimeout = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 10000;

    _classCallCheck(this, ChainWebSocket);

    this.statusCb = statusCb;
    this.serverAddress = serverAddress;
    this.timeoutInterval = connectTimeout;

    // The currenct connection state of the websocket.
    this.connected = false;
    this.reconnectTimeout = null;

    // Callback to execute when the websocket is reconnected.
    this.on_reconnect = null;

    // An incrementing ID for each request so that we can pair it with the
    // response from the websocket.
    this.cbId = 0;

    // Objects to store key/value pairs for callbacks, subscription callbacks
    // and unsubscribe callbacks.
    this.cbs = {};
    this.subs = {};
    this.unsub = {};

    // Current connection promises' rejection
    this.currentResolve = null;
    this.currentReject = null;

    // Health check for the connection to the BlockChain.
    this.healthCheck = null;

    // Copy the constants to this instance.
    this.status = ChainWebSocket.status;

    // Bind the functions to the instance.
    this.onConnectionOpen = this.onConnectionOpen.bind(this);
    this.onConnectionClose = this.onConnectionClose.bind(this);
    this.onConnectionTerminate = this.onConnectionTerminate.bind(this);
    this.onConnectionError = this.onConnectionError.bind(this);
    this.onConnectionTimeout = this.onConnectionTimeout.bind(this);
    this.createConnection = this.createConnection.bind(this);
    this.createConnectionPromise = this.createConnectionPromise.bind(this);
    this.listener = this.listener.bind(this);

    // Create the initial connection the blockchain.
    this.createConnection();
  }

  /**
   * Create the connection to the Blockchain.
   *
   * @returns
   * @memberof ChainWebSocket
   */


  ChainWebSocket.prototype.createConnection = function createConnection() {
    this.debug('!!! ChainWebSocket create connection');

    // Clear any possible reconnect timers.
    this.reconnectTimeout = null;

    // Create the promise for this connection
    if (!this.connect_promise) {
      this.connect_promise = new Promise(this.createConnectionPromise);
    }

    // Attempt to create the websocket
    try {
      this.ws = new WebSocketClient(this.serverAddress);
    } catch (error) {
      // Set a timeout to try and reconnect here.
      return this.resetConnection();
    }

    this.addEventListeners();

    // Handle timeouts to the websocket's initial connection.
    this.connectionTimeout = setTimeout(this.onConnectionTimeout, this.timeoutInterval);
  };

  /**
   * Reset the connection to the BlockChain.
   *
   * @memberof ChainWebSocket
   */


  ChainWebSocket.prototype.resetConnection = function resetConnection() {
    // Close the Websocket if its still 'half-open'
    this.close();

    // Make sure we only ever have one timeout running to reconnect.
    if (!this.reconnectTimeout) {
      this.debug('!!! ChainWebSocket reset connection', this.timeoutInterval);
      this.reconnectTimeout = setTimeout(this.createConnection, this.timeoutInterval);
    }

    // Reject the current promise if there is one.
    if (this.currentReject) {
      this.currentReject(new Error('Connection attempt failed: ' + this.serverAddress));
    }
  };

  /**
   * Add event listeners to the WebSocket.
   *
   * @memberof ChainWebSocket
   */


  ChainWebSocket.prototype.addEventListeners = function addEventListeners() {
    this.debug('!!! ChainWebSocket add event listeners');
    this.ws.addEventListener('open', this.onConnectionOpen);
    this.ws.addEventListener('close', this.onConnectionClose);
    this.ws.addEventListener('error', this.onConnectionError);
    this.ws.addEventListener('message', this.listener);
  };

  /**
   * Remove the event listers from the WebSocket. Its important to remove the event listerers
   * for garbaage collection. Because we are creating a new WebSocket on each connection attempt
   * any listeners that are still attached could prevent the old sockets from
   * being garbage collected.
   *
   * @memberof ChainWebSocket
   */


  ChainWebSocket.prototype.removeEventListeners = function removeEventListeners() {
    this.debug('!!! ChainWebSocket remove event listeners');
    this.ws.removeEventListener('open', this.onConnectionOpen);
    this.ws.removeEventListener('close', this.onConnectionClose);
    this.ws.removeEventListener('error', this.onConnectionError);
    this.ws.removeEventListener('message', this.listener);
  };

  /**
   * A function that is passed to a new promise that stores the resolve and reject callbacks
   * in the state.
   *
   * @param {function} resolve A callback to be executed when the promise is resolved.
   * @param {function} reject A callback to be executed when the promise is rejected.
   * @memberof ChainWebSocket
   */


  ChainWebSocket.prototype.createConnectionPromise = function createConnectionPromise(resolve, reject) {
    this.debug('!!! ChainWebSocket createPromise');
    this.currentResolve = resolve;
    this.currentReject = reject;
  };

  /**
   * Called when a new Websocket connection is opened.
   *
   * @memberof ChainWebSocket
   */


  ChainWebSocket.prototype.onConnectionOpen = function onConnectionOpen() {
    this.debug('!!! ChainWebSocket Connected ');

    this.connected = true;

    clearTimeout(this.connectionTimeout);
    this.connectionTimeout = null;

    // This will trigger the login process as well as some additional setup in ApiInstances
    if (this.on_reconnect) {
      this.on_reconnect();
    }

    if (this.currentResolve) {
      this.currentResolve();
    }

    if (this.statusCb) {
      this.statusCb(ChainWebSocket.status.OPEN);
    }
  };

  /**
   * called when the connection attempt times out.
   *
   * @memberof ChainWebSocket
   */


  ChainWebSocket.prototype.onConnectionTimeout = function onConnectionTimeout() {
    this.debug('!!! ChainWebSocket timeout');
    this.onConnectionClose(new Error('Connection timed out.'));
  };

  /**
   * Called when the Websocket is not responding to the health checks.
   *
   * @memberof ChainWebSocket
   */


  ChainWebSocket.prototype.onConnectionTerminate = function onConnectionTerminate() {
    this.debug('!!! ChainWebSocket terminate');
    this.onConnectionClose(new Error('Connection was terminated.'));
  };

  /**
   * Called when the connection to the Blockchain is closed.
   *
   * @param {*} error
   * @memberof ChainWebSocket
   */


  ChainWebSocket.prototype.onConnectionClose = function onConnectionClose(error) {
    this.debug('!!! ChainWebSocket Close ', error);

    this.resetConnection();

    if (this.statusCb) {
      this.statusCb(ChainWebSocket.status.CLOSED);
    }
  };

  /**
   * Called when the Websocket encounters an error.
   *
   * @param {*} error
   * @memberof ChainWebSocket
   */


  ChainWebSocket.prototype.onConnectionError = function onConnectionError(error) {
    this.debug('!!! ChainWebSocket On Connection Error ', error);

    this.resetConnection();

    if (this.statusCb) {
      this.statusCb(ChainWebSocket.status.ERROR);
    }
  };

  /**
   * Entry point to make RPC calls on the BlockChain.
   *
   * @param {array} params An array of params to be passed to the rpc call. [method, ...params]
   * @returns A new promise for this specific call.
   * @memberof ChainWebSocket
   */


  ChainWebSocket.prototype.call = function call(params) {
    var _this = this;

    if (!this.connected) {
      this.debug('!!! ChainWebSocket Call not connected. ');
      return Promise.reject(new Error('Disconnected from the BlockChain.'));
    }

    this.debug('!!! ChainWebSocket Call connected. ', params);

    var request = {
      method: params[1],
      params: params,
      id: this.cbId + 1
    };

    this.cbId = request.id;

    if (SUBSCRIBE_OPERATIONS.includes(request.method)) {
      // Store callback in subs map
      this.subs[request.id] = {
        callback: request.params[2][0]
      };

      // Replace callback with the callback id
      request.params[2][0] = request.id;
    }

    if (UNSUBSCRIBE_OPERATIONS.includes(request.method)) {
      if (typeof request.params[2][0] !== 'function') {
        throw new Error('First parameter of unsub must be the original callback');
      }

      var unSubCb = request.params[2].splice(0, 1)[0];

      // Find the corresponding subscription
      for (var id in this.subs) {
        // eslint-disable-line
        if (this.subs[id].callback === unSubCb) {
          this.unsub[request.id] = id;
          break;
        }
      }
    }

    if (!this.healthCheck) {
      this.healthCheck = setTimeout(this.onConnectionTerminate.bind(this), HEALTH_CHECK_INTERVAL);
    }

    return new Promise(function (resolve, reject) {
      _this.cbs[request.id] = {
        time: new Date(),
        resolve: resolve,
        reject: reject
      };

      // Set all requests to be 'call' methods.
      request.method = 'call';

      try {
        _this.ws.send(JSON.stringify(request));
      } catch (error) {
        _this.debug('Caught a nasty error : ', error);
      }
    });
  };

  /**
   * Called when messages are received on the Websocket.
   *
   * @param {*} response The message received.
   * @memberof ChainWebSocket
   */


  ChainWebSocket.prototype.listener = function listener(response) {
    var responseJSON = null;

    try {
      responseJSON = JSON.parse(response.data);
    } catch (error) {
      responseJSON.error = 'Error parsing response: ' + error.stack;
      this.debug('Error parsing response: ', response);
    }

    // Clear the health check timeout, we've just received a healthy response from the server.
    if (this.healthCheck) {
      clearTimeout(this.healthCheck);
      this.healthCheck = null;
    }

    var sub = false;
    var callback = null;

    if (responseJSON.method === 'notice') {
      sub = true;
      responseJSON.id = responseJSON.params[0];
    }

    if (!sub) {
      callback = this.cbs[responseJSON.id];
    } else {
      callback = this.subs[responseJSON.id].callback;
    }

    if (callback && !sub) {
      if (responseJSON.error) {
        this.debug('----> responseJSON : ', responseJSON);
        callback.reject(responseJSON.error);
      } else {
        callback.resolve(responseJSON.result);
      }

      delete this.cbs[responseJSON.id];

      if (this.unsub[responseJSON.id]) {
        delete this.subs[this.unsub[responseJSON.id]];
        delete this.unsub[responseJSON.id];
      }
    } else if (callback && sub) {
      callback(responseJSON.params[1]);
    } else {
      this.debug('Warning: unknown websocket responseJSON: ', responseJSON);
    }
  };

  /**
   * Login to the Blockchain.
   *
   * @param {string} user Username
   * @param {string} password Password
   * @returns A promise that is fulfilled after login.
   * @memberof ChainWebSocket
   */


  ChainWebSocket.prototype.login = function login(user, password) {
    var _this2 = this;

    this.debug('!!! ChainWebSocket login.', user, password);
    return this.connect_promise.then(function () {
      return _this2.call([1, 'login', [user, password]]);
    });
  };

  /**
   * Close the connection to the Blockchain.
   *
   * @memberof ChainWebSocket
   */


  ChainWebSocket.prototype.close = function close() {
    if (this.ws) {
      this.removeEventListeners();

      // Try and fire close on the connection.
      this.ws.close();

      // Clear our references so that it can be garbage collected.
      this.ws = null;
    }

    // Clear our timeouts for connection timeout and health check.
    clearTimeout(this.connectionTimeout);
    this.connectionTimeout = null;

    clearTimeout(this.healthCheck);
    this.healthCheck = null;

    clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = null;

    // Toggle the connected flag.
    this.connected = false;
  };

  ChainWebSocket.prototype.debug = function debug() {
    if (SOCKET_DEBUG) {
      for (var _len = arguments.length, params = Array(_len), _key = 0; _key < _len; _key++) {
        params[_key] = arguments[_key];
      }

      console.log.apply(null, params);
    }
  };

  return ChainWebSocket;
}();

// Constants for STATE


ChainWebSocket.status = {
  RECONNECTED: 'reconnected',
  OPEN: 'open',
  CLOSED: 'closed',
  ERROR: 'error'
};

exports.default = ChainWebSocket;
},{"ws":7}],5:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _ApiInstances = require('./ApiInstances');

var _ApiInstances2 = _interopRequireDefault(_ApiInstances);

var _ChainWebSocket = require('./ChainWebSocket');

var _ChainWebSocket2 = _interopRequireDefault(_ChainWebSocket);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Manager = function () {
  function Manager(_ref) {
    var url = _ref.url,
        urls = _ref.urls;

    _classCallCheck(this, Manager);

    this.url = url;
    this.urls = urls.filter(function (a) {
      return a !== url;
    });
  }

  Manager.prototype.logFailure = function logFailure(url) {
    console.error('Unable to connect to', url + ', skipping to next full node API server');
  };

  Manager.prototype.connect = function connect() {
    var _connect = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;

    var url = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : this.url;

    return new Promise(function (resolve, reject) {
      _ApiInstances2.default.instance(url, _connect).init_promise.then(resolve).catch(function (error) {
        _ApiInstances2.default.instance().close();
        reject(error);
      });
    });
  };

  Manager.prototype.connectWithFallback = function connectWithFallback() {
    var connect = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;
    var url = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : this.url;
    var index = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;

    var _this = this;

    var resolve = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;
    var reject = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : null;

    if (reject && index > this.urls.length - 1) {
      return reject(new Error('Tried ' + (index + 1) + ' connections, none of which worked: ' + JSON.stringify(this.urls.concat(this.url))));
    }

    var fallback = function fallback(resolve, reject) {
      _this.logFailure(url);
      return _this.connectWithFallback(connect, _this.urls[index], index + 1, resolve, reject);
    };

    if (resolve && reject) {
      return this.connect(connect, url).then(resolve).catch(function () {
        fallback(resolve, reject);
      });
    }

    return new Promise(function (resolve, reject) {
      _this.connect(connect).then(resolve).catch(function () {
        fallback(resolve, reject);
      });
    });
  };

  Manager.prototype.checkConnections = function checkConnections() {
    var rpc_user = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
    var rpc_password = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';

    var _this2 = this;

    var resolve = arguments[2];
    var reject = arguments[3];

    var connectionStartTimes = {};

    var checkFunction = function checkFunction(resolve, reject) {
      var fullList = _this2.urls.concat(_this2.url);
      var connectionPromises = [];

      fullList.forEach(function (url) {
        var conn = new _ChainWebSocket2.default(url, function () {});
        connectionStartTimes[url] = new Date().getTime();
        connectionPromises.push(function () {
          return conn.login(rpc_user, rpc_password).then(function () {
            var _ref2;

            conn.close();
            return _ref2 = {}, _ref2[url] = new Date().getTime() - connectionStartTimes[url], _ref2;
          }).catch(function () {
            if (url === _this2.url) {
              _this2.url = _this2.urls[0];
            } else {
              _this2.urls = _this2.urls.filter(function (a) {
                return a !== url;
              });
            }

            conn.close();
            return null;
          });
        });
      });

      Promise.all(connectionPromises.map(function (a) {
        return a();
      })).then(function (res) {
        resolve(res.filter(function (a) {
          return !!a;
        }).reduce(function (f, a) {
          var key = Object.keys(a)[0];
          f[key] = a[key];
          return f;
        }, {}));
      }).catch(function () {
        return _this2.checkConnections(rpc_user, rpc_password, resolve, reject);
      });
    };

    if (resolve && reject) {
      checkFunction(resolve, reject);
    } else {
      return new Promise(checkFunction);
    }
  };

  return Manager;
}();

exports.default = Manager;
},{"./ApiInstances":2,"./ChainWebSocket":4}],6:[function(require,module,exports){
'use strict';

exports.__esModule = true;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var GrapheneApi = function () {
  function GrapheneApi(ws_rpc, api_name) {
    _classCallCheck(this, GrapheneApi);

    this.ws_rpc = ws_rpc;
    this.api_name = api_name;
  }

  GrapheneApi.prototype.init = function init() {
    var _this = this;

    return this.ws_rpc.call([1, this.api_name, []]).then(function (response) {
      _this.api_id = response;
      return _this;
    });
  };

  GrapheneApi.prototype.exec = function exec(method, params) {
    return this.ws_rpc.call([this.api_id, method, params]).catch(function (error) {
      console.log('!!! GrapheneApi error: ', method, params, error, JSON.stringify(error));
      throw error;
    });
  };

  return GrapheneApi;
}();

exports.default = GrapheneApi;
},{}],7:[function(require,module,exports){

},{}]},{},[1])(1)
});

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJkaXN0L2luZGV4LmpzIiwiZGlzdC9zcmMvQXBpSW5zdGFuY2VzLmpzIiwiZGlzdC9zcmMvQ2hhaW5Db25maWcuanMiLCJkaXN0L3NyYy9DaGFpbldlYlNvY2tldC5qcyIsImRpc3Qvc3JjL0Nvbm5lY3Rpb25NYW5hZ2VyLmpzIiwiZGlzdC9zcmMvR3JhcGhlbmVBcGkuanMiLCJub2RlX21vZHVsZXMvYnJvd3Nlci1yZXNvbHZlL2VtcHR5LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xlQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCIndXNlIHN0cmljdCc7XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7XG5leHBvcnRzLk1hbmFnZXIgPSBleHBvcnRzLkNoYWluQ29uZmlnID0gZXhwb3J0cy5BcGlzID0gdW5kZWZpbmVkO1xuXG52YXIgX0FwaUluc3RhbmNlcyA9IHJlcXVpcmUoJy4vc3JjL0FwaUluc3RhbmNlcycpO1xuXG52YXIgX0FwaUluc3RhbmNlczIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9BcGlJbnN0YW5jZXMpO1xuXG52YXIgX0Nvbm5lY3Rpb25NYW5hZ2VyID0gcmVxdWlyZSgnLi9zcmMvQ29ubmVjdGlvbk1hbmFnZXInKTtcblxudmFyIF9Db25uZWN0aW9uTWFuYWdlcjIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9Db25uZWN0aW9uTWFuYWdlcik7XG5cbnZhciBfQ2hhaW5Db25maWcgPSByZXF1aXJlKCcuL3NyYy9DaGFpbkNvbmZpZycpO1xuXG52YXIgX0NoYWluQ29uZmlnMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX0NoYWluQ29uZmlnKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgZGVmYXVsdDogb2JqIH07IH1cblxuZXhwb3J0cy5BcGlzID0gX0FwaUluc3RhbmNlczIuZGVmYXVsdDtcbmV4cG9ydHMuQ2hhaW5Db25maWcgPSBfQ2hhaW5Db25maWcyLmRlZmF1bHQ7XG5leHBvcnRzLk1hbmFnZXIgPSBfQ29ubmVjdGlvbk1hbmFnZXIyLmRlZmF1bHQ7IiwiJ3VzZSBzdHJpY3QnO1xuXG5leHBvcnRzLl9fZXNNb2R1bGUgPSB0cnVlO1xuXG52YXIgX0NoYWluV2ViU29ja2V0ID0gcmVxdWlyZSgnLi9DaGFpbldlYlNvY2tldCcpO1xuXG52YXIgX0NoYWluV2ViU29ja2V0MiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX0NoYWluV2ViU29ja2V0KTtcblxudmFyIF9HcmFwaGVuZUFwaSA9IHJlcXVpcmUoJy4vR3JhcGhlbmVBcGknKTtcblxudmFyIF9HcmFwaGVuZUFwaTIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9HcmFwaGVuZUFwaSk7XG5cbnZhciBfQ2hhaW5Db25maWcgPSByZXF1aXJlKCcuL0NoYWluQ29uZmlnJyk7XG5cbnZhciBfQ2hhaW5Db25maWcyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfQ2hhaW5Db25maWcpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG5mdW5jdGlvbiBfY2xhc3NDYWxsQ2hlY2soaW5zdGFuY2UsIENvbnN0cnVjdG9yKSB7IGlmICghKGluc3RhbmNlIGluc3RhbmNlb2YgQ29uc3RydWN0b3IpKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgY2FsbCBhIGNsYXNzIGFzIGEgZnVuY3Rpb25cIik7IH0gfVxuXG52YXIgaW5zdCA9IHZvaWQgMDtcblxudmFyIEFwaXNJbnN0YW5jZSA9IGZ1bmN0aW9uICgpIHtcbiAgZnVuY3Rpb24gQXBpc0luc3RhbmNlKCkge1xuICAgIF9jbGFzc0NhbGxDaGVjayh0aGlzLCBBcGlzSW5zdGFuY2UpO1xuICB9XG5cbiAgLyoqIEBhcmcge3N0cmluZ30gY29ubmVjdGlvbiAuLiAqL1xuICBBcGlzSW5zdGFuY2UucHJvdG90eXBlLmNvbm5lY3QgPSBmdW5jdGlvbiBjb25uZWN0KGNzLCBjb25uZWN0VGltZW91dCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICB2YXIgcnBjX3VzZXIgPSAnJztcbiAgICB2YXIgcnBjX3Bhc3N3b3JkID0gJyc7XG5cbiAgICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgd2luZG93LmxvY2F0aW9uICYmIHdpbmRvdy5sb2NhdGlvbi5wcm90b2NvbCA9PT0gJ2h0dHBzOicgJiYgY3MuaW5kZXhPZignd3NzOi8vJykgPCAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1NlY3VyZSBkb21haW5zIHJlcXVpcmUgd3NzIGNvbm5lY3Rpb24nKTtcbiAgICB9XG5cbiAgICB0aGlzLndzX3JwYyA9IG5ldyBfQ2hhaW5XZWJTb2NrZXQyLmRlZmF1bHQoY3MsIHRoaXMuc3RhdHVzQ2IsIGNvbm5lY3RUaW1lb3V0KTtcblxuICAgIHRoaXMuaW5pdF9wcm9taXNlID0gdGhpcy53c19ycGMubG9naW4ocnBjX3VzZXIsIHJwY19wYXNzd29yZCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICBjb25zb2xlLmxvZygnQ29ubmVjdGVkIHRvIEFQSSBub2RlOicsIGNzKTtcbiAgICAgIF90aGlzLl9kYiA9IG5ldyBfR3JhcGhlbmVBcGkyLmRlZmF1bHQoX3RoaXMud3NfcnBjLCAnZGF0YWJhc2UnKTtcbiAgICAgIF90aGlzLl9uZXQgPSBuZXcgX0dyYXBoZW5lQXBpMi5kZWZhdWx0KF90aGlzLndzX3JwYywgJ25ldHdvcmtfYnJvYWRjYXN0Jyk7XG4gICAgICBfdGhpcy5faGlzdCA9IG5ldyBfR3JhcGhlbmVBcGkyLmRlZmF1bHQoX3RoaXMud3NfcnBjLCAnaGlzdG9yeScpO1xuICAgICAgX3RoaXMuX2NyeXB0byA9IG5ldyBfR3JhcGhlbmVBcGkyLmRlZmF1bHQoX3RoaXMud3NfcnBjLCAnY3J5cHRvJyk7XG4gICAgICBfdGhpcy5fYm9va2llID0gbmV3IF9HcmFwaGVuZUFwaTIuZGVmYXVsdChfdGhpcy53c19ycGMsICdib29raWUnKTtcbiAgICAgIHZhciBkYl9wcm9taXNlID0gX3RoaXMuX2RiLmluaXQoKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIF90aGlzLl9kYi5leGVjKCdnZXRfY2hhaW5faWQnLCBbXSkudGhlbihmdW5jdGlvbiAoX2NoYWluX2lkKSB7XG4gICAgICAgICAgX3RoaXMuY2hhaW5faWQgPSBfY2hhaW5faWQ7XG4gICAgICAgICAgcmV0dXJuIF9DaGFpbkNvbmZpZzIuZGVmYXVsdC5zZXRDaGFpbklkKF9jaGFpbl9pZCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG5cbiAgICAgIF90aGlzLndzX3JwYy5vbl9yZWNvbm5lY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIF90aGlzLndzX3JwYy5sb2dpbignJywgJycpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgIF90aGlzLl9kYi5pbml0KCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAoX3RoaXMuc3RhdHVzQ2IpIHtcbiAgICAgICAgICAgICAgX3RoaXMuc3RhdHVzQ2IoX0NoYWluV2ViU29ja2V0Mi5kZWZhdWx0LnN0YXR1cy5SRUNPTk5FQ1RFRCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgX3RoaXMuX25ldC5pbml0KCk7XG4gICAgICAgICAgX3RoaXMuX2hpc3QuaW5pdCgpO1xuICAgICAgICAgIF90aGlzLl9jcnlwdG8uaW5pdCgpO1xuICAgICAgICAgIF90aGlzLl9ib29raWUuaW5pdCgpO1xuICAgICAgICB9KTtcbiAgICAgIH07XG5cbiAgICAgIHJldHVybiBQcm9taXNlLmFsbChbZGJfcHJvbWlzZSwgX3RoaXMuX25ldC5pbml0KCksIF90aGlzLl9oaXN0LmluaXQoKSxcbiAgICAgIC8vIFRlbXBvcmFyeSBzcXVhc2ggY3J5cHRvIEFQSSBlcnJvciB1bnRpbCB0aGUgQVBJIGlzIHVwZ3JhZGVkIGV2ZXJ5d2hlcmVcbiAgICAgIF90aGlzLl9jcnlwdG8uaW5pdCgpLmNhdGNoKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIHJldHVybiBjb25zb2xlLmVycm9yKCdBcGlJbnN0YW5jZVxcdENyeXB0byBBUEkgRXJyb3InLCBlKTtcbiAgICAgIH0pLCBfdGhpcy5fYm9va2llLmluaXQoKV0pO1xuICAgIH0pO1xuICB9O1xuXG4gIEFwaXNJbnN0YW5jZS5wcm90b3R5cGUuY2xvc2UgPSBmdW5jdGlvbiBjbG9zZSgpIHtcbiAgICBpZiAodGhpcy53c19ycGMpIHtcbiAgICAgIHRoaXMud3NfcnBjLmNsb3NlKCk7XG4gICAgfVxuXG4gICAgdGhpcy53c19ycGMgPSBudWxsO1xuICB9O1xuXG4gIEFwaXNJbnN0YW5jZS5wcm90b3R5cGUuZGJfYXBpID0gZnVuY3Rpb24gZGJfYXBpKCkge1xuICAgIHJldHVybiB0aGlzLl9kYjtcbiAgfTtcblxuICBBcGlzSW5zdGFuY2UucHJvdG90eXBlLm5ldHdvcmtfYXBpID0gZnVuY3Rpb24gbmV0d29ya19hcGkoKSB7XG4gICAgcmV0dXJuIHRoaXMuX25ldDtcbiAgfTtcblxuICBBcGlzSW5zdGFuY2UucHJvdG90eXBlLmhpc3RvcnlfYXBpID0gZnVuY3Rpb24gaGlzdG9yeV9hcGkoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2hpc3Q7XG4gIH07XG5cbiAgQXBpc0luc3RhbmNlLnByb3RvdHlwZS5jcnlwdG9fYXBpID0gZnVuY3Rpb24gY3J5cHRvX2FwaSgpIHtcbiAgICByZXR1cm4gdGhpcy5fY3J5cHRvO1xuICB9O1xuXG4gIEFwaXNJbnN0YW5jZS5wcm90b3R5cGUuYm9va2llX2FwaSA9IGZ1bmN0aW9uIGJvb2tpZV9hcGkoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2Jvb2tpZTtcbiAgfTtcblxuICBBcGlzSW5zdGFuY2UucHJvdG90eXBlLnNldFJwY0Nvbm5lY3Rpb25TdGF0dXNDYWxsYmFjayA9IGZ1bmN0aW9uIHNldFJwY0Nvbm5lY3Rpb25TdGF0dXNDYWxsYmFjayhjYWxsYmFjaykge1xuICAgIHRoaXMuc3RhdHVzQ2IgPSBjYWxsYmFjaztcbiAgfTtcblxuICByZXR1cm4gQXBpc0luc3RhbmNlO1xufSgpO1xuXG4vKipcclxuICAgIENvbmZpZ3VyZTogY29uZmlndXJlIGFzIGZvbGxvd3MgYEFwaXMuaW5zdGFuY2UoXCJ3czovL2xvY2FsaG9zdDo4MDkwXCIpLmluaXRfcHJvbWlzZWAuICBUaGlzXHJcbiAgICByZXR1cm5zIGEgcHJvbWlzZSwgb25jZSByZXNvbHZlZCB0aGUgY29ubmVjdGlvbiBpcyByZWFkeS5cclxuXHJcbiAgICBJbXBvcnQ6IGltcG9ydCB7IEFwaXMgfSBmcm9tIFwiQGdyYXBoZW5lL2NoYWluXCJcclxuXHJcbiAgICBTaG9ydC1oYW5kOiBBcGlzLmRiKFwibWV0aG9kXCIsIFwicGFybTFcIiwgMiwgMywgLi4uKS4gIFJldHVybnMgYSBwcm9taXNlIHdpdGggcmVzdWx0cy5cclxuXHJcbiAgICBBZGRpdGlvbmFsIHVzYWdlOiBBcGlzLmluc3RhbmNlKCkuZGJfYXBpKCkuZXhlYyhcIm1ldGhvZFwiLCBbXCJtZXRob2RcIiwgXCJwYXJtMVwiLCAyLCAzLCAuLi5dKS5cclxuICAgIFJldHVybnMgYSBwcm9taXNlIHdpdGggcmVzdWx0cy5cclxuKi9cblxuZXhwb3J0cy5kZWZhdWx0ID0ge1xuICBzZXRScGNDb25uZWN0aW9uU3RhdHVzQ2FsbGJhY2s6IGZ1bmN0aW9uIHNldFJwY0Nvbm5lY3Rpb25TdGF0dXNDYWxsYmFjayhjYWxsYmFjaykge1xuICAgIHRoaXMuc3RhdHVzQ2IgPSBjYWxsYmFjaztcblxuICAgIGlmIChpbnN0KSB7XG4gICAgICBpbnN0LnNldFJwY0Nvbm5lY3Rpb25TdGF0dXNDYWxsYmFjayhjYWxsYmFjayk7XG4gICAgfVxuICB9LFxuXG4gIC8qKlxyXG4gICAgICAgIEBhcmcge3N0cmluZ30gY3MgaXMgb25seSBwcm92aWRlZCBpbiB0aGUgZmlyc3QgY2FsbFxyXG4gICAgICAgIEByZXR1cm4ge0FwaXN9IHNpbmdsZXRvbiAuLiBDaGVjayBBcGlzLmluc3RhbmNlKCkuaW5pdF9wcm9taXNlIHRvXHJcbiAgICAgICAga25vdyB3aGVuIHRoZSBjb25uZWN0aW9uIGlzIGVzdGFibGlzaGVkXHJcbiAgICAqL1xuICByZXNldDogZnVuY3Rpb24gcmVzZXQoKSB7XG4gICAgdmFyIGNzID0gYXJndW1lbnRzLmxlbmd0aCA+IDAgJiYgYXJndW1lbnRzWzBdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMF0gOiAnd3M6Ly9sb2NhbGhvc3Q6ODA5MCc7XG4gICAgdmFyIGNvbm5lY3QgPSBhcmd1bWVudHNbMV07XG4gICAgdmFyIGNvbm5lY3RUaW1lb3V0ID0gYXJndW1lbnRzLmxlbmd0aCA+IDIgJiYgYXJndW1lbnRzWzJdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMl0gOiA0MDAwO1xuXG4gICAgaWYgKGluc3QpIHtcbiAgICAgIGluc3QuY2xvc2UoKTtcbiAgICAgIGluc3QgPSBudWxsO1xuICAgIH1cblxuICAgIGluc3QgPSBuZXcgQXBpc0luc3RhbmNlKCk7XG4gICAgaW5zdC5zZXRScGNDb25uZWN0aW9uU3RhdHVzQ2FsbGJhY2sodGhpcy5zdGF0dXNDYik7XG5cbiAgICBpZiAoaW5zdCAmJiBjb25uZWN0KSB7XG4gICAgICBpbnN0LmNvbm5lY3QoY3MsIGNvbm5lY3RUaW1lb3V0KTtcbiAgICB9XG5cbiAgICByZXR1cm4gaW5zdDtcbiAgfSxcbiAgaW5zdGFuY2U6IGZ1bmN0aW9uIGluc3RhbmNlKCkge1xuICAgIHZhciBjcyA9IGFyZ3VtZW50cy5sZW5ndGggPiAwICYmIGFyZ3VtZW50c1swXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzBdIDogJ3dzOi8vbG9jYWxob3N0OjgwOTAnO1xuICAgIHZhciBjb25uZWN0ID0gYXJndW1lbnRzWzFdO1xuICAgIHZhciBjb25uZWN0VGltZW91dCA9IGFyZ3VtZW50cy5sZW5ndGggPiAyICYmIGFyZ3VtZW50c1syXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzJdIDogNDAwMDtcblxuICAgIGlmICghaW5zdCkge1xuICAgICAgaW5zdCA9IG5ldyBBcGlzSW5zdGFuY2UoX0NoYWluQ29uZmlnMi5kZWZhdWx0KTtcbiAgICAgIGluc3Quc2V0UnBjQ29ubmVjdGlvblN0YXR1c0NhbGxiYWNrKHRoaXMuc3RhdHVzQ2IpO1xuICAgIH1cblxuICAgIGlmIChpbnN0ICYmIGNvbm5lY3QpIHtcbiAgICAgIGluc3QuY29ubmVjdChjcywgY29ubmVjdFRpbWVvdXQpO1xuICAgIH1cblxuICAgIHJldHVybiBpbnN0O1xuICB9LFxuICBjaGFpbklkOiBmdW5jdGlvbiBjaGFpbklkKCkge1xuICAgIHJldHVybiB0aGlzLmluc3RhbmNlKCkuY2hhaW5faWQ7XG4gIH0sXG4gIGNsb3NlOiBmdW5jdGlvbiBjbG9zZSgpIHtcbiAgICBpZiAoaW5zdCkge1xuICAgICAgaW5zdC5jbG9zZSgpO1xuICAgICAgaW5zdCA9IG51bGw7XG4gICAgfVxuICB9XG4gIC8vIGRiOiAobWV0aG9kLCAuLi5hcmdzKSA9PiBBcGlzLmluc3RhbmNlKCkuZGJfYXBpKCkuZXhlYyhtZXRob2QsIHRvU3RyaW5ncyhhcmdzKSksXG4gIC8vIG5ldHdvcms6IChtZXRob2QsIC4uLmFyZ3MpID0+IEFwaXMuaW5zdGFuY2UoKS5uZXR3b3JrX2FwaSgpLmV4ZWMobWV0aG9kLCB0b1N0cmluZ3MoYXJncykpLFxuICAvLyBoaXN0b3J5OiAobWV0aG9kLCAuLi5hcmdzKSA9PiBBcGlzLmluc3RhbmNlKCkuaGlzdG9yeV9hcGkoKS5leGVjKG1ldGhvZCwgdG9TdHJpbmdzKGFyZ3MpKSxcbiAgLy8gY3J5cHRvOiAobWV0aG9kLCAuLi5hcmdzKSA9PiBBcGlzLmluc3RhbmNlKCkuY3J5cHRvX2FwaSgpLmV4ZWMobWV0aG9kLCB0b1N0cmluZ3MoYXJncykpXG5cbn07IiwiJ3VzZSBzdHJpY3QnO1xuXG5leHBvcnRzLl9fZXNNb2R1bGUgPSB0cnVlO1xuXG5mdW5jdGlvbiBfY2xhc3NDYWxsQ2hlY2soaW5zdGFuY2UsIENvbnN0cnVjdG9yKSB7IGlmICghKGluc3RhbmNlIGluc3RhbmNlb2YgQ29uc3RydWN0b3IpKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgY2FsbCBhIGNsYXNzIGFzIGEgZnVuY3Rpb25cIik7IH0gfVxuXG52YXIgZGVmYXVsdHMgPSB7XG4gIGNvcmVfYXNzZXQ6ICdQUFknLFxuICBhZGRyZXNzX3ByZWZpeDogJ1BQWScsXG4gIGV4cGlyZV9pbl9zZWNzOiAxNSxcbiAgZXhwaXJlX2luX3NlY3NfcHJvcG9zYWw6IDI0ICogNjAgKiA2MCxcbiAgcmV2aWV3X2luX3NlY3NfY29tbWl0dGVlOiAyNCAqIDYwICogNjBcbn07XG5cbnZhciBuZXR3b3JrcyA9IHtcbiAgbmV0d29ya3M6IHtcbiAgICBQZWVycGxheXM6IHtcbiAgICAgIGNvcmVfYXNzZXQ6ICdQUFknLFxuICAgICAgYWRkcmVzc19wcmVmaXg6ICdQUFknLFxuICAgICAgY2hhaW5faWQ6ICc2YjZiNWYwY2U3YTM2ZDMyMzc2OGU1MzRmM2VkYjQxYzZkNjMzMmE1NDFhOTU3MjViOThlMjhkMTQwODUwMTM0J1xuICAgIH0sXG4gICAgUGVlcnBsYXlzVGVzdG5ldDoge1xuICAgICAgY29yZV9hc3NldDogJ1BQWVRFU1QnLFxuICAgICAgYWRkcmVzc19wcmVmaXg6ICdQUFlURVNUJyxcbiAgICAgIGNoYWluX2lkOiAnYmU2Yjc5Mjk1ZTcyODQwNmNiYjc0OTRiY2I2MjZlNjJhZDI3OGZhNDAxODY5OWNmOGY3NTczOWY0YzFhODFmZCdcbiAgICB9LFxuICAgIFBlZXJwbGF5c0JlYXRyaWNlOiB7XG4gICAgICBjb3JlX2Fzc2V0OiBcIlRFU1RcIixcbiAgICAgIGFkZHJlc3NfcHJlZml4OiBcIlRFU1RcIixcbiAgICAgIGNoYWluX2lkOiBcImIzZjdmZTFlNWFkMGQyZGVjYTQwYTYyNmE0NDA0NTI0Zjc4ZTY1YzNhNDgxMzc1NTFjMzNlYTRlN2MzNjU2NzJcIlxuICAgIH1cblxuICB9XG59O1xuXG52YXIgQ2hhaW5Db25maWcgPSBmdW5jdGlvbiAoKSB7XG4gIGZ1bmN0aW9uIENoYWluQ29uZmlnKCkge1xuICAgIF9jbGFzc0NhbGxDaGVjayh0aGlzLCBDaGFpbkNvbmZpZyk7XG5cbiAgICB0aGlzLnJlc2V0KCk7XG4gIH1cblxuICBDaGFpbkNvbmZpZy5wcm90b3R5cGUucmVzZXQgPSBmdW5jdGlvbiByZXNldCgpIHtcbiAgICBPYmplY3QuYXNzaWduKHRoaXMsIGRlZmF1bHRzKTtcbiAgfTtcblxuICBDaGFpbkNvbmZpZy5wcm90b3R5cGUuc2V0Q2hhaW5JZCA9IGZ1bmN0aW9uIHNldENoYWluSWQoY2hhaW5JRCkge1xuICAgIHZhciByZWYgPSBPYmplY3Qua2V5cyhuZXR3b3Jrcyk7XG5cbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gcmVmLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICB2YXIgbmV0d29ya19uYW1lID0gcmVmW2ldO1xuICAgICAgdmFyIG5ldHdvcmsgPSBuZXR3b3Jrc1tuZXR3b3JrX25hbWVdO1xuXG4gICAgICBpZiAobmV0d29yay5jaGFpbl9pZCA9PT0gY2hhaW5JRCkge1xuICAgICAgICB0aGlzLm5ldHdvcmtfbmFtZSA9IG5ldHdvcmtfbmFtZTtcblxuICAgICAgICBpZiAobmV0d29yay5hZGRyZXNzX3ByZWZpeCkge1xuICAgICAgICAgIHRoaXMuYWRkcmVzc19wcmVmaXggPSBuZXR3b3JrLmFkZHJlc3NfcHJlZml4O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBuZXR3b3JrX25hbWU6IG5ldHdvcmtfbmFtZSxcbiAgICAgICAgICBuZXR3b3JrOiBuZXR3b3JrXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLm5ldHdvcmtfbmFtZSkge1xuICAgICAgY29uc29sZS5sb2coJ1Vua25vd24gY2hhaW4gaWQgKHRoaXMgbWF5IGJlIGEgdGVzdG5ldCknLCBjaGFpbklEKTtcbiAgICB9XG4gIH07XG5cbiAgQ2hhaW5Db25maWcucHJvdG90eXBlLnNldFByZWZpeCA9IGZ1bmN0aW9uIHNldFByZWZpeCgpIHtcbiAgICB2YXIgcHJlZml4ID0gYXJndW1lbnRzLmxlbmd0aCA+IDAgJiYgYXJndW1lbnRzWzBdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMF0gOiAnUFBZJztcblxuICAgIHRoaXMuYWRkcmVzc19wcmVmaXggPSBwcmVmaXg7XG4gIH07XG5cbiAgcmV0dXJuIENoYWluQ29uZmlnO1xufSgpO1xuXG5leHBvcnRzLmRlZmF1bHQgPSBuZXcgQ2hhaW5Db25maWcoKTsiLCIndXNlIHN0cmljdCc7XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7XG5cbmZ1bmN0aW9uIF9jbGFzc0NhbGxDaGVjayhpbnN0YW5jZSwgQ29uc3RydWN0b3IpIHsgaWYgKCEoaW5zdGFuY2UgaW5zdGFuY2VvZiBDb25zdHJ1Y3RvcikpIHsgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCBjYWxsIGEgY2xhc3MgYXMgYSBmdW5jdGlvblwiKTsgfSB9XG5cbnZhciBTT0NLRVRfREVCVUcgPSBmYWxzZTtcbnZhciBXZWJTb2NrZXRDbGllbnQgPSBudWxsO1xuXG5pZiAodHlwZW9mIFdlYlNvY2tldCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgV2ViU29ja2V0Q2xpZW50ID0gV2ViU29ja2V0O1xufSBlbHNlIHtcbiAgV2ViU29ja2V0Q2xpZW50ID0gcmVxdWlyZSgnd3MnKTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBnbG9iYWwtcmVxdWlyZVxufVxuXG52YXIgU1VCU0NSSUJFX09QRVJBVElPTlMgPSBbJ3NldF9zdWJzY3JpYmVfY2FsbGJhY2snLCAnc3Vic2NyaWJlX3RvX21hcmtldCcsICdicm9hZGNhc3RfdHJhbnNhY3Rpb25fd2l0aF9jYWxsYmFjaycsICdzZXRfcGVuZGluZ190cmFuc2FjdGlvbl9jYWxsYmFjayddO1xuXG52YXIgVU5TVUJTQ1JJQkVfT1BFUkFUSU9OUyA9IFsndW5zdWJzY3JpYmVfZnJvbV9tYXJrZXQnLCAndW5zdWJzY3JpYmVfZnJvbV9hY2NvdW50cyddO1xuXG52YXIgSEVBTFRIX0NIRUNLX0lOVEVSVkFMID0gMTAwMDA7XG5cbnZhciBDaGFpbldlYlNvY2tldCA9IGZ1bmN0aW9uICgpIHtcbiAgLyoqXHJcbiAgICpDcmVhdGVzIGFuIGluc3RhbmNlIG9mIENoYWluV2ViU29ja2V0LlxyXG4gICAqIEBwYXJhbSB7c3RyaW5nfSAgICBzZXJ2ZXJBZGRyZXNzICAgICAgICAgICBUaGUgYWRkcmVzcyBvZiB0aGUgd2Vic29ja2V0IHRvIGNvbm5lY3QgdG8uXHJcbiAgICogQHBhcmFtIHtmdW5jdGlvbn0gIHN0YXR1c0NiICAgICAgICAgICAgICAgIENhbGxlZCB3aGVuIHN0YXR1cyBldmVudHMgb2NjdXIuXHJcbiAgICogQHBhcmFtIHtudW1iZXJ9ICAgIFtjb25uZWN0VGltZW91dD0xMDAwMF0gIFRoZSB0aW1lIGZvciBhIGNvbm5lY3Rpb24gYXR0ZW1wdCB0byBjb21wbGV0ZS5cclxuICAgKiBAbWVtYmVyb2YgQ2hhaW5XZWJTb2NrZXRcclxuICAgKi9cbiAgZnVuY3Rpb24gQ2hhaW5XZWJTb2NrZXQoc2VydmVyQWRkcmVzcywgc3RhdHVzQ2IpIHtcbiAgICB2YXIgY29ubmVjdFRpbWVvdXQgPSBhcmd1bWVudHMubGVuZ3RoID4gMiAmJiBhcmd1bWVudHNbMl0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1syXSA6IDEwMDAwO1xuXG4gICAgX2NsYXNzQ2FsbENoZWNrKHRoaXMsIENoYWluV2ViU29ja2V0KTtcblxuICAgIHRoaXMuc3RhdHVzQ2IgPSBzdGF0dXNDYjtcbiAgICB0aGlzLnNlcnZlckFkZHJlc3MgPSBzZXJ2ZXJBZGRyZXNzO1xuICAgIHRoaXMudGltZW91dEludGVydmFsID0gY29ubmVjdFRpbWVvdXQ7XG5cbiAgICAvLyBUaGUgY3VycmVuY3QgY29ubmVjdGlvbiBzdGF0ZSBvZiB0aGUgd2Vic29ja2V0LlxuICAgIHRoaXMuY29ubmVjdGVkID0gZmFsc2U7XG4gICAgdGhpcy5yZWNvbm5lY3RUaW1lb3V0ID0gbnVsbDtcblxuICAgIC8vIENhbGxiYWNrIHRvIGV4ZWN1dGUgd2hlbiB0aGUgd2Vic29ja2V0IGlzIHJlY29ubmVjdGVkLlxuICAgIHRoaXMub25fcmVjb25uZWN0ID0gbnVsbDtcblxuICAgIC8vIEFuIGluY3JlbWVudGluZyBJRCBmb3IgZWFjaCByZXF1ZXN0IHNvIHRoYXQgd2UgY2FuIHBhaXIgaXQgd2l0aCB0aGVcbiAgICAvLyByZXNwb25zZSBmcm9tIHRoZSB3ZWJzb2NrZXQuXG4gICAgdGhpcy5jYklkID0gMDtcblxuICAgIC8vIE9iamVjdHMgdG8gc3RvcmUga2V5L3ZhbHVlIHBhaXJzIGZvciBjYWxsYmFja3MsIHN1YnNjcmlwdGlvbiBjYWxsYmFja3NcbiAgICAvLyBhbmQgdW5zdWJzY3JpYmUgY2FsbGJhY2tzLlxuICAgIHRoaXMuY2JzID0ge307XG4gICAgdGhpcy5zdWJzID0ge307XG4gICAgdGhpcy51bnN1YiA9IHt9O1xuXG4gICAgLy8gQ3VycmVudCBjb25uZWN0aW9uIHByb21pc2VzJyByZWplY3Rpb25cbiAgICB0aGlzLmN1cnJlbnRSZXNvbHZlID0gbnVsbDtcbiAgICB0aGlzLmN1cnJlbnRSZWplY3QgPSBudWxsO1xuXG4gICAgLy8gSGVhbHRoIGNoZWNrIGZvciB0aGUgY29ubmVjdGlvbiB0byB0aGUgQmxvY2tDaGFpbi5cbiAgICB0aGlzLmhlYWx0aENoZWNrID0gbnVsbDtcblxuICAgIC8vIENvcHkgdGhlIGNvbnN0YW50cyB0byB0aGlzIGluc3RhbmNlLlxuICAgIHRoaXMuc3RhdHVzID0gQ2hhaW5XZWJTb2NrZXQuc3RhdHVzO1xuXG4gICAgLy8gQmluZCB0aGUgZnVuY3Rpb25zIHRvIHRoZSBpbnN0YW5jZS5cbiAgICB0aGlzLm9uQ29ubmVjdGlvbk9wZW4gPSB0aGlzLm9uQ29ubmVjdGlvbk9wZW4uYmluZCh0aGlzKTtcbiAgICB0aGlzLm9uQ29ubmVjdGlvbkNsb3NlID0gdGhpcy5vbkNvbm5lY3Rpb25DbG9zZS5iaW5kKHRoaXMpO1xuICAgIHRoaXMub25Db25uZWN0aW9uVGVybWluYXRlID0gdGhpcy5vbkNvbm5lY3Rpb25UZXJtaW5hdGUuYmluZCh0aGlzKTtcbiAgICB0aGlzLm9uQ29ubmVjdGlvbkVycm9yID0gdGhpcy5vbkNvbm5lY3Rpb25FcnJvci5iaW5kKHRoaXMpO1xuICAgIHRoaXMub25Db25uZWN0aW9uVGltZW91dCA9IHRoaXMub25Db25uZWN0aW9uVGltZW91dC5iaW5kKHRoaXMpO1xuICAgIHRoaXMuY3JlYXRlQ29ubmVjdGlvbiA9IHRoaXMuY3JlYXRlQ29ubmVjdGlvbi5iaW5kKHRoaXMpO1xuICAgIHRoaXMuY3JlYXRlQ29ubmVjdGlvblByb21pc2UgPSB0aGlzLmNyZWF0ZUNvbm5lY3Rpb25Qcm9taXNlLmJpbmQodGhpcyk7XG4gICAgdGhpcy5saXN0ZW5lciA9IHRoaXMubGlzdGVuZXIuYmluZCh0aGlzKTtcblxuICAgIC8vIENyZWF0ZSB0aGUgaW5pdGlhbCBjb25uZWN0aW9uIHRoZSBibG9ja2NoYWluLlxuICAgIHRoaXMuY3JlYXRlQ29ubmVjdGlvbigpO1xuICB9XG5cbiAgLyoqXHJcbiAgICogQ3JlYXRlIHRoZSBjb25uZWN0aW9uIHRvIHRoZSBCbG9ja2NoYWluLlxyXG4gICAqXHJcbiAgICogQHJldHVybnNcclxuICAgKiBAbWVtYmVyb2YgQ2hhaW5XZWJTb2NrZXRcclxuICAgKi9cblxuXG4gIENoYWluV2ViU29ja2V0LnByb3RvdHlwZS5jcmVhdGVDb25uZWN0aW9uID0gZnVuY3Rpb24gY3JlYXRlQ29ubmVjdGlvbigpIHtcbiAgICB0aGlzLmRlYnVnKCchISEgQ2hhaW5XZWJTb2NrZXQgY3JlYXRlIGNvbm5lY3Rpb24nKTtcblxuICAgIC8vIENsZWFyIGFueSBwb3NzaWJsZSByZWNvbm5lY3QgdGltZXJzLlxuICAgIHRoaXMucmVjb25uZWN0VGltZW91dCA9IG51bGw7XG5cbiAgICAvLyBDcmVhdGUgdGhlIHByb21pc2UgZm9yIHRoaXMgY29ubmVjdGlvblxuICAgIGlmICghdGhpcy5jb25uZWN0X3Byb21pc2UpIHtcbiAgICAgIHRoaXMuY29ubmVjdF9wcm9taXNlID0gbmV3IFByb21pc2UodGhpcy5jcmVhdGVDb25uZWN0aW9uUHJvbWlzZSk7XG4gICAgfVxuXG4gICAgLy8gQXR0ZW1wdCB0byBjcmVhdGUgdGhlIHdlYnNvY2tldFxuICAgIHRyeSB7XG4gICAgICB0aGlzLndzID0gbmV3IFdlYlNvY2tldENsaWVudCh0aGlzLnNlcnZlckFkZHJlc3MpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAvLyBTZXQgYSB0aW1lb3V0IHRvIHRyeSBhbmQgcmVjb25uZWN0IGhlcmUuXG4gICAgICByZXR1cm4gdGhpcy5yZXNldENvbm5lY3Rpb24oKTtcbiAgICB9XG5cbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXJzKCk7XG5cbiAgICAvLyBIYW5kbGUgdGltZW91dHMgdG8gdGhlIHdlYnNvY2tldCdzIGluaXRpYWwgY29ubmVjdGlvbi5cbiAgICB0aGlzLmNvbm5lY3Rpb25UaW1lb3V0ID0gc2V0VGltZW91dCh0aGlzLm9uQ29ubmVjdGlvblRpbWVvdXQsIHRoaXMudGltZW91dEludGVydmFsKTtcbiAgfTtcblxuICAvKipcclxuICAgKiBSZXNldCB0aGUgY29ubmVjdGlvbiB0byB0aGUgQmxvY2tDaGFpbi5cclxuICAgKlxyXG4gICAqIEBtZW1iZXJvZiBDaGFpbldlYlNvY2tldFxyXG4gICAqL1xuXG5cbiAgQ2hhaW5XZWJTb2NrZXQucHJvdG90eXBlLnJlc2V0Q29ubmVjdGlvbiA9IGZ1bmN0aW9uIHJlc2V0Q29ubmVjdGlvbigpIHtcbiAgICAvLyBDbG9zZSB0aGUgV2Vic29ja2V0IGlmIGl0cyBzdGlsbCAnaGFsZi1vcGVuJ1xuICAgIHRoaXMuY2xvc2UoKTtcblxuICAgIC8vIE1ha2Ugc3VyZSB3ZSBvbmx5IGV2ZXIgaGF2ZSBvbmUgdGltZW91dCBydW5uaW5nIHRvIHJlY29ubmVjdC5cbiAgICBpZiAoIXRoaXMucmVjb25uZWN0VGltZW91dCkge1xuICAgICAgdGhpcy5kZWJ1ZygnISEhIENoYWluV2ViU29ja2V0IHJlc2V0IGNvbm5lY3Rpb24nLCB0aGlzLnRpbWVvdXRJbnRlcnZhbCk7XG4gICAgICB0aGlzLnJlY29ubmVjdFRpbWVvdXQgPSBzZXRUaW1lb3V0KHRoaXMuY3JlYXRlQ29ubmVjdGlvbiwgdGhpcy50aW1lb3V0SW50ZXJ2YWwpO1xuICAgIH1cblxuICAgIC8vIFJlamVjdCB0aGUgY3VycmVudCBwcm9taXNlIGlmIHRoZXJlIGlzIG9uZS5cbiAgICBpZiAodGhpcy5jdXJyZW50UmVqZWN0KSB7XG4gICAgICB0aGlzLmN1cnJlbnRSZWplY3QobmV3IEVycm9yKCdDb25uZWN0aW9uIGF0dGVtcHQgZmFpbGVkOiAnICsgdGhpcy5zZXJ2ZXJBZGRyZXNzKSk7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxyXG4gICAqIEFkZCBldmVudCBsaXN0ZW5lcnMgdG8gdGhlIFdlYlNvY2tldC5cclxuICAgKlxyXG4gICAqIEBtZW1iZXJvZiBDaGFpbldlYlNvY2tldFxyXG4gICAqL1xuXG5cbiAgQ2hhaW5XZWJTb2NrZXQucHJvdG90eXBlLmFkZEV2ZW50TGlzdGVuZXJzID0gZnVuY3Rpb24gYWRkRXZlbnRMaXN0ZW5lcnMoKSB7XG4gICAgdGhpcy5kZWJ1ZygnISEhIENoYWluV2ViU29ja2V0IGFkZCBldmVudCBsaXN0ZW5lcnMnKTtcbiAgICB0aGlzLndzLmFkZEV2ZW50TGlzdGVuZXIoJ29wZW4nLCB0aGlzLm9uQ29ubmVjdGlvbk9wZW4pO1xuICAgIHRoaXMud3MuYWRkRXZlbnRMaXN0ZW5lcignY2xvc2UnLCB0aGlzLm9uQ29ubmVjdGlvbkNsb3NlKTtcbiAgICB0aGlzLndzLmFkZEV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgdGhpcy5vbkNvbm5lY3Rpb25FcnJvcik7XG4gICAgdGhpcy53cy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgdGhpcy5saXN0ZW5lcik7XG4gIH07XG5cbiAgLyoqXHJcbiAgICogUmVtb3ZlIHRoZSBldmVudCBsaXN0ZXJzIGZyb20gdGhlIFdlYlNvY2tldC4gSXRzIGltcG9ydGFudCB0byByZW1vdmUgdGhlIGV2ZW50IGxpc3RlcmVyc1xyXG4gICAqIGZvciBnYXJiYWFnZSBjb2xsZWN0aW9uLiBCZWNhdXNlIHdlIGFyZSBjcmVhdGluZyBhIG5ldyBXZWJTb2NrZXQgb24gZWFjaCBjb25uZWN0aW9uIGF0dGVtcHRcclxuICAgKiBhbnkgbGlzdGVuZXJzIHRoYXQgYXJlIHN0aWxsIGF0dGFjaGVkIGNvdWxkIHByZXZlbnQgdGhlIG9sZCBzb2NrZXRzIGZyb21cclxuICAgKiBiZWluZyBnYXJiYWdlIGNvbGxlY3RlZC5cclxuICAgKlxyXG4gICAqIEBtZW1iZXJvZiBDaGFpbldlYlNvY2tldFxyXG4gICAqL1xuXG5cbiAgQ2hhaW5XZWJTb2NrZXQucHJvdG90eXBlLnJlbW92ZUV2ZW50TGlzdGVuZXJzID0gZnVuY3Rpb24gcmVtb3ZlRXZlbnRMaXN0ZW5lcnMoKSB7XG4gICAgdGhpcy5kZWJ1ZygnISEhIENoYWluV2ViU29ja2V0IHJlbW92ZSBldmVudCBsaXN0ZW5lcnMnKTtcbiAgICB0aGlzLndzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ29wZW4nLCB0aGlzLm9uQ29ubmVjdGlvbk9wZW4pO1xuICAgIHRoaXMud3MucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xvc2UnLCB0aGlzLm9uQ29ubmVjdGlvbkNsb3NlKTtcbiAgICB0aGlzLndzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgdGhpcy5vbkNvbm5lY3Rpb25FcnJvcik7XG4gICAgdGhpcy53cy5yZW1vdmVFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgdGhpcy5saXN0ZW5lcik7XG4gIH07XG5cbiAgLyoqXHJcbiAgICogQSBmdW5jdGlvbiB0aGF0IGlzIHBhc3NlZCB0byBhIG5ldyBwcm9taXNlIHRoYXQgc3RvcmVzIHRoZSByZXNvbHZlIGFuZCByZWplY3QgY2FsbGJhY2tzXHJcbiAgICogaW4gdGhlIHN0YXRlLlxyXG4gICAqXHJcbiAgICogQHBhcmFtIHtmdW5jdGlvbn0gcmVzb2x2ZSBBIGNhbGxiYWNrIHRvIGJlIGV4ZWN1dGVkIHdoZW4gdGhlIHByb21pc2UgaXMgcmVzb2x2ZWQuXHJcbiAgICogQHBhcmFtIHtmdW5jdGlvbn0gcmVqZWN0IEEgY2FsbGJhY2sgdG8gYmUgZXhlY3V0ZWQgd2hlbiB0aGUgcHJvbWlzZSBpcyByZWplY3RlZC5cclxuICAgKiBAbWVtYmVyb2YgQ2hhaW5XZWJTb2NrZXRcclxuICAgKi9cblxuXG4gIENoYWluV2ViU29ja2V0LnByb3RvdHlwZS5jcmVhdGVDb25uZWN0aW9uUHJvbWlzZSA9IGZ1bmN0aW9uIGNyZWF0ZUNvbm5lY3Rpb25Qcm9taXNlKHJlc29sdmUsIHJlamVjdCkge1xuICAgIHRoaXMuZGVidWcoJyEhISBDaGFpbldlYlNvY2tldCBjcmVhdGVQcm9taXNlJyk7XG4gICAgdGhpcy5jdXJyZW50UmVzb2x2ZSA9IHJlc29sdmU7XG4gICAgdGhpcy5jdXJyZW50UmVqZWN0ID0gcmVqZWN0O1xuICB9O1xuXG4gIC8qKlxyXG4gICAqIENhbGxlZCB3aGVuIGEgbmV3IFdlYnNvY2tldCBjb25uZWN0aW9uIGlzIG9wZW5lZC5cclxuICAgKlxyXG4gICAqIEBtZW1iZXJvZiBDaGFpbldlYlNvY2tldFxyXG4gICAqL1xuXG5cbiAgQ2hhaW5XZWJTb2NrZXQucHJvdG90eXBlLm9uQ29ubmVjdGlvbk9wZW4gPSBmdW5jdGlvbiBvbkNvbm5lY3Rpb25PcGVuKCkge1xuICAgIHRoaXMuZGVidWcoJyEhISBDaGFpbldlYlNvY2tldCBDb25uZWN0ZWQgJyk7XG5cbiAgICB0aGlzLmNvbm5lY3RlZCA9IHRydWU7XG5cbiAgICBjbGVhclRpbWVvdXQodGhpcy5jb25uZWN0aW9uVGltZW91dCk7XG4gICAgdGhpcy5jb25uZWN0aW9uVGltZW91dCA9IG51bGw7XG5cbiAgICAvLyBUaGlzIHdpbGwgdHJpZ2dlciB0aGUgbG9naW4gcHJvY2VzcyBhcyB3ZWxsIGFzIHNvbWUgYWRkaXRpb25hbCBzZXR1cCBpbiBBcGlJbnN0YW5jZXNcbiAgICBpZiAodGhpcy5vbl9yZWNvbm5lY3QpIHtcbiAgICAgIHRoaXMub25fcmVjb25uZWN0KCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuY3VycmVudFJlc29sdmUpIHtcbiAgICAgIHRoaXMuY3VycmVudFJlc29sdmUoKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5zdGF0dXNDYikge1xuICAgICAgdGhpcy5zdGF0dXNDYihDaGFpbldlYlNvY2tldC5zdGF0dXMuT1BFTik7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxyXG4gICAqIGNhbGxlZCB3aGVuIHRoZSBjb25uZWN0aW9uIGF0dGVtcHQgdGltZXMgb3V0LlxyXG4gICAqXHJcbiAgICogQG1lbWJlcm9mIENoYWluV2ViU29ja2V0XHJcbiAgICovXG5cblxuICBDaGFpbldlYlNvY2tldC5wcm90b3R5cGUub25Db25uZWN0aW9uVGltZW91dCA9IGZ1bmN0aW9uIG9uQ29ubmVjdGlvblRpbWVvdXQoKSB7XG4gICAgdGhpcy5kZWJ1ZygnISEhIENoYWluV2ViU29ja2V0IHRpbWVvdXQnKTtcbiAgICB0aGlzLm9uQ29ubmVjdGlvbkNsb3NlKG5ldyBFcnJvcignQ29ubmVjdGlvbiB0aW1lZCBvdXQuJykpO1xuICB9O1xuXG4gIC8qKlxyXG4gICAqIENhbGxlZCB3aGVuIHRoZSBXZWJzb2NrZXQgaXMgbm90IHJlc3BvbmRpbmcgdG8gdGhlIGhlYWx0aCBjaGVja3MuXHJcbiAgICpcclxuICAgKiBAbWVtYmVyb2YgQ2hhaW5XZWJTb2NrZXRcclxuICAgKi9cblxuXG4gIENoYWluV2ViU29ja2V0LnByb3RvdHlwZS5vbkNvbm5lY3Rpb25UZXJtaW5hdGUgPSBmdW5jdGlvbiBvbkNvbm5lY3Rpb25UZXJtaW5hdGUoKSB7XG4gICAgdGhpcy5kZWJ1ZygnISEhIENoYWluV2ViU29ja2V0IHRlcm1pbmF0ZScpO1xuICAgIHRoaXMub25Db25uZWN0aW9uQ2xvc2UobmV3IEVycm9yKCdDb25uZWN0aW9uIHdhcyB0ZXJtaW5hdGVkLicpKTtcbiAgfTtcblxuICAvKipcclxuICAgKiBDYWxsZWQgd2hlbiB0aGUgY29ubmVjdGlvbiB0byB0aGUgQmxvY2tjaGFpbiBpcyBjbG9zZWQuXHJcbiAgICpcclxuICAgKiBAcGFyYW0geyp9IGVycm9yXHJcbiAgICogQG1lbWJlcm9mIENoYWluV2ViU29ja2V0XHJcbiAgICovXG5cblxuICBDaGFpbldlYlNvY2tldC5wcm90b3R5cGUub25Db25uZWN0aW9uQ2xvc2UgPSBmdW5jdGlvbiBvbkNvbm5lY3Rpb25DbG9zZShlcnJvcikge1xuICAgIHRoaXMuZGVidWcoJyEhISBDaGFpbldlYlNvY2tldCBDbG9zZSAnLCBlcnJvcik7XG5cbiAgICB0aGlzLnJlc2V0Q29ubmVjdGlvbigpO1xuXG4gICAgaWYgKHRoaXMuc3RhdHVzQ2IpIHtcbiAgICAgIHRoaXMuc3RhdHVzQ2IoQ2hhaW5XZWJTb2NrZXQuc3RhdHVzLkNMT1NFRCk7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxyXG4gICAqIENhbGxlZCB3aGVuIHRoZSBXZWJzb2NrZXQgZW5jb3VudGVycyBhbiBlcnJvci5cclxuICAgKlxyXG4gICAqIEBwYXJhbSB7Kn0gZXJyb3JcclxuICAgKiBAbWVtYmVyb2YgQ2hhaW5XZWJTb2NrZXRcclxuICAgKi9cblxuXG4gIENoYWluV2ViU29ja2V0LnByb3RvdHlwZS5vbkNvbm5lY3Rpb25FcnJvciA9IGZ1bmN0aW9uIG9uQ29ubmVjdGlvbkVycm9yKGVycm9yKSB7XG4gICAgdGhpcy5kZWJ1ZygnISEhIENoYWluV2ViU29ja2V0IE9uIENvbm5lY3Rpb24gRXJyb3IgJywgZXJyb3IpO1xuXG4gICAgdGhpcy5yZXNldENvbm5lY3Rpb24oKTtcblxuICAgIGlmICh0aGlzLnN0YXR1c0NiKSB7XG4gICAgICB0aGlzLnN0YXR1c0NiKENoYWluV2ViU29ja2V0LnN0YXR1cy5FUlJPUik7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxyXG4gICAqIEVudHJ5IHBvaW50IHRvIG1ha2UgUlBDIGNhbGxzIG9uIHRoZSBCbG9ja0NoYWluLlxyXG4gICAqXHJcbiAgICogQHBhcmFtIHthcnJheX0gcGFyYW1zIEFuIGFycmF5IG9mIHBhcmFtcyB0byBiZSBwYXNzZWQgdG8gdGhlIHJwYyBjYWxsLiBbbWV0aG9kLCAuLi5wYXJhbXNdXHJcbiAgICogQHJldHVybnMgQSBuZXcgcHJvbWlzZSBmb3IgdGhpcyBzcGVjaWZpYyBjYWxsLlxyXG4gICAqIEBtZW1iZXJvZiBDaGFpbldlYlNvY2tldFxyXG4gICAqL1xuXG5cbiAgQ2hhaW5XZWJTb2NrZXQucHJvdG90eXBlLmNhbGwgPSBmdW5jdGlvbiBjYWxsKHBhcmFtcykge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICBpZiAoIXRoaXMuY29ubmVjdGVkKSB7XG4gICAgICB0aGlzLmRlYnVnKCchISEgQ2hhaW5XZWJTb2NrZXQgQ2FsbCBub3QgY29ubmVjdGVkLiAnKTtcbiAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoJ0Rpc2Nvbm5lY3RlZCBmcm9tIHRoZSBCbG9ja0NoYWluLicpKTtcbiAgICB9XG5cbiAgICB0aGlzLmRlYnVnKCchISEgQ2hhaW5XZWJTb2NrZXQgQ2FsbCBjb25uZWN0ZWQuICcsIHBhcmFtcyk7XG5cbiAgICB2YXIgcmVxdWVzdCA9IHtcbiAgICAgIG1ldGhvZDogcGFyYW1zWzFdLFxuICAgICAgcGFyYW1zOiBwYXJhbXMsXG4gICAgICBpZDogdGhpcy5jYklkICsgMVxuICAgIH07XG5cbiAgICB0aGlzLmNiSWQgPSByZXF1ZXN0LmlkO1xuXG4gICAgaWYgKFNVQlNDUklCRV9PUEVSQVRJT05TLmluY2x1ZGVzKHJlcXVlc3QubWV0aG9kKSkge1xuICAgICAgLy8gU3RvcmUgY2FsbGJhY2sgaW4gc3VicyBtYXBcbiAgICAgIHRoaXMuc3Vic1tyZXF1ZXN0LmlkXSA9IHtcbiAgICAgICAgY2FsbGJhY2s6IHJlcXVlc3QucGFyYW1zWzJdWzBdXG4gICAgICB9O1xuXG4gICAgICAvLyBSZXBsYWNlIGNhbGxiYWNrIHdpdGggdGhlIGNhbGxiYWNrIGlkXG4gICAgICByZXF1ZXN0LnBhcmFtc1syXVswXSA9IHJlcXVlc3QuaWQ7XG4gICAgfVxuXG4gICAgaWYgKFVOU1VCU0NSSUJFX09QRVJBVElPTlMuaW5jbHVkZXMocmVxdWVzdC5tZXRob2QpKSB7XG4gICAgICBpZiAodHlwZW9mIHJlcXVlc3QucGFyYW1zWzJdWzBdICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignRmlyc3QgcGFyYW1ldGVyIG9mIHVuc3ViIG11c3QgYmUgdGhlIG9yaWdpbmFsIGNhbGxiYWNrJyk7XG4gICAgICB9XG5cbiAgICAgIHZhciB1blN1YkNiID0gcmVxdWVzdC5wYXJhbXNbMl0uc3BsaWNlKDAsIDEpWzBdO1xuXG4gICAgICAvLyBGaW5kIHRoZSBjb3JyZXNwb25kaW5nIHN1YnNjcmlwdGlvblxuICAgICAgZm9yICh2YXIgaWQgaW4gdGhpcy5zdWJzKSB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLWxpbmVcbiAgICAgICAgaWYgKHRoaXMuc3Vic1tpZF0uY2FsbGJhY2sgPT09IHVuU3ViQ2IpIHtcbiAgICAgICAgICB0aGlzLnVuc3ViW3JlcXVlc3QuaWRdID0gaWQ7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIXRoaXMuaGVhbHRoQ2hlY2spIHtcbiAgICAgIHRoaXMuaGVhbHRoQ2hlY2sgPSBzZXRUaW1lb3V0KHRoaXMub25Db25uZWN0aW9uVGVybWluYXRlLmJpbmQodGhpcyksIEhFQUxUSF9DSEVDS19JTlRFUlZBTCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIF90aGlzLmNic1tyZXF1ZXN0LmlkXSA9IHtcbiAgICAgICAgdGltZTogbmV3IERhdGUoKSxcbiAgICAgICAgcmVzb2x2ZTogcmVzb2x2ZSxcbiAgICAgICAgcmVqZWN0OiByZWplY3RcbiAgICAgIH07XG5cbiAgICAgIC8vIFNldCBhbGwgcmVxdWVzdHMgdG8gYmUgJ2NhbGwnIG1ldGhvZHMuXG4gICAgICByZXF1ZXN0Lm1ldGhvZCA9ICdjYWxsJztcblxuICAgICAgdHJ5IHtcbiAgICAgICAgX3RoaXMud3Muc2VuZChKU09OLnN0cmluZ2lmeShyZXF1ZXN0KSk7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBfdGhpcy5kZWJ1ZygnQ2F1Z2h0IGEgbmFzdHkgZXJyb3IgOiAnLCBlcnJvcik7XG4gICAgICB9XG4gICAgfSk7XG4gIH07XG5cbiAgLyoqXHJcbiAgICogQ2FsbGVkIHdoZW4gbWVzc2FnZXMgYXJlIHJlY2VpdmVkIG9uIHRoZSBXZWJzb2NrZXQuXHJcbiAgICpcclxuICAgKiBAcGFyYW0geyp9IHJlc3BvbnNlIFRoZSBtZXNzYWdlIHJlY2VpdmVkLlxyXG4gICAqIEBtZW1iZXJvZiBDaGFpbldlYlNvY2tldFxyXG4gICAqL1xuXG5cbiAgQ2hhaW5XZWJTb2NrZXQucHJvdG90eXBlLmxpc3RlbmVyID0gZnVuY3Rpb24gbGlzdGVuZXIocmVzcG9uc2UpIHtcbiAgICB2YXIgcmVzcG9uc2VKU09OID0gbnVsbDtcblxuICAgIHRyeSB7XG4gICAgICByZXNwb25zZUpTT04gPSBKU09OLnBhcnNlKHJlc3BvbnNlLmRhdGEpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICByZXNwb25zZUpTT04uZXJyb3IgPSAnRXJyb3IgcGFyc2luZyByZXNwb25zZTogJyArIGVycm9yLnN0YWNrO1xuICAgICAgdGhpcy5kZWJ1ZygnRXJyb3IgcGFyc2luZyByZXNwb25zZTogJywgcmVzcG9uc2UpO1xuICAgIH1cblxuICAgIC8vIENsZWFyIHRoZSBoZWFsdGggY2hlY2sgdGltZW91dCwgd2UndmUganVzdCByZWNlaXZlZCBhIGhlYWx0aHkgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyLlxuICAgIGlmICh0aGlzLmhlYWx0aENoZWNrKSB7XG4gICAgICBjbGVhclRpbWVvdXQodGhpcy5oZWFsdGhDaGVjayk7XG4gICAgICB0aGlzLmhlYWx0aENoZWNrID0gbnVsbDtcbiAgICB9XG5cbiAgICB2YXIgc3ViID0gZmFsc2U7XG4gICAgdmFyIGNhbGxiYWNrID0gbnVsbDtcblxuICAgIGlmIChyZXNwb25zZUpTT04ubWV0aG9kID09PSAnbm90aWNlJykge1xuICAgICAgc3ViID0gdHJ1ZTtcbiAgICAgIHJlc3BvbnNlSlNPTi5pZCA9IHJlc3BvbnNlSlNPTi5wYXJhbXNbMF07XG4gICAgfVxuXG4gICAgaWYgKCFzdWIpIHtcbiAgICAgIGNhbGxiYWNrID0gdGhpcy5jYnNbcmVzcG9uc2VKU09OLmlkXTtcbiAgICB9IGVsc2Uge1xuICAgICAgY2FsbGJhY2sgPSB0aGlzLnN1YnNbcmVzcG9uc2VKU09OLmlkXS5jYWxsYmFjaztcbiAgICB9XG5cbiAgICBpZiAoY2FsbGJhY2sgJiYgIXN1Yikge1xuICAgICAgaWYgKHJlc3BvbnNlSlNPTi5lcnJvcikge1xuICAgICAgICB0aGlzLmRlYnVnKCctLS0tPiByZXNwb25zZUpTT04gOiAnLCByZXNwb25zZUpTT04pO1xuICAgICAgICBjYWxsYmFjay5yZWplY3QocmVzcG9uc2VKU09OLmVycm9yKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNhbGxiYWNrLnJlc29sdmUocmVzcG9uc2VKU09OLnJlc3VsdCk7XG4gICAgICB9XG5cbiAgICAgIGRlbGV0ZSB0aGlzLmNic1tyZXNwb25zZUpTT04uaWRdO1xuXG4gICAgICBpZiAodGhpcy51bnN1YltyZXNwb25zZUpTT04uaWRdKSB7XG4gICAgICAgIGRlbGV0ZSB0aGlzLnN1YnNbdGhpcy51bnN1YltyZXNwb25zZUpTT04uaWRdXTtcbiAgICAgICAgZGVsZXRlIHRoaXMudW5zdWJbcmVzcG9uc2VKU09OLmlkXTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGNhbGxiYWNrICYmIHN1Yikge1xuICAgICAgY2FsbGJhY2socmVzcG9uc2VKU09OLnBhcmFtc1sxXSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuZGVidWcoJ1dhcm5pbmc6IHVua25vd24gd2Vic29ja2V0IHJlc3BvbnNlSlNPTjogJywgcmVzcG9uc2VKU09OKTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXHJcbiAgICogTG9naW4gdG8gdGhlIEJsb2NrY2hhaW4uXHJcbiAgICpcclxuICAgKiBAcGFyYW0ge3N0cmluZ30gdXNlciBVc2VybmFtZVxyXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBwYXNzd29yZCBQYXNzd29yZFxyXG4gICAqIEByZXR1cm5zIEEgcHJvbWlzZSB0aGF0IGlzIGZ1bGZpbGxlZCBhZnRlciBsb2dpbi5cclxuICAgKiBAbWVtYmVyb2YgQ2hhaW5XZWJTb2NrZXRcclxuICAgKi9cblxuXG4gIENoYWluV2ViU29ja2V0LnByb3RvdHlwZS5sb2dpbiA9IGZ1bmN0aW9uIGxvZ2luKHVzZXIsIHBhc3N3b3JkKSB7XG4gICAgdmFyIF90aGlzMiA9IHRoaXM7XG5cbiAgICB0aGlzLmRlYnVnKCchISEgQ2hhaW5XZWJTb2NrZXQgbG9naW4uJywgdXNlciwgcGFzc3dvcmQpO1xuICAgIHJldHVybiB0aGlzLmNvbm5lY3RfcHJvbWlzZS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBfdGhpczIuY2FsbChbMSwgJ2xvZ2luJywgW3VzZXIsIHBhc3N3b3JkXV0pO1xuICAgIH0pO1xuICB9O1xuXG4gIC8qKlxyXG4gICAqIENsb3NlIHRoZSBjb25uZWN0aW9uIHRvIHRoZSBCbG9ja2NoYWluLlxyXG4gICAqXHJcbiAgICogQG1lbWJlcm9mIENoYWluV2ViU29ja2V0XHJcbiAgICovXG5cblxuICBDaGFpbldlYlNvY2tldC5wcm90b3R5cGUuY2xvc2UgPSBmdW5jdGlvbiBjbG9zZSgpIHtcbiAgICBpZiAodGhpcy53cykge1xuICAgICAgdGhpcy5yZW1vdmVFdmVudExpc3RlbmVycygpO1xuXG4gICAgICAvLyBUcnkgYW5kIGZpcmUgY2xvc2Ugb24gdGhlIGNvbm5lY3Rpb24uXG4gICAgICB0aGlzLndzLmNsb3NlKCk7XG5cbiAgICAgIC8vIENsZWFyIG91ciByZWZlcmVuY2VzIHNvIHRoYXQgaXQgY2FuIGJlIGdhcmJhZ2UgY29sbGVjdGVkLlxuICAgICAgdGhpcy53cyA9IG51bGw7XG4gICAgfVxuXG4gICAgLy8gQ2xlYXIgb3VyIHRpbWVvdXRzIGZvciBjb25uZWN0aW9uIHRpbWVvdXQgYW5kIGhlYWx0aCBjaGVjay5cbiAgICBjbGVhclRpbWVvdXQodGhpcy5jb25uZWN0aW9uVGltZW91dCk7XG4gICAgdGhpcy5jb25uZWN0aW9uVGltZW91dCA9IG51bGw7XG5cbiAgICBjbGVhclRpbWVvdXQodGhpcy5oZWFsdGhDaGVjayk7XG4gICAgdGhpcy5oZWFsdGhDaGVjayA9IG51bGw7XG5cbiAgICBjbGVhclRpbWVvdXQodGhpcy5yZWNvbm5lY3RUaW1lb3V0KTtcbiAgICB0aGlzLnJlY29ubmVjdFRpbWVvdXQgPSBudWxsO1xuXG4gICAgLy8gVG9nZ2xlIHRoZSBjb25uZWN0ZWQgZmxhZy5cbiAgICB0aGlzLmNvbm5lY3RlZCA9IGZhbHNlO1xuICB9O1xuXG4gIENoYWluV2ViU29ja2V0LnByb3RvdHlwZS5kZWJ1ZyA9IGZ1bmN0aW9uIGRlYnVnKCkge1xuICAgIGlmIChTT0NLRVRfREVCVUcpIHtcbiAgICAgIGZvciAodmFyIF9sZW4gPSBhcmd1bWVudHMubGVuZ3RoLCBwYXJhbXMgPSBBcnJheShfbGVuKSwgX2tleSA9IDA7IF9rZXkgPCBfbGVuOyBfa2V5KyspIHtcbiAgICAgICAgcGFyYW1zW19rZXldID0gYXJndW1lbnRzW19rZXldO1xuICAgICAgfVxuXG4gICAgICBjb25zb2xlLmxvZy5hcHBseShudWxsLCBwYXJhbXMpO1xuICAgIH1cbiAgfTtcblxuICByZXR1cm4gQ2hhaW5XZWJTb2NrZXQ7XG59KCk7XG5cbi8vIENvbnN0YW50cyBmb3IgU1RBVEVcblxuXG5DaGFpbldlYlNvY2tldC5zdGF0dXMgPSB7XG4gIFJFQ09OTkVDVEVEOiAncmVjb25uZWN0ZWQnLFxuICBPUEVOOiAnb3BlbicsXG4gIENMT1NFRDogJ2Nsb3NlZCcsXG4gIEVSUk9SOiAnZXJyb3InXG59O1xuXG5leHBvcnRzLmRlZmF1bHQgPSBDaGFpbldlYlNvY2tldDsiLCIndXNlIHN0cmljdCc7XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7XG5cbnZhciBfQXBpSW5zdGFuY2VzID0gcmVxdWlyZSgnLi9BcGlJbnN0YW5jZXMnKTtcblxudmFyIF9BcGlJbnN0YW5jZXMyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfQXBpSW5zdGFuY2VzKTtcblxudmFyIF9DaGFpbldlYlNvY2tldCA9IHJlcXVpcmUoJy4vQ2hhaW5XZWJTb2NrZXQnKTtcblxudmFyIF9DaGFpbldlYlNvY2tldDIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9DaGFpbldlYlNvY2tldCk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IGRlZmF1bHQ6IG9iaiB9OyB9XG5cbmZ1bmN0aW9uIF9jbGFzc0NhbGxDaGVjayhpbnN0YW5jZSwgQ29uc3RydWN0b3IpIHsgaWYgKCEoaW5zdGFuY2UgaW5zdGFuY2VvZiBDb25zdHJ1Y3RvcikpIHsgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCBjYWxsIGEgY2xhc3MgYXMgYSBmdW5jdGlvblwiKTsgfSB9XG5cbnZhciBNYW5hZ2VyID0gZnVuY3Rpb24gKCkge1xuICBmdW5jdGlvbiBNYW5hZ2VyKF9yZWYpIHtcbiAgICB2YXIgdXJsID0gX3JlZi51cmwsXG4gICAgICAgIHVybHMgPSBfcmVmLnVybHM7XG5cbiAgICBfY2xhc3NDYWxsQ2hlY2sodGhpcywgTWFuYWdlcik7XG5cbiAgICB0aGlzLnVybCA9IHVybDtcbiAgICB0aGlzLnVybHMgPSB1cmxzLmZpbHRlcihmdW5jdGlvbiAoYSkge1xuICAgICAgcmV0dXJuIGEgIT09IHVybDtcbiAgICB9KTtcbiAgfVxuXG4gIE1hbmFnZXIucHJvdG90eXBlLmxvZ0ZhaWx1cmUgPSBmdW5jdGlvbiBsb2dGYWlsdXJlKHVybCkge1xuICAgIGNvbnNvbGUuZXJyb3IoJ1VuYWJsZSB0byBjb25uZWN0IHRvJywgdXJsICsgJywgc2tpcHBpbmcgdG8gbmV4dCBmdWxsIG5vZGUgQVBJIHNlcnZlcicpO1xuICB9O1xuXG4gIE1hbmFnZXIucHJvdG90eXBlLmNvbm5lY3QgPSBmdW5jdGlvbiBjb25uZWN0KCkge1xuICAgIHZhciBfY29ubmVjdCA9IGFyZ3VtZW50cy5sZW5ndGggPiAwICYmIGFyZ3VtZW50c1swXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzBdIDogdHJ1ZTtcblxuICAgIHZhciB1cmwgPSBhcmd1bWVudHMubGVuZ3RoID4gMSAmJiBhcmd1bWVudHNbMV0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1sxXSA6IHRoaXMudXJsO1xuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIF9BcGlJbnN0YW5jZXMyLmRlZmF1bHQuaW5zdGFuY2UodXJsLCBfY29ubmVjdCkuaW5pdF9wcm9taXNlLnRoZW4ocmVzb2x2ZSkuY2F0Y2goZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgIF9BcGlJbnN0YW5jZXMyLmRlZmF1bHQuaW5zdGFuY2UoKS5jbG9zZSgpO1xuICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH07XG5cbiAgTWFuYWdlci5wcm90b3R5cGUuY29ubmVjdFdpdGhGYWxsYmFjayA9IGZ1bmN0aW9uIGNvbm5lY3RXaXRoRmFsbGJhY2soKSB7XG4gICAgdmFyIGNvbm5lY3QgPSBhcmd1bWVudHMubGVuZ3RoID4gMCAmJiBhcmd1bWVudHNbMF0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1swXSA6IHRydWU7XG4gICAgdmFyIHVybCA9IGFyZ3VtZW50cy5sZW5ndGggPiAxICYmIGFyZ3VtZW50c1sxXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzFdIDogdGhpcy51cmw7XG4gICAgdmFyIGluZGV4ID0gYXJndW1lbnRzLmxlbmd0aCA+IDIgJiYgYXJndW1lbnRzWzJdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMl0gOiAwO1xuXG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIHZhciByZXNvbHZlID0gYXJndW1lbnRzLmxlbmd0aCA+IDMgJiYgYXJndW1lbnRzWzNdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbM10gOiBudWxsO1xuICAgIHZhciByZWplY3QgPSBhcmd1bWVudHMubGVuZ3RoID4gNCAmJiBhcmd1bWVudHNbNF0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1s0XSA6IG51bGw7XG5cbiAgICBpZiAocmVqZWN0ICYmIGluZGV4ID4gdGhpcy51cmxzLmxlbmd0aCAtIDEpIHtcbiAgICAgIHJldHVybiByZWplY3QobmV3IEVycm9yKCdUcmllZCAnICsgKGluZGV4ICsgMSkgKyAnIGNvbm5lY3Rpb25zLCBub25lIG9mIHdoaWNoIHdvcmtlZDogJyArIEpTT04uc3RyaW5naWZ5KHRoaXMudXJscy5jb25jYXQodGhpcy51cmwpKSkpO1xuICAgIH1cblxuICAgIHZhciBmYWxsYmFjayA9IGZ1bmN0aW9uIGZhbGxiYWNrKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgX3RoaXMubG9nRmFpbHVyZSh1cmwpO1xuICAgICAgcmV0dXJuIF90aGlzLmNvbm5lY3RXaXRoRmFsbGJhY2soY29ubmVjdCwgX3RoaXMudXJsc1tpbmRleF0sIGluZGV4ICsgMSwgcmVzb2x2ZSwgcmVqZWN0KTtcbiAgICB9O1xuXG4gICAgaWYgKHJlc29sdmUgJiYgcmVqZWN0KSB7XG4gICAgICByZXR1cm4gdGhpcy5jb25uZWN0KGNvbm5lY3QsIHVybCkudGhlbihyZXNvbHZlKS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIGZhbGxiYWNrKHJlc29sdmUsIHJlamVjdCk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgX3RoaXMuY29ubmVjdChjb25uZWN0KS50aGVuKHJlc29sdmUpLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZmFsbGJhY2socmVzb2x2ZSwgcmVqZWN0KTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9O1xuXG4gIE1hbmFnZXIucHJvdG90eXBlLmNoZWNrQ29ubmVjdGlvbnMgPSBmdW5jdGlvbiBjaGVja0Nvbm5lY3Rpb25zKCkge1xuICAgIHZhciBycGNfdXNlciA9IGFyZ3VtZW50cy5sZW5ndGggPiAwICYmIGFyZ3VtZW50c1swXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzBdIDogJyc7XG4gICAgdmFyIHJwY19wYXNzd29yZCA9IGFyZ3VtZW50cy5sZW5ndGggPiAxICYmIGFyZ3VtZW50c1sxXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzFdIDogJyc7XG5cbiAgICB2YXIgX3RoaXMyID0gdGhpcztcblxuICAgIHZhciByZXNvbHZlID0gYXJndW1lbnRzWzJdO1xuICAgIHZhciByZWplY3QgPSBhcmd1bWVudHNbM107XG5cbiAgICB2YXIgY29ubmVjdGlvblN0YXJ0VGltZXMgPSB7fTtcblxuICAgIHZhciBjaGVja0Z1bmN0aW9uID0gZnVuY3Rpb24gY2hlY2tGdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHZhciBmdWxsTGlzdCA9IF90aGlzMi51cmxzLmNvbmNhdChfdGhpczIudXJsKTtcbiAgICAgIHZhciBjb25uZWN0aW9uUHJvbWlzZXMgPSBbXTtcblxuICAgICAgZnVsbExpc3QuZm9yRWFjaChmdW5jdGlvbiAodXJsKSB7XG4gICAgICAgIHZhciBjb25uID0gbmV3IF9DaGFpbldlYlNvY2tldDIuZGVmYXVsdCh1cmwsIGZ1bmN0aW9uICgpIHt9KTtcbiAgICAgICAgY29ubmVjdGlvblN0YXJ0VGltZXNbdXJsXSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgICAgICBjb25uZWN0aW9uUHJvbWlzZXMucHVzaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgcmV0dXJuIGNvbm4ubG9naW4ocnBjX3VzZXIsIHJwY19wYXNzd29yZCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgX3JlZjI7XG5cbiAgICAgICAgICAgIGNvbm4uY2xvc2UoKTtcbiAgICAgICAgICAgIHJldHVybiBfcmVmMiA9IHt9LCBfcmVmMlt1cmxdID0gbmV3IERhdGUoKS5nZXRUaW1lKCkgLSBjb25uZWN0aW9uU3RhcnRUaW1lc1t1cmxdLCBfcmVmMjtcbiAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAodXJsID09PSBfdGhpczIudXJsKSB7XG4gICAgICAgICAgICAgIF90aGlzMi51cmwgPSBfdGhpczIudXJsc1swXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIF90aGlzMi51cmxzID0gX3RoaXMyLnVybHMuZmlsdGVyKGZ1bmN0aW9uIChhKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGEgIT09IHVybDtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbm4uY2xvc2UoKTtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuXG4gICAgICBQcm9taXNlLmFsbChjb25uZWN0aW9uUHJvbWlzZXMubWFwKGZ1bmN0aW9uIChhKSB7XG4gICAgICAgIHJldHVybiBhKCk7XG4gICAgICB9KSkudGhlbihmdW5jdGlvbiAocmVzKSB7XG4gICAgICAgIHJlc29sdmUocmVzLmZpbHRlcihmdW5jdGlvbiAoYSkge1xuICAgICAgICAgIHJldHVybiAhIWE7XG4gICAgICAgIH0pLnJlZHVjZShmdW5jdGlvbiAoZiwgYSkge1xuICAgICAgICAgIHZhciBrZXkgPSBPYmplY3Qua2V5cyhhKVswXTtcbiAgICAgICAgICBmW2tleV0gPSBhW2tleV07XG4gICAgICAgICAgcmV0dXJuIGY7XG4gICAgICAgIH0sIHt9KSk7XG4gICAgICB9KS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBfdGhpczIuY2hlY2tDb25uZWN0aW9ucyhycGNfdXNlciwgcnBjX3Bhc3N3b3JkLCByZXNvbHZlLCByZWplY3QpO1xuICAgICAgfSk7XG4gICAgfTtcblxuICAgIGlmIChyZXNvbHZlICYmIHJlamVjdCkge1xuICAgICAgY2hlY2tGdW5jdGlvbihyZXNvbHZlLCByZWplY3QpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoY2hlY2tGdW5jdGlvbik7XG4gICAgfVxuICB9O1xuXG4gIHJldHVybiBNYW5hZ2VyO1xufSgpO1xuXG5leHBvcnRzLmRlZmF1bHQgPSBNYW5hZ2VyOyIsIid1c2Ugc3RyaWN0JztcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcblxuZnVuY3Rpb24gX2NsYXNzQ2FsbENoZWNrKGluc3RhbmNlLCBDb25zdHJ1Y3RvcikgeyBpZiAoIShpbnN0YW5jZSBpbnN0YW5jZW9mIENvbnN0cnVjdG9yKSkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKFwiQ2Fubm90IGNhbGwgYSBjbGFzcyBhcyBhIGZ1bmN0aW9uXCIpOyB9IH1cblxudmFyIEdyYXBoZW5lQXBpID0gZnVuY3Rpb24gKCkge1xuICBmdW5jdGlvbiBHcmFwaGVuZUFwaSh3c19ycGMsIGFwaV9uYW1lKSB7XG4gICAgX2NsYXNzQ2FsbENoZWNrKHRoaXMsIEdyYXBoZW5lQXBpKTtcblxuICAgIHRoaXMud3NfcnBjID0gd3NfcnBjO1xuICAgIHRoaXMuYXBpX25hbWUgPSBhcGlfbmFtZTtcbiAgfVxuXG4gIEdyYXBoZW5lQXBpLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gaW5pdCgpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgcmV0dXJuIHRoaXMud3NfcnBjLmNhbGwoWzEsIHRoaXMuYXBpX25hbWUsIFtdXSkudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgIF90aGlzLmFwaV9pZCA9IHJlc3BvbnNlO1xuICAgICAgcmV0dXJuIF90aGlzO1xuICAgIH0pO1xuICB9O1xuXG4gIEdyYXBoZW5lQXBpLnByb3RvdHlwZS5leGVjID0gZnVuY3Rpb24gZXhlYyhtZXRob2QsIHBhcmFtcykge1xuICAgIHJldHVybiB0aGlzLndzX3JwYy5jYWxsKFt0aGlzLmFwaV9pZCwgbWV0aG9kLCBwYXJhbXNdKS5jYXRjaChmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUubG9nKCchISEgR3JhcGhlbmVBcGkgZXJyb3I6ICcsIG1ldGhvZCwgcGFyYW1zLCBlcnJvciwgSlNPTi5zdHJpbmdpZnkoZXJyb3IpKTtcbiAgICAgIHRocm93IGVycm9yO1xuICAgIH0pO1xuICB9O1xuXG4gIHJldHVybiBHcmFwaGVuZUFwaTtcbn0oKTtcblxuZXhwb3J0cy5kZWZhdWx0ID0gR3JhcGhlbmVBcGk7IiwiIl19
