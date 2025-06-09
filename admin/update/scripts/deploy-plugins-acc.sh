#!/bin/bash
set -e
rsync -av --delete \
  /var/www/vhosts/customiizer.com/httpdocs_dev/wp-content/plugins/ \
  /var/www/vhosts/customiizer.com/httpdocs_acc/wp-content/plugins/

echo "✅ Extensions mises à jour."
