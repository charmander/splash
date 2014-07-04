GNUTLS_CERTTOOL := certtool
SITE_NAME := splash

.PHONY: all
all: $(SITE_NAME).crt nginx.conf app.conf

ca.key:
	$(GNUTLS_CERTTOOL) --generate-privkey --hash sha256 --bits 4096 --outfile ca.key

ca.crt: ca.key ca.cfg
	$(GNUTLS_CERTTOOL) --generate-self-signed \
		--load-privkey ca.key \
		--template ca.cfg \
		--outfile ca.crt

$(SITE_NAME).key: ca.crt
	$(GNUTLS_CERTTOOL) --generate-privkey --hash sha256 --bits 4096 --outfile $(SITE_NAME).key

$(SITE_NAME).csr: $(SITE_NAME).key cert.cfg
	$(GNUTLS_CERTTOOL) --generate-request \
		--load-privkey $(SITE_NAME).key \
		--template cert.cfg \
		--outfile $(SITE_NAME).csr

$(SITE_NAME).crt: $(SITE_NAME).csr cert.cfg
	$(GNUTLS_CERTTOOL) --generate-certificate \
		--load-ca-certificate ca.crt \
		--load-ca-privkey ca.key \
		--load-request $(SITE_NAME).csr \
		--template cert.cfg \
		--outfile $(SITE_NAME).crt

nginx.conf: nginx.conf.template template.js
	node template \
		username=$(shell whoami) \
		< nginx.conf.template > nginx.conf

app.conf: app.conf.template template.js
	node template \
		certificate_name=$(SITE_NAME) \
		/path/to/app=$(shell dirname $$(pwd)) \
		< app.conf.template > app.conf

.PHONY: clean
clean:
	rm -f ca.key ca.crt $(SITE_NAME).key $(SITE_NAME).csr $(SITE_NAME).crt nginx.conf app.conf

.PHONY: install
install: $(SITE_NAME).key $(SITE_NAME).crt nginx.conf
	@! test -z $(NGINX_CONF_DIR) || ! echo 'NGINX_CONF_DIR is required.'

	test -d $(NGINX_CONF_DIR)/../sites-available || mkdir $(NGINX_CONF_DIR)/../sites-available
	test -d $(NGINX_CONF_DIR)/../sites-enabled || mkdir $(NGINX_CONF_DIR)/../sites-enabled

	cp -i nginx.conf $(NGINX_CONF_DIR)
	cp $(SITE_NAME).key $(SITE_NAME).crt $(NGINX_CONF_DIR)
	cp app.conf $(NGINX_CONF_DIR)/../sites-available/$(SITE_NAME)

	ln -sf ../sites-available/$(SITE_NAME) $(NGINX_CONF_DIR)/../sites-enabled/
