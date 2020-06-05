### Come hang out in web chat land
live at:
webchatland.aaron.work

Demo video: https://www.youtube.com/watch?v=aYpq589IFCs

To run:

```
npm install
node signaling-server.js
```

Then open localhost:38000 in your browser!

You can join a "private" channel by adding a url parameter:

localhost:38000?channel=my_channel_name

If you want to host on your own server, here's the nginx conf that i used to reverse proxy both socket and express (static files) through ssl:

```
server {
  server_name webchatland.aaron.work;

  listen 443;
  listen [::]:443;

  ssl on;
   ssl_certificate     /etc/letsencrypt/live/webchatland.aaron.work/fullchain.pem;  # generate this with `apt install letsencrypt; letsencrypt certonly zulip.yourdomain.com`
    ssl_certificate_key /etc/letsencrypt/live/webchatland.aaron.work/privkey.pem;

  location / {
    proxy_pass http://localhost:38000;
  }
  
  location /socket.io/ {
  proxy_pass http://localhost:38001;
  proxy_redirect off;
  proxy_http_version      1.1;
  proxy_set_header        Upgrade                 $http_upgrade;
  proxy_set_header        Connection              "upgrade";
  proxy_set_header        Host                    $host;
  proxy_set_header        X-Real-IP               $remote_addr;
  proxy_set_header        X-Forwarded-For         $proxy_add_x_forwarded_for;
  }
}
```
