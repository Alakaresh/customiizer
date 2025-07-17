#!/bin/bash

echo "🧨 Synchronisation complète : DROP + CREATE + INSERT (DEV → ACC)..."

# 📄 Chemin du fichier de config PHP (DOIT contenir les constantes définies comme DB_NAME, DB_ACC_NAME, etc.)
CONFIG_PHP="/var/www/vhosts/customiizer.com/httpdocs_dev/wp-config.php"

# 🔁 Lire les constantes PHP depuis wp-config.php
DEV_DB=$(php -r "include '$CONFIG_PHP'; echo DB_NAME;")
DEV_USER=$(php -r "include '$CONFIG_PHP'; echo DB_USER;")
DEV_PASS=$(php -r "include '$CONFIG_PHP'; echo DB_PASSWORD;")

ACC_DB=$(php -r "include '$CONFIG_PHP'; echo DB_ACC_NAME;")
ACC_USER=$(php -r "include '$CONFIG_PHP'; echo DB_ACC_USER;")
ACC_PASS=$(php -r "include '$CONFIG_PHP'; echo DB_ACC_PASSWORD;")
ACC_HOST="localhost"

# 📁 Fichier temporaire
TMP_SQL="/tmp/dev_to_acc_full_reset.sql"
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
  "WPC_missions"
)

# 🚫 Désactivation des contraintes
echo "SET FOREIGN_KEY_CHECKS=0;" >> "$TMP_SQL"

# 🧨 DROP + CREATE (structure complète)
for table in "${TABLES[@]}"; do
  echo "💣 DROP + structure : $table"
  echo "DROP TABLE IF EXISTS \`$table\`;" >> "$TMP_SQL"
  mysqldump -u "$DEV_USER" -p"$DEV_PASS" "$DEV_DB" "$table" \
    --no-data --skip-add-locks --skip-comments --skip-triggers \
    >> "$TMP_SQL"
done

# ➕ INSERT (données)
for table in "${TABLES[@]}"; do
  echo "📤 INSERT : $table"
  mysqldump -u "$DEV_USER" -p"$DEV_PASS" "$DEV_DB" "$table" \
    --no-create-info --skip-triggers --complete-insert \
    --skip-add-locks --skip-disable-keys --default-character-set=utf8mb4 \
    >> "$TMP_SQL"
done

# ✅ Réactivation des contraintes
echo "SET FOREIGN_KEY_CHECKS=1;" >> "$TMP_SQL"

# 🚀 Exécution sur ACC
echo "📥 Import final dans ACC..."
mysql --default-character-set=utf8mb4 -h "$ACC_HOST" -u "$ACC_USER" -p"$ACC_PASS" "$ACC_DB" < "$TMP_SQL"

if [ $? -eq 0 ]; then
  echo "✅ Tables supprimées et recréées avec succès dans ACC."
else
  echo "❌ Échec de la synchronisation complète."
fi
