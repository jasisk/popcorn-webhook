var should = require("should"),
    path = require("path"),
    fs = require("fs"),
    rimraf = require("rimraf"),
    tmpFile = path.join(__dirname, "/tmp.db"),
    levelup = require('levelup'),
    webhooks = require("../lib/webhooks");

describe("webhooks", function(){
  describe("constructor", function(){
    describe("syncronous", function(){
      var hook;
      before(function(){
        hook = webhooks(tmpFile);
      });
      after(function(done){
        hook._db.close(function(){
          rimraf(tmpFile, function(err){
            done(err);
          });
        });
      });
      it("should open the db", function(){
        (fs.existsSync(tmpFile)).should.be.true;
      });
      it("should set db instance to `_db`", function(){
        should.exist(hook._db);
      });
    });

    describe("asyncronous", function(){
      var hook;
      before(function(done){
        webhooks(tmpFile, function(err, db){
          hook = db;
          done(err);
        });
      });
      after(function(done){
        hook._db.close(function(){
          rimraf(tmpFile, function(err){
            done(err);
          });
        });
      });
      it("should open the db", function(){
        (fs.existsSync(tmpFile)).should.be.true;
      });
      it("should set db instance to `_db`", function(){
        should.exist(hook._db);
      });
    });


  });

  describe("#get()", function(){
    it("should return an empty array on new db", function(done){
      var hook = webhooks(tmpFile);
      hook.get(function(err, hooks){
        should.not.exist(err);
        hooks.should.eql([]);
        hook._db.close();
        rimraf(tmpFile, done);
      });
    });
    it("should return an array with results", function(done){
      var db = levelup(tmpFile);
      var urls = ["http://www.paypal.com"];
      db.put("webhooks", JSON.stringify(urls), function(err){
        if (err) done(err);
        db.close(function(){
          var hook = webhooks(tmpFile);
          hook.get(function(err, hooks){
            should.not.exist(err);
            hooks.should.eql(urls);
            hook._db.close();
            rimraf(tmpFile, done);
          });
        });
      });
    });
  });

  describe("#add()", function(){
    var hook;
    beforeEach(function(){
      hook = webhooks(tmpFile);
    });
    afterEach(function(done){
      hook._db.close(function(){
        rimraf(tmpFile, function(err){
          done(err);
        });
      });
    });
    it("should add a url", function(done){
      var url = "http://www.paypal.com";
      hook.add(url, function(err){
        hook.get(function(err, val){
          val.should.eql([url]);
          done(err);
        });
      });
    });
    it("should not add a duplicate", function(done){
      var url = "http://www.paypal.com";
      hook.add(url, function(err){
        hook.add(url.toUpperCase(), function(err){
          hook.get(function(err, val){
            val.should.eql([url]);
            done(err);
          });
        });
      });
    });
  });

});