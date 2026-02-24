from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
from data_processor import DataProcessor
import os
import pandas as pd
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import secrets

app = Flask(__name__, static_folder='static', static_url_path='')
app.config['SECRET_KEY'] = secrets.token_hex(16)
CORS(app, origins=['*'], supports_credentials=True)

import json

# Fichier pour sauvegarder les utilisateurs
USERS_FILE = 'users.json'

def load_users():
    """Charge les utilisateurs depuis le fichier"""
    if os.path.exists(USERS_FILE):
        try:
            with open(USERS_FILE, 'r') as f:
                return json.load(f)
        except:
            pass
    return {'admin': generate_password_hash('admin123')}

def save_users():
    """Sauvegarde les utilisateurs dans le fichier"""
    try:
        with open(USERS_FILE, 'w') as f:
            json.dump(users, f)
    except Exception as e:
        print(f"Erreur sauvegarde users: {e}")

# Base de données utilisateurs et sessions
users = load_users()
user_sessions = {}  # {token: username}
user_files = {}  # {username: [files]}

UPLOAD_FOLDER = 'uploads'
PROCESSED_FOLDER = 'processed'
ALLOWED_EXTENSIONS = {'csv', 'xlsx', 'xls', 'json', 'xml'}  # Retiré 'ods'

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(PROCESSED_FOLDER, exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['PROCESSED_FOLDER'] = PROCESSED_FOLDER

processor = DataProcessor()

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    if username in users and check_password_hash(users[username], password):
        token = secrets.token_hex(16)
        user_sessions[token] = username
        if username not in user_files:
            user_files[username] = []
        return jsonify({'success': True, 'token': token, 'username': username})
    return jsonify({'error': 'Identifiants invalides'}), 401

@app.route('/api/logout', methods=['POST'])
def logout():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if token in user_sessions:
        del user_sessions[token]
    return jsonify({'success': True})

@app.route('/api/verify', methods=['GET'])
def verify_token():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if token in user_sessions:
        return jsonify({'valid': True, 'username': user_sessions[token]})
    return jsonify({'valid': False}), 401

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'error': 'Username et password requis'}), 400
    if username in users:
        return jsonify({'error': 'Utilisateur existe déjà'}), 400
    
    users[username] = generate_password_hash(password)
    save_users()  # Sauvegarder dans le fichier
    return jsonify({'success': True, 'message': 'Compte créé avec succès'})

def get_user_from_token():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    return user_sessions.get(token)

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

@app.route('/api/analyze', methods=['POST'])
def analyze_file():
    # Authentification optionnelle pour simplifier
    username = get_user_from_token() or 'anonymous'
    
    if 'file' not in request.files:
        return jsonify({'error': 'Aucun fichier fourni'}), 400
    
    file = request.files['file']
    if file.filename == '' or not allowed_file(file.filename):
        return jsonify({'error': 'Fichier invalide'}), 400
    
    filename = secure_filename(file.filename)
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(file_path)
    
    file_type = filename.rsplit('.', 1)[1].lower()
    if file_type in ['xlsx', 'xls']:
        file_type = 'excel'
    
    try:
        df = processor.load_file(file_path, file_type)
        analysis = processor.analyze_data(df)
        analysis['filename'] = filename
        
        # Enregistrer dans l'historique si authentifié
        if username != 'anonymous':
            if username not in user_files:
                user_files[username] = []
            file_info = {
                'filename': filename,
                'upload_date': datetime.now().isoformat(),
                'rows': analysis.get('total_rows', 0),
                'columns': analysis.get('total_columns', 0),
                'status': 'uploaded'
            }
            user_files[username].append(file_info)
        
        return jsonify(analysis)
    except Exception as e:
        return jsonify({'error': f'Erreur d\'analyse: {str(e)}'}), 500

@app.route('/api/process', methods=['POST'])
def process_file():
    data = request.get_json()
    filename = data.get('filename')
    options = data.get('options', {})
    
    if not filename:
        return jsonify({'error': 'Nom de fichier manquant'}), 400
    
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    if not os.path.exists(file_path):
        return jsonify({'error': 'Fichier non trouvé'}), 404
    
    file_type = filename.rsplit('.', 1)[1].lower()
    if file_type in ['xlsx', 'xls']:
        file_type = 'excel'
    
    try:
        processed_df, stats = processor.process_data(file_path, file_type, options)
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        output_format = options.get('output_format', 'csv')
        base_name = filename.rsplit('.', 1)[0]
        
        if output_format == 'csv':
            processed_filename = f"{base_name}_processed_{timestamp}.csv"
            processed_path = os.path.join(app.config['PROCESSED_FOLDER'], processed_filename)
            processed_df.to_csv(processed_path, index=False)
        elif output_format == 'excel':
            processed_filename = f"{base_name}_processed_{timestamp}.xlsx"
            processed_path = os.path.join(app.config['PROCESSED_FOLDER'], processed_filename)
            processed_df.to_excel(processed_path, index=False)
        else:
            processed_filename = f"{base_name}_processed_{timestamp}.json"
            processed_path = os.path.join(app.config['PROCESSED_FOLDER'], processed_filename)
            processed_df.to_json(processed_path, orient='records')
        
        return jsonify({
            'message': 'Traitement terminé avec succès',
            'processed_file': processed_filename,
            'stats': stats
        })
    except Exception as e:
        return jsonify({'error': f'Erreur de traitement: {str(e)}'}), 500

@app.route('/api/files', methods=['GET'])
def get_user_files():
    username = get_user_from_token() or 'anonymous'
    return jsonify({'files': user_files.get(username, [])})

@app.route('/api/files/<filename>', methods=['DELETE'])
def delete_file(filename):
    username = get_user_from_token() or 'anonymous'
    
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    if os.path.exists(file_path):
        os.remove(file_path)
    
    # Supprimer de l'historique
    if username in user_files:
        user_files[username] = [f for f in user_files[username] if f['filename'] != filename]
    
    return jsonify({'success': True})

@app.route('/api/preview/<filename>', methods=['GET'])
def preview_file(filename):
    username = get_user_from_token()
    if not username:
        return jsonify({'error': 'Non authentifié'}), 401
    
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    if not os.path.exists(file_path):
        return jsonify({'error': 'Fichier non trouvé'}), 404
    
    file_type = filename.rsplit('.', 1)[1].lower()
    if file_type in ['xlsx', 'xls']:
        file_type = 'excel'
    
    try:
        df = processor.load_file(file_path, file_type)
        preview_data = df.head(10).to_dict('records')
        columns = df.columns.tolist()
        return jsonify({'columns': columns, 'data': preview_data})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/stats', methods=['GET'])
def get_stats():
    username = get_user_from_token() or 'anonymous'
    
    files = user_files.get(username, [])
    total_files = len(files)
    total_rows = sum(f.get('rows', 0) for f in files)
    
    return jsonify({
        'total_files': total_files,
        'total_rows': total_rows,
        'recent_files': files[-5:] if files else []
    })

@app.route('/api/download/<filename>')
def download_file(filename):
    return send_file(os.path.join(app.config['PROCESSED_FOLDER'], filename), as_attachment=True)

@app.route('/api/status')
def status():
    return jsonify({'status': 'API active', 'supported_formats': list(ALLOWED_EXTENSIONS)})

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path.startswith('api/'):
        return jsonify({'error': 'API endpoint not found'}), 404
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
