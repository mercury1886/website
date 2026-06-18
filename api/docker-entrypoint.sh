#!/bin/sh
set -e

if [ ! -f composer.lock ] || [ ! -f vendor/autoload.php ] || [ composer.json -nt composer.lock ] || [ composer.lock -nt vendor/autoload.php ]; then
  composer install --no-interaction --prefer-dist
fi

exec "$@"
