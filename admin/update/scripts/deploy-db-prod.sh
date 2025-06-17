#!/bin/bash

echo "🧨 Synchronisation complète : DROP + CREATE + INSERT (DEV → PROD)..."

# 📄 Chemin vers le wp-config contenant toutes les constantes
CONFIG_PHP="/var/www/vhosts/customiizer.com/httpdocs_dev/wp-config.php"

# 🔁 Extraction dynamique depuis wp-config.php
DEV_DB=$(php -r "include '$CONFIG_PHP'; echo DB_NAME;")
DEV_USER=$(php -r "include '$CONFIG_PHP'; echo DB_USER;")
DEV_PASS=$(php -r "include '$CONFIG_PHP'; echo DB_PASSWORD;")

PROD_DB=$(php -r "include '$CONFIG_PHP'; echo DB_PROD_NAME;")
PROD_USER=$(php -r "include '$CONFIG_PHP'; echo DB_PROD_USER;")
PROD_PASS=$(php -r "include '$CONFIG_PHP'; echo DB_PROD_PASSWORD;")
PROD_HOST="localhost" # Change-le si distant

# 📁 Fichier temporaire
TMP_SQL="/tmp/dev_to_prod_full_reset.sql"
> "$TMP_SQL"

# 🗂️ Tables à resynchroniser totalement
TABLES=(
  "WPC_variants"
  "WPC_variant_mockup"
  "WPC_variant_prices"
  "WPC_variant_print"
  "WPC_variant_stock"
  "WPC_variant_templates"
  "WPC_products"
  "WPC_suppliers"
)

# 🚫 Désactivation des contraintes
echo "SET FOREIGN_KEY_CHECKS=0;" >> "$TMP_SQL"

# 🧨 DROP + CREATE (structure)
for table in "${TABLES[@]}"; do
  echo "💣 DROP + structure : $table"
  echo "DROP TABLE IF EXISTS \`$table\`;" >> "$TMP_SQL"
  mysqldump -u "$DEV_USER" -p"$DEV_PASS" "$DEV_DB" "$table" \
    --no-data --skip-add-locks --skip-comments --skip-triggers \
    >> "$TMP_SQL"
done

# ➕ INSERT (data)
for table in "${TABLES[@]}"; do
  echo "📤 INSERT : $table"
  mysqldump -u "$DEV_USER" -p"$DEV_PASS" "$DEV_DB" "$table" \
    --no-create-info --skip-triggers --complete-insert \
    --skip-add-locks --skip-disable-keys --skip-set-charset \
    >> "$TMP_SQL"
done

# ✅ Réactivation des contraintes
echo "SET FOREIGN_KEY_CHECKS=1;" >> "$TMP_SQL"

# 🚀 Exécution sur PROD
echo "📥 Import final dans PROD..."
mysql -h "$PROD_HOST" -u "$PROD_USER" -p"$PROD_PASS" "$PROD_DB" < "$TMP_SQL"

if [ $? -eq 0 ]; then
  echo "✅ Tables supprimées et recréées avec succès dans PROD."
else
  echo "❌ Échec de la synchronisation complète PROD."
fi
