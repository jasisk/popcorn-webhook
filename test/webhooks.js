var should = require("should"),
    path = require("path"),
    fs = require("fs"),
    rimraf = require("rimraf"),
    tmpFile = path.join(__dirname, "/tmp.db"),
    levelup = require("levelup"),
    webhooks = require("../lib/webhooks");

describe("webhooks", function(){
  describe("constructor", function(){
    describe("synchronous", function(){
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

    describe("asynchronous", function(){
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

  describe(".list()", function(){
    it("should return an empty array on new db", function(done){
      var hook = webhooks(tmpFile);
      hook.list(function(err, hooks){
        should.not.exist(err);
        hooks.should.eql([]);
        hook._db.close();
        rimraf(tmpFile, done);
      });
    });
    it("should return an object with results", function(done){
      var db = levelup(tmpFile);
      var url = "http://www.paypal.com";
      var key = "ohgodohgodohgod";
      db.put(url, key, function(err){
        if (err) done(err);
        db.close(function(){
          var hook = webhooks(tmpFile);
          hook.list(function(err, hooks){
            var obj = {};
            obj[url] = key;
            should.not.exist(err);
            hooks.should.eql(obj);
            hook._db.close();
            rimraf(tmpFile, done);
          });
        });
      });
    });
  });

  describe(".add()", function(){
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
        hook.list(function(err, val){
          Object.keys(val).should.eql([url]);
          done(err);
        });
      });
    });
    it("should not add a duplicate", function(done){
      var url = "http://www.paypal.com";
      hook.add(url, function(err){
        hook.add(url.toUpperCase(), function(err){
          hook.list(function(err, val){
            Object.keys(val).should.eql([url]);
            done(err);
          });
        });
      });
    });
    it("should return an auth token", function(done){
      var url = "http://www.paypal.com";
      hook.add(url, function(err, token){
        token.should.have.length(40);
        done();
      });
    });
  });

  describe(".getToken()", function(){
    // I should stub out .list()
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
    it("should return the right token", function(done){
      var url = "http://www.paypal.com";
      hook.add(url, function(err, token){
        hook.getToken(url, function(err, fetchedToken){
          should.not.exist(err);
          fetchedToken.should.equal(token);
          done();
        });
      });
    });
    it("should error if url doesn't exist", function(done){
      hook.getToken("http://www.popcorn.com", function(err, fetchedToken){
        should.exist(err);
        done();
      });
    });
  });

  describe("#sign()", function(){
    it("should calculate the proper hmac", function(){
      var signed = webhooks.sign("http://www.paypal.com", "abcdef", {
        t:1234567,
        r:1234567
      });
      signed.should.be.an.object;
      signed.signature.should.equal("3353da1368c18d1bbec94ec0535802d1e5b1e196");
    });
    it("should calculate the proper hmac without params", function(){
      var signed = webhooks.sign("http://www.paypal.com", "abcdef");
      signed.should.have.keys("url", "params", "signature");
      signed.params.should.have.keys("t", "r");
    });
  });

  describe("#verify()", function(){
    it("should validate the hmac correctly", function(){
      var params = {
        t:1234567,
        r:1234567
      };
      var signed = webhooks.sign("http://www.paypal.com", "abcdef", params);
      webhooks.verify(signed.url, "abcdef", params, signed.signature).should.be.true;
      webhooks.verify(signed.url, "abcdef", null, signed.signature).should.be.false;
      webhooks.verify(signed.url, "fedcba", params, signed.signature).should.be.false;
    });
  });

  describe(".signedList()", function(){
    var hook;
    var url = "http://www.paypal.com";
    before(function(done){
      hook = webhooks(tmpFile);
      hook.add(url, function(err){
        done();
      });
    });
    after(function(done){
      hook._db.close(function(){
        rimraf(tmpFile, function(err){
          done(err);
        });
      });
    });
    it("should return the list properly signed", function(done){
      // I should probably stub out #sign() and avoid .getToken() and #verify()
      hook.signedList(function(err, list){
        should.not.exist(err);
        list.should.have.length(1);
        hook.getToken(list[0].url, function(err, token){
          var verified = webhooks.verify(list[0].url,
                                         token,
                                         list[0].params,
                                         list[0].signature);
          verified.should.be.true;
        });
        done();
      });
    });
  });

});