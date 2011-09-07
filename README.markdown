jQuery XMPP
==================================


If you have a chat application in your web page then you probably are using [XMPP](http://en.wikipedia.org/wiki/Extensible_Messaging_and_Presence_Protocol)
There are some opensource and easy to use servers that support this protocol but not for javascript, where the actual XMPP tools are very weighty
because no framework is used and they implement everything.

My idea is use jQuery because ajax support and DOM manipulation is already done, then my work is only create a few functions.



Description
-----------
This plugin allows connect to a XMPP server and also provides handlers for events (message, presence, iq).
You should have a web server redirecting the BOSH connections to the XMPP server.
This plugin only offers the communication so you are free to do you user interface as you want.

At the moment only one instance of XMPP is supported. The authentication methods available are plain and digestMD5



How to use
==========


Initialization
--------------

You should provide to the plugin the jid, password and handlers. Just something like this:

       $.xmpp.connect({jid:"user@domain.com", password:"qwerty",
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
       });



Every option except the handlers are required. Usually are only used onMessage and onPresence handlers.

The object sent to every handler is the full XMPP object. Such xmpp is just XML you can access to the data like you do with the DOM elements.
For example, when you receive a text message the full message is something like this:

       <body xmlns="http://jabber.org/protocol/httpbind">
           <message from="aa@bb.com" to="aafriend@bb.com" type="chat">
                <body>Ey!!!</body>
           </message>
       </body>

Then, you can use "find" to get the text message o "attribute" to get the attributes. In this example, we can get the "from" like this:

     message = $(message).find("message");
     var from = message.attr("from"); 



Sending commands
----------------

Send a text message
     `$.xmpp.sendMessage({message: "Hey dude!", to:"someone@somewhere.com"});`

Setting a presence
     `$.xmpp.setPresence("online");`

Remember that after connect you should set presence to online if you want be visible by your contacts.

The common presence types are:

*   online

*   offline

*   dnd (do not disturb)

*   away



Resources
=========
[XMPP home page](http://xmpp.org/)
[jQuery Plugin Page](http://plugins.jquery.com/project/xmpp-lib)

