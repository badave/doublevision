var Bookshelf = require("bookshelf");
var _ = require('lodash');

var Model = require('../models/base');

var Backbone = require('backbone');

BaseCollection = module.exports = Backbone.Collection.extend({
  model: Model
});