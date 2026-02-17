import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-results',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="results-container">
      <div class="success-header">
        <div class="success-icon">✅</div>
        <h2>Traitement terminé avec succès!</h2>
        <p>🎉 Votre fichier a été nettoyé et normalisé</p>
      </div>

      <div class="stats-grid">
        <div class="stat-card primary">
          <div class="stat-value">{{stats?.initial_rows || 0}}</div>
          <div class="stat-label">Lignes originales</div>
        </div>
        <div class="stat-card success">
          <div class="stat-value">{{stats?.final_rows || 0}}</div>
          <div class="stat-label">Lignes finales</div>
        </div>
        <div class="stat-card danger">
          <div class="stat-value">{{stats?.rows_removed || 0}}</div>
          <div class="stat-label">Lignes supprimées</div>
        </div>
        <div class="stat-card info">
          <div class="stat-value">{{stats?.final_columns || 0}}</div>
          <div class="stat-label">Colonnes</div>
        </div>
      </div>

      <div class="details-section">
        <h3>📋 Détails du traitement</h3>

        <div class="detail-card" *ngIf="hasMissingValues()">
          <div class="detail-header">
            <span class="step-number">1</span>
            <h4>Valeurs manquantes</h4>
          </div>
          <p class="detail-summary">Total: <strong>{{getTotalMissing()}}</strong> valeur(s)</p>
          <div class="detail-list">
            <div *ngFor="let item of getMissingItems()" class="detail-item">
              <span class="item-name">{{item.key}}</span>
              <span class="item-value">{{item.value}} valeur(s)</span>
            </div>
          </div>
        </div>

        <div class="detail-card" *ngIf="hasOutliers()">
          <div class="detail-header">
            <span class="step-number">2</span>
            <h4>Valeurs aberrantes</h4>
          </div>
          <p class="detail-summary">Total: <strong>{{getTotalOutliers()}}</strong> outlier(s)</p>
          <div class="detail-list">
            <div *ngFor="let item of getOutlierItems()" class="detail-item">
              <span class="item-name">{{item.key}}</span>
              <span class="item-value">{{item.value}} outlier(s)</span>
            </div>
          </div>
        </div>

        <div class="detail-card">
          <div class="detail-header">
            <span class="step-number">3</span>
            <h4>Doublons</h4>
          </div>
          <p class="detail-summary">
            Trouvés: <strong>{{stats?.duplicates_found || 0}}</strong> | 
            Supprimés: <strong>{{stats?.duplicates_removed || 0}}</strong>
          </p>
        </div>

        <div class="detail-card">
          <div class="detail-header">
            <span class="step-number">4</span>
            <h4>Normalisation</h4>
          </div>
          <p class="detail-summary">
            Méthode: <strong>{{getNormalizationLabel()}}</strong>
          </p>
        </div>
      </div>

      <div class="file-info">
        <p>📁 Fichier: <strong>{{filename}}</strong></p>
      </div>

      <div class="action-buttons">
        <button class="btn btn-success" (click)="onDownload()">
          📥 Télécharger
        </button>
        <button class="btn btn-primary" (click)="onNewFile()">
          🔄 Nouveau fichier
        </button>
      </div>

      <div class="tips-section">
        <h4>💡 Conseils:</h4>
        <ul>
          <li>Vérifiez les données normalisées avant utilisation</li>
          <li>Conservez une copie des données originales</li>
          <li>Les données sont prêtes pour l'analyse ML</li>
        </ul>
      </div>
    </div>
  `,
  styles: [`
    .results-container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
    .success-header { text-align: center; margin-bottom: 2rem; }
    .success-icon { font-size: 4rem; margin-bottom: 1rem; animation: bounce 1s ease; }
    @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
    .success-header h2 { font-size: 2rem; color: #28a745; margin-bottom: 0.5rem; }
    .success-header p { font-size: 1.2rem; color: #6c757d; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
    .stat-card { background: white; border-radius: 15px; padding: 2rem; text-align: center; box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1); transition: transform 0.3s ease; }
    .stat-card:hover { transform: translateY(-5px); }
    .stat-card.primary { border-top: 4px solid #667eea; }
    .stat-card.success { border-top: 4px solid #28a745; }
    .stat-card.danger { border-top: 4px solid #dc3545; }
    .stat-card.info { border-top: 4px solid #17a2b8; }
    .stat-value { font-size: 2.5rem; font-weight: bold; color: #2c3e50; margin-bottom: 0.5rem; }
    .stat-label { font-size: 1rem; color: #6c757d; }
    .details-section { margin-bottom: 2rem; }
    .details-section h3 { font-size: 1.5rem; color: #2c3e50; margin-bottom: 1.5rem; }
    .detail-card { background: white; border-radius: 15px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08); }
    .detail-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; }
    .step-number { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.2rem; }
    .detail-header h4 { margin: 0; color: #2c3e50; font-size: 1.3rem; }
    .detail-summary { color: #6c757d; margin-bottom: 1rem; }
    .detail-list { display: grid; gap: 0.75rem; }
    .detail-item { display: flex; justify-content: space-between; padding: 0.75rem; background: #f8f9fa; border-radius: 8px; }
    .item-name { font-weight: 600; color: #495057; }
    .item-value { color: #667eea; font-weight: bold; }
    .file-info { background: #e7f3ff; border-left: 4px solid #007bff; padding: 1rem; border-radius: 8px; margin-bottom: 2rem; }
    .file-info p { margin: 0; color: #004085; }
    .action-buttons { display: flex; gap: 1rem; margin-bottom: 2rem; }
    .btn { flex: 1; padding: 1rem 2rem; border: none; border-radius: 10px; font-size: 1.1rem; font-weight: 600; cursor: pointer; transition: all 0.3s ease; }
    .btn-success { background: #28a745; color: white; }
    .btn-success:hover { background: #218838; transform: translateY(-2px); }
    .btn-primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 10px 25px rgba(102, 126, 234, 0.4); }
    .tips-section { background: #fff3cd; border-left: 4px solid #ffc107; padding: 1.5rem; border-radius: 8px; }
    .tips-section h4 { color: #856404; margin-bottom: 1rem; }
    .tips-section ul { margin: 0; padding-left: 1.5rem; color: #856404; }
    .tips-section li { margin-bottom: 0.5rem; }
  `]
})
export class ResultsComponent {
  @Input() stats: any;
  @Input() filename: string = '';
  @Output() download = new EventEmitter<void>();
  @Output() newFile = new EventEmitter<void>();

  hasMissingValues(): boolean {
    return this.stats?.missing_values && Object.keys(this.stats.missing_values).length > 0;
  }

  hasOutliers(): boolean {
    return this.stats?.outliers && Object.keys(this.stats.outliers).length > 0;
  }

  getTotalMissing(): number {
    if (!this.stats?.missing_values) return 0;
    return Object.values(this.stats.missing_values).reduce((a: number, b: any) => a + Number(b), 0);
  }

  getTotalOutliers(): number {
    if (!this.stats?.outliers) return 0;
    return Object.values(this.stats.outliers).reduce((a: number, b: any) => a + Number(b), 0);
  }

  getMissingItems() {
    if (!this.stats?.missing_values) return [];
    return Object.entries(this.stats.missing_values).map(([key, value]) => ({ key, value }));
  }

  getOutlierItems() {
    if (!this.stats?.outliers) return [];
    return Object.entries(this.stats.outliers).map(([key, value]) => ({ key, value }));
  }

  getNormalizationLabel(): string {
    const method = this.stats?.normalization_method || 'standard';
    return method === 'standard' ? 'Standardisation (Z-score)' : 'Min-Max [0, 1]';
  }

  onDownload() { this.download.emit(); }
  onNewFile() { this.newFile.emit(); }
}
