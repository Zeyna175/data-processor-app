#!/bin/bash
# Exit on error
set -e

echo "--- BUILDING BACKEND ---"
pip install -r requirements.txt

echo "--- BUILDING FRONTEND ---"
cd python_Angular

# Install dependencies
npm install

# Build the Angular application
# Note: For Angular 17+, the output is usually in dist/<project-name>/browser
npm run build

cd ..

echo "--- PREPARING STATIC FILES ---"
# Create static directory if it doesn't exist
mkdir -p static

# Clear old static files to ensure a fresh deployment
rm -rf static/*

# Copy build artifacts to Flask static folder
# Adjusting to match Angular 17 output structure
if [ -d "python_Angular/dist/python-angular/browser" ]; then
    cp -r python_Angular/dist/python-angular/browser/* static/
else
    # Fallback for different output structures
    cp -r python_Angular/dist/python-angular/* static/
fi

echo "--- BUILD COMPLETE ---"