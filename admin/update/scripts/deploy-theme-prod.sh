#!/bin/bash
set -e

TYPE=${BUMP_TYPE:-patch}
TARGET=${BUMP_TARGET:-frontend}
EXCLUDES=${RSYNC_EXCLUDES:-"wp-config.php,.htaccess"}

SRC="/var/www/vhosts/customiizer.com/httpdocs_dev/wp-content/themes/customiizer/"
BUILD_DIR="/tmp/customiizer-theme-build"
DEST="/var/www/vhosts/customiizer.com/httpdocs/wp-content/themes/customiizer/"

# 👉 Définit l’environnement pour le bump
export DEPLOY_ENV=prod

echo "📌 Incrémentation de version ($TARGET - $TYPE)..."
/usr/bin/php /var/www/vhosts/customiizer.com/httpdocs_dev/wp-content/themes/customiizer/admin/update/bump-version.php type=$TYPE target=$TARGET

echo "🧹 Nettoyage ancien build..."
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

echo "📁 Copie du thème vers le dossier temporaire..."
rsync -a --exclude='.git' "$SRC" "$BUILD_DIR"

# 🔧 Minification si frontend
if [[ "$TARGET" == "frontend" ]]; then
    echo "🛠 Minification JS dans le dossier temporaire..."
    bash "$(dirname "$0")/prepare-js.sh" "$BUILD_DIR"
fi

# Préparer les exclusions
IFS=',' read -ra EXCLUDE_ARRAY <<< "$EXCLUDES"
EXCLUDE_OPTS=""
for path in "${EXCLUDE_ARRAY[@]}"; do
  EXCLUDE_OPTS+="--exclude=${path} "
done

echo "🚫 Exclusions appliquées : $EXCLUDES"
echo "📤 Déploiement du thème vers PROD..."

eval rsync -av --delete $EXCLUDE_OPTS "$BUILD_DIR/" "$DEST"

echo "🧼 Suppression du dossier temporaire..."
rm -rf "$BUILD_DIR"

echo "✅ Déploiement terminé sans toucher aux sources DEV."
