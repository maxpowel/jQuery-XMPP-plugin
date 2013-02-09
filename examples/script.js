$(document).ready(function(){
	$("#connectBut").click(function(){
		var server_name = "@localhost";
		var jid = $("#jid").val() + server_name;
		var password = $("#pass").val();
		var logContainer = $("#log");
		var contactList = $("#contacts");
	
		//An example of bosh server. This site is working but it can change or go down.
		//If you are going to have a production site, you must install your own BOSH server
		//var url ="http://bosh.metajack.im:5280/xmpp-httpbind";
		var url ="http://ec2-23-20-64-30.compute-1.amazonaws.com:5280/http-bind";
		$.xmpp.connect({url:url, jid: jid, password: password,
			onConnect: function(){
				logContainer.html("Connected");
				$.xmpp.setPresence(null);
			},
			onPresence: function(presence){
				var curId = presence.from.split('@')[0];

				$("#contacts li").each(function() {
					if ($(this).data('username') == curId) {
						$(this).remove()
						return false;
					}
				
				});

				var status_icon = "available_icon";
				switch (presence.show) {
					case "dnd": status_icon = "busy_icon";
											break;

					case "away": status_icon = "away_icon";
											break;

					default: status_icon = "available_icon";
				}
			
				var contact = $("<li data-username='" + curId + "'><div class='" + status_icon + " status_icon'>&nbsp;</div>");
				contact.append("<a href='javascript:void(0)'>"+ curId +"</a>");
				contact.find("a").click(function(){
						var id = MD5.hexdigest(presence.from);
						var conversation = $("#"+id);
						if(conversation.length == 0)
							openChat({to:presence.from});
				});
				contactList.append(contact);
			},
			onDisconnect: function(){
				logContainer.html("Disconnected");
			},
			onMessage: function(message){
			
				var jid = message.from.split("/");
				var id = MD5.hexdigest(message.from);
				var conversation = $("#"+id);
				if(conversation.length == 0){
					openChat({to:message.from});
				}
				conversation = $("#"+id);
				//conversation.find(".conversation").append("<div>"+ jid[0] +": "+ message.body +"</div>");

				if (message.body == null) {
					return;
				}

				var current_message = "<div class = 'msgBlock'><span class = 'chatter_name'>"+ jid[0].split('@')[0] +": </span><br>"  + message.body +"</div>"

				conversation.find(".conversation").append(current_message);
				conversation.find(".conversation").prop('scrollTop', conversation.find('.conversation').prop("scrollHeight"));
			
			},onError:function(error){
				alert(error.error);
			}
		});		
	});

	$("#disconnectBut").click(function(){
		$.xmpp.disconnect();
	});

	});


	function openChat(options){
	var id = MD5.hexdigest(options.to);

	// Chat box
	var chat_window = "<div id='" + id + "' class = 'chatBox'>";

	// Chat box header
	chat_window += "<div class='chatBox_header_wrapper'><div class='chatBox_header'> <div class='available_icon status_icon'>&nbsp;</div>" + options.to.split('@')[0] +" </div>";

	// chat box toolbaropenChat
	chat_window += "<div class='chatBox_toolbar'> <strong><span class='chatBox_minimise'><a href='#'>_</a></span> <span class='chatBox_close'><a href='#'>&times;</a></span></strong></div></div>";

	// Chat box actual conversation
	chat_window += "<div class='chatBox_body'><div class='conversation'></div>"

	// Chat box message box
	chat_window += "<div class='chatBox_curmsg'><input type='text' class='myCurMsg' /><button class='btn_sendMsg'>Send</button></div>";
	chat_window += "</div></div>";

	var chat = $(chat_window);
	var input = chat.find("input");
	var sendBut = chat.find("button.btn_sendMsg");
	var conversation = chat.find(".conversation");
	sendBut.click(function(){
		$.xmpp.sendMessage({to:options.to, body: input.val()});
		//conversation.append("<div>"+ $.xmpp.jid +": "+ input.val() +"</div>");

		var current_message = "<div class = 'msgBlock'><span class = 'chatter_name'>"+ $.xmpp.jid.split('@')[0] +": </span><br>"  + input.val() +"</div>"

		conversation.append(current_message);
		conversation.prop('scrollTop', conversation.prop("scrollHeight"));
		input.val("");
	});

	if ($('#chatBox_group').length == 0) {
		var chatBox_group = "<div style='height: 250px;' id='chatBox_group'></div>"
		$(chatBox_group).css('position', 'absolute');
		$(chatBox_group).css('z-index', 1000);
		$(chatBox_group).css('top', $(window).height() - 222);

		$("body").append(chatBox_group);
	}

	//$(chat).css('position', 'absolute');
	//$(chat).css('z-index', 1000);
	//$(chat).css('top', $(window).height() - 220);
	$(chat).css('float', 'right');
	$(chat).css('margin-right', '10px');

	$("#chatBox_group").append(chat);
	$(chat).show();
	}

	$('.chatBox_minimise').on('click', function() {

	if ($(this).text() == '_') {
		var newtop = $(window).height() - 25;
	
		$(this).closest('.chatBox').animate({top: newtop});
		$(this).closest('.chatBox').find('.chatBox_body').hide();
	
		$(this).html('<strong><a href="#">&#175;</a></strong>')
	} else {
		var newtop = $(window).height() - 220;

		$(this).closest('.chatBox').find('.chatBox_body').show();
		$(this).closest('.chatBox').animate({top: newtop});

		$(this).html('<a href="#">_</a>')
	}


	});

	$('.chatBox_close').on('click', function() {
	$(this).closest('.chatBox').remove();
	});

	$('#chatBox_status').on('click', function() {
	$.xmpp.setPresence($(this).val());
	});

	$('#chatBox_search').on('keyup',function() {
	$('#contacts li').hide();

	var search_text = $(this).val().toLowerCase();
	if (search_text == "") {
		$('#contacts li').show();
		return;
	}

	$('#contacts li').each(function(key, value) {
		if ($(value).text().toLowerCase().search(search_text) > -1) {
			$(this).show();
		}
	});
	});

	$(".myCurMsg").on('keyup', function(event){
	if(event.keyCode == 13){
	$(".chatBox_curmsg .btn_sendMsg").click();
	}
	});

