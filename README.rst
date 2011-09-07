==================================
jQuery XMPP
==================================

Do you want a chat in your web page? Then you probably use .. _XMPP: http://en.wikipedia.org/wiki/Extensible_Messaging_and_Presence_Protocol
There are some opensource and easy to use servers that support this protocol but not for javascript, where the actual XMPP tools are very weighty
because no framework is used and they implement everything.

My idea is use jQuery because ajax support and DOM manipulation is already done, then my work is only create a few functions.


I wanted to do something with arduino and one friend suggested the
posibility of play with n64 using wiimote

The project is based on Gamecube-N64-Controller (I forked it). You can
find technical details there

Description
=========
This plugin allows connect to a XMPP server and also provides handlers for events (message, presence, iq).
You should have a web server redirecting the BOSH connections to the XMPP server.
This plugin only offers the communication so you are free to do you user interface as you want.

At the moment only one instance of XMPP is supported. The authentication methods available are plain and digestMD5

How to use
=========
You should provide to the plugin the jid, password and handlers. Just something like this:
`$(document).xmpp({jid:"user@domain.com", password:"qwerty",
onDisconnect:function(){
...
},onConnect: function(){
...
},
onIq: function(iq){
...
},onMessage: function(message){
...
},onPresence: function(presence){
...
}
});`

Every option except the handlers are required.


Resources
=========
.. _XMPP: http://xmpp.org/
