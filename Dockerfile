FROM php:8.3-apache

RUN apt-get update && apt-get install -y --no-install-recommends libcurl4-openssl-dev \
    && docker-php-ext-install pdo_mysql curl \
    && rm -rf /var/lib/apt/lists/* \
    && a2enmod headers rewrite setenvif \
    && sed -i 's/Listen 80/Listen 10000/' /etc/apache2/ports.conf \
    && sed -i 's/<VirtualHost \*:80>/<VirtualHost *:10000>/' /etc/apache2/sites-available/000-default.conf \
    && printf '\nSetEnvIfNoCase Authorization "(.+)" HTTP_AUTHORIZATION=$1\n' > /etc/apache2/conf-available/forward-authorization.conf \
    && a2enconf forward-authorization

ENV APACHE_DOCUMENT_ROOT=/var/www/html
ENV PORT=10000

WORKDIR /var/www/html
COPY backend/ /var/www/html/

RUN chown -R www-data:www-data /var/www/html

EXPOSE 10000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD php -r 'exit(@file_get_contents("http://127.0.0.1:10000/api/health.php") === false ? 1 : 0);'

CMD ["sh", "-c", "if [ \"$RUN_DB_MIGRATION\" = \"1\" ]; then php scripts/migrate.php || exit 1; fi; exec apache2-foreground"]
