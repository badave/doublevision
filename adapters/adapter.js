var _ = require('lodash');
var Backbone = require('backbone');
var request = require('request');
var when = require('when');

var config = {
  "version": "v1"
};

Adapter = module.exports = Backbone.Model.extend({
  className: "Adapter",
  urlRoot: "",
  version: "",

  baseUrl: function() {
    return this.version ? this.urlRoot + "/" + this.version : this.urlRoot;
  },

  sendRequest: function(options, callback) {
    var that = this;
    var err = null;
    options = options || {};

    // Validate options
    if (!options.url && !options.path) {
      options.path = ""; 
    }

    var baseUrl = (typeof(this.baseUrl) === "function") ? this.baseUrl(): this.baseUrl;

    // Prepare the request
    var requestOptions = {
      method: options.method || 'GET',
      url: options.url || baseUrl + options.path,
      qs: options.qs || {},
      headers: {}
    };

    if (!_.isNull(options.json) && !_.isUndefined(options.json)) {
      requestOptions.json = options.json;
    } else {
      requestOptions.json = true;
    }

    // Optionally include FORM or BODY or JSON
    if (options.form) {
      _.defaults(requestOptions.headers, { "Content-Type": "application/x-www-form-urlencoded; charset=utf-8" });
      requestOptions.form = _.clone(options.form);
    } else if (options.body) {
      requestOptions.body = _.clone(options.body);
    } else if (options.json) {
      _.defaults(requestOptions.headers, { "Content-Type": "application/json; charset=utf-8" });
      requestOptions.json = _.clone(options.json);
    } else if (options.xml) {
      _.defaults(requestOptions.headers, { "Content-Type": "application/xml; charset=utf-8" });
      requestOptions.body = _.clone(options.xml);
    }
    // Optionally attach access_token.  If you are looking to use a different form of auth, override Authorization in headers
    var access_token = options.access_token || this.get("access_token");
    if (access_token) {
      requestOptions.access_token = access_token;
      _.defaults(requestOptions.headers, { "Authorization":  "Bearer " + access_token });
    }
    
    var authorization_token = options.authorization_token || this.get("authorization_token");
    if (authorization_token) {
      requestOptions.authorization_token = authorization_token;
      _.defaults(requestOptions.headers, { "Authorization": authorization_token });
    }
    
    // auth for affirm
    if(options.auth) {
      requestOptions.auth = options.auth;
    }

    var deferred = when.defer();

    if(config.debug) {
      console.info("==== Payments Service - Making Request ====");
      console.info(requestOptions);
    }

    that.LAST_REQUEST = requestOptions;

    // Fire the request
    request(requestOptions, function(error, response, body) {
      console.log(body);
      that.LAST_RESPONSE = response;
      that.LAST_BODY = body;

      if(config.debug) {
        console.info("==== Payments Service - Response Received ====");
        console.info(body);
      }

      if (error) {
        var message = error.message || response.meta && response.meta.error_message;
        console.warn("=== [ERROR] Request Failed:", message);

        if(callback) {
          callback(error);
        }

        return deferred.reject(error);
      } else if (response.statusCode >= 400) {
        error = new Error(that.extractError(body));
        error.code = response.statusCode;
        console.warn("=== [ERROR] Request failed with code:", error.code, "and message:", error.message);

        if(callback) {
          callback(error);
        }

        return deferred.reject(error);
      }

      if(callback) {
        callback(null, body);
      }
      
      return deferred.resolve(body);
    });

    return deferred.promise;
  },

  // If there's an error, try your damndest to find it.  APIs hide errors in all sorts of places these days
  extractError: function(body) {
    var that = this;

    if (_.isString(body)) {
      return body;
    } else if (_.isObject(body) && _.isString(body.error)) {
      return body.error;
    } else if (_.isObject(body) && _.isObject(body.error)) {
      return that.extractError(body.error);
    } else if (_.isObject(body) && _.isString(body.message)) {
      return body.message;
    } else if (_.isObject(body) && body.meta && _.isString(body.meta.error_message)) {
      return body.meta.error_message;
    } else {
      return "Unknown Error";
    }
  },
});
