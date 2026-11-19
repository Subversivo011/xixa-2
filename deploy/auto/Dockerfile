FROM docker:27-cli
RUN apk add --no-cache git
COPY deployer.sh /usr/local/bin/deployer.sh
COPY stack.main.yml /config/stack.main.yml
COPY stack.dev.yml /config/stack.dev.yml
RUN chmod +x /usr/local/bin/deployer.sh
CMD ["/usr/local/bin/deployer.sh"]
