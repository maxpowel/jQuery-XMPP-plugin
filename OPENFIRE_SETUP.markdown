OPENFIRE SERVER SETUP
==================================

Openfire is a very powerfull and user friendly XMPP server. Use it with this jquery xmpp is very easy, just following this steps for the next 3 minutes

Prerequisites
-------------
Apache web server installed with mod_proxy (installed by default)
Java JRE

Download and install
---------------------
Go to http://www.igniterealtime.org/downloads/index.jsp and download the installer. If you are using Debian (or ubuntu) download the .deb installer and
install it using dpgk -i

Now start the server (if the installation did not init it)
If you used the .deb package you have a script in /etc/init.d/ which can be used to start, restart and stop the openfire server.
The installation is done via web using the port 9090. Open your web browser and go to http://yourhost:9090
Follow the steps and your server is ready to use. You can create a new user and try to log in using pidgin (or any xmpp client)


Configuration
-----------
Now we need to enable BOSH and http binding. The second its already enabled but take care about the port used by openfire.
In the main menu, go to the tab "Server configuration" and enable BOSH. In the same page, you should also remeber the port used for http binding.
In my case it is 7070 but usually is 5280. Anyway, you can take the port number you want. Just remeber it.

Once we have finished configuring the server restart openfire to get some configuration values refreshed (if not, you will take error 500 when doing BOSH requests)

At this point openfire is ready.

The last step is configure mod_proxy of apache.
Open the file proxy.conf (/etc/apache2/mods-available/proxy.conf in Debian/Ubuntu)
Add the following lines

	ProxyPass /http-bind http://127.0.0.1:7070/http-bind/
	ProxyPassReverse /http-bind http://127.0.0.1:7070/http-bind/
	
Please check the port. It must be the same port configured in openfire

Now enable the apache modules

	a2enmod proxy
	a2enmod proxy_http

And restart apache. All configuration is done!

Manage Openfire
----------------
Openfire has a very friendly user interface. You will not have problems with it

Final words
------------
You can use the basic examples provided to test the connection (for example connection.html). Openfire and apache could be in different severs, in this case you only need to edit the
file proxy.conf and restart apache

Resources
=========
[A Website Chat made easy with XMPP and BOSH](http://blog.wolfspelz.de/2010/09/website-chat-made-easy-with-xmpp-and.html)
[Openfire Forum](http://community.igniterealtime.org/thread/49577)


