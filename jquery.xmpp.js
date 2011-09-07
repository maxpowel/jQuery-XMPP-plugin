/*
 *      jquery.xmpp.js
 *      
 *      Copyright 2011 Alvaro Garcia <maxpowel@gmail.com>
 *      
 *      This program is free software; you can redistribute it and/or modify
 *      it under the terms of the GNU General Public License as published by
 *      the Free Software Foundation; either version 3 of the License, or
 *      (at your option) any later version.
 *      
 *      This program is distributed in the hope that it will be useful,
 *      but WITHOUT ANY WARRANTY; without even the implied warranty of
 *      MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *      GNU General Public License for more details.
 *      
 *      You should have received a copy of the GNU General Public License
 *      along with this program; if not, write to the Free Software
 *      Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston,
 *      MA 02110-1301, USA.
 */

(function($) {
	$.xmpp = {
	rid:null,
	sid:null,
	jid:null,
	listening: false,
	onMessage: null,
	onIq: null,
	onPresence: null,
	connections: 0,
	/**
	 * Connect to the server
	 * @params Object 
	 *        {jid:"user@domain.com",
	 *          password:"qwerty",
	 *          onDisconnect:function(){},
	 *          onConnect: function(){},
	 *          onIq: function(iq){},
     *          onMessage: function(message){},
     *          onPresence: function(presence){}
     *         }
	 */
		connect: function(options){
			//Generate a random number. You can use your own generator
			this.rid = Math.round(Math.random()*Math.pow(10,10));
			//
			this.jid = options.jid;
			var split = options.jid.split("@");
			var domain = split[1];
			var xmpp = this;
			
			//Events
			this.onMessage = options.onMessage;
			this.onIq = options.onIq;
			this.onPresence = options.onPresence;
			
			//Init connection
			var msg = "<body rid='"+this.rid+"' xmlns='http://jabber.org/protocol/httpbind' to='"+domain+"' xml:lang='en' wait='60' hold='1' content='text/xml; charset=utf-8' ver='1.6' xmpp:version='1.0' xmlns:xmpp='urn:xmpp:xbosh'/>";
			$.post("/http-bind",msg,function(data){
				response = $(data);
				xmpp.sid = response.find("body").attr("sid");
				if(response.find("mechanism:contains('PLAIN')").length){
					xmpp.loginPlain(options);
				}else if(response.find("mechanism:contains('DIGEST-MD5')").length){
					xmpp.loginDigestMD5(options);
				}else throw "No auth method supported";
			});
		},
	
		/**
		 * Do a non-secure authentication
		 */
		loginPlain: function(options){
			this.rid++;
			var split = options.jid.split("@");
			var user = split[0];
			var domain = split[1];
			xmpp = this;
			var text = "<body rid='"+this.rid+"' xmlns='http://jabber.org/protocol/httpbind' sid='"+this.sid+"'><auth xmlns='urn:ietf:params:xml:ns:xmpp-sasl' mechanism='PLAIN'>"+Base64.encode(this.jid+"\u0000"+user+"\u0000"+options.password)+"</auth></body>";
			$.post("/http-bind",text,function(data){
				if($(data).find("success"))
				{
					xmpp.rid++;
					text ="<body rid='"+xmpp.rid+"' xmlns='http://jabber.org/protocol/httpbind' sid='"+xmpp.sid+"' to='"+domain+"' xml:lang='en' xmpp:restart='true' xmlns:xmpp='urn:xmpp:xbosh'/>";
					$.post("/http-bind",text,function(data){
						xmpp.messageHandler(data);
						xmpp.rid++;
						text ="<body rid='"+xmpp.rid+"' xmlns='http://jabber.org/protocol/httpbind' sid='"+xmpp.sid+"'><iq type='set' id='_bind_auth_2' xmlns='jabber:client'><bind xmlns='urn:ietf:params:xml:ns:xmpp-bind'><resource>Wixet</resource></bind></iq></body>";
						$.post("/http-bind",text,function(data){
							xmpp.messageHandler(data);
							xmpp.rid++;
							text = "<body rid='"+xmpp.rid+"' xmlns='http://jabber.org/protocol/httpbind' sid='"+xmpp.sid+"'><iq type='set' id='_session_auth_2' xmlns='jabber:client'><session xmlns='urn:ietf:params:xml:ns:xmpp-session'/></iq></body>";
							$.post("/http-bind",text,function(data){
								xmpp.messageHandler(data);
								xmpp.rid++;
								text = "<body rid='"+xmpp.rid+"' xmlns='http://jabber.org/protocol/httpbind' sid='"+xmpp.sid+"'><presence from='"+options.jid+"/Wixet' xmlns='jabber:client'><show>null</show></presence><presence xmlns='jabber:client'/><iq from='"+options.jid+"' type='get' id='1' xmlns='jabber:client'><vCard xmlns='vcard-temp'/></iq></body>";
								$.post("/http-bind",text,function(data){
									xmpp.messageHandler(data);
									try{
										options.onConnect(data);
									}catch(e){}
									xmpp.listen();
								});
							});
						});
					});
				}else throw "Error on authentication";
			});
		},
		
		/**
		 * Wait for a new event
		 */
		listen: function(){
			var xmpp = this;
			if(!this.listening){
				this.listening = true;	
				var xmpp = this;
				if(xmpp.connections == 0)
				{
					this.rid = this.rid+1;
					xmpp.connections = xmpp.connections + 1;
					$.post("/http-bind","<body rid='"+this.rid+"' xmlns='http://jabber.org/protocol/httpbind' sid='"+this.sid+"'></body>",
							function(data)
							{
								xmpp.connections = xmpp.connections - 1;
								xmpp.listening = false;
								var body = $(data).find("body");
								//When timeout the connections are 0
								//When listener is aborted because you send message (or something)
								// the body children are 0 but connections are > 0
								if(body.children().length > 0 && xmpp.connections == 0)
								{
									xmpp.messageHandler(data);
									xmpp.listen();
								}
							});
				}
			}

		},
		
		/**
		 * Send a text message
		 * @params Object
		 *         {message: "Hey dude!"}
		 */
		sendMessage: function(options){
			var xmpp = this;
			xmpp.rid = xmpp.rid + 1;
			this.listening = true;
			xmpp.connections = xmpp.connections + 1;
			msg = "<body rid='"+xmpp.rid+"' xmlns='http://jabber.org/protocol/httpbind' sid='"+xmpp.sid+"'><message from='"+xmpp.jid+"/Wixet' type='chat' to='"+options.to+"' xmlns='jabber:client'><body>"+options.message+"</body></message></body>";
			$.post("/http-bind",msg,function(data){
				xmpp.connections = xmpp.connections - 1;
				xmpp.messageHandler(data);
				xmpp.listening = false;
				xmpp.listen();
			});
		},
		
		/**
		 * Change the presence
		 * @params String
		 * The common presences are:
		 */
		setPresence: function(type){
			var xmpp = this;
			xmpp.rid = xmpp.rid + 1;
			this.listening = true;
			xmpp.connections = xmpp.connections + 1;
			msg = "<body rid='"+xmpp.rid+"' xmlns='http://jabber.org/protocol/httpbind' sid='"+xmpp.sid+"'><presence from='"+xmpp.jid+"/Wixet' xmlns='jabber:client'><show>"+type+"</show></presence></body>";
			$.post("/http-bind",msg,function(data){
				xmpp.connections = xmpp.connections - 1;
				xmpp.messageHandler(data);
				xmpp.listening = false;
				xmpp.listen();
			});

		},
		isWriting: function(options){
			var xmpp = this;
			xmpp.rid = xmpp.rid + 1;
			this.listening = true;
			xmpp.connections = xmpp.connections + 1;
			if(options.isWriting)
				msg = "<body rid='"+xmpp.rid+"' xmlns='http://jabber.org/protocol/httpbind' sid='"+xmpp.sid+"'><message type='chat' to='"+options.to+"/Wixet' from='"+xmpp.jid+"/Wixet'><x xmlns='jabber:x:event'><composing/></x><composing xmlns='http://jabber.org/protocol/chatstates'/></message></body>";
			else
				msg = "<body rid='"+xmpp.rid+"' xmlns='http://jabber.org/protocol/httpbind' sid='"+xmpp.sid+"'><message type='chat' to='"+options.to+"/Wixet' from='"+xmpp.jid+"/Wixet'><x xmlns='jabber:x:event'/><active xmlns='http://jabber.org/protocol/chatstates'/></message></body>";
			
			$.post("/http-bind",msg,function(data){
				xmpp.connections = xmpp.connections - 1;
				xmpp.messageHandler(data);
				xmpp.listening = false;
				xmpp.listen();
			});
		},
		messageHandler: function(data){
			var response = $(data);
			var xmpp = this;
			$.each(response.find("message"),function(i,element){
				try{
					xmpp.onMessage(element);
				}catch(e){}
			});
			
			$.each(response.find("iq"),function(i,element){
				try{
					xmpp.onIq(element);
				}catch(e){}
			});
			
			$.each(response.find("presence"),function(i,element){
				try{
					xmpp.onPresence(element);
				}catch(e){}
			});
		},
		
		disconnect: function(){
			
		}
	}
	

})(jQuery);
