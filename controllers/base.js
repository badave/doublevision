var _ = require('lodash');
var config = require('../config');
var Backbone = require('backbone');
var when = require("when");

var Model = require('../models/base');

BaseController = module.exports = Backbone.Model.extend({
  className: "BaseController",

  /** Define a version that will be used in the base url path */
  version: "v3",

  /** Define a path to be appended after the version */
  path: "/",

  /** Called after the constructor */
  initialize: function() {
    // Routes
    this.routes = {
      get: {},
      post: {},
      put: {},
      del: {}
    };

    // Before and After Middleware
    this.before = [];
    this.after = [];

    // Setup Routes
    this.setupBeforeMiddleware();
    this.setupRoutes();
    this.setupAfterMiddleware();
  },

  /**
   * Computes the base path for the controller
   * @return {string} computed base path (i.e. http://localhost/v2)
   */
  basePath: function() {
    return "/" + this.version + this.path;
  },

  /**
   * Setup routes that this controller should handle
   */
  setupRoutes: function() {
    _.verbose("%s#setupRoutes", this.className);
  },

  /**
   * Setup middleware that should run before the route
   * i.e. this.before.push(this.fakeBeforeMiddleware.bind(this))
   */
  setupBeforeMiddleware: function() {
    _.verbose("%s#setupBeforeMiddleware", this.className);

    // this.before.push(this.authenticateToken.bind(this));

    // // set the resource type for the meta tag in the response
    // this.before.push(this.setResourceType.bind(this));

    // // takes parameters and inserts those into the body of the request
    this.before.push(this.transformParams.bind(this));

    // // currently doesn't do anything, but may be used to verify JSON or form-data
    // this.before.push(this.validateContentType.bind(this));
  },

  /**
   * Setup middleware that should run after the route
   * i.e. this.after.push(this.fakeAfterMiddleware.bind(this))
   */
  setupAfterMiddleware: function() {
    _.verbose("%s#setupAfterMiddleware", this.className);
  },

  ////////////////
  // MIDDLEWARE //
  ////////////////
  
  // transforms req.params.ids to req.body.  For instance /v3/orders/:order_id/payments/:id gets moved into req.body as req.body.order_id and req.body.id
  transformParams: function(req, res, next) {
    for(var key in req.params) {
      if(/id/.test(key)) {
        req.body[key] = req.params[key];
      }
    }
    next();
  },

  validateContentType: function(req, res, next) {
    return next();
  },
  
  setResourceType: function(req, res, next) {
    res.resource_type = this.resource;
    return next();
  },

  authenticateToken: function(req, res, next) {
    var err;
    
    var access_token = this.authorizationTokenFromRequest(req);
    
    if (!access_token) {
      err = new Error("Unauthorized");
      err.code = 401;
      return next(err);
    }
    
    if (access_token === config.authorization_token_test) {
      req.env = "test";
      return next();
    } else if (access_token === config.authorization_token_live) {
      req.env = "live";
      return next();
    } else {
      err = new Error("Unauthorized");
      err.code = 401;
      return next(err);
    }
  },

  authorizationTokenFromRequest: function(req) {
    var access_token;

    if (req.headers.authorization) {
      // Use HTTP Auth header
      var parts = req.headers.authorization.split(':');
      var scheme = parts[0];
      var credentials = parts[1];
      if (scheme === 'Basic') {
        var userPass = new Buffer(credentials, 'base64').toString().split(':');
        if (userPass.length > 1) {
          access_token = userPass[0];
        } else {
          access_token = credentials;
        }
      } else if (scheme === 'Bearer') {
        access_token = credentials;
      } else {
        access_token = scheme;
      }
    } else if (req.query.access_token) {
      // Use query string
      access_token = req.query.access_token;
    }

    return access_token;
  },

  /////////////
  // Helpers //
  /////////////
  
  renderContent: function(model) {
    return model.render().content();
  },
  
  // Helpers
  // This method can be overridden to customize the response
  prepareResponse: function(err, modelOrCollection, req, res, next) {
    if (err) {
      return next(err);
    }

    if(!modelOrCollection) {
      return next();
    }

    if (modelOrCollection instanceof BaseModel) {
      res.data = this.renderContent(modelOrCollection); 
    } else if (modelOrCollection instanceof BaseCollection || modelOrCollection instanceof Array){
      var that = this;
      res.data = modelOrCollection.map(function(model) {
        return that.renderContent(model);
      });
    } else if (modelOrCollection.toJSON) {
      // TODO: arpan default this to base view, right now its a temp hack
      res.data = modelOrCollection.toJSON();
    }

    return next();
  },


  //////////////
  // Handlers //
  //////////////
  
  successHandler: function(req, res, next) {
    var that = this;
    return function(model) {
      return that.prepareResponse(null, model, req, res, next);
    };
  },
  
  errorHandler: function(req, res, next) {
    var that = this;
    return function(err) {
      if(err.message === "EmptyResponse") {
        err = new Error("Resource Not Found");
        err.code = 404;
      }

      if(/duplicate key value violates unique constraint/.test(err.message)) {
        var message = "Resource must be unique";

        if(/sku/.test(err.message)) {
          message += ": SKU is a duplicate";
        } else if(/email/.test(err.message)) {
          message = "Email has already signed up <br /> (but we're flattered that you tried again)";
        } else if(match = err.message.match(/duplicate key value violates unique constraint \"([a-zA-Z0-9\_]+)\"/)) {
          message += ": " + match[1];
        }

        err = new Error(message);
        err.code = 409;
      }

      if (/null value in column/.test(err.message)) {
        var message = "Required field not specified";

        if(match = err.message.match(/null value in column \"([a-zA-Z0-9\_]+)\"/)) {
          message += ": " + match[1];
        }
        
        err = new Error(message);
        err.code = 412;
      }

      if (err.type === "StripeCardError") {
        err = new Error(err.message);
        err.code = 402;
      }

      return that.prepareResponse(err, null, req, res, next);
    };
  }

});


