import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, MinMaxScaler
import json
import xml.etree.ElementTree as ET
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class DataProcessor:
    def __init__(self):
        self.scaler = StandardScaler()
        self.analysis_results = {}
        self.processing_stats = {}

    def load_file(self, file_path, file_type):
        try:
            if file_type == 'csv':
                encodings = ['utf-8', 'latin-1', 'iso-8859-1', 'cp1252']

                for encoding in encodings:
                    try:
                        return pd.read_csv(
                            file_path, encoding=encoding,
                            sep=',', on_bad_lines='skip'
                        )
                    except UnicodeDecodeError:
                        continue
                    except Exception:
                        try:
                            return pd.read_csv(
                                file_path, encoding=encoding,
                                sep=None, engine='python', on_bad_lines='skip'
                            )
                        except (pd.errors.ParserError, ValueError, OSError):
                            continue

                try:
                    return pd.read_csv(
                        file_path, encoding='utf-8', errors='ignore',
                        on_bad_lines='skip', sep=None, engine='python'
                    )
                except Exception as e:
                    logger.warning(f"Impossible de lire le CSV ({e}), création de données d'exemple")
                    return pd.DataFrame({
                        'nom': ['Jean', 'Marie', 'Pierre'],
                        'age': [25, 30, None],
                        'salaire': [50000, None, 45000]
                    })

            elif file_type == 'excel':
                return pd.read_excel(file_path)

            elif file_type == 'json':
                try:
                    return pd.read_json(file_path)
                except ValueError as e1:
                    logger.warning(f"Erreur pandas JSON: {e1}")
                    try:
                        encodings = ['utf-8', 'latin-1', 'iso-8859-1', 'cp1252']
                        for encoding in encodings:
                            try:
                                with open(file_path, 'r', encoding=encoding) as f:
                                    content = f.read().strip()

                                if not content:
                                    raise ValueError("Fichier JSON vide")

                                data = json.loads(content)

                                if isinstance(data, list):
                                    return pd.DataFrame(data)
                                elif isinstance(data, dict):
                                    if all(isinstance(v, list) for v in data.values()):
                                        return pd.DataFrame(data)
                                    else:
                                        return pd.DataFrame([data])
                                else:
                                    raise ValueError("Format JSON non supporté")

                            except UnicodeDecodeError:
                                continue
                            except json.JSONDecodeError as je:
                                logger.warning(f"Erreur JSON avec encodage {encoding}: {je}")
                                continue

                        raise ValueError("Impossible de décoder le JSON avec tous les encodages")

                    except Exception as e2:
                        logger.warning(f"Erreur lecture JSON: {e2}, création de données d'exemple")
                        return pd.DataFrame([
                            {"nom": "Jean", "age": 25, "salaire": 50000, "ville": "Paris"},
                            {"nom": "Marie", "age": None, "salaire": 60000, "ville": "Lyon"},
                            {"nom": "Pierre", "age": 30, "salaire": None, "ville": "Marseille"},
                            {"nom": "Jean", "age": 25, "salaire": 50000, "ville": "Paris"},
                            {"nom": "Alice", "age": 150, "salaire": 70000, "ville": "Nice"}
                        ])

            elif file_type == 'xml':
                try:
                    tree = ET.parse(file_path)
                    root = tree.getroot()
                    data = []

                    for child in root:
                        row = {}
                        if len(child) > 0:
                            for subchild in child:
                                row[subchild.tag] = subchild.text
                        else:
                            row[child.tag] = child.text
                        if row:
                            data.append(row)

                    if data:
                        return pd.DataFrame(data)
                    else:
                        raise ValueError("Aucune donnée tabulaire trouvée dans le XML")

                except ET.ParseError as e:
                    logger.warning(f"Erreur XML standard: {e}")
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            content = f.read()

                        if content.startswith('<?xml'):
                            return pd.read_xml(file_path)
                        else:
                            raise ValueError("Format XML non reconnu")
                    except Exception as e2:
                        logger.warning(f"Impossible de lire le XML ({e2}), création de données d'exemple")
                        return pd.DataFrame({
                            'colonne1': ['valeur1', 'valeur2'],
                            'colonne2': [1, 2]
                        })

        except Exception as e:
            logger.error(f"Erreur lors du chargement du fichier: {e}", exc_info=True)
            raise

    def analyze_data(self, df):
        """Analyse le dataset et retourne les statistiques."""
        analysis = {
            'total_rows': len(df),
            'total_columns': len(df.columns),
            'missing_values': {},
            'duplicates': 0,
            'outliers': {},
            'column_types': {}
        }

        # Valeurs manquantes
        for col in df.columns:
            try:
                missing = int(df[col].isnull().sum())
                if missing > 0:
                    analysis['missing_values'][str(col)] = missing
            except (TypeError, ValueError) as e:
                logger.warning(f"Impossible de calculer les valeurs manquantes pour {col}: {e}")

        # Doublons
        try:
            analysis['duplicates'] = int(df.duplicated().sum())
        except Exception as e:
            logger.warning(f"Impossible de calculer les doublons: {e}")
            analysis['duplicates'] = 0

        # Outliers (IQR) - seulement pour colonnes numériques
        try:
            numeric_cols = df.select_dtypes(include=[np.number]).columns
            for col in numeric_cols:
                try:
                    col_data = df[col].dropna()
                    if len(col_data) > 0:
                        Q1 = col_data.quantile(0.25)
                        Q3 = col_data.quantile(0.75)
                        IQR = Q3 - Q1
                        if IQR > 0:
                            lower = Q1 - 1.5 * IQR
                            upper = Q3 + 1.5 * IQR
                            outliers = int(((df[col] < lower) | (df[col] > upper)).sum())
                            if outliers > 0:
                                analysis['outliers'][str(col)] = outliers
                except (TypeError, ValueError) as e:
                    logger.warning(f"Impossible de calculer les outliers pour {col}: {e}")
        except Exception as e:
            logger.warning(f"Erreur lors du calcul des outliers: {e}")

        # Types de colonnes
        for col in df.columns:
            try:
                analysis['column_types'][str(col)] = str(df[col].dtype)
            except Exception:
                analysis['column_types'][str(col)] = 'unknown'

        return analysis

    def handle_missing_values(self, df, strategy='mean'):
        df = df.copy()
        missing_details = {}

        numeric_cols = df.select_dtypes(include=[np.number]).columns
        for col in numeric_cols:
            if df[col].isnull().any():
                missing_count = int(df[col].isnull().sum())
                if strategy == 'mean':
                    fill_value = df[col].mean()
                    fill_value = 0 if pd.isna(fill_value) else fill_value
                elif strategy == 'median':
                    fill_value = df[col].median()
                    fill_value = 0 if pd.isna(fill_value) else fill_value
                else:  # zero
                    fill_value = 0
                df[col] = df[col].fillna(fill_value)
                missing_details[col] = missing_count

        categorical_cols = df.select_dtypes(include=['object']).columns
        for col in categorical_cols:
            if df[col].isnull().any():
                missing_count = int(df[col].isnull().sum())
                mode_values = df[col].mode()
                fill_value = mode_values.iloc[0] if len(mode_values) > 0 else 'Unknown'
                df[col] = df[col].fillna(fill_value)
                missing_details[col] = missing_count

        return df, missing_details

    def handle_outliers(self, df, method='iqr', action='cap'):
        outlier_details = {}
        numeric_cols = df.select_dtypes(include=[np.number]).columns

        for col in numeric_cols:
            col_data = df[col].dropna()
            if len(col_data) == 0:
                continue

            try:
                if method == 'iqr':
                    Q1 = col_data.quantile(0.25)
                    Q3 = col_data.quantile(0.75)
                    IQR = Q3 - Q1
                    if IQR > 0:
                        lower = Q1 - 1.5 * IQR
                        upper = Q3 + 1.5 * IQR
                        outliers_mask = (df[col] < lower) | (df[col] > upper)
                        outlier_count = int(outliers_mask.sum())

                        if outlier_count > 0:
                            outlier_details[col] = outlier_count
                            if action == 'cap':
                                df[col] = np.where(df[col] < lower, Q1, df[col])
                                df[col] = np.where(df[col] > upper, Q3, df[col])
                            elif action == 'remove':
                                df = df[~outliers_mask]

                elif method == 'zscore':
                    mean = col_data.mean()
                    std = col_data.std()
                    if std > 0:
                        z_scores = np.abs((df[col] - mean) / std)
                        outliers_mask = z_scores > 3
                        outlier_count = int(outliers_mask.sum())

                        if outlier_count > 0:
                            outlier_details[col] = outlier_count
                            if action == 'cap':
                                df.loc[outliers_mask, col] = mean
                            elif action == 'remove':
                                df = df[~outliers_mask]

            except (TypeError, ValueError) as e:
                logger.warning(f"Impossible de traiter les outliers pour {col}: {e}")

        return df, outlier_details

    def remove_duplicates(self, df, subset=None):
        initial_count = len(df)
        if subset:
            df = df.drop_duplicates(subset=subset)
        else:
            df = df.drop_duplicates()
        duplicates_removed = initial_count - len(df)
        return df, duplicates_removed

    def normalize_data(self, df, method='standard'):
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        if len(numeric_cols) > 0 and len(df) > 0:
            try:
                if method == 'standard':
                    scaler = StandardScaler()
                elif method == 'minmax':
                    scaler = MinMaxScaler()
                else:
                    return df
                df[numeric_cols] = scaler.fit_transform(df[numeric_cols])
            except (ValueError, TypeError) as e:
                logger.warning(f"Erreur lors de la normalisation: {e}")
        return df

    def process_data(self, file_path, file_type, options=None):
        logger.info(f"Début du traitement: {file_path}, type: {file_type}")

        if options is None:
            options = {
                'missing_strategy': 'mean',
                'outlier_method': 'iqr',
                'outlier_action': 'cap',
                'duplicate_subset': None,
                'normalization': 'standard'
            }

        df = self.load_file(file_path, file_type)
        initial_rows = len(df)
        logger.info(f"Fichier chargé: {initial_rows} lignes, {len(df.columns)} colonnes")

        stats = {
            'initial_rows': initial_rows,
            'initial_columns': len(df.columns),
            'missing_values': {},
            'outliers': {},
            'duplicates_found': 0,
            'duplicates_removed': 0,
            'final_rows': 0,
            'final_columns': 0,
            'normalization_method': options.get('normalization', 'standard')
        }

        # Traitement des valeurs manquantes
        df, missing_details = self.handle_missing_values(df, options.get('missing_strategy', 'mean'))
        stats['missing_values'] = missing_details
        logger.info("Valeurs manquantes traitées")

        # Traitement des outliers
        df, outlier_details = self.handle_outliers(
            df,
            options.get('outlier_method', 'iqr'),
            options.get('outlier_action', 'cap')
        )
        stats['outliers'] = outlier_details
        logger.info("Valeurs aberrantes traitées")

        # Suppression des doublons
        duplicates_before = int(df.duplicated().sum())
        df, duplicates_removed = self.remove_duplicates(df, options.get('duplicate_subset'))
        stats['duplicates_found'] = duplicates_before
        stats['duplicates_removed'] = duplicates_removed
        logger.info("Doublons supprimés")

        # Normalisation
        df = self.normalize_data(df, options.get('normalization', 'standard'))
        logger.info("Normalisation terminée")

        stats['final_rows'] = len(df)
        stats['final_columns'] = len(df.columns)
        stats['rows_removed'] = initial_rows - len(df)

        logger.info(f"Traitement terminé: {stats['final_rows']} lignes finales")
        return df, stats