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

  jobStream: function(){},

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

exports.sign = function(url, token, params){
  var hmac = crypto.createHmac("sha1", token),
      queryString = [],
      toSign = [],
      params = params || {
        t: Date.now(),
        r: crypto.randomBytes(4).toString("hex")
      };

  Object.keys(params).sort().forEach(function(v, i, a){
    queryString.push(v + "=" + params[v]);
    toSign.push(v + params[v]);
  });

  queryString = "?" + queryString.join("&");
  toSign = toSign.join("");

  return {
    url: url + queryString,
    signature: hmac.update(toSign).digest('hex')
  };
}

exports.verify = function(url, signature, token){
  var queryStringIndex = url.lastIndexOf("?");
  if (!~queryStringIndex) {
    return false;
  }
  var paramString = url.substring(queryStringIndex + 1);
  url = url.substring(0, queryStringIndex);
  var kvPairs = paramString.split("&");
  var params = {};
  kvPairs.forEach(function(v, i, a){
    var splitIndex = v.indexOf("=");
    if (!~splitIndex || !splitIndex) {
      return false;
    }
    var key = v.substring(0, splitIndex);
    var value = v.substring(splitIndex + 1);
    params[key] = value;
  });
  return this.sign(url, token, params).signature === signature;
}