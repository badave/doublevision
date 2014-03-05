// Middleware
var _ = require('lodash');
var fs = require('fs');
var path = require('path');

var domain = require('domain');
var pid = process.pid;
var config = require('./config');

var middleware = module.exports = {
  redirectToSSL: function(req, res, next) {
    if (req.protocol !== 'https') {
      res.redirect(301, 'https://' + req.headers.host + req.url);
    } else {
      next();
    }
  },

  errorDomain: function(req, res, next) {
    var d = domain.create();
    d.add(req);
    d.add(res);
    d.on('error', function(err) {
      _.error("Uncaught Exception for URL: %s", req.url);

      res.writeHead(500);
      res.end("Internal Server Error. We have been notified.");
    });

    d.run(next);
  },

  // Default route handler
  responseHandler: function(req, res, next) {
    // 404
    if (!res.data) {
      var err = new Error("Route Not Found");
      err.code = 404;
      return next(err);
    }

    // Route Succeeded
    res.code = res.code || 200;
    res.envelope = {
      meta: {
        code: res.code,
        resource_type: res.resource_type
      }
    };

    // Env
    if (req.env) {
      res.envelope.meta.env = req.env;
    }

    // Paging
    if (res.paging) {
      res.envelope.paging = res.paging;
    }

    // Data
    if (res.data) {
      res.envelope.data = res.data;
    }

    return next();
  },

  // Default response handler
  // All routes should return a final next(...) call or else the 404 handler will be called
  // If the route encounters an error, return next(err)
  // If the route succeeds, return next(obj) where obj CANNOT be null/undefined
  errorHandler: function(err, req, res, next) {
    // Route has an Error
    err.code = err.code || 500;
    err.message = err.message || "Internal Server Error";

    if (err.code >= 400 && err.code < 500) {
      err.type = "client_error";
    } else if (500 <= err.code) {
      err.type = "api_error";
    }

    res.code = err.code <= 505 ? err.code : 500;
    res.envelope = {
      meta: {
        code: err.code,
        error_message: err.message,
        error_type: err.type
      }
    };

    if (req.env) {
      res.envelope.meta.env = req.env;
    }

    res.envelope.data = err.message;

    // Print to log
    _.error("%s %s %d", req.method, req.originalUrl, err.code);
    if (err.code === 500 && err.stack) {
      _.error("Headers: %j", req.headers.authorization, {});
      _.error("Params: %j", req.params, {});
      _.error("%s", err.stack);
    } else {
      _.error("%s", err.message);
    }

    return next();
  },

  finalHandler: function(req, res, next) {
    // If we timed out before managing to respond, don't send the response
    if (res.headerSent) {
      _.error("request timed out before response was sent");
      return;
    }

    // Respond with correct format, defaulting to json
    res.fmt = res.fmt || 'json';
    if (res.fmt === 'json') {
      res.jsonp(res.code, res.envelope);
    } else if (res.fmt === 'xml') {
      res.set('Content-Type', 'application/xml; charset=utf-8');
      res.send(res.code, res.data);
    } else {
      // text or html
      res.send(res.code, res.data);
    }
  }
};
