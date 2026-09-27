FROM php:8.3-apache

RUN docker-php-ext-install pdo_mysql \
    && a2enmod headers rewrite

ENV APACHE_DOCUMENT_ROOT=/var/www/html

WORKDIR /var/www/html
COPY backend/ /var/www/html/

RUN chown -R www-data:www-data /var/www/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD php -r 'exit(@file_get_contents("http://127.0.0.1/api/health.php") === false ? 1 : 0);'

CMD ["sh", "-c", "if [ \"$RUN_DB_MIGRATION\" = \"1\" ]; then php scripts/migrate.php || exit 1; fi; exec apache2-foreground"]
