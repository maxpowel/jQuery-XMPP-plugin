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

       $.xmpp.connect({resource:"MyChat", jid:"user@domain.com", password:"qwerty", url:"http://myboshservice.com/http-bind"
       onDisconnect:function(){
          alert("Disconnected");
       },onConnect: function(){
            $.xmpp.setPresence(null);
            console.log("Connected");
       },
       onIq: function(iq){
           console.log(iq);
       },onMessage: function(message){
            console.log("New message of " + message.from + ": "+message.body);
       },onPresence: function(presence){
            console.log("New presence of " + presence.from + " is "+presence.show);
       },onError: function(error){
            console.log("Error: "+error);
       }
       });


The options jid and password are required. Usually are used onMessage and onPresence handlers.


The object sent to onMessage is:
     `{from:"user@server.com/resource", to:"receiver@aaa.com", body:"Ey!"}`
If message.body is null it means that is a composing notification message (the other person is writing a message)
       
The object sent to onPresence is:
     `{from:"user@server.com", to:"receiver@aaa.com", show:"away"}`
The normal values for "show" are: away, dnd (do not disturb) and null (online)
       
       
The object sent to onIQ is the full XMPP object. Such xmpp is just XML you can access to the data like you do with the DOM elements.
For example, when you receive a text message the full message is something like this:

       <body xmlns="http://jabber.org/protocol/httpbind">
           <iq from="aa@bb.com" to="aafriend@bb.com" otherAttr="value">
                <something>TEXT</something>
           </iq>
       </body>

Then, you can use "find" to get the contents o "attribute" to get the attributes. In this example, we can get the value of the tag something like this:

     value = $(iq).find("something").html();



Sending commands
----------------

Send a basic text message
     `$.xmpp.sendMessage({message: "Hey dude!", to:"someone@somewhere.com", resource:"MyChat"});`
Resource parameer is optional and instead of this parameter you can add the resource to the "to" parameter (to:"someone@somewhere.com/MyChat"). Take care of not use resource parameter on initialization if you want to use the second way.
This resource parameter overrides the resource value provided on initialization (if any).

Send a more complex text message

       $.xmpp.sendMessage({message: "Hey dude!", to:"someone@somewhere.com", resource:"MyChat", otherAttr:"value"},
       "<error>My custom error</error>",function(){ alert("Message sent!"); });
       
This command will send the text message and the object specified in the second parameter. The final message will be something like this:

       <message type='chat' to='someone@somewhere.com/MyChat' otherAttr='value' xmlns='jabber:client'>
       <body>Hey dude!</body><error>My custom error</error></message>
       
The second (optional) parameter is useful for notice errors or extra information.

Setting a presence
     `$.xmpp.setPresence(null);`
     
     
Send a generic command
     `$.xmpp.sendCommand(rawCommand, callback);`
The raw command is the xmpp command plain text. For example, send command uses this methos as:
     `$.xmpp.sendCommand("<message><body>Hey dude!</body></message>", callback);`
     
Using this method you can send any command like iq or your custom commands.
Also, you can use it if you need to use a more complex sendMessage method (just generate the xml content and send it through sendCommand).
Or you can use this method to provide more helpers (like sendMessage or setPresence) and improve the library!



NOTE: Remember that after connect you should set presence to online (null) if you want be visible by your contacts.

The common presence types are:

*   null (null value, not the string "null") to set the presence to online

*   offline

*   dnd (do not disturb)

*   away

Handlers
-----------
By default only message, iq and presence commands are captured. If you are using you own message types (when using sendCommand method) you should capture it by modifying the `messageHandler` method
For example you are using a custom command called "notification". In this case, you need to append following code to messageHandler

       $.each(response.find("notification"),function(i,element){
       try{
           var e = $(element);
               xmpp.onNotification({from: e.attr("from"), to: e.attr("to"), text: e.find("text").text()});
           }catch(e){}
       });

Of course, you need to provide the onNotification event on initialization

       $.xmpp.connect({resource:"MyChat", jid:"user@domain.com", password:"qwerty", url:"http://myboshservice.com/http-bind"
       onConnect: function(){
            $.xmpp.setPresence(null);
            console.log("Connected");
       },
       onNotification: function(notification){
           console.log("My custom command received!");
           console.log(notification);
       },onMessage: function(message){
            console.log("New message of " + message.from + ": "+message.body);
       }
       });

Resources
=========
[XMPP home page](http://xmpp.org/)
[jQuery Plugin Page](http://plugins.jquery.com/project/xmpp-lib)

