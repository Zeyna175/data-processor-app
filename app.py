from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from data_processor import DataProcessor
import os
import logging
import pandas as pd
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import secrets

# ─── Logging structuré ────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)
logger = logging.getLogger(__name__)

# ─── Application Flask ────────────────────────────────────────────────────────
app = Flask(__name__, static_folder='static', static_url_path='')

# SECRET_KEY fixe depuis l'environnement (ne change plus au redémarrage)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', secrets.token_hex(32))
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get(
    'DATABASE_URL', 'sqlite:///users.db'
).replace('postgres://', 'postgresql://')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Limite de taille fichier : 16 MB maximum
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

# CORS restreint via variable d'environnement
allowed_origins_env = os.environ.get('ALLOWED_ORIGINS', '*')
allowed_origins = [o.strip() for o in allowed_origins_env.split(',')]
CORS(app, origins=allowed_origins, supports_credentials=True)

db = SQLAlchemy(app)

# ─── Modèles ──────────────────────────────────────────────────────────────────

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Session(db.Model):
    """Sessions persistantes en base de données (survit aux redémarrages)."""
    id = db.Column(db.Integer, primary_key=True)
    token = db.Column(db.String(64), unique=True, nullable=False, index=True)
    username = db.Column(db.String(80), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class UserFile(db.Model):
    """Historique des fichiers uploadés par utilisateur."""
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), nullable=False)
    filename = db.Column(db.String(200), nullable=False)
    upload_date = db.Column(db.String(50), nullable=False)
    rows = db.Column(db.Integer, default=0)
    columns = db.Column(db.Integer, default=0)
    status = db.Column(db.String(50), default='uploaded')


# ─── Initialisation de la base de données ────────────────────────────────────
with app.app_context():
    db.create_all()
    if not User.query.filter_by(username='admin').first():
        admin_password = os.environ.get('ADMIN_PASSWORD', 'admin123')
        admin = User(
            username='admin',
            password_hash=generate_password_hash(admin_password)
        )
        db.session.add(admin)
        db.session.commit()
        logger.info("Utilisateur admin créé.")

# ─── Configuration des dossiers ───────────────────────────────────────────────
UPLOAD_FOLDER = 'uploads'
PROCESSED_FOLDER = 'processed'
ALLOWED_EXTENSIONS = {'csv', 'xlsx', 'xls', 'json', 'xml'}

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(PROCESSED_FOLDER, exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['PROCESSED_FOLDER'] = PROCESSED_FOLDER

processor = DataProcessor()

# ─── Gestionnaire d'erreur fichier trop lourd ─────────────────────────────────
@app.errorhandler(413)
def file_too_large(e):
    return jsonify({'error': 'Fichier trop volumineux. Taille maximale : 16 MB.'}), 413

# ─── Helpers ──────────────────────────────────────────────────────────────────

def get_user_from_token():
    token = request.headers.get('Authorization', '').replace('Bearer ', '').strip()
    if not token:
        return None
    session = Session.query.filter_by(token=token).first()
    return session.username if session else None


def allowed_file(filename):
    if '.' not in filename:
        logger.warning(f"Fichier sans extension rejeté : {filename}")
        return False
    extension = filename.rsplit('.', 1)[1].lower()
    is_allowed = extension in ALLOWED_EXTENSIONS
    logger.info(f"Fichier: {filename}, Extension: {extension}, Autorisé: {is_allowed}")
    return is_allowed


def get_file_type(filename):
    ext = filename.rsplit('.', 1)[1].lower()
    return 'excel' if ext in ('xlsx', 'xls') else ext


VALID_MISSING_STRATEGIES = {'mean', 'median', 'zero'}
VALID_OUTLIER_METHODS = {'iqr', 'zscore'}
VALID_OUTLIER_ACTIONS = {'cap', 'remove'}
VALID_OUTPUT_FORMATS = {'csv', 'excel', 'json'}
VALID_NORMALIZATIONS = {'standard', 'minmax', 'none'}


def validate_options(options):
    """Valide et nettoie les options de traitement. Retourne (options_clean, erreur)."""
    if not isinstance(options, dict):
        return None, "Les options doivent être un objet JSON."

    clean = {}

    missing_strategy = options.get('missing_strategy', 'mean')
    if missing_strategy not in VALID_MISSING_STRATEGIES:
        return None, f"missing_strategy invalide. Valeurs acceptées : {VALID_MISSING_STRATEGIES}"
    clean['missing_strategy'] = missing_strategy

    outlier_method = options.get('outlier_method', 'iqr')
    if outlier_method not in VALID_OUTLIER_METHODS:
        return None, f"outlier_method invalide. Valeurs acceptées : {VALID_OUTLIER_METHODS}"
    clean['outlier_method'] = outlier_method

    outlier_action = options.get('outlier_action', 'cap')
    if outlier_action not in VALID_OUTLIER_ACTIONS:
        return None, f"outlier_action invalide. Valeurs acceptées : {VALID_OUTLIER_ACTIONS}"
    clean['outlier_action'] = outlier_action

    output_format = options.get('output_format', 'csv')
    if output_format not in VALID_OUTPUT_FORMATS:
        return None, f"output_format invalide. Valeurs acceptées : {VALID_OUTPUT_FORMATS}"
    clean['output_format'] = output_format

    normalization = options.get('normalization', 'standard')
    if normalization not in VALID_NORMALIZATIONS:
        return None, f"normalization invalide. Valeurs acceptées : {VALID_NORMALIZATIONS}"
    clean['normalization'] = normalization

    duplicate_subset = options.get('duplicate_subset')
    if duplicate_subset is not None and not isinstance(duplicate_subset, list):
        return None, "duplicate_subset doit être une liste de colonnes ou null."
    clean['duplicate_subset'] = duplicate_subset

    return clean, None

# ─── Authentification ─────────────────────────────────────────────────────────

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json(silent=True) or {}
    username = data.get('username', '').strip()
    password = data.get('password', '')

    if not username or not password:
        return jsonify({'error': 'Username et password requis'}), 400

    user = User.query.filter_by(username=username).first()
    if user and check_password_hash(user.password_hash, password):
        token = secrets.token_hex(32)
        new_session = Session(token=token, username=username)
        db.session.add(new_session)
        db.session.commit()
        logger.info(f"Connexion réussie pour : {username}")
        return jsonify({'success': True, 'token': token, 'username': username})

    logger.warning(f"Tentative de connexion échouée pour : {username}")
    return jsonify({'error': 'Identifiants invalides'}), 401


@app.route('/api/logout', methods=['POST'])
def logout():
    token = request.headers.get('Authorization', '').replace('Bearer ', '').strip()
    if token:
        Session.query.filter_by(token=token).delete()
        db.session.commit()
    return jsonify({'success': True})


@app.route('/api/verify', methods=['GET'])
def verify_token():
    token = request.headers.get('Authorization', '').replace('Bearer ', '').strip()
    session = Session.query.filter_by(token=token).first()
    if session:
        return jsonify({'valid': True, 'username': session.username})
    return jsonify({'valid': False}), 401


@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json(silent=True) or {}
    username = data.get('username', '').strip()
    password = data.get('password', '')

    if not username or not password:
        return jsonify({'error': 'Username et password requis'}), 400

    if len(username) < 3 or len(username) > 80:
        return jsonify({'error': 'Le username doit faire entre 3 et 80 caractères'}), 400

    if len(password) < 6:
        return jsonify({'error': 'Le mot de passe doit faire au moins 6 caractères'}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Utilisateur existe déjà'}), 400

    new_user = User(username=username, password_hash=generate_password_hash(password))
    db.session.add(new_user)
    db.session.commit()
    logger.info(f"Nouveau compte créé : {username}")
    return jsonify({'success': True, 'message': 'Compte créé avec succès'})

# ─── Fichiers ─────────────────────────────────────────────────────────────────

@app.route('/api/analyze', methods=['POST'])
def analyze_file():
    username = get_user_from_token() or 'anonymous'

    if 'file' not in request.files:
        return jsonify({'error': 'Aucun fichier fourni'}), 400

    file = request.files['file']
    if not file.filename or not allowed_file(file.filename):
        return jsonify({'error': 'Fichier invalide ou format non supporté'}), 400

    filename = secure_filename(file.filename)
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(file_path)

    file_type = get_file_type(filename)

    try:
        df = processor.load_file(file_path, file_type)
        analysis = processor.analyze_data(df)
        analysis['filename'] = filename

        if username != 'anonymous':
            file_info = UserFile(
                username=username,
                filename=filename,
                upload_date=datetime.now().isoformat(),
                rows=analysis.get('total_rows', 0),
                columns=analysis.get('total_columns', 0),
                status='uploaded'
            )
            db.session.add(file_info)
            db.session.commit()

        return jsonify(analysis)
    except Exception as e:
        logger.error(f"Erreur d'analyse pour {filename}: {e}", exc_info=True)
        return jsonify({'error': f"Erreur d'analyse: {str(e)}"}), 500


@app.route('/api/process', methods=['POST'])
def process_file():
    data = request.get_json(silent=True) or {}
    filename = data.get('filename', '').strip()
    raw_options = data.get('options', {})

    if not filename:
        return jsonify({'error': 'Nom de fichier manquant'}), 400

    # Validation du nom de fichier (sécurité path traversal)
    safe_filename = secure_filename(filename)
    if safe_filename != filename:
        return jsonify({'error': 'Nom de fichier invalide'}), 400

    file_path = os.path.join(app.config['UPLOAD_FOLDER'], safe_filename)
    if not os.path.exists(file_path):
        return jsonify({'error': 'Fichier non trouvé'}), 404

    # Validation des options
    options, error = validate_options(raw_options)
    if error:
        return jsonify({'error': error}), 400

    file_type = get_file_type(safe_filename)

    try:
        processed_df, stats = processor.process_data(file_path, file_type, options)

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        output_format = options.get('output_format', 'csv')
        base_name = safe_filename.rsplit('.', 1)[0]

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

        # Nettoyage automatique du fichier uploadé après traitement
        try:
            os.remove(file_path)
            logger.info(f"Fichier temporaire supprimé : {safe_filename}")
        except OSError as e:
            logger.warning(f"Impossible de supprimer le fichier temporaire {safe_filename}: {e}")

        return jsonify({
            'message': 'Traitement terminé avec succès',
            'processed_file': processed_filename,
            'stats': stats
        })
    except Exception as e:
        logger.error(f"Erreur de traitement pour {safe_filename}: {e}", exc_info=True)
        return jsonify({'error': f"Erreur de traitement: {str(e)}"}), 500


@app.route('/api/files', methods=['GET'])
def get_user_files():
    username = get_user_from_token() or 'anonymous'
    files = UserFile.query.filter_by(username=username).order_by(UserFile.id.desc()).all()
    return jsonify({'files': [
        {
            'filename': f.filename,
            'upload_date': f.upload_date,
            'rows': f.rows,
            'columns': f.columns,
            'status': f.status
        } for f in files
    ]})


@app.route('/api/files/<filename>', methods=['DELETE'])
def delete_file(filename):
    username = get_user_from_token() or 'anonymous'

    safe_filename = secure_filename(filename)
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], safe_filename)
    if os.path.exists(file_path):
        os.remove(file_path)

    UserFile.query.filter_by(username=username, filename=safe_filename).delete()
    db.session.commit()

    return jsonify({'success': True})


@app.route('/api/preview/<filename>', methods=['GET'])
def preview_file(filename):
    username = get_user_from_token()
    if not username:
        return jsonify({'error': 'Non authentifié'}), 401

    safe_filename = secure_filename(filename)
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], safe_filename)
    if not os.path.exists(file_path):
        return jsonify({'error': 'Fichier non trouvé'}), 404

    file_type = get_file_type(safe_filename)

    try:
        df = processor.load_file(file_path, file_type)
        preview_data = df.head(10).to_dict('records')
        columns = df.columns.tolist()
        return jsonify({'columns': columns, 'data': preview_data})
    except Exception as e:
        logger.error(f"Erreur de prévisualisation pour {safe_filename}: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@app.route('/api/stats', methods=['GET'])
def get_stats():
    username = get_user_from_token() or 'anonymous'
    files = UserFile.query.filter_by(username=username).all()
    total_files = len(files)
    total_rows = sum(f.rows for f in files)
    recent = UserFile.query.filter_by(username=username).order_by(UserFile.id.desc()).limit(5).all()

    return jsonify({
        'total_files': total_files,
        'total_rows': total_rows,
        'recent_files': [
            {
                'filename': f.filename,
                'upload_date': f.upload_date,
                'rows': f.rows,
                'columns': f.columns,
                'status': f.status
            } for f in recent
        ]
    })


@app.route('/api/download/<filename>')
def download_file(filename):
    safe_filename = secure_filename(filename)
    return send_file(
        os.path.join(app.config['PROCESSED_FOLDER'], safe_filename),
        as_attachment=True
    )


@app.route('/api/status')
def status():
    return jsonify({'status': 'API active', 'supported_formats': list(ALLOWED_EXTENSIONS)})


@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path.startswith('api/'):
        return jsonify({'error': 'API endpoint not found'}), 404
    if path and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, 'index.html')


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    logger.info(f"Démarrage du serveur sur le port {port}")
    app.run(host='0.0.0.0', port=port, debug=False)
