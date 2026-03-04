#!/bin/bash
set -e

echo "🔨 Build pour déploiement Render..."

cd python_Angular
echo "📦 Installation des dépendances npm..."
npm install

echo "🏗️ Build Angular production..."
npm run build

echo "📂 Copie vers static/..."
cd ..
rm -rf static/*
cp -r python_Angular/dist/python-angular/browser/* static/

echo "✅ Build terminé ! Prêt pour Render."
