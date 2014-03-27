var _ = require('lodash');
var Backbone = require('backbone');

var winston = require('winston');
var env = process.env['NODE_ENV'] || 'development';

// Adds some cool shit into global
global._ = _;
global.Backbone = Backbone;
global.config = require('../config');
global.Bookshelf = require('./bookshelf');

/**
 * Winston Logger
 * Creates a new logger, assigns custom log levels and transports
 *
 * Default transport: Console
 * Remote transport: Loggly
 * Remote transport: MongoDB
 */
var logger = new winston.Logger({
  levels: {
    http: 0,
    verbose: 1,
    info: 2,
    data: 3,
    warn: 4,
    debug: 5,
    error: 6
  }
});

// Add colors
winston.addColors({
  http: 'magenta',
  verbose: 'cyan',
  info: 'green',
  data: 'grey',
  warn: 'yellow',
  debug: 'blue',
  error: 'red'
});

// Add transports
if (env === 'test') {
  logger.add(winston.transports.Console, {
    level: 'warn',
    colorize: true,
    timestamp: true
  });
} else if (env === 'production' || env === 'staging') {
  logger.add(winston.transports.Console, {
    level: 'info',
    colorize: true,
    timestamp: false
  });
} else {
  logger.add(winston.transports.Console, {
    level: 'http',
    colorize: true,
    timestamp: true
  });
}

// Mixin logger to _
logger.extend(_);
