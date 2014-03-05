/**
 * User Model
 *
 */
var S = require('string');
var bcrypt = require('bcrypt');
var Promise = require('when');

var Model = require("./base");

var Renderer = require('../renderers/user');

var MailChimpAPI = require('mailchimp').MailChimpAPI;
var Mailchimp = new MailChimpAPI(config.mailchimp, { version : '2.0' });

var User = module.exports = Model.extend({
  tableName: "users",
  name: "user",

  renderer: Renderer,

  defaultFields: {
    first_name: "",
    middle_name: "",
    last_name: ""
  },

  allowedFields: [
    "email",
    "first_name",
    "middle_name",
    "last_name",
    "type"
  ],

  dataFields: [],

  fieldTypes: {
    "email": "email",
    "first_name": "string",
    "middle_name": "string",
    "last_name": "string",
    "type": "string"
  },

  blacklistedFields: ["hash", "salt", "secret"],

  requiredFields: ["email"],

  afterCreate: function() {
    var deferred = Promise.defer();

    Mailchimp.call("lists", "subscribe", { "id": "", email: { "email": this.get("email") } }, function(err, data) {
      if(err) {
        return deferred.reject(err);
      }

      return deferred.resolve(data);
    });

    return deferred.promise;
  },

  beforeSave: function() {
    this.set('email', _.sanitizeEmail((this.get('email'))));
    this.hashPassword();
    return Model.prototype.beforeSave.apply(this, arguments);
  },

  // takes current password and created, verifies hash
  verifyPassword: function(password) {
    var hash = bcrypt.hashSync(password + this.get('created').toString(), this.get('salt'));
    return hash === this.get('hash');
  },

  hashPassword: function() {
    if(this.get('password')) {
      this.set("hash", bcrypt.hashSync(this.get('password') + this.get('created').toString(), this.get('salt')));
      this.unset('password');
    }
  },
  resetToken: function() {
    return _.encodeJwt({iss: this.id, exp: new Date().getTime() + 604800000}, config.client_id);
  }
});