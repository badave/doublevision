var pg = require('pg');
var Bookshelf = require('bookshelf');

var config = require("../config");

Bookshelf.primary = Bookshelf.initialize({
  client      : 'pg',
  connection  : config.pg,
  debug       : config.debug
});

global.Bookshelf = Bookshelf;

module.exports = Bookshelf;