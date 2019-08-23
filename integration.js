'use strict';

const request = require('request');
const config = require('./config/config');
const { Address6 } = require('ip-address');
const threatQConfig = require('./config/threatq.config');
const async = require('async');
const fs = require('fs');
const SessionManager = require('./lib/session-manager');

let Logger;
let requestWithDefaults;
let sessionManager;
let authenticatedRequest;
let attributesConfigured = false;

const attributeLookup = {};
const MAX_AUTH_RETRIES = 2;
const IGNORED_IPS = new Set(['127.0.0.1', '255.255.255.255', '0.0.0.0']);
const MAX_ENTITIES_PER_LOOKUP = 10;

function doLookup(entities, options, cb) {
  if (
    typeof threatQConfig.threatQIndicatorTypes !== 'undefined' &&
    Object.keys(threatQConfig.threatQIndicatorTypes).length == 0
  ) {
    return cb({
      detail: 'Missing ThreatQ indicator types in your ThreatQ config file',
      toFix: `Please open the ThreatQ config file called 'threatq.config.js' which is found in this 
        integration's config directory and provides values for the 'threatQIndicatorTypes' property`
    });
  }
  let lookupResults = [];
  let { entityGroups, entityLookup } = createEntityGroups(entities, options);

  options.__indicatorStatusValues = options.indicatorStatuses.map((statusObject) => {
    // value is a string representing an integer so we convert it to an integer using the `+` syntax
    return +statusObject.value;
  });

  async.map(
    entityGroups,
    (entityGroup, next) => {
      _lookupEntityGroup(entityGroup, entityLookup, options, next);
    },
    (err, results) => {
      if (err) {
        return cb(err);
      }

      results.forEach((groupResults) => {
        groupResults.forEach((result) => {
          lookupResults.push(result);
        });
      });

      cb(null, lookupResults);
    }
  );
}

function createEntityGroups(entities, options) {
  let entityLookup = {};
  let entityGroups = [];
  let entityGroup = [];

  Logger.debug({ entities: entities, options: options }, 'Entities and Options');

  entities.forEach(function(entity) {
    if (entityGroup.length >= MAX_ENTITIES_PER_LOOKUP) {
      entityGroups.push(entityGroup);
      entityGroup = [];
    }

    if (
      entity.isPrivateIP ||
      IGNORED_IPS.has(entity.value) ||
      (entity.isIPv6 && !new Address6(entity.value).isValid())
    ) {
      return;
    } else {
      entityGroup.push(entity);
      entityLookup[entity.value.toLowerCase()] = entity;
    }
  });

  // grab any "trailing" entities
  if (entityGroup.length > 0) {
    entityGroups.push(entityGroup);
  }

  Logger.trace({ entityGroups: entityGroups }, 'Entity Groups');

  return {
    entityGroups,
    entityLookup
  };
}

function _handleRestErrors(response, body) {
  // 204: Successful Delete
  // 201: Successful Creation
  // 200: Successful Get
  if (response.statusCode !== 200 && response.statusCode !== 201 && response.statusCode !== 204) {
    return _createJsonErrorPayload(response.statusMessage, null, response.statusCode, '2A', 'TQ HTTP Request Failed', {
      response: response,
      body: body
    });
  }
}

function createToken(options, done) {
  let sessionToken = sessionManager.getSession(options.username, options.password);

  if (sessionToken) {
    return done(null, sessionToken);
  }

  //do the lookup
  let requestOptions = {
    method: 'POST',
    uri: options.url + '/api/token',
    body: {
      email: options.username,
      password: options.password,
      grant_type: 'password',
      client_id: options.client
    },
    json: true
  };

  requestWithDefaults(requestOptions, function(err, response, body) {
    if (err) {
      // generic HTTP error
      done(
        _createJsonErrorPayload('Unable to connect to TQ server', null, '500', '2A', 'Login Request Failed', {
          err: err,
          //response: response,
          body: body
        })
      );
      return;
    }

    if (response.statusCode === 400) {
      // invalid username and password
      done(
        _createJsonErrorPayload(
          'User credentials are not valid',
          null,
          response.statusCode,
          '2B',
          'Login Request Failed',
          {
            err: err,
            //response: response,
            body: body
          }
        )
      );
      return;
    }

    if (response.statusCode !== 200) {
      done(
        _createJsonErrorPayload(
          'User credentials are not valid',
          null,
          response.statusCode,
          '2C',
          'Login Request Failed',
          {
            err: err,
            //response: response,
            body: body
          }
        )
      );
      return;
    }

    // success if body has an `access_token` in it
    if (typeof body === 'object' && typeof body.access_token === 'string') {
      done(null, body.access_token);
    } else {
      done(
        _createJsonErrorPayload(
          'Could not find access token in login response',
          null,
          response.statusCode,
          '2D',
          'Login Request Failed',
          {
            err: err,
            //response: response,
            body: body
          }
        )
      );
    }
  });
}

function _getEntityType(entity) {
  if (entity.isIPv4) {
    return 'ipv4';
  }
  if (entity.isIPv6) {
    return 'ipv6';
  }
  if (entity.type === 'IPv4CIDR') {
    return 'ipv4cidr';
  }
  if (entity.isDomain) {
    return 'domain';
  }
  if (entity.isURL) {
    return 'url';
  }
  if (entity.isSHA1) {
    return 'sha1';
  }
  if (entity.isSHA256) {
    return 'sha256';
  }
  if (entity.isMD5) {
    return 'md5';
  }
  if (entity.isEmail) {
    return 'email';
  }
}
function _createSearchQuery(entityObjects, options) {
  let indicators = [];

  entityObjects.forEach((entityObj) => {
    let indicatorQuery = [
      {
        field: 'indicator_value',
        operator: 'is',
        value: entityObj.value
      },
      {
        field: 'indicator_type',
        operator: 'is',
        value: threatQConfig.threatQIndicatorTypes[_getEntityType(entityObj)]
      },
      {
        field: 'indicator_score',
        operator: 'greater than or equal to',
        value: options.minimumScore.value
      }
    ];

    // Note that indicators in ThreatQ can have a score higher than 10 even though the user interface
    // shows 10 as the maximum.  We only want to apply the max score filter if the max score has been
    // set to 9 or less by the user.
    if (options.maximumScore.value !== 9999) {
      indicatorQuery.push({
        field: 'indicator_score',
        operator: 'less than or equal to',
        value: options.maximumScore.value
      });
    }

    indicators.push(indicatorQuery);
  });

  return indicators;
}

function _lookupEntityGroup(entitiesArray, entityLookup, options, cb) {
  let lookupGroupResults = [];
  //do the lookup
  let requestOptions = {
    method: 'POST',
    uri: options.url + '/api/search/advanced',
    qs: {
      limit: 10
    },
    body: {
      indicators: _createSearchQuery(entitiesArray, options)
    },
    json: true
  };

  Logger.trace(requestOptions);

  authenticatedRequest(options, requestOptions, function(err, response, body) {
    if (err) {
      return cb(err);
    }

    body.data.forEach((result) => {
      let lookupResult = _createLookupResultObject(entityLookup[result.value.toLowerCase()], result, options);
      if (lookupResult) {
        lookupGroupResults.push(lookupResult);
      }
    });

    cb(null, lookupGroupResults);
  });
}

function onMessage(payload, options, cb) {
  Logger.trace({ payload }, `Received ${payload.type} message`);
  switch (payload.type) {
    case 'CREATE_COMMENT':
      createComment(payload.data.id, payload.data.comment, options, (err, result) => {
        if (err) {
          Logger.error(err, 'Error in createComment');
        }
        cb(err, result);
      });
      break;
    case 'GET_COMMENTS':
      getComments(payload.data.id, options, (err, comments) => {
        if (err) {
          Logger.error(err, 'Error in getComments');
        }
        Logger.trace(comments, 'comments');
        cb(err, comments);
      });
      break;
    case 'DELETE_COMMENT':
      deleteComment(payload.data.indicatorId, payload.data.commentId, options, (err) => {
        if (err) {
          Logger.error(err, 'Error in deleteComment');
        }
        cb(err, {});
      });
      break;
    case 'UPDATE_COMMENT':
      updateComment(payload.data.indicatorCommentId, payload.data.value, options, (err, comment) => {
        if (err) {
          Logger.error(err, 'Error in updateComment');
        }
        cb(err, comment);
      });
      break;
    case 'DELETE_TAG':
      deleteTag(payload.data.indicatorId, payload.data.tagId, options, (err) => {
        if (err) {
          Logger.error(err, 'Error in deleteTag');
        }
        cb(err, {});
      });
      break;
    case 'ADD_TAG':
      addTag(payload.data.indicatorId, payload.data.tagName, options, (err, newTag) => {
        if (err) {
          Logger.error(err, 'Error in addTag');
        }
        Logger.trace({ newTag }, 'Returned new tag');
        cb(err, newTag);
      });
      break;
    case 'ADD_TO_WATCHLIST':
      addToWatchlist(payload.data.indicatorId, options, (err, watchlist) => {
        if (err) {
          Logger.error(err, 'Error in addToWatchlist');
        }
        cb(err, watchlist);
      });
      break;
    case 'REMOVE_FROM_WATCHLIST':
      removeFromWatchlist(payload.data.indicatorId, payload.data.watchlistId, options, (err) => {
        if (err) {
          Logger.error(err, 'Error in removeFromWatchlist');
        }
        cb(err, {});
      });
      break;
    case 'ADD_ATTRIBUTE':
      addAttribute(
        payload.data.indicatorId,
        payload.data.attributeName,
        payload.data.attributeValue,
        options,
        (err, attribute) => {
          if (err) {
            Logger.error(err, 'Error in addAttribute');
          }
          cb(err, attribute);
        }
      );
      break;
    case 'DELETE_ATTRIBUTE':
      deleteAttribute(payload.data.indicatorId, payload.data.indicatorAttributeId, options, (err, attribute) => {
        if (err) {
          Logger.error(err, 'Error in removeFromWatchlist');
        }
        cb(err, attribute);
      });
      break;
    case 'GET_ATTRIBUTES':
      getAttributes(payload.data.id, options, (err, attributes) => {
        if (err) {
          Logger.error(err, 'Error in getAttributes');
        }
        Logger.trace(attributes, 'comments');
        cb(err, attributes);
      });
      break;
    case 'UPDATE_INDICATOR_ATTRIBUTE':
      updateIndicatorAttribute(
        payload.data.indicatorId,
        payload.data.indicatorAttributeId,
        payload.data.value,
        options,
        (err, attribute) => {
          if (err) {
            Logger.error(err, 'Error in updateIndicatorAttribute');
          }
          cb(err, attribute);
        }
      );
      break;
    case 'UPDATE_INDICATOR':
      let fieldName = payload.data.fieldName;
      if (fieldName === 'score') {
        updateScore(payload.data.indicatorId, payload.data.fieldValue, options, (err, indicator) => {
          if (err) {
            Logger.error(err, 'Error in updateScore');
          }
          cb(err, indicator);
        });
      } else if (fieldName === 'status') {
        updateStatus(payload.data.indicatorId, payload.data.fieldValue, options, (err, indicator) => {
          if (err) {
            Logger.error(err, 'Error in updateStatus');
          }
          cb(err, indicator);
        });
      } else {
        cb({
          detail: 'UPDATE_INDICATOR must update `score` or `status`'
        });
      }
      break;
    case 'UPDATE_SCORE':
      updateScore(payload.data.indicatorId, payload.data.score, options, (err, indicator) => {
        if (err) {
          Logger.error(err, 'Error in updateScore');
        }
        cb(err, indicator);
      });
      break;
    case 'UPDATE_STATUS':
      updateStatus(payload.data.indicatorId, payload.data.statusId, options, (err, indicator) => {
        if (err) {
          Logger.error(err, 'Error in updateStatus');
        }
        cb(err, indicator);
      });
      break;
    default:
      cb({ detail: 'Unexpected onMessage type.  Supported messages are `CREATE_COMMENT` and `GET_COMMENTS`' });
  }
}

function updateIndicatorAttribute(indicatorId, indicatorAttributeId, value, options, cb) {
  let requestOptions = {
    method: 'PUT',
    uri: `${options.url}/api/indicators/${indicatorId}/attributes/${indicatorAttributeId}`,
    body: {
      value: value
    },
    json: true
  };

  Logger.trace(requestOptions);

  authenticatedRequest(options, requestOptions, function(err, response, body) {
    if (err) {
      return cb(err);
    }

    // returns attribute
    cb(null, body.data);
  });
}

function updateScore(indicatorId, score, options, cb) {
  let requestOptions = {
    method: 'PUT',
    uri: `${options.url}/api/indicator/${indicatorId}/scores`,
    body: {
      manual_score: score
    },
    json: true
  };

  Logger.trace(requestOptions);

  authenticatedRequest(options, requestOptions, function(err, response, body) {
    if (err) {
      return cb(err);
    }

    // returns indicator
    cb(null, body.data);
  });
}

function deleteAttribute(indicatorId, indicatorAttributeId, options, cb) {
  let requestOptions = {
    method: 'DELETE',
    uri: `${options.url}/api/indicators/${indicatorId}/attributes/${indicatorAttributeId}`,
    json: true
  };

  Logger.trace(requestOptions);

  authenticatedRequest(options, requestOptions, function(err, response, body) {
    if (err) {
      return cb(err);
    }

    // returns attribute
    cb(null, {});
  });
}

function addAttribute(indicatorId, attributeName, attributeValue, options, cb) {
  let requestOptions = {
    method: 'POST',
    uri: `${options.url}/api/indicators/${indicatorId}/attributes`,
    body: [
      {
        name: attributeName,
        value: attributeValue,
        sources: []
      }
    ],
    json: true
  };

  Logger.trace(requestOptions);

  authenticatedRequest(options, requestOptions, function(err, response, body) {
    if (err) {
      return cb(err);
    }

    // returns attribute
    cb(null, body.data[0]);
  });
}

/**
 * Updates the given indicatorId with the provided statusId
 * 1: 'Active',
 * 2: 'Expired',
 * 3: 'Indirect',
 * 4: 'Review',
 * 5: 'Whitelisted'
 *
 * @param indicatorId
 * @param statusId
 * @param options
 * @param cb
 */
function updateStatus(indicatorId, statusId, options, cb) {
  let requestOptions = {
    method: 'PUT',
    uri: `${options.url}/api/indicators/${indicatorId}`,
    body: {
      status_id: statusId
    },
    json: true
  };

  Logger.trace(requestOptions);

  authenticatedRequest(options, requestOptions, function(err, response, body) {
    if (err) {
      return cb(err);
    }

    // returns indicator
    cb(null, body.data);
  });
}

function addToWatchlist(indicatorId, options, cb) {
  let requestOptions = {
    method: 'POST',
    uri: `${options.url}/api/indicators/${indicatorId}/watchlist`,
    json: true
  };

  Logger.trace(requestOptions);

  authenticatedRequest(options, requestOptions, function(err, result) {
    if (err) {
      return cb(err);
    }

    cb(null, result.data);
  });
}

function removeFromWatchlist(indicatorId, watchlistId, options, cb) {
  let requestOptions = {
    method: 'DELETE',
    uri: `${options.url}/api/indicators/${indicatorId}/watchlist/${watchlistId}`,
    json: true
  };

  Logger.trace(requestOptions);

  authenticatedRequest(options, requestOptions, function(err) {
    if (err) {
      return cb(err);
    }

    cb(null, null);
  });
}

function deleteTag(indicatorId, tagId, options, cb) {
  Logger.trace({ indicatorId, tagId, options }, 'deleteTag');
  let requestOptions = {
    method: 'DELETE',
    uri: `${options.url}/api/indicators/${indicatorId}/tags/${tagId}`,
    json: true
  };

  Logger.trace(requestOptions);

  authenticatedRequest(options, requestOptions, function(err) {
    if (err) {
      return cb(err);
    }

    cb(null, null);
  });
}

function addTag(indicatorId, tagName, options, cb) {
  let requestOptions = {
    method: 'POST',
    uri: `${options.url}/api/indicators/${indicatorId}/tags/`,
    body: {
      name: tagName
    },
    json: true
  };

  Logger.trace(requestOptions);

  authenticatedRequest(options, requestOptions, function(err, response, body) {
    if (err) {
      return cb(err);
    }

    Logger.trace(body);
    if (Array.isArray(body.data) && body.data.length === 1) {
      cb(null, body.data[0]);
    } else {
      let invalidResponseErr = {
        indicatorId,
        tagName,
        body,
        detail: 'Unexpected response from add tags call'
      };
      Logger.error(invalidResponseErr);
      cb(invalidResponseErr);
    }
  });
}

function deleteComment(indicatorId, commentId, options, cb) {
  Logger.trace({ indicatorId, commentId, options }, 'deleteComment');
  let requestOptions = {
    method: 'DELETE',
    uri: `${options.url}/api/indicators/${indicatorId}/comments/${commentId}`,
    json: true
  };

  Logger.trace(requestOptions);

  authenticatedRequest(options, requestOptions, function(err) {
    if (err) {
      Logger.error(err, 'Error deleting comment');
      return cb(err);
    }

    cb(null, null);
  });
}

function getComments(id, options, cb) {
  //do the lookup
  let requestOptions = {
    method: 'GET',
    uri: `${options.url}/api/indicators/${id}/comments`,
    qs: {
      limit: 30,
      sort: '-created_at',
      with: 'sources' //this includes the user that created the comment
    },
    json: true
  };

  Logger.trace(requestOptions);

  authenticatedRequest(options, requestOptions, function(err, response, body) {
    if (err) {
      return cb(err);
    }

    Logger.trace(body);
    cb(null, {
      totalComments: body.total,
      comments: body.data
    });
  });
}

function getAttributes(id, options, cb) {
  //do the lookup
  let requestOptions = {
    method: 'GET',
    uri: `${options.url}/api/indicators/${id}/attributes`,
    json: true
  };

  Logger.trace(requestOptions);

  authenticatedRequest(options, requestOptions, function(err, response, body) {
    if (err) {
      return cb(err);
    }

    Logger.trace(body);
    cb(null, {
      totalAttributes: body.total,
      attributes: _pickConfiguredAttributes(body.data)
    });
  });
}

function getDetails(id, options, cb) {
  //do the lookup
  let requestOptions = {
    method: 'GET',
    uri: `${options.url}/api/indicators/${id}`,
    qs: {
      with: 'tags,adversaries,attributes,indicators,watchlist'
    },
    json: true
  };

  Logger.trace(requestOptions);

  authenticatedRequest(options, requestOptions, function(err, response, body) {
    if (err) {
      return cb(err);
    }
    cb(null, body.data);
  });
}

function updateComment(indicatorCommentId, value, options, cb) {
  let requestOptions = {
    method: 'PUT',
    uri: `${options.url}/api/indicators/comments/${indicatorCommentId}`,
    body: {
      value: value
    },
    json: true
  };

  Logger.trace(requestOptions);

  authenticatedRequest(options, requestOptions, function(err, response, body) {
    if (err) {
      return cb(err);
    }

    // returns newly updated comment
    cb(null, body.data);
  });
}

function createComment(id, note, options, cb) {
  //do the lookup
  let requestOptions = {
    method: 'POST',
    uri: `${options.url}/api/indicators/${id}/comments`,
    body: {
      value: note
    },
    json: true
  };

  Logger.trace(requestOptions);

  authenticatedRequest(options, requestOptions, function(err, response, body) {
    if (err) {
      return cb(err);
    }

    // returns newly created comment
    cb(null, body.data);
  });
}

function getCurrentUser(options, cb) {
  let requestOptions = {
    method: 'GET',
    uri: `${options.url}/api/users/current`,
    json: true
  };

  Logger.trace(requestOptions);

  authenticatedRequest(options, requestOptions, function(err, response, body) {
    if (err) {
      return cb(err);
    }

    if (body && body.data && body.data.source) {
      // return current user source id
      cb(null, body.data.source.id);
    } else {
      cb({
        body: body,
        detail: 'Could not retrieve current user'
      });
    }
  });
}

function onDetails(lookupObject, options, cb) {
  async.parallel(
    {
      details: function(done) {
        getDetails(lookupObject.data.details.id, options, done);
      },
      comments: function(done) {
        getComments(lookupObject.data.details.id, options, done);
      },
      currentUser: function(done) {
        getCurrentUser(options, done);
      }
    },
    (err, results) => {
      if (err) {
        return cb(err);
      }

      lookupObject.data.details.currentUserSourceId = results.currentUser;
      lookupObject.data.details.watchlist = results.details.watchlist;
      lookupObject.data.details.adversaries = results.details.adversaries;
      lookupObject.data.details.attributes = _pickConfiguredAttributes(results.details.attributes);
      lookupObject.data.details.tags = results.details.tags;
      lookupObject.data.details.indicators = results.details.indicators;
      lookupObject.data.details.description = results.details.description;
      lookupObject.data.details.comments = results.comments.comments;
      lookupObject.data.details.totalComments = results.comments.totalComments;

      cb(null, lookupObject.data);
    }
  );
}

function _pickConfiguredAttributes(attributes) {
  let pickedAttributes = [];
  if (attributesConfigured) {
    attributes.forEach((attr) => {
      if (attributeLookup[attr.name]) {
        pickedAttributes.push(attr);
      }
    });
  }
  return pickedAttributes;
}

function _createLookupResultObject(entityObj, result, options) {
  // filter out any results that are are not of a status set by the user
  if (
    typeof result.status !== 'undefined' &&
    typeof result.status.id !== 'undefined' &&
    !options.__indicatorStatusValues.includes(result.status.id)
  ) {
    return;
  }

  result.userOptions = {
    _threatQAttributeLookup: attributeLookup,
    _threatQStatuses: threatQConfig.threatQStatuses,
    url: options.url,
    allowAddingTag: options.allowAddingTag,
    allowDeletingTags: options.allowDeletingTags,
    allowEditingStatus: options.allowEditingStatus,
    allowEditingScore: options.allowEditingScore
  };

  return {
    entity: entityObj,
    data: {
      summary: [`Score: ${result.score}`, `Status: ${result.status.name}`],
      details: result
    }
  };
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
    errors: [_createJsonErrorObject(msg, pointer, httpCode, code, title, meta)]
  };
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

  if (Array.isArray(threatQConfig.threatQAttributes)) {
    threatQConfig.threatQAttributes.forEach((attribute) => {
      attributesConfigured = true;
      attributeLookup[attribute.name] = attribute;
    });
  }

  sessionManager = new SessionManager(Logger);

  requestWithDefaults = request.defaults(defaults);

  authenticatedRequest = (options, requestOptions, cb, requestCounter = 0) => {
    if (requestCounter === MAX_AUTH_RETRIES) {
      // We reached the maximum number of auth retries
      return cb({
        detail: `Attempted to authenticate ${MAX_AUTH_RETRIES} times but failed authentication`
      });
    }

    createToken(options, function(err, token) {
      if (err) {
        Logger.error({ err: err }, 'Error getting token');
        return cb({
          err: err,
          detail: 'Error creating authentication token'
        });
      }

      requestOptions.headers = { Authorization: 'Bearer ' + token };

      requestWithDefaults(requestOptions, (err, resp, body) => {
        if (err) {
          return _createJsonErrorPayload(
            'Unable to connect to TQ server',
            null,
            '500',
            '2A',
            'ThreatQ HTTP Request Failed',
            {
              err: err,
              response: response,
              body: body
            }
          );
        }

        if (resp.statusCode === 401) {
          // Unable to authenticate so we attempt to get a new token
          sessionManager.clearSession(options.username, options.password);

          authenticatedRequest(options, requestOptions, cb, ++requestCounter);
          return;
        }

        let restError = _handleRestErrors(resp, body);
        if (restError) {
          return cb(restError);
        }

        cb(null, resp, body);
      });
    });
  };
}

function validateOptions(userOptions, cb) {
  let errors = [];
  if (
    typeof userOptions.url.value !== 'string' ||
    (typeof userOptions.url.value === 'string' && userOptions.url.value.length === 0)
  ) {
    errors.push({
      key: 'url',
      message: 'You must provide your TQ server URL'
    });
  }

  Logger.info(userOptions);

  if (+userOptions.minimumScore.value.value > +userOptions.maximumScore.value.value) {
    errors.push({
      key: 'minimumScore',
      message: 'The Minimum Score must be less than or equal to the Maximum Score'
    });
  }

  if (
    typeof userOptions.username.value !== 'string' ||
    (typeof userOptions.username.value === 'string' && userOptions.username.value.length === 0)
  ) {
    errors.push({
      key: 'username',
      message: 'You must provide your TQ username'
    });
  }

  if (
    typeof userOptions.password.value !== 'string' ||
    (typeof userOptions.password.value === 'string' && userOptions.password.value.length === 0)
  ) {
    errors.push({
      key: 'password',
      message: "You must provide your TQ username's password"
    });
  }

  if (
    typeof userOptions.client.value !== 'string' ||
    (typeof userOptions.client.value === 'string' && userOptions.client.value.length === 0)
  ) {
    errors.push({
      key: 'username',
      message: 'You must provide your TQ username'
    });
  }
  cb(null, errors);
}

module.exports = {
  doLookup: doLookup,
  startup: startup,
  validateOptions: validateOptions,
  onDetails: onDetails,
  onMessage: onMessage
};
