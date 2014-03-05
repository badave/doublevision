var _ = require('lodash');

var BaseCollection = require('../collections/base');
var User = require('../models/user');

var UserCollection =  module.exports = BaseCollection.extend({
  className: "UserCollection",
  model: User
});