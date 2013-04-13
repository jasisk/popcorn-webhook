var levelup = require("levelup"),
    path = require("path"),
    key = "webhooks";

exports = module.exports = function(dbPath, cb){
  if (typeof dbPath === 'function') {
    cb = dbPath;
    dbPath = null;
  }
  return new Webhooks(dbPath, cb);
};

function Webhooks(dbPath, cb){
  var self = this;
  dbPath = dbPath || path.resolve(__dirname + "/../webhooks.db");
  if (cb) {
    levelup(dbPath, null, function(err, db){
      if (!err) {
        self._db = db;
      }
      cb(err, db);
    });
  } else {
    this._db = levelup(dbPath);
  }
}

Webhooks.prototype = {

  constructor: Webhooks,
  _webhooks: null,

  get: function(cb){
    var self = this;
    if (this._webhooks) {
      cb(null, this._webhooks);
      return;
    }
    this._db.get(key, function(err, val){
      if (err && err.name !== "NotFoundError") {
        cb(err);
        return;
      } else {
        if (err) {
          val = "[]";
        }
        val = JSON.parse(val);
        self._webhooks = val;
        cb(null, val);
        return;
      }
    });
  },

  add: function(url, cb){
    var lowercaseUrl = url.toLowerCase();
    var self = this;

    this.get(function(err, val){
      if (err) {
        cb(err);
        return;
      }
      if (~val.indexOf(lowercaseUrl)) {
        cb(null);
        return;
      }
      val.push(lowercaseUrl);
      var value = JSON.stringify(val);
      self._db.put(key, value, function(err){
        if (err) {
          self._webhooks = null;
        } else {
          self._webhooks = val;
        }
        cb(err);
      });
    });
  }

};