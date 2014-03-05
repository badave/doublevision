var _ = require('lodash');
var config = require('../config');
var when = require("when");

var BaseController = require('./base');

var CrudController = module.exports = BaseController.extend({
  className: "CrudController",

  // Singular and Plural forms of the database table/collection
  resources: 'models',
  resource: 'model',

  model: null,
  collection: null,

  // Which crud routes are to be used.  If you just want to allow reading for example, crud: ["R"]
  // CRUD routes are sent to the following methods automagically
  // 1) C: create
  // 2) R: find
  // 2.5) O: findOne
  // 3) U: update
  // 4) D: destroy
  crud: ["C", "R", "O", "U", "D"],

  basePath: function() {
    return "/" + this.version + this.path + this.resources;
  },

  setupRoutes: function() {
    CrudController.__super__.setupRoutes.call(this);

    // Setup CRUD routes
    _.each(this.crud, function(crud) {
      switch (crud) {
      case 'C':
        // Create
        this.routes.post[this.basePath()] = {
          action: this.create,
          middleware: []
        };
        break;
      case 'R':
        // Find
        this.routes.get[this.basePath()] = {
          action: this.find,
          middleware: []
        };
        break;
      case 'O':
        // FindOne
        this.routes.get[this.basePath() + "/:id"] = {
          action: this.findOne,
          middleware: []
        };
        break;
      case 'U':
        // Update
        this.routes.put[this.basePath() + "/:id"] = {
          action: this.update,
          middleware: []
        };
        break;
      case 'D':
        // Destroy
        this.routes.del[this.basePath() + "/:id"] = {
          action: this.destroy,
          middleware: []
        };
        break;
      default:
        break;
      }
    }.bind(this));
  },


  // readies the model for sexytime
  setupModel: function(req) {
    var model = new this.model();

    // moves flags to the model
    model.flags = req.flags;
    
    // decodes from base62
    var ids = this.decodeIds(req);

    // transformParentParams moves ids from the params to the req.body
    model.set(ids);

    var id = this.extractId(req);
    if(id) { model.setId(id); }
    model.setEnv(req.env);
    model.req = req;

    return model;
  },

  decodeIds: function(req) {
    var body = req.body;

    var ids = {};
    _.each(body, function(value, key) {
      // the !== "_id" prevents it from converting our old stupid mongo objectids from base62
      if(/_id/.test(key) && key !== "_id") {
        body[key] = _.base62Decode(value);
        ids[key] = _.base62Decode(value);
      }
    });

    return ids;
  },

  /////////////
  // Helpers //
  /////////////
  
  // Pass in a query_builder for the second param.  collections have query builders (collection.query());
  prepareQuery: function(req, query) {
    var qs = req.query;

    query.where({
      user_id: req.user.id,
      env: req.env
    });

    // Since/Until or From/To based on updated timestamp in ms
    var since = qs.since || qs.from;
    var until = qs.until || qs.to;

    if(since) {
      query.andWhere('updated_at', '>=', new Date(since));
    }

    if(until) {
      query.andWhere('updated_at', '<=', new Date(until));
    }

    // turns req.params.ids into query string params
    if(req.params) { 
      for(var key in req.params) {
        if(/id/.test(key)) {
          query.andWhere(key, _.base62Decode(req.params[key]));
        }
      }
    }

    return query;
  },

  prepareQueryOptions: function(req, query) {
    var qs = req.query;

    var offset = qs.skip || qs.offset || 0;
    var limit = qs.limit || qs.count || 100;

    query.orderBy(qs.sort || "updated_at", _.get(qs, "order", "").toUpperCase() || "DESC");
    query.offset(offset);
    query.limit(limit);

    req.offset = offset;
    req.limit = limit;

    return query;
  },

  extractId: function(req) {
    var id = null;

    if (req.params.id) {
      id = req.params.id;
    } else if (req.body.id) {
      id = req.body.id;
    } else if (req.query.id) {
      id = req.query.id;
    }

    if(id) {
      return _.base62Decode(id);
    }
  },

  ////////////////////
  // CRUD functions //
  ////////////////////

  find: function(req, res, next) {
    var err;
    var that = this;
    var collection = new this.collection();
    
    var query = collection.query();
    
    this.prepareQuery(req, query);
    this.prepareQueryOptions(req, query);
    
    collection.fetch()
    .then(function() {
      collection.resetQuery();

      var query = collection.query();

      query.count("id");

      that.prepareQuery(req, query);

      query.then(function(c)  {
        var count = collection.length;
        var total = c[0].aggregate;

        res.paging = {
          total: _.parseInt(total),
          count: _.parseInt(count),
          limit: _.parseInt(req.limit),
          offset: _.parseInt(req.offset),
          has_more: _.parseInt(count) < _.parseInt(total)
        };

        return that.prepareResponse(err, collection, req, res, next);
      });

    })
    .otherwise(that.errorHandler(req, res, next));
  },

  findOne: function(req, res, next) {
    var err;
    var that = this;
    var model = this.setupModel(req);
    
    model.fetch({ require: true })
    .then(that.successHandler(req, res, next))
    .otherwise(that.errorHandler(req, res, next));
  },

  create: function(req, res, next) {
    var that = this;

    var model = this.setupModel(req);

    model.setFromRequest(req.body);
    
    this.saveModel(model, req, res, next);
  },
  
  // Save model
  saveModel: function(model, req, res, next) {
    var that = this;
    
    model.save()
    .then(that.successHandler(req, res, next))
    .otherwise(that.errorHandler(req, res, next));
  },

  update: function(req, res, next) {
    var that = this;
    var model = this.setupModel(req);

    model.fetch({ require: true })
    .then(function() {

      var attributes = model.setFromRequest(req.body);

      // Save BaseModel
      return model.save(attributes, { patch: true })
      .then(that.successHandler(req, res, next))
      .otherwise(that.errorHandler(req, res, next));

    })
    .otherwise(that.errorHandler(req, res, next));
  },

  destroy: function(req, res, next) {
    var that = this;
    var model = this.setupModel(req);

    model.fetch({ require: true })
    .then(function() {

      // Create model instance
      model.destroy({require: true})
      .then(function() {
        res.code = 204;
        res.data = {};
        return next();
      })
      .otherwise(that.errorHandler(req, res, next));

    })
    .otherwise(that.errorHandler(req, res, next));
  },

  requireAdmin: function(req, res, next) {
    // TODO UserModel
    if(!req.admin) {
      err = new Error("=== [ERROR] Unauthorized ===");
      err.code = 401;
      return next(err);
    }

    next();
  },

  requireUser: function(req, res, next) {
    // TODO UserModel
    if(!req.user) {
      var err = new Error("=== [ERROR] Unauthorized ===");
      err.code = 401;
      return next(err);
    }

    next();
  },

  authenticateUser: function() {
    return middleware.authenticate.apply(this, arguments);
  },

  requireJSON: function(req, res, next) {
    var err;
    // Enforce Content-Type: application/json for all POST and PUT requests
    if (!req.is('json')) {
      err = new Error("Please set your Request Headers to contain: Content-Type: application/json");
    }
    return next(err);
  },

  ///////////////
  // Renderers //
  ///////////////
  renderModel: function(model) {
    return model.render().content();
  },

  renderCollection: function(collection) {
    // TODO paging
    return collection.map(function(model) {
      return model.render().content();
    });
  },

  renderContent: function(model) {
    return model.render().content();
  }

});
