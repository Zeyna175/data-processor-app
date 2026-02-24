import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-processing-options',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="options-container">
      <div class="header-section">
        <h2>⚙️ Options de traitement</h2>
        <p class="subtitle">Personnalisez le traitement de vos données</p>
      </div>

      <div class="analysis-summary" *ngIf="analysis">
        <div class="summary-card">
          <div class="summary-item">
            <span class="label">Fichier:</span>
            <span class="value">{{analysis.filename}}</span>
          </div>
          <div class="summary-item">
            <span class="label">Lignes:</span>
            <span class="value">{{analysis.total_rows}}</span>
          </div>
          <div class="summary-item">
            <span class="label">Colonnes:</span>
            <span class="value">{{analysis.total_columns}}</span>
          </div>
          <div class="summary-item alert" *ngIf="getTotalProblems() > 0">
            <span class="label">⚠️ Problèmes:</span>
            <span class="value">{{getTotalProblems()}}</span>
          </div>
        </div>
      </div>

      <div class="options-grid">
        <div class="option-card">
          <div class="option-header">
            <span class="icon">🔧</span>
            <h3>Valeurs manquantes</h3>
          </div>
          <select [(ngModel)]="options.missing_strategy" class="form-select">
            <option value="mean">Moyenne</option>
            <option value="median">Médiane</option>
            <option value="zero">Zéro</option>
          </select>
          <p class="help-text">
            <span *ngIf="getMissingCount() > 0" class="badge-warning">
              {{getMissingCount()}} manquante(s)
            </span>
            <span *ngIf="getMissingCount() === 0" class="badge-success">
              Aucune
            </span>
          </p>
        </div>

        <div class="option-card">
          <div class="option-header">
            <span class="icon">📊</span>
            <h3>Détection outliers</h3>
          </div>
          <select [(ngModel)]="options.outlier_method" class="form-select">
            <option value="iqr">IQR</option>
            <option value="zscore">Z-Score</option>
          </select>
          <p class="help-text">IQR ou Z-Score</p>
        </div>

        <div class="option-card">
          <div class="option-header">
            <span class="icon">🎯</span>
            <h3>Action outliers</h3>
          </div>
          <select [(ngModel)]="options.outlier_action" class="form-select">
            <option value="cap">Limiter</option>
            <option value="remove">Supprimer</option>
          </select>
        </div>

        <div class="option-card">
          <div class="option-header">
            <span class="icon">📏</span>
            <h3>Normalisation</h3>
          </div>
          <select [(ngModel)]="options.normalization" class="form-select">
            <option value="standard">Standard</option>
            <option value="minmax">Min-Max</option>
          </select>
        </div>

        <div class="option-card">
          <div class="option-header">
            <span class="icon">💾</span>
            <h3>Format sortie</h3>
          </div>
          <select [(ngModel)]="options.output_format" class="form-select">
            <option value="csv">CSV</option>
            <option value="excel">Excel</option>
            <option value="json">JSON</option>
          </select>
        </div>
      </div>

      <div class="action-buttons">
        <button class="btn btn-secondary" (click)="onBack()">← Retour</button>
        <button class="btn btn-primary" (click)="onProcess()">🚀 Lancer</button>
      </div>
    </div>
  `,
  styles: [`
    .options-container { max-width: 1200px; margin: 0 auto; padding: 2rem; background: #f8f9fa; min-height: 100vh; }
    .header-section { text-align: center; margin-bottom: 2rem; }
    .header-section h2 { font-size: 2rem; color: #2c3e50; margin-bottom: 0.5rem; }
    .subtitle { color: #7f8c8d; font-size: 1.1rem; }
    
    .analysis-summary { 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
      border-radius: 15px; 
      padding: 1.5rem; 
      margin-bottom: 2rem; 
      box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3); 
    }
    
    .summary-card { 
      display: grid; 
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); 
      gap: 1rem; 
    }
    
    .summary-item { 
      background: rgba(255, 255, 255, 0.95); 
      padding: 1rem; 
      border-radius: 10px; 
      display: flex; 
      flex-direction: column;
      gap: 0.5rem;
    }
    
    .summary-item.alert { 
      background: #fff3cd; 
      border-left: 4px solid #ffc107; 
    }
    
    .summary-item .label { 
      font-weight: 600; 
      color: #495057; 
      font-size: 0.9rem;
    }
    
    .summary-item .value { 
      font-size: 1.2rem; 
      font-weight: bold; 
      color: #667eea; 
      word-break: break-all;
    }
    
    .options-grid { 
      display: grid; 
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); 
      gap: 1.5rem; 
      margin-bottom: 2rem; 
    }
    
    .option-card { 
      background: white; 
      border-radius: 15px; 
      padding: 1.5rem; 
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08); 
      transition: transform 0.3s ease, box-shadow 0.3s ease; 
    }
    
    .option-card:hover { 
      transform: translateY(-5px); 
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15); 
    }
    
    .option-header { 
      display: flex; 
      align-items: center; 
      gap: 0.75rem; 
      margin-bottom: 1rem; 
    }
    
    .option-header .icon { 
      font-size: 1.8rem; 
    }
    
    .option-header h3 { 
      font-size: 1.1rem; 
      color: #2c3e50; 
      margin: 0; 
      font-weight: 600;
    }
    
    .form-select { 
      width: 100%; 
      padding: 0.75rem; 
      border: 2px solid #e9ecef; 
      border-radius: 10px; 
      font-size: 1rem; 
      background: white; 
      transition: border-color 0.3s ease;
    }
    
    .form-select:focus { 
      outline: none; 
      border-color: #667eea; 
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }
    
    .help-text { 
      margin-top: 0.75rem; 
      font-size: 0.9rem; 
      color: #6c757d; 
    }
    
    .badge-warning { 
      background: #fff3cd; 
      color: #856404; 
      padding: 0.35rem 0.85rem; 
      border-radius: 20px; 
      font-weight: 600; 
      display: inline-block;
    }
    
    .badge-success { 
      background: #d4edda; 
      color: #155724; 
      padding: 0.35rem 0.85rem; 
      border-radius: 20px; 
      font-weight: 600; 
      display: inline-block;
    }
    
    .action-buttons { 
      display: flex; 
      justify-content: space-between; 
      gap: 1rem; 
      margin-top: 2rem; 
      flex-wrap: wrap;
    }
    
    .btn { 
      padding: 1rem 2rem; 
      border: none; 
      border-radius: 10px; 
      font-size: 1.1rem; 
      font-weight: 600; 
      cursor: pointer; 
      transition: all 0.3s ease; 
      min-width: 150px;
    }
    
    .btn-secondary { 
      background: #6c757d; 
      color: white; 
    }
    
    .btn-secondary:hover { 
      background: #5a6268; 
      transform: translateY(-2px); 
      box-shadow: 0 5px 15px rgba(108, 117, 125, 0.3);
    }
    
    .btn-primary { 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
      color: white; 
      flex: 1; 
    }
    
    .btn-primary:hover { 
      transform: translateY(-2px); 
      box-shadow: 0 10px 25px rgba(102, 126, 234, 0.4); 
    }
    
    @media (max-width: 768px) {
      .options-container { padding: 1rem; }
      .summary-card { grid-template-columns: 1fr; }
      .options-grid { grid-template-columns: 1fr; }
      .action-buttons { flex-direction: column; }
      .btn { width: 100%; }
    }
  `]
})
export class ProcessingOptionsComponent {
  @Input() analysis: any;
  @Output() back = new EventEmitter<void>();
  @Output() process = new EventEmitter<any>();

  options = {
    missing_strategy: 'mean',
    outlier_method: 'iqr',
    outlier_action: 'cap',
    normalization: 'standard',
    output_format: 'csv'
  };

  getTotalProblems(): number {
    if (!this.analysis) return 0;
    return this.getMissingCount() + (this.analysis.duplicates || 0);
  }

  getMissingCount(): number {
    if (!this.analysis?.missing_values) return 0;
    return Object.values(this.analysis.missing_values).reduce((a: number, b: any) => a + Number(b), 0);
  }

  onBack() { this.back.emit(); }
  onProcess() { this.process.emit(this.options); }
}
