var redis = require("redis");
var rc = require("rc")("popcorn", {
  port: 6379,
  server: "127.0.0.1",
  channel: "popcorn"
});