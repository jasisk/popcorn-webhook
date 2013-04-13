var levelup = require("levelup");
var redis = require("redis");
var kue = require("kue");
var rc = require("rc")("popcorn", {
  port: 6379,
  server: "127.0.0.1",
  channel: "popcorn"
});

kue.app.listen(3000);