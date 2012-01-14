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
	onPresence: null,
	connections: 0,
	resource: null,
	/**
	 * Connect to the server
	 * @params Object 
	 *        {jid:"user@domain.com",
	 *          password:"qwerty",
	 * 			resource:"Chat",
	 *          onDisconnect:function(){},
	 *          onConnect: function(data){},
	 *          onIq: function(iq){},
     *          onMessage: function(message){},
     *          onPresence: function(presence){}
     * 			onConnectionFailed: function(data){}
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
				
			var resource;
			if(options.resource == null)
				this.resource = "";
			else
				this.resource = options.resource;
			
			//Events
			this.onMessage = options.onMessage;
			this.onIq = options.onIq;
			this.onPresence = options.onPresence;
			
			//Init connection
			var msg = "<body rid='"+this.rid+"' xmlns='http://jabber.org/protocol/httpbind' to='"+domain+"' xml:lang='en' wait='60' hold='1' content='text/xml; charset=utf-8' ver='1.6' xmpp:version='1.0' xmlns:xmpp='urn:xmpp:xbosh'/>";
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
		
		loginDigestMD5: function(options){
			
			var xmpp = this;
			this.rid++;
			var msg = "<body rid='"+this.rid+"' xmlns='http://jabber.org/protocol/httpbind' sid='"+this.sid+"'><auth xmlns='urn:ietf:params:xml:ns:xmpp-sasl' mechanism='DIGEST-MD5'/></body>";
			$.post(this.url,msg,function(data){
				var response = $(data);

				var split = options.jid.split("@");
				var domain = split[1];
				var username = split[0];
				
				//Code bases on Strophe
				var attribMatch = /([a-z]+)=("[^"]+"|[^,"]+)(?:,|$)/;

				var challenge = Base64.decode(response.text());
				
				var cnonce = MD5.hexdigest("" + (Math.random() * 1234567890));
				var realm = "";
				var host = null;
				var nonce = "";
				var qop = "";
				var matches;

				while (challenge.match(attribMatch)) {
					matches = challenge.match(attribMatch);
					challenge = challenge.replace(matches[0], "");
					matches[2] = matches[2].replace(/^"(.+)"$/, "$1");
					switch (matches[1]) {
					case "realm":
						realm = matches[2];
						break;
					case "nonce":
						nonce = matches[2];
						break;
					case "qop":
						qop = matches[2];
						break;
					case "host":
						host = matches[2];
						break;
					}
				}

				var digest_uri = "xmpp/" + domain;
				if (host !== null) {
					digest_uri = digest_uri + "/" + host;
				}
				
				var A1 = MD5.hash(username +
								  ":" + realm + ":" + options.password) +
					":" + nonce + ":" + cnonce;
				var A2 = 'AUTHENTICATE:' + digest_uri;

				var responseText = "";
				responseText += 'username=' +
					xmpp._quote(username) + ',';
				responseText += 'realm=' + xmpp._quote(realm) + ',';
				responseText += 'nonce=' + xmpp._quote(nonce) + ',';
				responseText += 'cnonce=' + xmpp._quote(cnonce) + ',';
				responseText += 'nc="00000001",';
				responseText += 'qop="auth",';
				responseText += 'digest-uri=' + xmpp._quote(digest_uri) + ',';
				responseText += 'response=' + xmpp._quote(
					MD5.hexdigest(MD5.hexdigest(A1) + ":" +
								  nonce + ":00000001:" +
								  cnonce + ":auth:" +
								  MD5.hexdigest(A2))) + ',';
				responseText += 'charset="utf-8"';
				console.log(responseText);
				//
				//Try o authenticate
				xmpp.rid++;
				var msg ="<body rid='"+xmpp.rid+"' xmlns='http://jabber.org/protocol/httpbind' sid='"+xmpp.sid+"'><response xmlns='urn:ietf:params:xml:ns:xmpp-sasl'>"+Base64.encode(responseText)+"</response></body>";
				$.post(this.url,msg,function(data){
					//var response = $(data);
					xmpp.rid++;
					var msg ="<body rid='"+xmpp.rid+"' xmlns='http://jabber.org/protocol/httpbind' sid='"+xmpp.sid+"'><response xmlns='urn:ietf:params:xml:ns:xmpp-sasl'/></body>";
					$.post(this.url,msg,function(data){
						console.log(data);
						//var response = $(data);
						//xmpp.rid++;
						//var msg ="<body rid='"+xmpp.rid+"' xmlns='http://jabber.org/protocol/httpbind' sid='"+xmpp.sid+"'><response xmlns='urn:ietf:params:xml:ns:xmpp-sasl'/></body>";
					}, 'text');
				}, 'text');
				
			}, 'text');
		},
		
		/**
		 * Returns the quoted string
		 * @prams string
		 * @return quoted string
		 */
		_quote: function(string){
			return '"'+string+'"';
		},
		/**
		 * Do a plain authentication
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
						text ="<body rid='"+xmpp.rid+"' xmlns='http://jabber.org/protocol/httpbind' sid='"+xmpp.sid+"'><iq type='set' id='_bind_auth_2' xmlns='jabber:client'><bind xmlns='urn:ietf:params:xml:ns:xmpp-bind'><resource>" + xmpp.resource +"</resource></bind></iq></body>";
						$.post(url,text,function(data){
							//xmpp.messageHandler(data);
							xmpp.rid++;
							text = "<body rid='"+xmpp.rid+"' xmlns='http://jabber.org/protocol/httpbind' sid='"+xmpp.sid+"'><iq type='set' id='_session_auth_2' xmlns='jabber:client'><session xmlns='urn:ietf:params:xml:ns:xmpp-session'/></iq></body>";
							$.post(url,text,function(data){
								if(options.onConnect != null)
										options.onConnect(data);
										
								xmpp.listen();
							}, 'text');
						}, 'text');
					}, 'text');
				}else{
					 if(options.onConnectionFailed != null)
						options.onConnecttionFailed(data);
				}
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
		 *         {body: "Hey dude!",
		 * 			to: "someone@somewhere.com"
		 * 			resource: "Chat"}
		 */
		sendMessage: function(options){
			var xmpp = this;
			var resource;
			var toJid = options.to;
			
			if(options.resource != null)
				toJid = toJid+"/"+options.resource;
			else if(this.resource != "")
				toJid = toJid+"/"+this.resource;
			
			xmpp.rid = xmpp.rid + 1;
			this.listening = true;
			xmpp.connections = xmpp.connections + 1;
			msg = "<body rid='"+xmpp.rid+"' xmlns='http://jabber.org/protocol/httpbind' sid='"+xmpp.sid+"'><message type='chat' to='"+toJid+"' xmlns='jabber:client'><body>"+options.body+"</body></message></body>";
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


/*
 * A JavaScript implementation of the RSA Data Security, Inc. MD5 Message
 * Digest Algorithm, as defined in RFC 1321.
 * Version 2.1 Copyright (C) Paul Johnston 1999 - 2002.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for more info.
 */

var MD5 = (function () {
    /*
     * Configurable variables. You may need to tweak these to be compatible with
     * the server-side, but the defaults work in most cases.
     */
    var hexcase = 0;  /* hex output format. 0 - lowercase; 1 - uppercase */
    var b64pad  = ""; /* base-64 pad character. "=" for strict RFC compliance */
    var chrsz   = 8;  /* bits per input character. 8 - ASCII; 16 - Unicode */

    /*
     * Add integers, wrapping at 2^32. This uses 16-bit operations internally
     * to work around bugs in some JS interpreters.
     */
    var safe_add = function (x, y) {
        var lsw = (x & 0xFFFF) + (y & 0xFFFF);
        var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
        return (msw << 16) | (lsw & 0xFFFF);
    };

    /*
     * Bitwise rotate a 32-bit number to the left.
     */
    var bit_rol = function (num, cnt) {
        return (num << cnt) | (num >>> (32 - cnt));
    };

    /*
     * Convert a string to an array of little-endian words
     * If chrsz is ASCII, characters >255 have their hi-byte silently ignored.
     */
    var str2binl = function (str) {
        var bin = [];
        var mask = (1 << chrsz) - 1;
        for(var i = 0; i < str.length * chrsz; i += chrsz)
        {
            bin[i>>5] |= (str.charCodeAt(i / chrsz) & mask) << (i%32);
        }
        return bin;
    };

    /*
     * Convert an array of little-endian words to a string
     */
    var binl2str = function (bin) {
        var str = "";
        var mask = (1 << chrsz) - 1;
        for(var i = 0; i < bin.length * 32; i += chrsz)
        {
            str += String.fromCharCode((bin[i>>5] >>> (i % 32)) & mask);
        }
        return str;
    };

    /*
     * Convert an array of little-endian words to a hex string.
     */
    var binl2hex = function (binarray) {
        var hex_tab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
        var str = "";
        for(var i = 0; i < binarray.length * 4; i++)
        {
            str += hex_tab.charAt((binarray[i>>2] >> ((i%4)*8+4)) & 0xF) +
                hex_tab.charAt((binarray[i>>2] >> ((i%4)*8  )) & 0xF);
        }
        return str;
    };

    /*
     * Convert an array of little-endian words to a base-64 string
     */
    var binl2b64 = function (binarray) {
        var tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        var str = "";
        var triplet, j;
        for(var i = 0; i < binarray.length * 4; i += 3)
        {
            triplet = (((binarray[i   >> 2] >> 8 * ( i   %4)) & 0xFF) << 16) |
                (((binarray[i+1 >> 2] >> 8 * ((i+1)%4)) & 0xFF) << 8 ) |
                ((binarray[i+2 >> 2] >> 8 * ((i+2)%4)) & 0xFF);
            for(j = 0; j < 4; j++)
            {
                if(i * 8 + j * 6 > binarray.length * 32) { str += b64pad; }
                else { str += tab.charAt((triplet >> 6*(3-j)) & 0x3F); }
            }
        }
        return str;
    };

    /*
     * These functions implement the four basic operations the algorithm uses.
     */
    var md5_cmn = function (q, a, b, x, s, t) {
        return safe_add(bit_rol(safe_add(safe_add(a, q),safe_add(x, t)), s),b);
    };

    var md5_ff = function (a, b, c, d, x, s, t) {
        return md5_cmn((b & c) | ((~b) & d), a, b, x, s, t);
    };

    var md5_gg = function (a, b, c, d, x, s, t) {
        return md5_cmn((b & d) | (c & (~d)), a, b, x, s, t);
    };

    var md5_hh = function (a, b, c, d, x, s, t) {
        return md5_cmn(b ^ c ^ d, a, b, x, s, t);
    };

    var md5_ii = function (a, b, c, d, x, s, t) {
        return md5_cmn(c ^ (b | (~d)), a, b, x, s, t);
    };

    /*
     * Calculate the MD5 of an array of little-endian words, and a bit length
     */
    var core_md5 = function (x, len) {
        /* append padding */
        x[len >> 5] |= 0x80 << ((len) % 32);
        x[(((len + 64) >>> 9) << 4) + 14] = len;

        var a =  1732584193;
        var b = -271733879;
        var c = -1732584194;
        var d =  271733878;

        var olda, oldb, oldc, oldd;
        for (var i = 0; i < x.length; i += 16)
        {
            olda = a;
            oldb = b;
            oldc = c;
            oldd = d;

            a = md5_ff(a, b, c, d, x[i+ 0], 7 , -680876936);
            d = md5_ff(d, a, b, c, x[i+ 1], 12, -389564586);
            c = md5_ff(c, d, a, b, x[i+ 2], 17,  606105819);
            b = md5_ff(b, c, d, a, x[i+ 3], 22, -1044525330);
            a = md5_ff(a, b, c, d, x[i+ 4], 7 , -176418897);
            d = md5_ff(d, a, b, c, x[i+ 5], 12,  1200080426);
            c = md5_ff(c, d, a, b, x[i+ 6], 17, -1473231341);
            b = md5_ff(b, c, d, a, x[i+ 7], 22, -45705983);
            a = md5_ff(a, b, c, d, x[i+ 8], 7 ,  1770035416);
            d = md5_ff(d, a, b, c, x[i+ 9], 12, -1958414417);
            c = md5_ff(c, d, a, b, x[i+10], 17, -42063);
            b = md5_ff(b, c, d, a, x[i+11], 22, -1990404162);
            a = md5_ff(a, b, c, d, x[i+12], 7 ,  1804603682);
            d = md5_ff(d, a, b, c, x[i+13], 12, -40341101);
            c = md5_ff(c, d, a, b, x[i+14], 17, -1502002290);
            b = md5_ff(b, c, d, a, x[i+15], 22,  1236535329);

            a = md5_gg(a, b, c, d, x[i+ 1], 5 , -165796510);
            d = md5_gg(d, a, b, c, x[i+ 6], 9 , -1069501632);
            c = md5_gg(c, d, a, b, x[i+11], 14,  643717713);
            b = md5_gg(b, c, d, a, x[i+ 0], 20, -373897302);
            a = md5_gg(a, b, c, d, x[i+ 5], 5 , -701558691);
            d = md5_gg(d, a, b, c, x[i+10], 9 ,  38016083);
            c = md5_gg(c, d, a, b, x[i+15], 14, -660478335);
            b = md5_gg(b, c, d, a, x[i+ 4], 20, -405537848);
            a = md5_gg(a, b, c, d, x[i+ 9], 5 ,  568446438);
            d = md5_gg(d, a, b, c, x[i+14], 9 , -1019803690);
            c = md5_gg(c, d, a, b, x[i+ 3], 14, -187363961);
            b = md5_gg(b, c, d, a, x[i+ 8], 20,  1163531501);
            a = md5_gg(a, b, c, d, x[i+13], 5 , -1444681467);
            d = md5_gg(d, a, b, c, x[i+ 2], 9 , -51403784);
            c = md5_gg(c, d, a, b, x[i+ 7], 14,  1735328473);
            b = md5_gg(b, c, d, a, x[i+12], 20, -1926607734);

            a = md5_hh(a, b, c, d, x[i+ 5], 4 , -378558);
            d = md5_hh(d, a, b, c, x[i+ 8], 11, -2022574463);
            c = md5_hh(c, d, a, b, x[i+11], 16,  1839030562);
            b = md5_hh(b, c, d, a, x[i+14], 23, -35309556);
            a = md5_hh(a, b, c, d, x[i+ 1], 4 , -1530992060);
            d = md5_hh(d, a, b, c, x[i+ 4], 11,  1272893353);
            c = md5_hh(c, d, a, b, x[i+ 7], 16, -155497632);
            b = md5_hh(b, c, d, a, x[i+10], 23, -1094730640);
            a = md5_hh(a, b, c, d, x[i+13], 4 ,  681279174);
            d = md5_hh(d, a, b, c, x[i+ 0], 11, -358537222);
            c = md5_hh(c, d, a, b, x[i+ 3], 16, -722521979);
            b = md5_hh(b, c, d, a, x[i+ 6], 23,  76029189);
            a = md5_hh(a, b, c, d, x[i+ 9], 4 , -640364487);
            d = md5_hh(d, a, b, c, x[i+12], 11, -421815835);
            c = md5_hh(c, d, a, b, x[i+15], 16,  530742520);
            b = md5_hh(b, c, d, a, x[i+ 2], 23, -995338651);

            a = md5_ii(a, b, c, d, x[i+ 0], 6 , -198630844);
            d = md5_ii(d, a, b, c, x[i+ 7], 10,  1126891415);
            c = md5_ii(c, d, a, b, x[i+14], 15, -1416354905);
            b = md5_ii(b, c, d, a, x[i+ 5], 21, -57434055);
            a = md5_ii(a, b, c, d, x[i+12], 6 ,  1700485571);
            d = md5_ii(d, a, b, c, x[i+ 3], 10, -1894986606);
            c = md5_ii(c, d, a, b, x[i+10], 15, -1051523);
            b = md5_ii(b, c, d, a, x[i+ 1], 21, -2054922799);
            a = md5_ii(a, b, c, d, x[i+ 8], 6 ,  1873313359);
            d = md5_ii(d, a, b, c, x[i+15], 10, -30611744);
            c = md5_ii(c, d, a, b, x[i+ 6], 15, -1560198380);
            b = md5_ii(b, c, d, a, x[i+13], 21,  1309151649);
            a = md5_ii(a, b, c, d, x[i+ 4], 6 , -145523070);
            d = md5_ii(d, a, b, c, x[i+11], 10, -1120210379);
            c = md5_ii(c, d, a, b, x[i+ 2], 15,  718787259);
            b = md5_ii(b, c, d, a, x[i+ 9], 21, -343485551);

            a = safe_add(a, olda);
            b = safe_add(b, oldb);
            c = safe_add(c, oldc);
            d = safe_add(d, oldd);
        }
        return [a, b, c, d];
    };


    /*
     * Calculate the HMAC-MD5, of a key and some data
     */
    var core_hmac_md5 = function (key, data) {
        var bkey = str2binl(key);
        if(bkey.length > 16) { bkey = core_md5(bkey, key.length * chrsz); }

        var ipad = new Array(16), opad = new Array(16);
        for(var i = 0; i < 16; i++)
        {
            ipad[i] = bkey[i] ^ 0x36363636;
            opad[i] = bkey[i] ^ 0x5C5C5C5C;
        }

        var hash = core_md5(ipad.concat(str2binl(data)), 512 + data.length * chrsz);
        return core_md5(opad.concat(hash), 512 + 128);
    };

    var obj = {
        /*
         * These are the functions you'll usually want to call.
         * They take string arguments and return either hex or base-64 encoded
         * strings.
         */
        hexdigest: function (s) {
            return binl2hex(core_md5(str2binl(s), s.length * chrsz));
        },

        b64digest: function (s) {
            return binl2b64(core_md5(str2binl(s), s.length * chrsz));
        },

        hash: function (s) {
            return binl2str(core_md5(str2binl(s), s.length * chrsz));
        },

        hmac_hexdigest: function (key, data) {
            return binl2hex(core_hmac_md5(key, data));
        },

        hmac_b64digest: function (key, data) {
            return binl2b64(core_hmac_md5(key, data));
        },

        hmac_hash: function (key, data) {
            return binl2str(core_hmac_md5(key, data));
        },

        /*
         * Perform a simple self-test to see if the VM is working
         */
        test: function () {
            return MD5.hexdigest("abc") === "900150983cd24fb0d6963f7d28e17f72";
        }
    };

    return obj;
})();

