'use strict';

let request = require('request');
let _ = require('lodash');
let util = require('util');
let net = require('net');
let config = require('./config/config');
let async = require('async');
let fs = require('fs');
let SessionManager = require('./lib/session-manager');
let Logger;

let requestWithDefaults;
let sessionManager;


//process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const IGNORED_IPS = new Set([
    '127.0.0.1',
    '255.255.255.255',
    '0.0.0.0'
]);

const ERROR_EXPIRED_SESSION = 'expired_session_error';
const MAX_ENTITIES_PER_LOOKUP = 1;

function createEntityGroups(entities, options, cb) {
    let entityLookup = {};
    let entityGroups = [];
    let entityGroup = [];

    Logger.debug({entities: entities, options: options}, 'Entities and Options');

    entities.forEach(function (entity) {
        if (entityGroup.length >= MAX_ENTITIES_PER_LOOKUP) {
            entityGroups.push(entityGroup);
            entityGroup = [];
        }

        if ((entity.isPrivateIP || IGNORED_IPS.has(entity.value)) && options.ignorePrivateIps) {
            return;
        } else {
            entityGroup.push(entity.value);
            entityLookup[entity.value.toLowerCase()] = entity;
        }
    });

// grab any "trailing" entities
    if (entityGroup.length > 0) {
        entityGroups.push(entityGroup);
    }

    _doLookup(entityGroups, entityLookup, options, cb);
}

/**
 *
 * @param entities
 * @param options
 * @param cb
 */
function _doLookup(entityGroups, entityLookup, options, cb) {
    if (entityGroups.length > 0) {
        Logger.debug({entityGroups: entityGroups}, 'Looking up Entity Groups');

        let sessionToken = sessionManager.getSession(options.username, options.password);

        if (sessionToken) {
// we are already authenticated.
            Logger.debug({numSession: sessionManager.getNumSessions()}, 'Session Already Exists');
            /*
             options.severityQueryString = SEVERITY_LEVELS_QUERY_FORMAT.slice(SEVERITY_LEVELS.indexOf(options.minimumSeverity))
             .join(" OR " );*/

            _lookupWithSessionToken(entityGroups, entityLookup, options, sessionToken, function (err, results) {
                if (err && err === ERROR_EXPIRED_SESSION) {
// the session was expired so we need to retry
// remove the session and try again
                    Logger.debug({err: err}, "Clearing Session");
                    sessionManager.clearSession(options.username, options.password);
                    _doLookup(entityGroups, entityLookup, options, cb);
                } else if (err) {
                    Logger.error({err: err}, 'Error doing lookup');
                    cb(err);
                } else {
                    Logger.debug({results: results}, "Logging results in dolookup");
                    cb(null, results);
                }
            });
        } else {
// we are not authenticated so we need to login and get a sessionToken
            Logger.trace('Session does not exist. Creating Session');
            _login(options, function (err, sessionToken) {
                Logger.debug({sessionToken: sessionToken}, 'Created new session');
                if (err) {
                    Logger.error({err: err}, 'Error logging in');
// Cover the case where an error is returned but the session was still created.
                    if (err === ERROR_EXPIRED_SESSION) {
                        cb('Invalid Username or Password');
                    } else {
                        cb(err);
                    }

                    return;
                }

                sessionManager.setSession(options.username, options.password, sessionToken);
                _doLookup(entityGroups, entityLookup, options, cb);
            });
        }
    } else {
        cb(null, []);
    }
}


function _lookupWithSessionToken(entityGroups, entityLookup, options, sessionToken, cb) {
    let lookupResults = [];

    let tqUri = options.url + "/indicators/";

    async.map(entityGroups, function (entityGroup, next) {
        _lookupEntity(entityGroup, entityLookup, sessionToken, options, next);
    }, function (err, results) {
        if (err) {
            cb(err);
            return;
        }

        Logger.debug({results: results}, "Results from async map lookupEntity");

        results.forEach(tqItem => {
            if(tqItem.data.length > 0){
                lookupResults.push({
                    entity: tqItem._entityObject,
                    data: {
                        summary: ["Class: " + tqItem.data[0].class + " Status: " + tqItem.data[0].status.name],
                        details: {
                            allData: tqItem.data,
                            url: tqUri
                        }
                    }
                });
            }else{
                // cache miss here
                lookupResults.push({
                    entity: tqItem._entityObject,
                    data: null
                });
            }
        });

        Logger.debug({lookupResults: lookupResults}, 'Lookup Results');

        cb(null, lookupResults);
    });
}

function _handleRequestError(err, response, body, options, cb) {


    if (err) {
        cb(_createJsonErrorPayload("Unable to connect to TQ server", null, '500', '2A', 'ThreatQ HTTP Request Failed', {
            err: err,
            response: response,
            body: body
        }));
        return;
    }

// Sessions will expire after a set period of time which means we need to login again if we
// receive this error.
// 403 is returned if the session is invalid but also if you try to login with invalid creds.
    if (response.statusCode === 401) {
        Logger.debug({err: err, body: body}, "Received HTTP Status 401");
        cb(ERROR_EXPIRED_SESSION);
        return;
    }

    if (response.statusCode !== 200) {
        if (body) {
            cb(body);
        } else {
            cb(_createJsonErrorPayload(response.statusMessage, null, response.statusCode, '2A', 'STAXX HTTP Request Failed', {
                response: response,
                body: body
            }));
        }
        return;
    }

    cb(null, body);
}


function _login(options, done) {
    //do the lookup
    let requestOptions = {
        method: 'POST',
        uri: options.url + '/api/token',
        body: {
            email: options.username,
            password: options.password,
            grant_type: "password",
            client_id: options.client,
        },
        json: true
    };

    Logger.debug({loginRequestOptions: requestOptions}, "Login Request Options");

    requestWithDefaults(requestOptions, function (err, response, body) {
        _handleRequestError(err, response, body, options, function (err, body) {
            if (err) {
                Logger.error({err: err, body: body}, 'HTTP Error Authenticating with ThreatQuotient');
                done(err);
                return;
            }

            if (response.statusCode !== 200) {
                Logger.error({err: err, body: body}, 'Non 200 HTTP Code when Authenticating with ThreatQuotient');
                done(err);
                return;
            }

            Logger.info({body:body}, "Login Body");

            if(typeof body === 'object' && typeof body.access_token === 'string'){
                done(null, body.access_token);
            }else{
                Logger.error({err: err, body: body}, 'Could not find access token in login response');
                done(err);
                return;
            }
        });
    });
}

function _lookupEntity(entitiesArray, entityLookup, apiToken, options, done) {
    //do the lookup
    let requestOptions = {
        method: 'GET',
        uri: options.url + "/api/indicators/search",
        qs:{
            limit: 10,
            value: entitiesArray[0],
            with: "tags,score"
        },
        headers:{
            Authorization: "Bearer " + apiToken
        },
        json: true
    };

    Logger.debug({requestOptions: requestOptions}, "_lookupEntity Request Options");

    requestWithDefaults(requestOptions, function (err, response, body) {
        _handleRequestError(err, response, body, options, function (err, body) {
            if (err) {
                if (err === ERROR_EXPIRED_SESSION) {
                    Logger.debug({err: err}, 'Session Expired');
                } else {
                    Logger.error({err: err}, 'Error Looking up Entity');
                }

                done(err);
                return;
            }
            Logger.debug({enttitiesArray: entityLookup[0]}, "What does the entities array look like");
            Logger.debug({body: body}, "LookupEntity Results");


            body._entityObject = entityLookup[entitiesArray[0]];

            done(null, body);
        });
    });
}

/**
 * Helper method that creates a fully formed JSON payload for a single error
 * @param msg
 * @param pointer
 * @param httpCode
 * @param code
 * @param title
 * @returns {{errors: *[]}}
 * @private
 */
function _createJsonErrorPayload(msg, pointer, httpCode, code, title, meta) {
    return {
        errors: [
            _createJsonErrorObject(msg, pointer, httpCode, code, title, meta)
        ]
    }
}

function _createJsonErrorObject(msg, pointer, httpCode, code, title, meta) {
    let error = {
        detail: msg,
        status: httpCode.toString(),
        title: title,
        code: 'TQ_' + code.toString()
    };

    if (pointer) {
        error.source = {
            pointer: pointer
        };
    }

    if (meta) {
        error.meta = meta;
    }

    return error;
}

function startup(logger) {
    Logger = logger;


    let defaults = {};

    if (typeof config.request.cert === 'string' && config.request.cert.length > 0) {
        defaults.cert = fs.readFileSync(config.request.cert);
    }

    if (typeof config.request.key === 'string' && config.request.key.length > 0) {
        defaults.key = fs.readFileSync(config.request.key);
    }

    if (typeof config.request.passphrase === 'string' && config.request.passphrase.length > 0) {
        defaults.passphrase = config.request.passphrase;
    }

    if (typeof config.request.ca === 'string' && config.request.ca.length > 0) {
        defaults.ca = fs.readFileSync(config.request.ca);
    }

    if (typeof config.request.proxy === 'string' && config.request.proxy.length > 0) {
        defaults.proxy = config.request.proxy;
    }


    if (typeof config.request.rejectUnauthorized === 'boolean') {
        defaults.rejectUnauthorized = config.request.rejectUnauthorized;
    }

    sessionManager = new SessionManager(Logger);

    requestWithDefaults = request.defaults(defaults);
}


function validateOptions(userOptions, cb) {
    let errors = [];
    if (typeof userOptions.url.value !== 'string' ||
        (typeof userOptions.url.value === 'string' && userOptions.url.value.length === 0)) {
        errors.push({
            key: 'url',
            message: 'You must provide your TQ server URL'
        })
    }

    if (typeof userOptions.username.value !== 'string' ||
        (typeof userOptions.username.value === 'string' && userOptions.username.value.length === 0)) {
        errors.push({
            key: 'username',
            message: 'You must provide your TQ username'
        })
    }

    if (typeof userOptions.password.value !== 'string' ||
        (typeof userOptions.password.value === 'string' && userOptions.password.value.length === 0)) {
        errors.push({
            key: 'password',
            message: 'You must provide your TQ email\'s password'
        })
    }
    cb(null, errors);
}

module.exports = {
    doLookup: createEntityGroups,
    startup: startup,
    validateOptions: validateOptions
};