var mongo = require('mongodb');

var db;
var table_log_name = 'porker_log';
var LOG_LIMIT = 20;

module.exports.set_db = function(current_db){
  db = current_db;
};

module.exports.get_logs = function(callback){
  db.collection(table_log_name, function(err, collection) {
    collection.find({}, {limit: LOG_LIMIT, sort: {date: -1}}).toArray(function(err, results) {
      callback(results);
    });
  });
}

module.exports.add = function(current_log, callback){
  db.collection(table_log_name, function(err, collection) {
    collection.insert( current_log, callback );
  });
}

