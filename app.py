from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
from data_processor import DataProcessor
import os
from pathlib import Path
import pandas as pd
from werkzeug.utils import secure_filename

# Chemin absolu vers les fichiers statiques
static_folder = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static')
print(f"Static folder path: {static_folder}")
print(f"Static folder exists: {os.path.exists(static_folder)}")

app = Flask(__name__, static_folder=static_folder, static_url_path='')
CORS(app)  # Autorise toutes les origines pour le déploiement

UPLOAD_FOLDER = 'uploads'
PROCESSED_FOLDER = 'processed'
ALLOWED_EXTENSIONS = {'csv', 'xlsx', 'xls', 'json', 'xml'}  # Retiré 'ods'

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(PROCESSED_FOLDER, exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['PROCESSED_FOLDER'] = PROCESSED_FOLDER

processor = DataProcessor()

def allowed_file(filename):
    has_dot = '.' in filename
    if has_dot:
        extension = filename.rsplit('.', 1)[1].lower()
        is_allowed = extension in ALLOWED_EXTENSIONS
        print(f"Fichier: {filename}, Extension: {extension}, Autorisé: {is_allowed}")
        return is_allowed
    else:
        print(f"Fichier sans extension: {filename}")
        return False

@app.route('/api/upload', methods=['POST', 'OPTIONS'])
def upload_file():
    if request.method == 'OPTIONS':
        return '', 200
        
    print(f"Requête reçue: {request.method}")
    print(f"Fichiers: {request.files}")
    
    if 'file' not in request.files:
        return jsonify({'error': 'Aucun fichier fourni'}), 400
    
    file = request.files['file']
    print(f"Nom du fichier: '{file.filename}'")
    
    if file.filename == '':
        return jsonify({'error': 'Aucun fichier sélectionné'}), 400
    
    # Debug de la validation
    file_is_allowed = allowed_file(file.filename)
    print(f"Fichier autorisé: {file_is_allowed}")
    
    if file and file_is_allowed:
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        print(f"Fichier sauvé: {file_path}")
        
        file_type = filename.rsplit('.', 1)[1].lower()
        if file_type in ['xlsx', 'xls']:
            file_type = 'excel'
        
        try:
            print(f"Traitement du fichier type: {file_type}")
            processed_df = processor.process_data(file_path, file_type)
            
            processed_filename = f"processed_{filename.rsplit('.', 1)[0]}.csv"
            processed_path = os.path.join(app.config['PROCESSED_FOLDER'], processed_filename)
            processed_df.to_csv(processed_path, index=False)
            print(f"Fichier traité sauvé: {processed_path}")
            
            return jsonify({
                'message': 'Fichier traité avec succès',
                'processed_file': processed_filename,
                'rows': len(processed_df),
                'columns': len(processed_df.columns)
            })
        
        except Exception as e:
            print(f"Erreur de traitement: {str(e)}")
            return jsonify({'error': f'Erreur de traitement: {str(e)}'}), 500
    
    print(f"Extensions autorisées: {ALLOWED_EXTENSIONS}")
    return jsonify({'error': 'Type de fichier non supporté'}), 400

@app.route('/api/download/<filename>')
def download_file(filename):
    return send_file(os.path.join(app.config['PROCESSED_FOLDER'], filename), as_attachment=True)

@app.route('/api/status')
def status():
    return jsonify({'status': 'API active', 'supported_formats': list(ALLOWED_EXTENSIONS)})

@app.route('/')
def serve_angular():
    print(f"Serving index.html from: {static_folder}")
    return send_from_directory(static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    print(f"Requested path: {path}")
    if path.startswith('api/'):
        return jsonify({'error': 'API endpoint not found'}), 404
    
    # Vérifier si le fichier existe
    file_path = os.path.join(static_folder, path)
    print(f"Looking for file: {file_path}")
    print(f"File exists: {os.path.exists(file_path)}")
    
    if os.path.exists(file_path):
        return send_from_directory(static_folder, path)
    else:
        # Fallback vers index.html pour les routes Angular
        print(f"File not found, serving index.html")
        return send_from_directory(static_folder, 'index.html')

if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
