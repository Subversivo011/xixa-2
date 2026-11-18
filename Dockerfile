FROM nginx:alpine
COPY . /usr/share/nginx/html
RUN mv /usr/share/nginx/html/deploy/nginx.conf /etc/nginx/conf.d/default.conf \
 && rm -rf /usr/share/nginx/html/deploy
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
