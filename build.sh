#!/bin/bash
set -e

echo "Installing Python dependencies..."
pip install -r requirements.txt

echo "Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

echo "Building Angular app..."
cd python_Angular
npm install
npm run build
cd ..

echo "Copying static files..."
mkdir -p static
cp -r python_Angular/dist/python-angular/browser/* static/

echo "Build complete!"