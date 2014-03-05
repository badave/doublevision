// API Documentation:
var config = module.exports = {};

// Get ENV
config.env = process.env.NODE_ENV || 'development';

config.debug = false;

// Metadata
config.title = "referral";

config.authorization_token_test = "6ce4de11ff52d57ad85994be47e8f17247fd665f";
config.authorization_token_live = "94bfbf4c8ca84d21c64644bbf7089fcaf94c2f93";

// Support email
config.support_email = "support@airbriteinc.com";

config.mailchimp = "2a20eec2a8fb3d1b62538b0896d0e2e6-us6";

/**
 * IMPORTANT NOTE ON CONNECTING TO RDS POSTGRES
 * Make sure IP is whitelisted in the RDS Security Group (i.e. CIDR/IP: 23.125.128.23/32)
 */

// Environments
if (config.env === 'production') {
  config.pg = {
    url       : "postgres://xyndrvrnzbwbgz:za8SXgErVvZrKxDSAuo-lbwWxk@ec2-54-225-102-235.compute-1.amazonaws.com:5432/d3d8n339jm7m0d",
    host      : "ec2-54-225-102-235.compute-1.amazonaws.com",
    port      : 5432,
    user      : "xyndrvrnzbwbgz",
    password  : "za8SXgErVvZrKxDSAuo-lbwWxk",
    database  : "d3d8n339jm7m0d",
    ssl       : true
  };
  config.test = false;
} else {
  config.pg = {
    url       : "postgres://xyndrvrnzbwbgz:za8SXgErVvZrKxDSAuo-lbwWxk@ec2-54-225-102-235.compute-1.amazonaws.com:5432/d3d8n339jm7m0d",
    host      : "ec2-54-225-102-235.compute-1.amazonaws.com",
    port      : 5432,
    user      : "xyndrvrnzbwbgz",
    password  : "za8SXgErVvZrKxDSAuo-lbwWxk",
    database  : "d3d8n339jm7m0d",
    ssl       : true
  };

  config.test = true;
  config.debug = true;
}

// Mailgun
config.mailgun_key = "key-6mvzuli0wcp5n76qdjb-s7qyhh8d1oo1";
config.mailgun_url = "https://api:" + config.mailgun_key + "@api.mailgun.net/v2";

config.manifest = {};

config.cdn_url = "";