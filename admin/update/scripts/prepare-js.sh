#!/bin/bash
set -e

export PATH="/usr/local/bin:/usr/bin:$PATH"

if ! command -v npx >/dev/null 2>&1; then
  echo "❌ Erreur : npx n'est pas installé ou introuvable dans \$PATH"
  exit 1
fi

# Couleurs pour les logs
RED="\033[0;31m"
GREEN="\033[0;32m"
CYAN="\033[0;36m"
YELLOW="\033[1;33m"
RESET="\033[0m"

TARGET_DIR="$1"
DEBUG_MODE=false

if [[ -z "$TARGET_DIR" || ! -d "$TARGET_DIR" ]]; then
  echo -e "${RED}❌ Dossier cible non spécifié ou invalide.${RESET}"
  echo "Utilisation : prepare-js.sh /chemin/vers/theme [--debug]"
  exit 1
fi

# Mode debug optionnel
if [[ "$2" == "--debug" ]]; then
  DEBUG_MODE=true
  echo -e "${YELLOW}⚠️ Mode DEBUG activé : aucun fichier ne sera écrasé dans le thème.${RESET}"
fi

BUILD_DIR="$TARGET_DIR/js-build"
OBF_DIR="$TARGET_DIR/js-build-obf"

echo -e "${CYAN}🔍 Source          : $TARGET_DIR"
echo -e "🔧 Dossier build   : $BUILD_DIR"
echo -e "🔒 Obfuscation dans : $OBF_DIR${RESET}"

# Nettoyage
echo -e "${CYAN}🧹 Nettoyage des dossiers temporaires...${RESET}"
rm -rf "$BUILD_DIR" "$OBF_DIR"
mkdir -p "$BUILD_DIR"

# Minification avec Terser
echo -e "${CYAN}📦 Minification + suppression console.log...${RESET}"
find "$TARGET_DIR" \( -name "*.js" -o -name "*.mjs" \) \
     ! -path "*/node_modules/*" \
     ! -path "*/.git/*" \
     ! -path "$BUILD_DIR/*" \
     ! -path "$OBF_DIR/*" | while read file; do
  REL_PATH="${file#$TARGET_DIR/}"
  DEST="$BUILD_DIR/$REL_PATH"
  mkdir -p "$(dirname "$DEST")"
  npx terser "$file" \
    --compress drop_console=true,drop_debugger=true \
    --mangle \
    --output "$DEST" \
    || echo -e "${YELLOW}⚠️ Échec de la minification pour : $file${RESET}"
done

# Obfuscation avec javascript-obfuscator
echo -e "${CYAN}🔒 Obfuscation...${RESET}"
npx javascript-obfuscator "$BUILD_DIR" --output "$OBF_DIR" \
  --compact true \
  --control-flow-flattening true \
  --self-defending true

# Remplacement des fichiers (ou affichage debug)
if [ "$DEBUG_MODE" = false ]; then
  echo -e "${CYAN}📁 Remplacement des JS dans ${TARGET_DIR}...${RESET}"
  find "$OBF_DIR" -name "*.js" | while read file; do
    REL_PATH="${file#$OBF_DIR/}"
    cp "$file" "$TARGET_DIR/$REL_PATH"
  done
else
  echo -e "${YELLOW}🚫 DEBUG : les fichiers JS n'ont pas été remplacés.${RESET}"
fi

# Nettoyage temporaire
rm -rf "$BUILD_DIR" "$OBF_DIR"

echo -e "${GREEN}✅ JS minifié et obfusqué avec succès${RESET}"
