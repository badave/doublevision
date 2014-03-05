var _ = require('lodash');
var when = require('when');
var Backbone = require('backbone');

var BaseCollection = require('../collections/base');


BaseView = module.exports = Backbone.Model.extend({
  className: "BaseView",
  
  initialize: function(object) {
    this.model = object.model;
  },
  
  id: function(id) {
    return id ? _.base62Encode(id): id;
  },
  
  viewId: function() {
    return '/'+this.model.tableName+'/'+_.base62Encode(this.model.id);
  },
  
  getValue: function(key) {
    return this.model.get(key);
  },
  
  unexpandedContent: function() {
    var result = {};
    result['id'] = this.viewId();
    return result;
  },

  common: function() {
    var obj = {};

    obj.id = this.id(this.model.id);

    if(this.model.get("created_at")) {
      obj.created_at = this.model.get("created_at");
    }

    if(this.model.get('user_id')) {
      obj.user_id = _.base62Encode(this.model.get("user_id"));
    }

    if(this.model.get('updated_at')) {
      obj.updated_at = this.model.get("updated_at");
    }

    if(this.model.get('metadata')) {
      obj.metadata = this.model.get('metadata');
    }

    if(this.model.get('data')) {
      _.each(this.model.get('data'), function(value, key) {
        obj[key] = value;
      });
    }

    return obj;
  },

  connections: [],

  /**
   * Connections are an array of objects with keys and renderers.
   *
   * Keys are going to be the root for the object
   * You can pass in a relation for specifying the related field.  
   * In this example, the relation is the same as the key, so it doesn't
   * have to be specified.
   * 
   * @type {Object}
   connections: { 
     customer: CustomerRenderer,
     billing_address: AddressRenderer,
     shipping_address: AddressRenderer,
     line_items: LineItemRenderer
   }
   */
  _connections: function() {
    var obj = {};

    var that = this;
    _.each(this.model.relations, function(relation, key) {
      var renderer = that.connections[key];
      if(relation instanceof BaseCollection) {
        obj[key] = obj[key] || [];

        relation.each(function(model) {
          var attrs = model.attributes;

          if(!_.isEmpty(attrs)) {
            obj[key].push(new renderer({
              model: model
            }).content());
          }
        });
      } else if(relation.relatedData) {
        var relatedType = relation.relatedData.type;
        
        obj[key] = obj[key] || [];
        switch(relatedType) {
          case 'hasMany':
            if(!_.isEmpty(relation.models)) {
              _.forEach(relation.models, function(model) {
                var attrs = model.attributes;
  
                if(!_.isEmpty(attrs)) {
                  obj[key].push(new renderer({
                    model: model
                  }).content());
                }
              });
            }
            break;
          case 'belongsTo':
          default:
            if(!_.isEmpty(relation.attributes)) {
              obj[key] = new renderer({
                model: relation
              }).content();
            }
            break;
        }
      } else {
        obj[key] = obj[key] || [];
        if(!_.isEmpty(relation.attributes)) {
          obj[key] = new renderer({
            model: relation
          }).content();
        }
      }
    });

    return obj;
  },

  schema: function() {
    return {};
  },
  
  content: function() {
    return _.extend({}, this.common(), this.schema(), this._connections());
  }
});