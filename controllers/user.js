
var moment = require('moment');

var CrudController = require('./crud');

var User = require('../models/user');
var UserCollection = require('../collections/user');

UsersController = module.exports = CrudController.extend({
  className: "UsersController",
  resources: "users",
  resource: "user",
  model: User,
  collection: UserCollection,
  version: "v1",

  setupRoutes: function() {
    // UsersController.__super__.setupRoutes.call(this);
    var base = _.result(this, "basePath");

    this.routes.get[base] = {
      action: this.find,
      middleware: [this.requireAdmin.bind(this)]
    };

    this.routes.post[base] = {
      action: this.create,
      middleware: [this.requireJSON.bind(this)]
    };

    // Register/Login
    this.routes.post[base + "/authenticate"] = {
      action: this.login
    };

    this.routes.post[base + "/check_password"] = {
      action: this.checkPassword,
      middleware: [this.requireUser.bind(this)]
    };

    this.routes.post[base + "/forgot_password"] = {
      action: this.forgotPassword
    };

    this.routes.post[base + "/set_password"] = {
      action: this.setPassword
    };

    // more or less public
    this.routes.get[base + "/:id"] = {
      action: this.findOne,
      middleware: [this.authenticateUser.bind(this)]
    };

  },

  setupModel: function(req, res, next) {
    var model = new this.model();

    if (req.params.id) {
      model.setId(req.params.id);
    }

    if(req.user && req.params.id === "me") {
      // TODO Make UserModel
      model.setId(req.user._id);
    }

    return model;
  },

  findOne: function(req, res, next) {
    var model = this.setupModel(req);
    
    model.fetch({ require: true })
    .bind(this)
    .then(function() {

      // TODO Make UserModel
      if(!req.user || model.id !== req.user._id) {
        model.renderer = UserLimitedRenderer;
      }

      return this.prepareResponse(model, req, res, next); 
    })
    .otherwise(this.errorHandler(req, res, next));
  },

  login: function(req, res, next) {
    var err;

    req.body.user = req.body.user || {};

    var email = req.body.user.email || "";
    var password = req.body.user.password;

    var user = new User({
      email: email.toLowerCase()
    });
    
    user.fetch({require: true})
      .bind(this)
      .then(function() {
        if (!user.verifyPassword(password)) {
          err = new Error("Invalid Password");
          err.code = 401;
          return next(err);
        }
        return this.prepareResponse(user, req, res, next);
      })
      .otherwise( function(err) {
        if (user.isNew) {
          err = new Error("Email Not Found");
          err.code = 404;
        }
        return next(err);
      });
  },

  create: function(req, res, next) {
    var body = req.body;
    var user = new User();

    user.setFromRequest(body);
    
    // tries to save user.  if email is invalid, DB throws unique error.  gets parsed by errorHandler, correct error shown
    user.save()
    .tap(function() {
      // evt.emit("user_created", { "data": user.attributes });
    })
    .then(function(user) {
      var userCollection = new UserCollection();

      var query = userCollection.query();

      return query.groupBy("type")
        .where("type", "=", user.get("type"))
        .count("type")
        .then(function(results) {
          console.log(results);

          user.set("data", {
            "waitlist_number": results[0].count 
          });

          return user.save();
        });
    })
    .then(this.successHandler(req, res, next))
    .otherwise(this.errorHandler(req, res, next));
  },

  update: function(req, res, next) {
    var model = this.setupModel(req);

    model.fetch({ require: true })
      .then(function() {
        if(model.id !== req.user_model.id) {
          var err = new Error("Cannot update another person's account");
          err.code = 403;
          throw err;
        }

        model.setFromRequest(req.body);
        // Save BaseModel
        return model.save();
      })
      .then(this.successHandler(req, res, next))
      .otherwise(this.errorHandler(req, res, next));
  },

  checkPassword: function(req, res, next) {
    var password = req.body.password || '';

    if(req.user_model.get('hash') && !req.user_model.verifyPassword(password)) {
      err = new Error("Invalid Password");
      err.code = 401;
      return next(err);
    }

    return _.respondJson(req, res, 200, { "reset_token": req.user_model.resetToken() });
 },

  forgotPassword: function(req, res, next) {
    var email = req.body.email;

    if (!email || email === '') {
      return _.respondJsonError(req, res, 400, "No email specified");
    }

    // Trim and lowercase
    if (!_.isEmailValid(email)) {
      return _.respondJsonError(req, res, 400, "Invalid Email");
    }

    user = new User({
      "email": email
    });

    return user.fetch({ require: true})
      .then(function() {
        // TODO Make UserModel
        evt.emit("user_reset", {"data": user });
        return _.respondJson(req, res, 200, {"reset": "ok"});
      })
      .otherwise(function(err) {
        if (!user.get('created')) {
          err = new Error("Email Not Found");
          err.code = 404;
        }
        return next(err);
      });
  },

  setPassword: function(req, res, next) {
    var reset_token = req.body.reset_token;
    var password = req.body.password;

    if (!reset_token) {
      return _.respondJsonError(req, res, 400, "No reset token");
    }

    var payload = _.decodeJwt(reset_token, config.client_id);
    if (!payload || !payload.iss || payload.exp < Date.now()) {
      return _.respondJsonError(req, res, 400, "Invalid or expired reset token");
    }

    var user = new User();
    user.setId(payload.iss);

    return user.fetch({ require: true })
      .bind(this)
      .then(function() {
        user.set('password', password);
        return user.save();
      })
      .then(function() {
        // Subscribe email to newsletter
        if (config.env === 'production') {
          // TODO Make UserModel
          evt.emit('newsletter_subscribe', { 'data': user.attributes });
        }
        return user;
      })
      .then(this.successHandler(req, res, next))
      .otherwise(this.errorHandler(req, res, next));
  }
});