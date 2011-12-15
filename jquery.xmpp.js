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
	url: null,
	listening: false,
	onMessage: null,
	onIq: null,
	messageQueue: new Array(),
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
			if(options.url == null)
				this.url = '/http-bind'
			else
				this.url = options.url;
			
			//Events
			this.onMessage = options.onMessage;
			this.onIq = options.onIq;
			this.onPresence = options.onPresence;
			
			//Init connection
			var msg = "<body rid='"+this.rid+"' xmlns='http://jabber.org/protocol/httpbind' to='"+domain+"' xml:lang='en' wait='60' hold='1' content='text/xml; charset=utf-8' ver='1.6' xmpp:version='1.0' xmlns:xmpp='urn:xmpp:xbosh'/>";
			/*$.ajax({url: this.url, data:msg, type:'POST', complete: function(aa,bb){
				console.log(aa.responseText);
				console.log($(aa.responseText).find("mechanism"));
				
				}})*/
			$.post(this.url,msg,function(data){
				var response = $(xmpp.fixBody(data));
				xmpp.sid = response.attr("sid");
				if(response.find("mechanism:contains('PLAIN')").length){
					xmpp.loginPlain(options);
				}else if(response.find("mechanism:contains('DIGEST-MD5')").length){
					xmpp.loginDigestMD5(options);
				}else throw "No auth method supported";
			}, 'text');
		},
	
		/**
		 * Do a non-secure authentication
		 */
		loginPlain: function(options){
			this.rid++;
			var split = options.jid.split("@");
			var user = split[0];
			var domain = split[1];
			var xmpp = this;
			var text = "<body rid='"+this.rid+"' xmlns='http://jabber.org/protocol/httpbind' sid='"+this.sid+"'><auth xmlns='urn:ietf:params:xml:ns:xmpp-sasl' mechanism='PLAIN'>"+Base64.encode(this.jid+"\u0000"+user+"\u0000"+options.password)+"</auth></body>";
			var url = this.url;
			$.post(this.url,text,function(data){
				var response = $(xmpp.fixBody(data));

				if(response.find("success").length)
				{
					xmpp.rid++;
					text ="<body rid='"+xmpp.rid+"' xmlns='http://jabber.org/protocol/httpbind' sid='"+xmpp.sid+"' to='"+domain+"' xml:lang='en' xmpp:restart='true' xmlns:xmpp='urn:xmpp:xbosh'/>";
					$.post(url,text,function(data){
						//xmpp.messageHandler(data);
						xmpp.rid++;
						text ="<body rid='"+xmpp.rid+"' xmlns='http://jabber.org/protocol/httpbind' sid='"+xmpp.sid+"'><iq type='set' id='_bind_auth_2' xmlns='jabber:client'><bind xmlns='urn:ietf:params:xml:ns:xmpp-bind'><resource>Wixet</resource></bind></iq></body>";
						$.post(url,text,function(data){
							//xmpp.messageHandler(data);
							xmpp.rid++;
							text = "<body rid='"+xmpp.rid+"' xmlns='http://jabber.org/protocol/httpbind' sid='"+xmpp.sid+"'><iq type='set' id='_session_auth_2' xmlns='jabber:client'><session xmlns='urn:ietf:params:xml:ns:xmpp-session'/></iq></body>";
							$.post(url,text,function(data){
								//xmpp.messageHandler(data);
								//xmpp.rid++;
								//text = "<body rid='"+xmpp.rid+"' xmlns='http://jabber.org/protocol/httpbind' sid='"+xmpp.sid+"'><presence from='"+options.jid+"/Wixet' xmlns='jabber:client'><show>null</show></presence><presence xmlns='jabber:client'/><iq from='"+options.jid+"' type='get' id='1' xmlns='jabber:client'><vCard xmlns='vcard-temp'/></iq></body>";
								//$.post(url,text,function(data){
									//xmpp.messageHandler(data);
								//	try{
										options.onConnect(data);
								//	}catch(e){}
									xmpp.listen();
								//}, 'text');
							}, 'text');
						}, 'text');
					}, 'text');
				}else throw "Error on authentication";
			}, 'text');
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
					$.post(this.url,"<body rid='"+this.rid+"' xmlns='http://jabber.org/protocol/httpbind' sid='"+this.sid+"'></body>",
							function(data)
							{
								xmpp.connections = xmpp.connections - 1;
								xmpp.listening = false;
								var body = $(xmpp.fixBody(data));
								//When timeout the connections are 0
								//When listener is aborted because you send message (or something)
								// the body children are 0 but connections are > 0
								if(body.children().length > 0 && xmpp.connections == 0)
								{
									xmpp.messageHandler(data);
									xmpp.listen();
								}
							}, 'text');
				}
			}

		},
		
		/**
		 * Send a text message
		 * @params Object
		 *         {message: "Hey dude!",
		 * 			to: someone@somewhere.com}
		 */
		sendMessage: function(options){
			var xmpp = this;
			xmpp.rid = xmpp.rid + 1;
			this.listening = true;
			xmpp.connections = xmpp.connections + 1;
			msg = "<body rid='"+xmpp.rid+"' xmlns='http://jabber.org/protocol/httpbind' sid='"+xmpp.sid+"'><message type='chat' to='"+options.to+"/Wixet' xmlns='jabber:client'><body>"+options.message+"</body></message></body>";
			$.post(this.url,msg,function(data){
				xmpp.connections = xmpp.connections - 1;
				xmpp.messageHandler(data);
				xmpp.listening = false;
				xmpp.listen();
			}, 'text');
		},
		
		/**
		 * Change the presence
		 * @params String
		 * The common presences are: null, away, dnd
		 */
		setPresence: function(type){
			var xmpp = this;
			xmpp.rid = xmpp.rid + 1;
			this.listening = true;
			xmpp.connections = xmpp.connections + 1;
			if(type == null)
				msg = "<body rid='"+xmpp.rid+"' xmlns='http://jabber.org/protocol/httpbind' sid='"+xmpp.sid+"'><presence xmlns='jabber:client'></presence></body>";
			else
				msg = "<body rid='"+xmpp.rid+"' xmlns='http://jabber.org/protocol/httpbind' sid='"+xmpp.sid+"'><presence xmlns='jabber:client'><show>"+type+"</show></presence></body>";
			$.post(this.url,msg,function(data){
				xmpp.connections = xmpp.connections - 1;
				xmpp.messageHandler(data);
				xmpp.listening = false;
				xmpp.listen();
			}, 'text');

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
			
			$.post(this.url,msg,function(data){
				xmpp.connections = xmpp.connections - 1;
				xmpp.messageHandler(data);
				xmpp.listening = false;
				xmpp.listen();
			}, 'text');
		},
		messageHandler: function(data, context){
			var xmpp = this;
			var response = $(xmpp.fixBody(data));
			
			
			$.each(response.find("message"),function(i,element){
				try{
					var e = $(element);
					xmpp.onMessage({from: e.attr("from"), body: e.find(".body").html()});
				}catch(e){}
			});
			
			$.each(response.find("iq"),function(i,element){
				try{
					xmpp.onIq(element);
				}catch(e){}
			});
			
			$.each(response.find("presence"),function(i,element){
				try{
					var e = $(element);
					xmpp.onPresence({from: e.attr("from"), to: e.attr("to"), show: e.find("show").html()});
				}catch(e){}
			});
		},
		
		disconnect: function(){
			
		},
		
		/**
		 * Replaces <body> tags because jquery does not "parse" this tag
		 * @params String
		 * @return String
		 */
		fixBody: function(html){
			    html = html.replace(/<\/body>/ig, "</div>")
				html = html.replace(/<body/ig, "<div class='body'")
				return html;
		}
	}
	

})(jQuery);








//Dependencias
// This code was written by Tyler Akins and has been placed in the
// public domain.  It would be nice if you left this header intact.
// Base64 code from Tyler Akins -- http://rumkin.com

var Base64 = (function () {
    var keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

    var obj = {
        /**
         * Encodes a string in base64
         * @param {String} input The string to encode in base64.
         */
        encode: function (input) {
            var output = "";
            var chr1, chr2, chr3;
            var enc1, enc2, enc3, enc4;
            var i = 0;

            do {
                chr1 = input.charCodeAt(i++);
                chr2 = input.charCodeAt(i++);
                chr3 = input.charCodeAt(i++);

                enc1 = chr1 >> 2;
                enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
                enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
                enc4 = chr3 & 63;

                if (isNaN(chr2)) {
                    enc3 = enc4 = 64;
                } else if (isNaN(chr3)) {
                    enc4 = 64;
                }

                output = output + keyStr.charAt(enc1) + keyStr.charAt(enc2) +
                    keyStr.charAt(enc3) + keyStr.charAt(enc4);
            } while (i < input.length);

            return output;
        },

        /**
         * Decodes a base64 string.
         * @param {String} input The string to decode.
         */
        decode: function (input) {
            var output = "";
            var chr1, chr2, chr3;
            var enc1, enc2, enc3, enc4;
            var i = 0;

            // remove all characters that are not A-Z, a-z, 0-9, +, /, or =
            input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

            do {
                enc1 = keyStr.indexOf(input.charAt(i++));
                enc2 = keyStr.indexOf(input.charAt(i++));
                enc3 = keyStr.indexOf(input.charAt(i++));
                enc4 = keyStr.indexOf(input.charAt(i++));

                chr1 = (enc1 << 2) | (enc2 >> 4);
                chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
                chr3 = ((enc3 & 3) << 6) | enc4;

                output = output + String.fromCharCode(chr1);

                if (enc3 != 64) {
                    output = output + String.fromCharCode(chr2);
                }
                if (enc4 != 64) {
                    output = output + String.fromCharCode(chr3);
                }
            } while (i < input.length);

            return output;
        }
    };

    return obj;
})();
