var _ = require('lodash');
var Backbone = require('backbone');
var colors = require('colors');
var when = require('when');
var eyes = require('eyes');
var moment = require('moment');
var uuid = require('uuid');
var crypto = require('crypto');
var URLSafeBase64 = require('urlsafe-base64');
var Base62 = require('base62');

/**
 * Mixin following helpers into _
 */
_.extend(_, {
  uuid: uuid.v4,

  inspect: eyes.inspector({
    maxLength: 4096
  }),

  randomToken: function(id) {
    return crypto.createHmac('sha1', id).update(uuid.v4()).digest('hex');
  },

  generateHash: function(obj) {
    return crypto.createHash('md5').update(JSON.stringify(obj)).digest("hex").toString();
  },

  encryptCreditCardNumber: function(number) {
    var key = config.db_crypto_key;
    var cipher = crypto.createCipher('aes-256-cbc', key);
    
    var encryptedNumber = cipher.update(number, 'utf8', 'base64');
    return encryptedNumber + cipher.final('base64');
  },

  decryptCreditCardNumber: function(number) {
    var key = config.db_crypto_key;
    var decipher = crypto.createDecipher('aes-256-cbc', key);
    
    var decryptedNumber = decipher.update(number, 'base64', 'utf8');
    return decryptedNumber + decipher.final('utf8');
  },

  encryptCreditCardResponse: function(number) {
    var response_key = config.response_key;
    var response_cipher = crypto.createCipher('aes-256-cbc', response_key);
    var response_decipher = crypto.createDecipher('aes-256-cbc', config.response_key); // use this key in bloody-mary
    
    var encryptedNumber = response_cipher.update(number, 'utf8', 'base64');
    return encryptedNumber + response_cipher.final('base64');
  },

  base62Encode: function(id) {
    return Base62.encode(id);
  },

  base62Decode: function(id) {
    return Base62.decode(id.toString());
  },

  encodeBase64: function(str) {
    return URLSafeBase64.encode(new Buffer(str, 'utf-8'));
  },

  decodeBase64: function(str) {
    return URLSafeBase64.decode(str).toString('utf-8');
  },

  validateBase64: function(str) {
    return URLSafeBase64.validate(str);
  },

  isValidISO8601String: function(str) {
    // 2013-11-18T09:04:24.447Z
    // YYYY-MM-DDTHH:mm:ss.SSSZ
    return moment(str, 'YYYY-MM-DDTHH:mm:ss.SSSZ', true).isValid();
  },

  fingerprintObject: function(object, algorithm) {
    algorithm = algorithm || 'sha1';
    return crypto.createHash(algorithm).update(JSON.stringify(object)).digest("hex").toString();
  },

  addslashes: function(str) {
    str=str.replace(/\\/g,'\\\\');
    str=str.replace(/\'/g,'\\\'');
    str=str.replace(/\"/g,'\\"');
    str=str.replace(/\0/g,'\\0');
    return str;
  },
  
  /**
   * Default render responder
   */
  render: function(req, res, code, template, context) {
    context = context || {};
    res.status(code).render(template, context);
  },

  /**
   * Redirect to login page and set redirect
   */
  redirectLogin: function(req, res, redirect) {
    if (redirect) {
      req.session.redirect = redirect;
    }
    return res.redirect('/');
  },

  // Determines if request is coming from a json call
  isJSON: function(req, res) {
    return !!/application\/json/.test(req.header( 'Content-Type' ));
  },

  isEmailValid: function(email) {
    var email = email.trim();
    return (email.length > 0 && email.match(/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i));
  },
  
  sanitizeEmail: function(email) {
    return email.trim().toLowerCase();
  }

});
