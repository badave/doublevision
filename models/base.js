var _ = require('lodash');
var when = require('when');
var base62 = require('base62');
var check = require('validator').check,
    sanitize = require('validator').sanitize;

var BaseCollection = require('../collections/base');

BaseModel = module.exports = Bookshelf.primary.Model.extend({
  events: {
    "saving": "beforeSave",
    'updating': 'beforeUpdate',
    'creating': 'beforeCreate',
    "saved": "afterSave",
    'created': 'afterCreate',
    'updated': 'afterUpdate',
    'fetching': 'beforeFetch',
    'fetched': 'afterFetch',
    'destroying': 'beforeDestroy',
    'destroyed': 'afterDestroy'
  },
  
  userIdAttribute: 'user_id',
  teamIdAttribute: 'team_id',
  relations: {},

  /**
   * These are fields that are helpful here:
   * genericFields cannot be modified by request and are automatically set by us (this id, user_id, etc)
   * requiredFields are required.  Requests made without these will be errored out
   * dataFields will be saved to the "data" json column (description is included by default)
   * allowedFields are any parameters that we accept from a request -- these should be variables
   */
  genericFields: [ 'user_id', 'team_id', 'created_at', 'updated_at', 'data'],
  requiredFields: [],
  dataFields: ['description'],
  allowedFields: [],
  hasTimestamps : ['created_at', 'updated_at'],

  // Validators of format "key" -> "type"
  // {
  //  "name"    : "string",
  // }
  // You can see the list of validators in the validateTypes switch statement
  // 
  fieldTypes: {},

  /**
   * Connections are relationships with objects that belong to another object
   * 
   * Example:
   connections: {
     "addresses": {
       model: Address,
       save_step: "afterSave"
       collection: AddressCollection,
       foreignKey: "customer_id"
     }
   }
   * @type {Array}
   *
   * 
   * There's also localKey, for referring to something that has the foreignKey on "this" model versus the other model
   * They get saved at different points -> if you use a "localKey", "this" model gets saved after the other is created and sets the id to 
   * the relation "locally".  If you save without a "localKey", it'll first create this model then save those models.
   *
   * For example, in order.js,
   * 
   *  connections: {
        "customer": {
          model: Customer,
          localKey: "customer_id"
        }
      }
   *
   *  This creates the customer and then saves the customer_id to the order
   *
   * Other options
   *   passthru: {@array of column names} These are fields that you need to pass the ids for to the foreignRelation.
   *     ex - passthru: ["customer_id"] on shipping address, because it requires the customer_id 
   *   save_step: defaults to afterSave, however, there are three options for it
   *     1) beforeSave
   *     2) afterBeforeSave -- This happens right after the beforeSave, for connections that require another connection to be built
   *     3) afterSave
   */
  connections: {},


  initialize: function() {
    this.setupEvents.bind(this);
    this.setupEvents();

    return Bookshelf.primary.Model.prototype.initialize.apply(this, arguments);
  },

  setupEvents: function() {
    var that = this;
    var events = this.events;

    _.each(events, function(fn, key) { 
      var resolvingFunction = fn;

      if(!_.isFunction(resolvingFunction)) {
        var method = events[key];
        resolvingFunction = that[method];
      }

      if(!resolvingFunction) {
        throw new Error("Could not find resolving function for event: ", key);
      }

      that.on(key, function() {
        return resolvingFunction.apply(that, arguments);
      });
    });
  },
  
  findOrCreate: function(options) {
    var cloned = this.clone();
    
    return this.fetch(_.extend(options, {require: true})).then(null, function(err) {
       if (err.message === 'EmptyResponse') return cloned;
       throw err;
    });
  },

  save: function() {
    var that = this;

    that.validate();

    var args = arguments;

    return that.saveConnections("beforeSave")
      .then(function() {
        return that.saveConnections("afterBeforeSave");
      })
      .then(function() {
        return Bookshelf.primary.Model.prototype.save.apply(that, args);
      })
      .then(function() {
        return that.saveConnections("afterSave");
      })
      .then(function() {
        return that;
      });
  },

  beforeSave: function() {},
  afterSave: function() {},
  beforeCreate: function() {}, // stubs
  afterCreate: function() {}, // stubs
  beforeUpdate: function() {}, // stubs
  afterUpdate: function() {}, // stubs
  beforeFetch: function() {},
  afterFetch: function() {},
  beforeDestroy: function() {},
  afterDestroy: function() {},

  allowedConnections: function() {
    return _.keys(this.connections);
  },

  /**
   * sets the body of a model when passed in from the outside world
   * @param {object} body from req.body 
   *
   * Returns those attributes that are *accepted only* from the passed in object
   */
  setFromRequest: function(body) {
    var that = this;
    var allowedConnections = this.allowedConnections();

    this.checkMissing(body);
    
    // moves flags passed in from req.body to the model
    if(body.flags) {
      this.flags = _.clone(body.flags);
      delete body.flags;
    }
    
    var rejects = _.omit(body, "id", this.allowedFields, this.genericFields, this.dataFields, allowedConnections);
    if(!_.isEmpty(rejects)) {
      var err = new Error("Invalid parameters passed in for " + this.name + ": " + _.keys(rejects).join(", "));
      err.code = 400;
      throw err;
    }

    // strips out fields
    var attributes = _.pick(_.omit(body, this.genericFields, this.dataFields), this.allowedFields);

    if(body.id) {
      attributes.id = _.base62Decode(body.id);
    }

    // Picks out data we want in the data column
    var data = _.pick(body, this.dataFields) ;
    this.set(attributes);
    this.set("data", _.extend(this.get("data"), data));

    this.setupConnections(_.pick(body, allowedConnections));

    return attributes;
  },

  checkMissing: function(body) {
    // TODO -- updates might not contain data -> determine workaround
    var missing = [];

    _.each(this.requiredFields, function(field) {
      if(!_.has(body, field)) {
        missing.push(field);
      }
    });

    if(missing.length > 0) {
      var err = new Error("Required fields for " + this.name + ": " + missing.join(', '));
      err.code = 400;
      throw err;
    }
  },

  // Validates all attributes
  validate: function() {
    var that = this;
    for(var attribute in that.attributes) {
      that.validateType(attribute, that.attributes[attribute]);
    }
  },

  // TODO: arpan add validation in here, right now it only does sanitization
  validateType: function(attribute, value) {
    var that = this;
    var err;

    var type = that.fieldTypes[attribute];
    switch(type) {
    case 'integer':
      if(!_.isNaN(_.parseInt(value))) {
        that.set(attribute, _.parseInt(value));
      } else if(!value && value !== 0) {
        that.set(attribute, null);
      }
      break;
    case 'string':
      if(value && value.toString) { that.set(attribute, value.toString()); }
      break;
    case 'email':
      if(!_.isEmailValid(value)) {
        err = new Error("Email address isn't an email address");
        err.code = 404;
        throw err;
      }
      break;
    case 'zip':
      try{
        _.isValidZip(value);
      } catch(err) {
        err.code = 400;
        throw err;
      }
      break;
    case 'price':
      try {
        var message =  "Price is invalid for " + this.name + ": " + attribute;
        // TODO add check for > 0
        check(value, message).notNull().isInt();

        if(value < 0) {
          err = new Error(message);
          throw err;
        }
      } catch(err) {
        err.code = 400;
        throw err;
      }
      break;
    case 'quantity':
      try { // TODO add check for > 0
        var message =  "Quantity is invalid for " + this.name + ": " + attribute;
        check(value, message).notNull().isInt();

        if(value < 0) {
          var err = new Error(message);
          throw err;
        }

        that.set(attribute, _.parseInt(value));
      } catch(err) {
        err.code = 400;
        throw err;
      }
      break;
    case 'object':
      if(!(_.isObject(value))) {
        err = new Error("Expected an object for "+ this.name + ": " + attribute);
        err.code = 400;
        throw err;
      }
      break;
    case 'array':
      if(!_.isArray(value)) {
        err = new Error("Expected an array for "+ this.name + ": " + attribute);
        err.code = 400;
        throw err;
      }
      break; 
    default:
      break;
    }
  },

  // converts connection to related model
  setupConnections: function(body) {
    // console.log("===== Setting up connections: " + this.className + " =====")
    var that = this;

    that.relations = that.relations || {};

    _.each(body, function(reqObj, key) {
      var connection = that.connections[key];

      if(!connection) {
        return;
      }

      if(connection.collection) {
        if(!_.isArray(reqObj)) {
          throw new Error("Expected an array for: " + key);
        }

        var collection = new connection.collection();
        
        _.each(reqObj, function(obj) {
          var model = that.prepareConnection(connection, obj);
          collection.add(model);
        });
        // this wipes out the relations but makes it easier to plug in directly to our existing renderer
        that.relations[key] = collection;
      } else {
        var model = that.prepareConnection(connection, reqObj);
        that.relations[key] = model;
      }

    });
  },

  /**
   * Saves connections
   *   beforeSave will save down connections with localKeys
   *   
   */
  saveConnections: function(save_step) {
    // console.log("============== Saving connections for " + this.name + " ================");
    var that = this;

    var deferreds = [];

    _.each(this.relations, function(relation, key) {
      var connection = that.connections[key];

      if(!connection) {
        return;
      }

      if(!connection.save_step) {
        connection.save_step = "afterSave";
      }
      
      if(relation instanceof BaseCollection) {
        var collection = relation;
        collection.each(function(model) {
          // flagged for models we want to process
          if(model.set_by_request) {
            if(save_step === connection.save_step) {
              deferreds.push(that.processConnection(connection, model));
            }
          }
        });
      } else {
        var model = relation;
        if(model.set_by_request) {
          if(save_step === connection.save_step) {
            deferreds.push(that.processConnection(connection, model));
          }
        }
      }
    });

    return when.all(deferreds);
  },

  processConnection: function(connection, model) {
    var that = this;

    if(!this.name) {
      throw new Error("***DEV*** Error: You have left out a name for " + this.className + ".  Best advice is to add it as the singular of the resource");
    }

    // uses localKey first, then foreignKey if present, finally falls back to name on model
    var key = connection.localKey ? connection.localKey : connection.foreignKey ? connection.foreignKey : this.name + "_id";

    var promise;

    that.setupPassthru(connection, model);

    if(connection.localKey) {
      promise = that.saveLocal(connection, key, model);
    } else {
      promise = that.saveForeign(connection, key, model);
    }

    return promise;
  },

  setupPassthru: function(connection, model) {
    var that = this;

    if(connection.passthru) {
      _.each(connection.passthru, function(passthru) {
        if(typeof(that.get(passthru)) !== "undefined") {
          model.set(passthru, that.get(passthru));
        }
      });
    }
  },


  saveLocal: function(connection, key, model) {
    var that = this;

    return model.deferredSave()
    .then(function() {
      that.set(key, model.id);
    });
  },

  saveForeign: function(connection, key, model) {
    model.set(key, this.id);
    return model.deferredSave();
  },


  // deferredSave returns a deferred promise
  deferredSave: function() {
    var deferred = when.defer();
    var that = this;

    var options = {};

    if(that.id) {
      var q = this.query();
          
      var query = q.where("user_id", "=", that.userId())
        .andWhere("env", "=", that.env());
        
      options = { query: q };
    }


    this.save(null, null, options)
    .then(function() {
      that.resetQuery();
      deferred.resolve();
    }, function(err) {
      that.resetQuery();
      deferred.reject(err);
    });

    return deferred.promise;
  },

  prepareConnection: function(connection, obj) {
    var that = this;

    var model = new connection.model();
    // env and userId want to be set before setFromRequest gets called
    model.setEnv(this.env());
    model.setUserId(this.userId());
    // pass req around
    model.req = this.req;
    model.setFromRequest(obj);
    model.validate();
    model.set_by_request = true;
    return model;
  },

  render: function() {
    return new this.renderer({
      model: this
    });
  },

  setId: function(id) {
    return this.set(this.idAttribute, id);
  },

  env: function() {
    return this.get('env');
  },

  setEnv: function(env) {
    return this.set('env', env);
  },

  userId: function() {
    return this.get(this.userIdAttribute);
  },

  setUserId: function(userId) {
    return this.set(this.userIdAttribute, userId);
  },
  
  teamId: function() {
    return this.get(this.teamIdAttribute);
  },

  setTeamId: function(teamId) {
    return this.set(this.teamIdAttribute, teamId);
  },


  // Deprecate
  sanitizeFieldsRegExes: [ /reserved_/ ],
  // Deprecate
  blacklistedFields: [],
  // DEPRECATED, use renderers instead.
  toJSON: function() {
    var attributes = Bookshelf.primary.Model.prototype.toJSON.apply(this, arguments);

    attributes = _.omit(attributes, this.blacklistedFields);

    if(attributes.id) {
      attributes.id = _.base62Encode(attributes.id);
    }

    var that = this;
    
    for(var key in attributes) {
      if(/_id/.test(key) && attributes[key]) {
        attributes[key] = _.base62Encode(attributes[key]);
      }

      _.each(that.sanitizeFieldsRegExes, function(sanitizeFieldsRegEx) {
        if (sanitizeFieldsRegEx.test(key)) {
          delete attributes[key];
        }
      });
    }

    if(!attributes._id) {
      delete attributes._id;
    }

    if(!attributes.admin) {
      delete attributes.admin;
    }

    return attributes;
  }
});
