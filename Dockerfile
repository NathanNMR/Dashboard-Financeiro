FROM php:8.3-apache

RUN docker-php-ext-install pdo_mysql \
    && a2enmod headers rewrite

ENV PORT=10000
ENV APACHE_DOCUMENT_ROOT=/var/www/html

WORKDIR /var/www/html

# Copia somente os arquivos necessários para executar a API.
COPY api/ /var/www/html/api/
COPY lib/ /var/www/html/lib/
COPY scripts/ /var/www/html/scripts/
COPY bootstrap.php config.example.php schema.sql .htaccess /var/www/html/
COPY render-entrypoint.sh /usr/local/bin/render-entrypoint.sh

RUN chown -R www-data:www-data /var/www/html \
    && chmod +x /usr/local/bin/render-entrypoint.sh

EXPOSE 10000

CMD ["/usr/local/bin/render-entrypoint.sh"]
