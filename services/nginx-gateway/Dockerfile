FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/nginx.conf

RUN apk update && apk upgrade --no-cache && \
    touch /tmp/nginx.pid && \
    mkdir -p /tmp/client_temp /tmp/proxy_temp /tmp/fastcgi_temp /tmp/uwsgi_temp /tmp/scgi_temp /var/run /var/cache/nginx /var/log/nginx && \
    chown -R nginx:nginx /tmp /var/cache/nginx /var/log/nginx /etc/nginx /var/run

USER 101

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
