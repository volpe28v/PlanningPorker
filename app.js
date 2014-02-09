var program = require('commander');

// require my libs
var mongo_builder = require('./lib/mongo_builder');
var app = require('./lib/server');
var chat_log = require('./lib/chat_log');
var text_log = require('./lib/text_log');
var client_info = require('./lib/client_info');
var util = require('./lib/util');
var bots = require('./lib/bots');

var io = require('socket.io').listen(app);

program
  .version('0.0.3')
  .option('-p, --port <n>', 'port no. default is 3008.')
  .option('-d, --db_name [name]', 'db name. default is "planningporker_db".')
  .option('-t, --title_name [name]', 'title name. default is "".')
  .option('NODE_DEVHUB_USER', 'user name of basic authentication. define with env.')
  .option('NODE_DEVHUB_PaSS', 'password of basic authentication. define with env.')
  .parse(process.argv);

var port = program.port || process.env.PORT || 3000;
var db_name = program.db_name || 'planningporker_db';
var title_name = program.title_name ? "for " + program.title_name : "";
var basic_user = process.env.NODE_DEVHUB_USER ? process.env.NODE_DEVHUB_USER : "";
var basic_pass = process.env.NODE_DEVHUB_PASS ? process.env.NODE_DEVHUB_PASS : "";

console.log(' port : ' + port);
console.log(' db_name : ' + db_name);
console.log(' title_name : ' + title_name);
console.log(' NODE_DEVHUB_USER : ' + basic_user);
console.log(' NODE_DEVHUB_PASS : ' + basic_pass);

client_info.set_optional_title( title_name );

// set routing
app.get('/', function(req, res) {
  console.log('/');
  res.render('index',{locals:{title_name:title_name}});
});

app.get('/mobile', function(req, res) {
  console.log('/mobile');
  res.render('index_mobile',{locals:{title_name:title_name}});
});

app.get('/notify', function(req, res) {
  console.log('/notify');
  console.log(req.query);
  var name = decodeURI(req.query.name);
  var msg = decodeURI(req.query.msg);
  var data = {name: name, msg: msg, date: util.getFullDate(new Date()), ext: true};

  chat_log.add(data,function(){
    io.sockets.emit('message', data);
    client_info.send_growl_all(data);
    res.end('recved msg: ' + msg);
  });

  // for bot
  bots.action(data, function(reply){
    setTimeout(function(){
      reply.date = util.getFullDate(new Date());
      chat_log.add(reply);
      io.sockets.emit('message', reply);
      client_info.send_growl_all(reply);
    },reply.interval * 1000);
  });
});

// set db and listen app
mongo_builder.ready(db_name, function(db){
  chat_log.set_db(db);
  text_log.set_db(db);
  app.listen(port);
  console.log("listen!!!");
});

// define socket.io events
io.sockets.on('connection', function(client) {
  var client_ip = client_info.get_ip(client);
  console.log("New Connection from " + client_ip);

  client_info.login(client_ip);
 
  text_log.get_active_number(function(number){
    client.emit('memo_number',number);
    for( var i = 0; i < number.num; i++){
      text_log.get_logs_by_no(i, function(logs){
        client.emit('text_logs_with_no', logs);
      });
    }
  });

  text_log.get_latest(function(latest_texts){
    console.log("latest_text: " + latest_texts.length);
    var length = latest_texts.length;
    for( var i = 0; i < length; i++){
      client.emit('text',latest_texts[i]);
    }
  });

  client.on('name', function(data) {
    client_info.set_name(client, data.name);

    client.emit('list', client_info.ip_list());
    client.broadcast.emit('list', client_info.ip_list());
  });

  client.on('message', function(data) {
    client_info.set_name(client, data.name);

    data.date = util.getFullDate(new Date());

    client.emit('list', client_info.ip_list());
    client.broadcast.emit('list', client_info.ip_list());

    chat_log.add(data);
    client.emit('message_own', data);
    client.broadcast.emit('message', data);
    client_info.send_growl_without(client, data);

    // for bot
    bots.action(data, function(reply){
      setTimeout(function(){
        reply.date = util.getFullDate(new Date());
        chat_log.add(reply);
        client.emit('message_own', reply);
        client.broadcast.emit('message', reply);
        client_info.send_growl_without(client, reply);
      },reply.interval * 1000);
    });
  });

  client.on('remove_message', function(data) {
    client.broadcast.emit('remove_message', data);
    chat_log.remove(data.id);
  });

  client.on('number', function(number_data){
    console.log(number_data);
    client_info.set_number(client,number_data.number);

    client.emit('list', client_info.ip_list());
    client.broadcast.emit('list', client_info.ip_list());
  });

  client.on('number-all-clear', function(){
    client_info.clear_all_number();

    client.emit('list', client_info.ip_list());
    client.broadcast.emit('list', client_info.ip_list());
  });

  client.on('avatar', function(avatar){
    client_info.set_avatar(client,avatar.url);

    client.emit('list', client_info.ip_list());
    client.broadcast.emit('list', client_info.ip_list());
  });

  client.on('text', function(msg) {
    var name = client_info.get_name(client)
    msg.text = msg.text.replace(/\n/g,"\r\n");

    var current_text_log = { name: name, no: msg.no, text: msg.text, date: util.getFullDate(new Date()) }

    client.emit('text', current_text_log);
    client.broadcast.emit('text', current_text_log);

    text_log.update_latest_text(current_text_log);
  });

  client.on('add_history', function(msg) {
    text_log.add_history(msg.no, function(result){
      text_log.get_logs_by_no(msg.no, function(logs){
        client.emit('text_logs_with_no', logs);
        client.broadcast.emit('text_logs_with_no', logs);
      });
    });
  });

  client.on('memo_number', function(data) {
    client.emit('memo_number', data);
    client.broadcast.emit('memo_number', data);
    text_log.update_active_number(data);
  });

  client.on('disconnect', function() {
    client_info.set_pomo(client,false);
    var client_addr = client_info.get_ip(client);

    if( client_info.logout(client) ){
      client.broadcast.emit('list', client_info.ip_list());
    }

    console.log('disconnect:' + client_info.get_ip(client));
  });
});

console.log('Server running at http://127.0.0.1:' + port + '/');

