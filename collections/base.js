var Bookshelf = require("bookshelf");
var _ = require('lodash');

var Model = require('../models/base');

BaseCollection = module.exports = Bookshelf.primary.Collection.extend({
  model: Model
});