BOSH SERVER SETUP
==================================


We are going to setup a local XMPP server with BOSH. This is a server not a proxy, which means that you can only use local accounts (not gmail or facebook for example).

Download and install
---------------------
The software use is ejabberd, a free server available for linux and windows. I use debian so I just type aptitude install ejabber. Other option is download it from the
project webpage. Once you have downladed and installed try to init the server. In my case /etc/init.d/ejabberd start
Now go to you web browser and type http://localhost:5280/http-bind/
If everything went right a test webpage should be loaded.



Configuration
-----------
The configuration is very easy. Open the config file ejabberd.conf (in my case, this file is located at /etc/ejabberd).
Now we are going to enable BOSH service. Add the module mod_http_bind

       {modules,
        [
         ...
         {mod_http_bind, []},
         ...
       ]},
       
And now http_bind

       {listen, 
        [
         ...
         {5280, ejabberd_http, [
                                http_bind,
                                http_poll,
                                web_admin
                               ]
         },
         ...
       ]},

Now restart ejabberd and the BOSH service is ready!

Manage Ejabberd
----------------

Ejabberd can be manage with the command ejabberdctl
For example, to add a new user
         sudo ejabberdctl register testUser localhost testPassword
Check this command to view all available options
         
Once you have create one user, go to the examples directory and open the file basic-chat.html.
Edit the variable url and put the new url http://localhost:5280/http-bind/
Now load basic-chat.html into your navigator and try to login, you should be able to do it.
Remember that only local users can log in (only users you created with ejabberdctl). If you want
to login with external users you will need a xmpp proxy or other xmpp server (openfire for example)

Resources
=========
[Enable BOSH](https://git.process-one.net/ejabberd/mainline/blobs/raw/v2.1.11/doc/guide.html#modhttpbind)


