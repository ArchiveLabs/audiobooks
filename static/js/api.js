var Book, Browser;
$().ready(function() {
  'use strict';
  $.support.cors = true
  var apiurl = "https://api.archivelab.org/books";

  var requests = {
    get: function(url, callback) {
      $.get(url, function(results) {}).done(function(data) {
        if (callback) { callback(data); }
      });
    },

    post: function(url, data, callback) {
      $.post(url, data, function(results) {}).done(function(data) {
        if (callback) { callback(data); }
      });
    },

    put: function(url, data, callback) {
      $.put(url, data, function(results) {}).done(function(data) {
        if (callback) { callback(data); }
      });
    },
  };

  Book = {
    getPage: function(ocaid, page, callback) {
      var url = apiurl + '/' + ocaid + '/pages/' + page + '/plaintext';
      var data = {};
      if (redux && redux.auth.s3access && redux.auth.s3secret) {
          data.access = redux.auth.s3access;
          data.secret = redux.auth.s3secret;
      }
      requests.post(url, data, function(text) {
        callback(text.replace('- ', ''));
      });
    },
    getFirstPage: function(ocaid, callback) {
      var url = apiurl + '/' + ocaid + '/ia_manifest';
      requests.get(url, function(manifest) {
        callback(manifest.titleIndex);
      });
    }
  };
  Browser = {
    getS3Keys: function(callback) {
      var url = 'https://archive.org/account/s3.php?output_json=true';
      requests.get(url, function(resp) {
        resp = JSON.parse(resp);
        var s3accesskey = resp.success == 1 ? resp.key.s3accesskey : '';
        var s3secretkey = resp.success == 1 ? resp.key.s3secretkey : '';
        callback(s3accesskey, s3secretkey);
      });
    },
    getUrlParameter: function(key) {
      var query = window.location.search.substring(1);
      var params = query.split("&");
      if (key) {
        for (var i = 0; i < params.length; i++) {
          var item = params[i].split("=");
          var val = item[1];
          if (item[0] == key) { return (decodeURIComponent(val)); }
        }
        return (undefined);
      }
      return (items);
    },
    getJsonFromUrl: function() {
      var query = location.search.substr(1);
      var result = {};
      query.split("&").forEach(function(part) {
        var item = part.split("=");
        result[item[0]] = decodeURIComponent(item[1]);
      });
      return result;
    }
  };
});
