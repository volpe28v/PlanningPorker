var place = require('./place_table');
var client_info = {};
var client_max_id = 1;
var title = "DevHub ";
var isSending = false;
var POMO_MINUTES = 25;
var guest_no = 1;

module.exports.set_optional_title = function(ot){
  if ( ot == undefined ){ return }
  title += ot;
}

module.exports.login = function(login_ip){
  for (var ip in client_info){
    if(ip == login_ip){
      return true;
    }
  }
  
  var dummy_name = "Guest" + guest_no++;
  client_info[login_ip] = 
  {
    name: dummy_name,
    number: "",
    id: client_max_id
  }
  client_max_id += 1

  return true; 
};

module.exports.set_name = function(client, name){
  if (name == null || name == ""){return false;}

  var current_ip = this.get_ip(client)
  if (client_info[current_ip]){
    client_info[current_ip].name = name;
    return true;
  }

  return false;
};
 
module.exports.logout = function(client){
  var logout_ip = this.get_ip(client)

  // ログイン中のログアウトチェック 
  if ( this.exist_ip_num(client, logout_ip) > 1 ){
    return false;
  }
  delete client_info[logout_ip]

  return true;
};
 
module.exports.number_list = function(){
  var number_list = [];
  for (var ip in client_info){
    number_list.push(
      {
        name: client_info[ip].name, 
        number: client_info[ip].number,
      });
  }
  return number_list;
}

module.exports.ip_list = function(){
  var ip_list = [];
  for (var ip in client_info){
    ip_list.push(
      {
        name: client_info[ip].name, 
        id: client_info[ip].id,
        number: client_info[ip].number,
        avatar: client_info[ip].avatar
      });
  }
  return ip_list;
}

module.exports.exist_ip_num = function(client, ip){
  var ip_count = 0;
  for (var key in Object.keys(client.conn.server.clients)){
    if (key == ip){
      ip_count += 1;
    }
  }

  return ip_count;
}

module.exports.get_info = function(client){
  var client_ip = this.get_ip(client);
  return client_info[client_ip];
}

module.exports.get_ip = function(client){
  return client.client.id;
}

module.exports.get_name = function(client){
  var c = this.get_info(client);
  return c.name;
}

module.exports.get_id = function(client){
  var c = this.get_info(client);
  return c.id
}

module.exports.is_pomo = function(client){
  var c = this.get_info(client);
  if ( c.pomo == true ){
    return true;
  }else{
    return false;
  }
}

module.exports.set_pomo = function(client, pomo_flg, timer_id){
  var c = this.get_info(client);
  c.pomo = pomo_flg;
  if (pomo_flg){
    c.pomo_id = timer_id;
    c.pomo_min = POMO_MINUTES;
  }else{
    clearTimeout(c.pomo_id);
    c.pomo_id = null;
    c.pomo_min = 0
  }
}

module.exports.update_pomo = function(client, min){
  var c = this.get_info(client);
  return c.pomo_min -= min
}

module.exports.set_number = function(client, number){
  var c = this.get_info(client);
  c.number = number;
}

module.exports.clear_all_number = function(){
  var is_clear = false;
  for (var ip in client_info){
    if (client_info[ip].number != ""){
      is_clear = true;
    }
    client_info[ip].number = "";
  }
  return is_clear;
}

module.exports.set_avatar = function(client, url){
  var c = this.get_info(client);
  c.avatar = url;
}


