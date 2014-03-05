var hbs = require('hbs');
var fs = require('fs');
var _ = require('lodash');
var S = require('string');
var moment = require('moment');
var accounting = require('accounting');
var path = require("path");

var config = require('../config');

var partialsDir = __dirname + '/../views/partials';

var walk = function(dir, done) {
  var results = [];
  fs.readdir(dir, function(err, list) {
    if (err) return done(err);
    var i = 0;
    (function next() {
      var file = list[i++];
      if (!file) return done(null, results);
      file = dir + '/' + file;
      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          walk(file, function(err, res) {
            results = results.concat(res);
            next();
          });
        } else {
          results.push(file);
          next();
        }
      });
    })();
  });
};

// This loads partials into handlebars
walk(partialsDir, function(err, results) {
  if(results) {
    results.forEach(function(filename) {
      var matches = /\/partials\/([^.]+).handlebars$/.exec(filename);
      if (!matches) {
        return;
      }
      var name = matches[1];
      var template = fs.readFileSync(filename, 'utf8');
      hbs.registerPartial(name, template);
    });
  }
});


/**
 * backboneLoader
 * peter's peter is the greatest peter
 */
var backboneDir = __dirname + "/../backbone";
var backboneFiles = [];

// This creates a list of javascript files in the public/js/app directory
walk(backboneDir, function(err, results) {
  if(results) {
    results.forEach(function(filename) {
      var matches = /.js$/.exec(filename);
      if (!matches) {
        return;
      }
      var name = matches[1];
      var rel = "/" + path.relative(path.dirname(__dirname), filename).replace("public", '').replace("backbone/", "js/app/");

      // These are all javascript paths inside of the backbone directory
      backboneFiles.push(rel);
    });
  }
});

hbs.registerHelper('equal', function(lvalue, rvalue, options) {
  if(lvalue === rvalue) {
    return options.fn(this);
  }

  return options.inverse(this);
});

hbs.registerHelper('times', function(start, n, options) {
  var accum = '';
  for(var i = start; i < n+1; ++i)
    accum += options.fn(i);
  return accum;
});

hbs.registerHelper('or', function(lvalue, rvalue, options) {
  // Check for existance as well as length if its an empty array/object
  if ((lvalue && _.size(lvalue) > 0) || (rvalue && _.size(rvalue) > 0)) {
    return options.fn(this);
  } else {
    return options.inverse(this);
  }
});

hbs.registerHelper('and', function(lvalue, rvalue, options) {
  // Check for existance as well as length if its an empty array/object
  if ((lvalue && _.size(lvalue) > 0) && (rvalue && _.size(rvalue) > 0)) {
    return options.fn(this);
  } else {
    return options.inverse(this);
  }
});

hbs.registerHelper('multiply', function(lvalue, rvalue) {
  var lnum = parseFloat(lvalue);
  var rnum = parseFloat(rvalue);
  return lnum * rnum;
});

// Compare operators
hbs.registerHelper('compare', function(lvalue, operator, rvalue, options) {
  var operators, result;

  if (arguments.length < 3) {
    throw new Error("Handlerbars Helper 'compare' needs 2 parameters");
  }

  if (options === undefined) {
    options = rvalue;
    rvalue = operator;
    operator = "===";
  }

  operators = {
    '==': function (l, r) { return l == r; },
    '===': function (l, r) { return l === r; },
    '!=': function (l, r) { return l != r; },
    '!==': function (l, r) { return l !== r; },
    '<': function (l, r) { return l < r; },
    '>': function (l, r) { return l > r; },
    '<=': function (l, r) { return l <= r; },
    '>=': function (l, r) { return l >= r; },
    'typeof': function (l, r) { return typeof l == r; },
    'is_in': function(l, r) { return r.indexOf(l) >= 0; }
  };

  if (!operators[operator]) {
    throw new Error("Handlerbars Helper 'compare' doesn't know the operator " + operator);
  }

  result = operators[operator](lvalue, rvalue);

  if (result) {
    return options.fn(this);
  } else {
    return options.inverse(this);
  }
});

// Formats currency ($X.XX)
hbs.registerHelper('formatCurrency', function(value, currency, options) {
  var amountInCents = value;
  var symbol = '';

  var currencies = {
    usd: '$',
    cad: 'C$',
    gbp: '£',
    eur: '€'
  };

  if (currency) {
    symbol = currencies[currency] || '';
  }

  var requestOptions = {
    symbol: symbol,
    decimal: '.',
    thousand: ',',
    precision: 2,
    format: {
      pos: '%s%v',
      neg: '-%s%v',
      zero: '%s%v'
    }
  };

  return accounting.formatMoney(amountInCents / 100, requestOptions);
});

// Format date
hbs.registerHelper('formatDate', function(value, options) {
  var ms = value;

  // return ms.toISOString().replace(/T.+/, ' ');
  return moment(ms).format('YYYY-MM-DD');
});

hbs.registerHelper('formatDateAndTime', function(value, options) {
  var ms = value;

  // return ms.toISOString().replace(/T/, ' ').replace(/\..+/, '');
  return moment(ms).format('YYYY-MM-DD HH:mm:ss');
});

hbs.registerHelper('formatGmailTime', function(value, options) {
  var ms = value;
  var now = moment();

  if (moment(now).format('MM/DD/YYYY') === moment(ms).format('MM/DD/YYYY')) {
    return moment(ms).format('h:mm a');
  }

  return moment(ms).format('MMM D');
});

hbs.registerHelper('formatGmailTimeTooltip', function(value, options) {
  var ms = value;

  return moment(ms).format('ddd, MMM D, YYYY [at] h:mm A');
});

hbs.registerHelper('formatTime', function(value, options) {
  var ms = value;
  return moment(ms).format('h:mm:ss a');
});

hbs.registerHelper('count', function(value, options) {
  var array = value;
  return array.length || 0;
});

hbs.registerHelper('truncate', function(value, length, options) {
  var str = value;
  return S(str).truncate(length).s;
});

hbs.registerHelper('uriencode', function(value, options) {
  var str = value;
  return encodeURIComponent(str);
});

// Returns first object
hbs.registerHelper('firstObject', function(value, key) {
  var obj = value[0];
  var ret = key ? obj[key] : obj;
  return ret;
});

// Format country
hbs.registerHelper('formatCountry', function(value, options) {
  var code = value;

  return getCountry(code);
});

// Format address
hbs.registerHelper('formatAddress', function(value, options) {
  return value.street + "<br/>" + value.city + ", " + value.state + " " + value.zip + "<br/>" + getCountry(value.country);
});

hbs.registerHelper('truncate', function(value, length, options) {
  return S(value).truncate(length).s;
});

hbs.registerHelper("jsonify", function(value, options) {
  return new hbs.SafeString(_.addslashes(JSON.stringify(value)));
});

// hbs.registerHelper('chain', firstHelper, secondHelper,) {

// });

// These serve as a layout for files and auto cdning files
var time_for_cdn = new Date().getTime();
hbs.registerHelper("js", function(value, options) {
  var script = '';
  if(config.localhost && value !== 'application' && value !== "app") {
    script = '<script src="/js/' + value + '.js" type="text/javascript"></script>';
  } else if(config.localhost && value === "app") {
    // Load local app files
    backboneFiles.forEach(function(file) {
      script += '<script src="' + file + '" type="text/javascript"></script>';
    });
  } else {
    // Always load from cdn
    if(config.manifest[value + ".js"]) {
      script = '<script src="' + config.cdn_assets_url + "/" + config.manifest[value + ".js"] + '" type="text/javascript"></script>';
    } else {
      script = '<script src="/js/' + value + '.js?v=' + time_for_cdn + '"  type="text/javascript"></script>';
    }
  }

  return new hbs.SafeString(script);
});

hbs.registerHelper("css", function(value, options) {
  var script;
  if(config.localhost && value !== 'application') {
    script = '<link href="/css/' + value + '.css" type="text/css" rel="stylesheet">';
  } else {
    if(config.manifest[value + ".css"]) {
      script = '<link rel="stylesheet" href="' + config.cdn_assets_url + "/" + config.manifest[value + ".css"] + '" type="text/css">';
    } else {
      script = '<link rel="stylesheet" href="' + config.cdn_url + "/css/" + value + '.css?v=' + time_for_cdn + '"  type="text/css">';
    }
  }

  return new hbs.SafeString(script);
});


// Returns full country name
function getCountry(code) {
  switch(code.toUpperCase()) {
    case 'AF': return 'Afghanistan';
    case 'AX': return 'Aland Islands';
    case 'AL': return 'Albania';
    case 'DZ': return 'Algeria';
    case 'AS': return 'American Samoa';
    case 'AD': return 'Andorra';
    case 'AO': return 'Angola';
    case 'AI': return 'Anguilla';
    case 'AQ': return 'Antarctica';
    case 'AG': return 'Antigua and Barbuda';
    case 'AR': return 'Argentina';
    case 'AM': return 'Armenia';
    case 'AW': return 'Aruba';
    case 'AU': return 'Australia';
    case 'AT': return 'Austria';
    case 'AZ': return 'Azerbaijan';
    case 'BS': return 'Bahamas, The';
    case 'BH': return 'Bahrain';
    case 'BD': return 'Bangladesh';
    case 'BB': return 'Barbados';
    case 'BY': return 'Belarus';
    case 'BE': return 'Belgium';
    case 'BZ': return 'Belize';
    case 'BJ': return 'Benin';
    case 'BM': return 'Bermuda';
    case 'BT': return 'Bhutan';
    case 'BO': return 'Bolivia';
    case 'BQ': return 'Bonaire, Saint Eustatius and Saba';
    case 'BA': return 'Bosnia and Herzegovina';
    case 'BW': return 'Botswana';
    case 'BV': return 'Bouvet Island';
    case 'BR': return 'Brazil';
    case 'IO': return 'British Indian Ocean Territory';
    case 'BN': return 'Brunei Darussalam';
    case 'BG': return 'Bulgaria';
    case 'BF': return 'Burkina Faso';
    case 'BI': return 'Burundi';
    case 'KH': return 'Cambodia';
    case 'CM': return 'Cameroon';
    case 'CA': return 'Canada';
    case 'CV': return 'Cape Verde';
    case 'KY': return 'Cayman Islands';
    case 'CF': return 'Central African Republic';
    case 'TD': return 'Chad';
    case 'CL': return 'Chile';
    case 'CN': return 'China';
    case 'CX': return 'Christmas Island';
    case 'CC': return 'Cocos (Keeling) Islands';
    case 'CO': return 'Colombia';
    case 'KM': return 'Comoros';
    case 'CG': return 'Congo';
    case 'CD': return 'Congo, The Democratic Republic of the';
    case 'CK': return 'Cook Islands';
    case 'CR': return 'Costa Rica';
    case 'CI': return 'Cote D\'ivoire';
    case 'HR': return 'Croatia';
    case 'CW': return 'Curaçao';
    case 'CY': return 'Cyprus';
    case 'CZ': return 'Czech Republic';
    case 'DK': return 'Denmark';
    case 'DJ': return 'Djibouti';
    case 'DM': return 'Dominica';
    case 'DO': return 'Dominican Republic';
    case 'EC': return 'Ecuador';
    case 'EG': return 'Egypt';
    case 'SV': return 'El Salvador';
    case 'GQ': return 'Equatorial Guinea';
    case 'ER': return 'Eritrea';
    case 'EE': return 'Estonia';
    case 'ET': return 'Ethiopia';
    case 'FK': return 'Falkland Islands (Malvinas)';
    case 'FO': return 'Faroe Islands';
    case 'FJ': return 'Fiji';
    case 'FI': return 'Finland';
    case 'FR': return 'France';
    case 'GF': return 'French Guiana';
    case 'PF': return 'French Polynesia';
    case 'TF': return 'French Southern Territories';
    case 'GA': return 'Gabon';
    case 'GM': return 'Gambia, The';
    case 'GE': return 'Georgia';
    case 'DE': return 'Germany';
    case 'GH': return 'Ghana';
    case 'GI': return 'Gibraltar';
    case 'GR': return 'Greece';
    case 'GL': return 'Greenland';
    case 'GD': return 'Grenada';
    case 'GP': return 'Guadeloupe';
    case 'GU': return 'Guam';
    case 'GT': return 'Guatemala';
    case 'GG': return 'Guernsey';
    case 'GN': return 'Guinea';
    case 'GW': return 'Guinea-Bissau';
    case 'GY': return 'Guyana';
    case 'HT': return 'Haiti';
    case 'HM': return 'Heard Island and the McDonald Islands';
    case 'VA': return 'Holy See';
    case 'HN': return 'Honduras';
    case 'HK': return 'Hong Kong';
    case 'HU': return 'Hungary';
    case 'IS': return 'Iceland';
    case 'IN': return 'India';
    case 'ID': return 'Indonesia';
    case 'IQ': return 'Iraq';
    case 'IE': return 'Ireland';
    case 'IM': return 'Isle of Man';
    case 'IL': return 'Israel';
    case 'IT': return 'Italy';
    case 'JM': return 'Jamaica';
    case 'JP': return 'Japan';
    case 'JE': return 'Jersey';
    case 'JO': return 'Jordan';
    case 'KZ': return 'Kazakhstan';
    case 'KE': return 'Kenya';
    case 'KI': return 'Kiribati';
    case 'KR': return 'Korea, Republic of';
    case 'KW': return 'Kuwait';
    case 'KG': return 'Kyrgyzstan';
    case 'LA': return 'Lao People\'s Democratic Republic';
    case 'LV': return 'Latvia';
    case 'LB': return 'Lebanon';
    case 'LS': return 'Lesotho';
    case 'LR': return 'Liberia';
    case 'LY': return 'Libya';
    case 'LI': return 'Liechtenstein';
    case 'LT': return 'Lithuania';
    case 'LU': return 'Luxembourg';
    case 'MO': return 'Macao';
    case 'MK': return 'Macedonia, The Former Yugoslav Republic of';
    case 'MG': return 'Madagascar';
    case 'MW': return 'Malawi';
    case 'MY': return 'Malaysia';
    case 'MV': return 'Maldives';
    case 'ML': return 'Mali';
    case 'MT': return 'Malta';
    case 'MH': return 'Marshall Islands';
    case 'MQ': return 'Martinique';
    case 'MR': return 'Mauritania';
    case 'MU': return 'Mauritius';
    case 'YT': return 'Mayotte';
    case 'MX': return 'Mexico';
    case 'FM': return 'Micronesia, Federated States of';
    case 'MD': return 'Moldova, Republic of';
    case 'MC': return 'Monaco';
    case 'MN': return 'Mongolia';
    case 'ME': return 'Montenegro';
    case 'MS': return 'Montserrat';
    case 'MA': return 'Morocco';
    case 'MZ': return 'Mozambique';
    case 'MM': return 'Myanmar';
    case 'NA': return 'Namibia';
    case 'NR': return 'Nauru';
    case 'NP': return 'Nepal';
    case 'NL': return 'Netherlands';
    case 'AN': return 'Netherlands Antilles';
    case 'NC': return 'New Caledonia';
    case 'NZ': return 'New Zealand';
    case 'NI': return 'Nicaragua';
    case 'NE': return 'Niger';
    case 'NG': return 'Nigeria';
    case 'NU': return 'Niue';
    case 'NF': return 'Norfolk Island';
    case 'MP': return 'Northern Mariana Islands';
    case 'NO': return 'Norway';
    case 'OM': return 'Oman';
    case 'PK': return 'Pakistan';
    case 'PW': return 'Palau';
    case 'PS': return 'Palestinian Territories';
    case 'PA': return 'Panama';
    case 'PG': return 'Papua New Guinea';
    case 'PY': return 'Paraguay';
    case 'PE': return 'Peru';
    case 'PH': return 'Philippines';
    case 'PN': return 'Pitcairn';
    case 'PL': return 'Poland';
    case 'PT': return 'Portugal';
    case 'PR': return 'Puerto Rico';
    case 'QA': return 'Qatar';
    case 'RE': return 'Reunion';
    case 'RO': return 'Romania';
    case 'RU': return 'Russian Federation';
    case 'RW': return 'Rwanda';
    case 'BL': return 'Saint Barthelemy';
    case 'SH': return 'Saint Helena, Ascension and Tristan da Cunha';
    case 'KN': return 'Saint Kitts and Nevis';
    case 'LC': return 'Saint Lucia';
    case 'MF': return 'Saint Martin';
    case 'PM': return 'Saint Pierre and Miquelon';
    case 'VC': return 'Saint Vincent and the Grenadines';
    case 'WS': return 'Samoa';
    case 'SM': return 'San Marino';
    case 'ST': return 'Sao Tome and Principe';
    case 'SA': return 'Saudi Arabia';
    case 'SN': return 'Senegal';
    case 'RS': return 'Serbia';
    case 'SC': return 'Seychelles';
    case 'SL': return 'Sierra Leone';
    case 'SG': return 'Singapore';
    case 'SX': return 'Sint Maarten';
    case 'SK': return 'Slovakia';
    case 'SI': return 'Slovenia';
    case 'SB': return 'Solomon Islands';
    case 'SO': return 'Somalia';
    case 'ZA': return 'South Africa';
    case 'GS': return 'South Georgia and the South Sandwich Islands';
    case 'ES': return 'Spain';
    case 'LK': return 'Sri Lanka';
    case 'SR': return 'Suriname';
    case 'SJ': return 'Svalbard and Jan Mayen';
    case 'SZ': return 'Swaziland';
    case 'SE': return 'Sweden';
    case 'CH': return 'Switzerland';
    case 'TW': return 'Taiwan';
    case 'TJ': return 'Tajikistan';
    case 'TZ': return 'Tanzania, United Republic of';
    case 'TH': return 'Thailand';
    case 'TL': return 'Timor-leste';
    case 'TG': return 'Togo';
    case 'TK': return 'Tokelau';
    case 'TO': return 'Tonga';
    case 'TT': return 'Trinidad and Tobago';
    case 'TN': return 'Tunisia';
    case 'TR': return 'Turkey';
    case 'TM': return 'Turkmenistan';
    case 'TC': return 'Turks and Caicos Islands';
    case 'TV': return 'Tuvalu';
    case 'UG': return 'Uganda';
    case 'UA': return 'Ukraine';
    case 'AE': return 'United Arab Emirates';
    case 'GB': return 'United Kingdom';
    case 'US': return 'United States';
    case 'UM': return 'United States Minor Outlying Islands';
    case 'UY': return 'Uruguay';
    case 'UZ': return 'Uzbekistan';
    case 'VU': return 'Vanuatu';
    case 'VE': return 'Venezuela';
    case 'VN': return 'Vietnam';
    case 'VG': return 'Virgin Islands, British';
    case 'VI': return 'Virgin Islands, U.S.';
    case 'WF': return 'Wallis and Futuna';
    case 'EH': return 'Western Sahara';
    case 'YE': return 'Yemen';
    case 'ZM': return 'Zambia';
    case 'ZW': return 'Zimbabwe';
    default: return 'Unknown';
  }
}
