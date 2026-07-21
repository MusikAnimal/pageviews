# Local development image only — production runs on Toolforge.
# Based on https://github.com/dunglas/symfony-docker (simplified).
FROM dunglas/frankenphp:1-php8.4

WORKDIR /app

# apcu: cache pools (config/packages/cache.yaml)
# pdo_mysql: Toolforge replica connections
# intl/zip: Symfony + Intuition requirements
RUN install-php-extensions \
	@composer \
	apcu \
	intl \
	opcache \
	pdo_mysql \
	zip

COPY docker/php/app.dev.ini "$PHP_INI_DIR/conf.d/"

# Serve plain HTTP locally; the app is bind-mounted at runtime (see compose.yaml).
ENV SERVER_NAME=":80"
