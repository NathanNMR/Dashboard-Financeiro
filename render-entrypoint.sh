#!/bin/sh
set -eu

APP_PORT="${PORT:-10000}"

# A imagem oficial php:apache escuta 80 por padrão. No Render, usamos PORT.
sed -ri "s/^Listen [0-9]+$/Listen ${APP_PORT}/" /etc/apache2/ports.conf
sed -ri "s/<VirtualHost \\*:[0-9]+>/<VirtualHost *:${APP_PORT}>/" /etc/apache2/sites-available/000-default.conf

exec apache2-foreground
