var levelup = require("levelup"),
    path = require("path"),
    crypto = require("crypto"),
    key = "webhooks",
    stream = require("stream");

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

  getToken: function(url, cb){
    var lowercaseUrl = url.toLowerCase();
    this.list(function(err, list){
      if (err) {
        cb(err);
        return;
      }
      var urlObject;
      if (urlObject = list[lowercaseUrl]) {
        cb(null, urlObject);
      } else {
        cb(new Error("No token found for given url"));
      }
    });
  },

  list: function(cb){
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

  signedList: function(cb){
    this.list(function(err, list){
      if (err) cb(err);
      var signed = [];
      Object.keys(list).forEach(function(v, i, a){
        signed.push(exports.sign(v, list[v]));
      });
      cb(null, signed);
    });
  },

  add: function(url, cb){
    var lowercaseUrl = url.toLowerCase();
    var self = this;

    this.list(function(err, val){
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

exports.sign = function(url, token, params){
  var hmac = crypto.createHmac("sha1", token),
      toSign = [];

  params = params || {};
  params.t = params.t || Date.now();
  params.r = params.r || crypto.randomBytes(4).toString("hex");

  Object.keys(params).sort().forEach(function(v, i, a){
    toSign.push(v + params[v]);
  });

  toSign = toSign.join("");

  return {
    url: url,
    params: params,
    signature: hmac.update(url+toSign).digest('hex')
  };
};

exports.verify = function(url, token, params, signature){
  return this.sign(url, token, params).signature === signature;
};