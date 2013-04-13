var levelup = require("levelup"),
    path = require("path"),
    crypto = require("crypto"),
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
    var stream = this._db.createReadStream();
    this._webhooks = {};
    stream.on("data", function(data){
      self._webhooks[data.key] = data.value;
    });
    stream.on("error", function(err){
      cb(err);
    });
    stream.on("end", function(){
      cb(null, self._webhooks);
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
      if (~Object.keys(self._webhooks).indexOf(lowercaseUrl)) {
        cb(null);
        return;
      }
      self._webhooks[lowercaseUrl] = crypto.randomBytes(20).toString("hex");
      self._db.put(lowercaseUrl, self._webhooks[lowercaseUrl], function(err){
        if (err) {
          self._webhooks = null;
        }
        cb(err, self._webhooks[lowercaseUrl]);
      });
    });
  }

};