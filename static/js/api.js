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
      requests.get(url, function(text) {
        callback(text);
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
    },

    removeURLParameter: function(url, parameter) {
      var urlparts = url.split('?');
      var prefix = urlparts[0];
      if (urlparts.length >= 2) {
        var query = urlparts[1];
        var paramPrefix = encodeURIComponent(parameter) + '=';
        var params = query.split(/[&;]/g);

        //reverse iteration as may be destructive
        for (var i = params.length; i-- > 0;) {
          //idiom for string.startsWith
          if (params[i].lastIndexOf(paramPrefix, 0) !== -1) {
            params.splice(i, 1);
          }
        }

        url = prefix + (params.length > 0 ? '?' + params.join('&') : "");
        return url;
      } else {
        return url;
      }
    }
  };
});