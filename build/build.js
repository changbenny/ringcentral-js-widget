(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function register(globalSettings) {
    /*
     *
     * [register process]
     *
     * generate actions _____
     *                       |----> generate document --> [before, init, after] ----> generate handlers
     * fetch template   _____|                                                  ----> maybe [before, render, after]
     *
     */
    globalSettings = Object.assign({
        actions: {},
        handlers: {}
    }, globalSettings);

    var Widget = function Widget(options) {
        var _this = this;

        var options = Object.assign({
            actions: {},
            handlers: {}
        }, options);
        var settings = {
            // For deep copy
            actions: Object.assign({}, globalSettings.actions),
            handlers: Object.assign({}, globalSettings.handlers)
        };
        if (!options.template) {
            throw new Error('need a template');
        }
        this.props = {};
        Object.keys(settings.actions).forEach(function (index) {
            settings.actions[index] = bindScope(_this, settings.actions[index]);
        });
        Object.keys(settings.handlers).forEach(function (index) {
            settings.handlers[index] = bindScope(_this, settings.handlers[index]);
        });
        Object.keys(options.actions).forEach(function (index) {
            options.actions[index] = bindScope(_this, options.actions[index]);
        });
        Object.keys(options.handlers).forEach(function (index) {
            options.handlers[index] = bindScope(_this, options.handlers[index]);
        });
        Object.keys(settings.actions).forEach(function (index) {
            _this[index] = generateActions(settings.actions[index], options.actions[index], index /* for debug */);
        });
        this.render = generateActions({
            before: settings.actions.render.before,
            method: render.bind(this, settings.actions.render.method),
            after: settings.actions.render.after
        }, options.actions.render, 'render');

        function render(widgetRender, finish, target, callback) {
            if (typeof target === 'string') {
                target = document.querySelector(target);
            } else if (target instanceof HTMLElement) {
                target = target;
            } else {
                console.warn('first argument of render method should be selector string or dom');
            }
            target.appendChild(this.props.template);
            callback && typeof callback === 'function' && callback();
            if (widgetRender && typeof widgetRender === 'function') return widgetRender.call(this, finish);
        }
        this.props.dom = generateDocument(this, options.template);
        this.props.template = options.template;
        // init
        this.init();
        var handlers = settings.handlers;
        if (handlers) {
            Object.keys(handlers).forEach(function (index) {
                options.handlers[index].method.call(_this, generateHandlers(settings.handlers[index]));
            });
        }
    };
    return Widget;
}

function bindScope(scope, action) {
    return {
        before: action.before ? action.before.bind(scope) : function () {}.bind(scope),
        method: action.method ? action.method.bind(scope) : function () {}.bind(scope),
        after: action.after ? action.after.bind(scope) : function () {}.bind(scope)
    };
}

function generateDocument(widget, template) {
    var dom = {};
    [].forEach.call(template.querySelectorAll('[data-info]'), function (doc) {
        var info = doc.getAttribute('data-info');
        dom[info] = doc;
    });
    [].forEach.call(template.querySelectorAll('[data-event]'), function (doc) {
        var events = doc.getAttribute('data-event');
        // TODO: proper error messages
        events.split('|').forEach(function (event) {
            var eventName;
            var action;
            event.split(':').forEach(function (token, index) {
                if (index === 0) eventName = token;else if (index === 1) action = token;
            });
            if (!widget[action]) {
                console.warn('No such method:' + action + ' in ' + events + ', check data-event and widget methods definition');
                return;
            }
            doc.addEventListener(eventName, widget[action].bind(widget));
        });
    });
    return dom;
}

function generateActions(widgetAction, userAction, name) {
    if (!userAction) {
        userAction = {
            before: function before() {},
            method: function method() {},
            after: function after() {}
        };
        console.warn('Widget action [%s] is not defined by users', name);
    }
    return function () {
        var _ref;

        for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
        }

        console.info('[%s][before](' + (_ref = []).concat.apply(_ref, args) + ')', name);
        return Promise.resolve(wrapUserEvent.apply(undefined, [widgetAction.before, userAction.before].concat(args))).then(function (arg) {
            console.info('[%s][method](' + (typeof arg === 'function' ? arg() : arg) + ')', name);
            if (typeof arg === 'function') {
                return widgetAction.method.apply(widgetAction, [userAction.method].concat(_toConsumableArray(arg()))) || arg;
            }
            return widgetAction.method(userAction.method, arg) || arg;
        }).then(function (arg) {
            console.info('[%s][after](' + (typeof arg === 'function' ? arg() : arg) + ')', name);
            if (typeof arg === 'function') {
                return wrapUserEvent.apply(undefined, [widgetAction.after, userAction.after].concat(_toConsumableArray(arg()))) || arg;
            }
            return wrapUserEvent(widgetAction.after, userAction.after, arg) || arg;
        }).catch(function (err) {
            return console.error(err.stack);
        });
    };
}

function generateHandlers(widgetHandler) {
    return function () {
        for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
            args[_key2] = arguments[_key2];
        }

        return Promise.resolve(wrapUserEvent.apply(undefined, [widgetHandler.before, widgetHandler.before].concat(args))).then(function (arg) {
            if (typeof arg === 'function') {
                return widgetHandler.method.apply(widgetHandler, _toConsumableArray(arg())) || arg;
            }
            return widgetAction.method(arg) || arg;
        }).then(function (arg) {
            if (typeof arg === 'function') {
                return widgetHandler.after.apply(widgetHandler, _toConsumableArray(arg())) || arg;
            }
            return widgetHandler.after(arg) || arg;
        }).catch(function (err) {
            return console.error(err.stack);
        });
    };
}

function wrapUserEvent(widget, user) {
    for (var _len3 = arguments.length, args = Array(_len3 > 2 ? _len3 - 2 : 0), _key3 = 2; _key3 < _len3; _key3++) {
        args[_key3 - 2] = arguments[_key3];
    }

    var _ref2;

    var continueDefault = !user || user() || true;
    if (continueDefault || typeof continueDefault === 'undefined' || continueDefault) {
        if (widget) {
            return widget.apply(undefined, args) || function () {
                return args;
            };
        }
        return null;
    }
    return (_ref2 = []).concat.apply(_ref2, args);
}

exports.default = register;

},{}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _rcSdk = require('./rc-sdk');

var _rcSdk2 = _interopRequireDefault(_rcSdk);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var CallLogService = function (sdk) {

    var callLogUpdatedHandlers = [];

    return {

        getCallLogs: function getCallLogs() {

            sdk.platform().get('/account/~/extension/~/call-log', { dateFrom: '2016-2-28' }).then(function (response) {
                var records = response.json().records;
                callLogUpdatedHandlers.forEach(function (fun) {
                    return fun(records);
                });
            }).catch(function (e) {
                console.error('Recent Calls Error: ' + e.message);
            });
        },

        registerCallLogUpdatedHandler: function registerCallLogUpdatedHandler(handler) {
            callLogUpdatedHandlers.push(handler);
        }
    };
}(_rcSdk2.default);

exports.default = CallLogService;

},{"./rc-sdk":6}],3:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
var sdk = new RingCentral.SDK({
    appKey: 'eac8797af1b3502F2CEAAEECAC3Ed378AA7858A386656f28A008b0c638A754B1',
    appSecret: 'c082702E4ea4DA18c4b1377917778a8aafabCA3Be579B78B66d17C36874b27F4',
    server: RingCentral.SDK.server.production
});
var webPhone = new RingCentral.WebPhone({
    audioHelper: {
        incoming: '../demo/audio/incoming.ogg',
        outgoing: '../demo/audio/outgoing.ogg'
    }
});;
var rcHelper = function (sdk, webPhone) {
    var line;
    var handlers = {
        called: [],
        callStarted: [],
        callRejected: [],
        callEnded: [],
        callFailed: []
    };
    return {
        login: function login(props) {
            var dom = props.dom;
            return sdk.platform().login({
                username: dom.username.value,
                extension: dom.extension.value,
                password: dom.password.value
            }).then(function () {
                return registerSIP();
            });

            function registerSIP() {
                return sdk.platform().post('/client-info/sip-provision', {
                    sipInfo: [{
                        transport: 'WSS'
                    }]
                }).then(function (res) {
                    var data = res.json();
                    console.log("Sip Provisioning Data from RC API: " + JSON.stringify(data));
                    console.log(data.sipFlags.outboundCallsEnabled);
                    var checkFlags = false;
                    return webPhone.register(data, checkFlags).then(function () {
                        console.log('Registered');
                    }).catch(function (e) {
                        return Promise.reject(err);
                    });
                }).catch(function (e) {
                    return console.error(e);
                });
            }
        },
        callout: function callout(props) {
            console.log('user callout');
            var toNumber = props.toNumber;
            var fromNumber = props.fromNumber;

            // TODO: validate toNumber and fromNumber
            if (!sdk || !webPhone) {
                throw Error('Need to set up SDK and webPhone first.');
                return;
            }
            return sdk.platform().get('/restapi/v1.0/account/~/extension/~').then(function (res) {
                console.log(res);
                var info = res.json();
                if (info && info.regionalSettings && info.regionalSettings.homeCountry) {
                    return info.regionalSettings.homeCountry.id;
                }
                return null;
            }).then(function (countryId) {
                webPhone.call(toNumber, fromNumber, countryId);
            }).catch(function (e) {
                return console.error(e);
            });
        },
        answer: function answer(props) {
            return webPhone.answer(line).catch(function (e) {
                console.error(e);
            });
        },
        ignore: function ignore(props) {},
        cancel: function cancel(props) {
            return line.cancel().catch(function (e) {
                console.error(e);
            });
        },
        hangup: function hangup(props) {
            return webPhone.hangup(line).catch(function (err) {
                return console.error(err);
            });
        },
        record: function record(props) {},
        hold: function hold(props) {},
        mute: function mute(props) {},
        called: function called(handler) {
            handlers.called.push(handler);
        },
        callStarted: function callStarted(handler) {
            handlers.callStarted.push(handler);
        },
        callRejected: function callRejected(handler) {
            handlers.callRejected.push(handler);
        },
        callEnded: function callEnded(handler) {
            handlers.callEnded.push(handler);
        },
        callFailed: function callFailed(handler) {
            handlers.callFailed.push(handler);
        },
        initPhoneListener: function initPhoneListener(props) {
            var _this = this;

            webPhone.ua.on('sipIncomingCall', function (e) {
                console.log(handlers);
                line = e;
                handlers.called.forEach(function (h) {
                    return h(e);
                });
            });
            webPhone.ua.on('callStarted', function (e) {
                console.log(handlers);
                console.log(_this);
                handlers.callStarted.forEach(function (h) {
                    return h(e);
                });
            });
            webPhone.ua.on('callRejected', function (e) {
                console.log(handlers);
                handlers.callRejected.forEach(function (h) {
                    return h(e);
                });
            });
            webPhone.ua.on('callEnded', function (e) {
                console.log(handlers);
                handlers.callEnded.forEach(function (h) {
                    return h(e);
                });
            });
            webPhone.ua.on('callFailed', function (e) {
                console.log(handlers);
                handlers.callFailed.forEach(function (h) {
                    return h(e);
                });
            });
        },
        getCandidates: function getCandidates(props) {
            // FIXME: because of nested component
            var prefix = props.autoComplete.props.prefix;
            var test = ['111', '222', '333'];
            return test.filter(function (item) {
                return item.indexOf(prefix) === 0;
            });
        }
    };
}(sdk, webPhone);
exports.default = rcHelper;

},{}],4:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _rcSdk = require('./rc-sdk');

var _rcSdk2 = _interopRequireDefault(_rcSdk);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var LoginService = function (sdk) {

    var onLoginHandler = [];

    return {

        login: function login(username, extension, password) {
            console.log('LoginService -> start login');
            return sdk.platform().login({
                'username': username,
                'extension': extension,
                'password': password
            }).then(function () {
                onLoginHandler.forEach(function (handler) {
                    return handler();
                });
            });
        },

        checkLoginStatus: function checkLoginStatus() {

            return sdk.platform().loggedIn().then(function (isLoggedIn) {
                if (isLoggedIn) {
                    onLoginHandler.forEach(function (handler) {
                        return handler();
                    });
                }
                return isLoggedIn;
            });
        },

        registerLoginHandler: function registerLoginHandler(handler) {
            onLoginHandler.push(handler);
        }

    };
}(_rcSdk2.default);

exports.default = LoginService;

},{"./rc-sdk":6}],5:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _rcSdk = require('./rc-sdk');

var _rcSdk2 = _interopRequireDefault(_rcSdk);

var _rcWebphone = require('./rc-webphone');

var _rcWebphone2 = _interopRequireDefault(_rcWebphone);

var _loginService = require('./login-service');

var _loginService2 = _interopRequireDefault(_loginService);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var PhoneService = function () {
    var line;
    var handlers = {
        called: [],
        callStarted: [],
        callRejected: [],
        callEnded: [],
        callFailed: []
    };

    return {

        registerSIP: function registerSIP() {
            return _rcSdk2.default.platform().post('/client-info/sip-provision', {
                sipInfo: [{
                    transport: 'WSS'
                }]
            }).then(function (res) {
                var data = res.json();
                console.log("Sip Provisioning Data from RC API: " + JSON.stringify(data));
                console.log(data.sipFlags.outboundCallsEnabled);
                var checkFlags = false;
                return _rcWebphone2.default.register(data, checkFlags).then(function () {
                    console.log('Registered');
                }).catch(function (e) {
                    return Promise.reject(err);
                });
            }).catch(function (e) {
                return console.error(e);
            });
        },

        callout: function callout(fromNumber, toNumber) {
            console.log('user callout');

            // TODO: validate toNumber and fromNumber
            if (!_rcSdk2.default || !_rcWebphone2.default) {
                throw Error('Need to set up SDK and webPhone first.');
                return;
            }
            return _rcSdk2.default.platform().get('/restapi/v1.0/account/~/extension/~').then(function (res) {
                console.log(res);
                var info = res.json();
                if (info && info.regionalSettings && info.regionalSettings.homeCountry) {
                    return info.regionalSettings.homeCountry.id;
                }
                return null;
            }).then(function (countryId) {
                _rcWebphone2.default.call(toNumber, fromNumber, countryId);
            }).catch(function (e) {
                return console.error(e);
            });
        },
        answer: function answer(props) {
            return _rcWebphone2.default.answer(line).catch(function (e) {
                console.error(e);
            });
        },
        ignore: function ignore(props) {},
        cancel: function cancel(props) {
            return line.cancel().catch(function (e) {
                console.error(e);
            });
        },
        hangup: function hangup(props) {
            return _rcWebphone2.default.hangup(line).catch(function (err) {
                return console.error(err);
            });
        },
        called: function called(handler) {
            handlers.called.push(handler);
        },
        callStarted: function callStarted(handler) {
            handlers.callStarted.push(handler);
        },
        callRejected: function callRejected(handler) {
            handlers.callRejected.push(handler);
        },
        callEnded: function callEnded(handler) {
            handlers.callEnded.push(handler);
        },
        callFailed: function callFailed(handler) {
            handlers.callFailed.push(handler);
        },
        initPhoneListener: function initPhoneListener(props) {
            var _this = this;

            _rcWebphone2.default.ua.on('sipIncomingCall', function (e) {
                console.log(handlers);
                line = e;
                handlers.called.forEach(function (h) {
                    return h(e);
                });
            });
            _rcWebphone2.default.ua.on('callStarted', function (e) {
                console.log(handlers);
                console.log(_this);
                handlers.callStarted.forEach(function (h) {
                    return h(e);
                });
            });
            _rcWebphone2.default.ua.on('callRejected', function (e) {
                console.log(handlers);
                handlers.callRejected.forEach(function (h) {
                    return h(e);
                });
            });
            _rcWebphone2.default.ua.on('callEnded', function (e) {
                console.log(handlers);
                handlers.callEnded.forEach(function (h) {
                    return h(e);
                });
            });
            _rcWebphone2.default.ua.on('callFailed', function (e) {
                console.log(handlers);
                handlers.callFailed.forEach(function (h) {
                    return h(e);
                });
            });
        }

    };
}();

exports.default = PhoneService;

},{"./login-service":4,"./rc-sdk":6,"./rc-webphone":7}],6:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
var sdk = new RingCentral.SDK({
    appKey: '8mOtYiilT5OUPwwdeGgvpw',
    appSecret: 'cqNn89RmR2SR76Kpp8xJaAdNzNOqR8Qfmjb0B-gDOHTw',
    server: RingCentral.SDK.server.production
});

exports.default = sdk;

},{}],7:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
var webPhone = new RingCentral.WebPhone({
    audioHelper: {}
});

exports.default = webPhone;

},{}],8:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.PhoneService = exports.CallLogService = exports.LoginService = exports.webPhone = exports.sdk = exports.rcHelper = undefined;

var _helper = require('./helpers/helper');

var _helper2 = _interopRequireDefault(_helper);

var _rcSdk = require('./helpers/rc-sdk');

var _rcSdk2 = _interopRequireDefault(_rcSdk);

var _rcWebphone = require('./helpers/rc-webphone');

var _rcWebphone2 = _interopRequireDefault(_rcWebphone);

var _loginService = require('./helpers/login-service');

var _loginService2 = _interopRequireDefault(_loginService);

var _callLogService = require('./helpers/call-log-service');

var _callLogService2 = _interopRequireDefault(_callLogService);

var _phoneService = require('./helpers/phone-service');

var _phoneService2 = _interopRequireDefault(_phoneService);

var _w = require('./w');

var _w2 = _interopRequireDefault(_w);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// window.AuthPanel = AuthPanel;
// window.CallPanel = CallPanel;
// window.DialPad = DialPad;
// window.CallLog = CallLog;
// window.CallLogItem = CallLogItem
// window.AutoComplete = AutoComplete;
window.rcHelper = _helper2.default; // import AuthPanel from './components/auth-panel'
// import CallPanel from './components/call-panel'
// import DialPad from './components/dial-pad'
// import CallLog from './components/call-log'
// import CallLogItem from './components/call-log-item'
// import AutoComplete from './components/auto-complete'

window.sdk = _rcSdk2.default;
window.webPhone = _rcWebphone2.default;
window.LoginService = _loginService2.default;
window.CallLogService = _callLogService2.default;
window.PhoneService = _phoneService2.default;
window.w = _w2.default;
exports.
// AuthPanel,
// CallPanel,
// DialPad,
// CallLog,
// CallLogItem,
// AutoComplete,
rcHelper = _helper2.default;
exports.sdk = _rcSdk2.default;
exports.webPhone = _rcWebphone2.default;
exports.LoginService = _loginService2.default;
exports.CallLogService = _callLogService2.default;
exports.PhoneService = _phoneService2.default;

},{"./helpers/call-log-service":2,"./helpers/helper":3,"./helpers/login-service":4,"./helpers/phone-service":5,"./helpers/rc-sdk":6,"./helpers/rc-webphone":7,"./w":9}],9:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _component = require('./component');

var _component2 = _interopRequireDefault(_component);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function fetchWidget(name) {
    // TODO: check cache
    return fetch(w.options.path + name + '.html').then(function (response) {
        return response.text();
    }).then(function (body) {
        var template = document.createElement('template');
        template.innerHTML = body;
        var clone = document.importNode(template.content, true);
        return clone;
    }).then(function (clone) {
        return parseDocument(clone, name);
    });
}

function parseDocument(template, name) {
    var docs = template.querySelectorAll('*');
    var nestedFetch = Array.from(docs).reduce(function (aggr, doc) {
        if (doc.tagName.indexOf('-') > -1 /* WebComponent spec */ || doc instanceof HTMLUnknownElement) {
            // custom element
            aggr.push(w(doc.localName).then(function (widget) {
                // TODO: may 'customize' custom elements
                widget.render(doc);
                return {
                    name: doc.localName,
                    widget: widget
                };
            }));
        }
        return aggr;
    }, []);
    w.templates[name].template = template;
    // FIXME: script position
    var script = template.querySelector('script');
    document.body.appendChild(script);
    return Promise.all(nestedFetch);
    // we don't care about nested template return value, but template
}

function w(name, options) {
    options = options || {};
    if (!w.templates[name]) {
        w.templates[name] = {};
    }
    if (!w.templates[name].fetch) {
        w.templates[name].fetch = fetchWidget(name);
    }
    // w.templates[name].fetch = fetchWidget(name);
    return w.templates[name].fetch.then(function (widgets) {
        var parent = new w.templates[name].widget({
            template: w.templates[name].template.cloneNode(true),
            actions: options.actions || {},
            handlers: options.handlers || {}
        });
        widgets.forEach(function (widget) {
            return parent.props[widget.name] = widget;
        });
        return parent;
    }).catch(function (err) {
        return console.error(err);
    });
}
w.templates = {};
w.options = {
    path: '/template/'
};
w.register = function (setting) {
    Object.keys(w.templates).forEach(function (index) {
        var template = w.templates[index];
        if (template.template && !template.widget) template.widget = (0, _component2.default)(setting);
    });
};
w.config = function (options) {
    w.options = Object.assign(w.options, options);
};
w.preload = function () {};

// setting custom elements when registering widgets
w.custom = function () {};

exports.default = w;

},{"./component":1}]},{},[8])


//# sourceMappingURL=build.js.map
