var latest_login_list = [];
var login_name = '';
var LOGIN_COLOR_MAX = 9;
var COOKIE_NAME = "planning_porker_name";
var COOKIE_AVATAR = "planning_porker_avatar_url";
var COOKIE_EXPIRES = 365;
var TITLE_ORG = document.title;
var CODE_MIN_HEIGHT = 100;
var CODE_OUT_ADJUST_HEIGHT = 200;
var CODE_INDEX_ADJUST_HEIGHT = 50;
var CODE_ADJUST_HEIGHT = 100;
var SHARE_MEMO_NUMBER = 15;

var writing_text = [];
var text_logs = [];
var socket = io.connect('/');

$(function() {
  init_profile();
  init_number();
  init_sharememo();
  init_websocket();

  if ( $.cookie(COOKIE_NAME) != null ){
    login_name = $.cookie(COOKIE_NAME);
    $('#name').val(login_name);
    var avatar = $.cookie(COOKIE_AVATAR) || "";
    $('#avatar_url').val(avatar);
  }
});

function init_profile(){
  $('#name_form').submit(function() {
    return false;
  });

  $('#name').keyup(function(){
    var name = $('#name').val();
    $.cookie(COOKIE_NAME,name,{ expires: COOKIE_EXPIRES });

    if ( name ){
      login_name = name;
      socket.emit('message', {name:name, msg:""});
    }
    return false;
  });

  $('#avatar_form').submit(function() {
    return false;
  });

  $('#avatar_form').keyup(function() {
    var avatar = $('#avatar_url').val();
    $.cookie(COOKIE_AVATAR, avatar ,{ expires: COOKIE_EXPIRES });

    socket.emit('avatar', {url:avatar});
    return false;
  });
}

function init_number(){
  $('.number-list').on('click', 'button', function(){
    console.log($(this).html());

    var name = $('#name').val();
    socket.emit('number', {name:name, number:$(this).html()});
  });

  $('.action-list').on('click', '.clear-btn', function(){
    socket.emit('number', {name:name, number:""});
  });

  $('.action-list').on('click', '.all-clear-btn', function(){
    socket.emit('number-all-clear');
  });
}

function init_sharememo(){
  var i = 1;
  $("#share-memo").after($('<div/>').attr('id',"share_memo_" + i).attr("data-no",i).addClass("share-memo tab-pane"));
  $("#memo_number_option_top").after($('<option/>').attr('value',i).html(i));

  $(".share-memo").each(function(){
    $(this).append(
      $('<textarea/>').addClass("form-control code code-unselect").css("display","none").attr("placeholder", "Write here")).append(
      $('<pre/>').addClass("text-base-style").append($('<div/>').addClass("code-out")));
  });
}

function init_websocket(){
  socket.on('connect', function() {
    //console.log('connect');
    socket.emit('name', {name: $.cookie(COOKIE_NAME)});
    socket.emit('avatar', {url: $.cookie(COOKIE_AVATAR)});
  });

  socket.on('disconnect', function(){
    //console.log('disconnect');
  });

  socket.on('list', function(login_list) {
    $('#login_list_loader').hide();

    var is_all_number = true;
    for (var i = 0; i < login_list.length; ++i){
      if (login_list[i].number == undefined || login_list[i].number == ""){
        is_all_number = false;
        break;
      }
    }
 
    var out_list = "";
    var hide_sym = '<span class="glyphicon glyphicon-ok-circle"></span>';
    var is_all_same = true;
    var prev_number = login_list[0].number;
    for (var i = 0; i < login_list.length; ++i){
      var number = "&nbsp;";
      if (login_list[i].avatar){
        number = '<img src="' + login_list[i].avatar + '" class="img-rounded avatar-img">';
      }

      if (login_list[i].number != undefined && login_list[i].number != ""){
        if (is_all_number){
          number = login_list[i].number;
          if (prev_number != number){ is_all_same = false }
          prev_number = number;
        }else{
          number = hide_sym;
        }
      }
      var login_elem = '<li><div class="login-elem login-name' + get_color_id_by_name_id(login_list[i].id) + '"><div class="name">' + login_list[i].name + '</div><div class="number">' + number + '</div></div></li>';
      out_list += login_elem;
    }
    out_list = '<div class="list"><ul>' + out_list + "</ul></div>";

    if ($('#login_list').html() != out_list){
      $('#login_list').html(out_list);
      $('#login_list').fadeIn();
    }

    if (login_list.length > 1 && is_all_number && is_all_same){
      $('.login-elem').each(function(){
        $(this).addClass("text-highlight");
        $(this).switchClass("text-highlight", "", 5000);
      });
    }

    latest_login_list = login_list.sort(function(a,b){ return b.name.length - a.name.length });
    document.title = "(" + login_list.length + ") " + TITLE_ORG;
  });

  $(".code").autofit({min_height: CODE_MIN_HEIGHT});

  function setCaretPos(item, pos) {
    if (item.setSelectionRange) {  // Firefox, Chrome
      item.setSelectionRange(pos, pos);
    } else if (item.createTextRange) { // IE
      var range = item.createTextRange();
      range.collapse(true);
      range.moveEnd("character", pos);
      range.moveStart("character", pos);
      range.select();
    }
  };

  function switchEditShareMemo($share_memo, row){
    var no = $share_memo.data('no');
    writing_text[no] = writing_text[no] ? writing_text[no] : { text: "" };

    var $target_code = $share_memo.children(".code");
    $target_code.val(writing_text[no].text);
    $target_code.fadeIn('fast', function(){
      $target_code.keyup(); //call autofit
      // 編集モード時に選択した行位置を表示する
      $target_code.caretLine(row);
      $('#memo_area').scrollTop(row * 18 - CODE_ADJUST_HEIGHT);
    });
    $share_memo.children('pre').hide();
    $share_memo.children('.fix-text').show();
    $share_memo.children('.sync-text').hide();
    writing_loop_start(no);
 
    code_prev[no] = $target_code.val();
  }

  $('.share-memo').on('click','.sync-text', function(){
    var $share_memo = $(this).closest('.share-memo');
    switchEditShareMemo($share_memo, 0);
  });

  $('.share-memo').on('dblclick doubletap','pre tr', function(){
    // クリック時の行数を取得してキャレットに設定する
    var $share_memo = $(this).closest('.share-memo');
    var row = $(this).closest("table").find("tr").index(this);
    switchEditShareMemo($share_memo, row);
    return false;
  });

  $('.share-memo').on('dblclick doubletap','pre', function(){
    // 文字列が無い場合は最下部にキャレットを設定する
    var $share_memo = $(this).closest('.share-memo');
    var row = $(this).find("table tr").length - 1;
    switchEditShareMemo($share_memo, row);
  });

  // デコレートされた html へのイベント登録
  $('.share-memo').decora({
    checkbox_callback: function(that, applyCheckStatus){
      var share_memo_no = $(that).closest('.share-memo').data('no');

      // チェック対象のテキストを更新する
      writing_text[share_memo_no].text = applyCheckStatus(writing_text[share_memo_no].text);

      // 変更をサーバへ通知
      var $target_code = $(that).closest('.share-memo').children('.code');
      $target_code.val(writing_text[share_memo_no].text);
      socket.emit('text',{no: share_memo_no, text: $target_code.val()});
    }
  });

  function switchFixShareMemo($share_memo, row){
    if ($share_memo.children('.code').css('display') == "none"){ return; }

    $share_memo.children('.code').hide();
    $share_memo.children('pre').fadeIn();
    $share_memo.children('.fix-text').hide();
    $share_memo.children('.sync-text').show();

    // 閲覧モード時に編集していたキャレット位置を表示する
    var $target_tr = $share_memo.find('table tr').eq(row - 1);
    if ($target_tr.length > 0){
      $('#memo_area').scrollTop(0);
      $('#memo_area').scrollTop($target_tr.offset().top - CODE_OUT_ADJUST_HEIGHT);
    }
    socket.emit('add_history',{no: $share_memo.data('no')});
    writing_loop_stop();
  }

  $('.share-memo').on('dblclick doubletap','.code', function(){
    switchFixShareMemo($(this).parent(), $(this).caretLine());
  });

  $('.share-memo').on('click','.fix-text', function(){
    switchFixShareMemo($(this).parent(),1);
  });

  $(".share-memo").on('keydown','.code',function(event){
    // Ctrl - S or Ctrl - enter
    if ((event.ctrlKey == true && event.keyCode == 83) ||
        (event.ctrlKey == true && event.keyCode == 13)) {
      event.returnvalue = false;
      switchFixShareMemo($(this).parent(), $(this).caretLine());
      return false;
    }
  });

  var update_timer = [];
  // for share memo
  socket.on('text', function(text_log) {
    var no = text_log.no == undefined ? 1 : text_log.no;
    writing_text[no] = text_log;
    var $target = $('#share_memo_' + no);
    var $target_tab = $('#share_memo_tab_' + no);

    // 編集中の共有メモに他ユーザの変更が来たらフォーカスを外す
    if ( no == writing_loop_timer.code_no && login_name != text_log.name ){
      switchFixShareMemo($target, $target.children('.code').caretLine());
    }

    function setToTable(html){
      var table_html = "<table><tr><td>";
      table_html += html.replace(/[\n]/g,"</td></tr><tr><td>");
      return table_html += "</td></tr></table>";
    }

    // for code_out
    if (text_log.text != ""){
      $target.find('.code-out').html(setToTable($.decora.to_html(text_log.text)));
    }else{
      $target.find('.code-out').html(setToTable($.decora.to_html("Please double click and then write here.")));
    }

    // チェックボックスの進捗表示
    var checked_count = $target.find("input:checked").length;
    var checkbox_count = $target.find("input[type=checkbox]").length;
    if (checkbox_count > 0){
      $target.find('.checkbox-count').html(checked_count + "/" + checkbox_count + " done").show();
      if (checked_count == checkbox_count){
        $target.find('.checkbox-count').addClass('checkbox-count-done');
      }else{
        $target.find('.checkbox-count').removeClass('checkbox-count-done');
      }
    }else{
      $target.find('.checkbox-count').hide();
    }

    var title = $target.find('.code-out').text().split("\n")[0].substr(0,4);
    $target_tab.children('span').html(title);

    var $writer = $target_tab.children('.writer');
    $writer.addClass("silent-name writing-name");
    $writer.html(text_log.name);

    var $timestamp = $target_tab.find('.timestamp');
    $timestamp.attr("data-livestamp", text_log.date);

    var is_blank = text_log.text == "";
    if (is_blank){
      $writer.hide();
      $timestamp.hide();
    }else{
      $writer.show();
      $timestamp.show();
    }

    if (update_timer[no]){
      clearTimeout(update_timer[no]);
    }
    update_timer[no] = setTimeout(function(){
      $writer.removeClass("writing-name");
      update_timer[no] = undefined;
    },3000);
  });

  socket.on('text_logs_with_no', function(data){
    text_logs[data.no] = data.logs;
  });

  var code_prev = [];

  var writing_loop_timer = { id: -1, code_no: 0};
  function writing_loop_start(no){
    $target_code = $('#share_memo_' + no).children('.code');
    var loop = function() {
      var code = $target_code.val();
      if (code_prev[no] != code) {
        socket.emit('text',{no: no, text: code});
        code_prev[no] = code;
      }
    };
    // 念のためタイマー止めとく
    if (writing_loop_timer.id != -1){
      writing_loop_stop();
    }
    writing_loop_timer = {id: setInterval(loop, 400), code_no: no};
  }

  function writing_loop_stop(){
    clearInterval(writing_loop_timer.id);
    writing_loop_timer = { id: -1, code_no: 0};
  }
};

function get_color_id_by_name_id(id){
  if(id == 0){ return 0; } // no exist user.
  return id % LOGIN_COLOR_MAX + 1; // return 1 〜 LOGIN_COLOR_MAX
}

