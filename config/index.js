// API Documentation:
var config = module.exports = {};

// Get ENV
config.env = process.env.NODE_ENV || 'development';

config.debug = false;

// Metadata
config.title = "";

config.authorization_token_test = "";
config.authorization_token_live = "";

// Support email
config.support_email = "";

config.mailchimp = "-us6";

/**
 * IMPORTANT NOTE ON CONNECTING TO RDS POSTGRES
 * Make sure IP is whitelisted in the RDS Security Group (i.e. CIDR/IP: 23.125.128.23/32)
 */



// Environments
if (config.env === 'production') {
	config.pg = {
    url       : "postgres://zyvfwuqasnaens:R30IMI1a2ufW3OtSpaE2t9IRNR@ec2-54-204-2-217.compute-1.amazonaws.com:5432/d67ndsn51s6kt3",
    host      : "ec2-54-204-2-217.compute-1.amazonaws.com",
    port      : 5432,
    user      : "zyvfwuqasnaens",
    password  : "R30IMI1a2ufW3OtSpaE2t9IRNR",
    database  : "d67ndsn51s6kt3",
    ssl       : true
  };
   config.test = false;
} else {
  config.test = true;
  config.debug = true;
  config.pg = {
    url       : "postgres://zyvfwuqasnaens:R30IMI1a2ufW3OtSpaE2t9IRNR@ec2-54-204-2-217.compute-1.amazonaws.com:5432/d67ndsn51s6kt3",
    host      : "ec2-54-204-2-217.compute-1.amazonaws.com",
    port      : 5432,
    user      : "zyvfwuqasnaens",
    password  : "R30IMI1a2ufW3OtSpaE2t9IRNR",
    database  : "d67ndsn51s6kt3",
    ssl       : true
  };
}

// Mailgun
config.mailgun_key = "";
config.mailgun_url = "https://api:" + config.mailgun_key + "@api.mailgun.net/v2";

config.manifest = {};

config.cdn_url = "";