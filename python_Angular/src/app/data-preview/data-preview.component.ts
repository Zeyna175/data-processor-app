import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-data-preview',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="preview-container" *ngIf="preview">
      <h3>📊 Aperçu des données</h3>
      
      <div class="tables-wrapper">
        <div class="table-section">
          <h4>🔴 Avant traitement</h4>
          <div class="table-scroll">
            <table class="data-table">
              <thead>
                <tr>
                  <th *ngFor="let col of preview.columns">{{col}}</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let row of preview.before">
                  <td *ngFor="let col of preview.columns" [class.empty]="!row[col]">
                    {{row[col] || 'NaN'}}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="table-section">
          <h4>🟢 Après traitement</h4>
          <div class="table-scroll">
            <table class="data-table">
              <thead>
                <tr>
                  <th *ngFor="let col of preview.columns">{{col}}</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let row of preview.after">
                  <td *ngFor="let col of preview.columns">
                    {{row[col]}}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <p class="note">💡 Affichage des 10 premières lignes uniquement</p>
    </div>
  `,
  styles: [`
    .preview-container { margin: 2rem 0; }
    h3 { font-size: 1.5rem; color: #2c3e50; margin-bottom: 1.5rem; text-align: center; }
    .tables-wrapper { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 1rem; }
    @media (max-width: 1200px) { .tables-wrapper { grid-template-columns: 1fr; } }
    .table-section { background: white; border-radius: 10px; padding: 1rem; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    h4 { font-size: 1.1rem; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 2px solid #e9ecef; }
    .table-scroll { overflow-x: auto; max-height: 400px; overflow-y: auto; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    .data-table th { background: #667eea; color: white; padding: 0.75rem; text-align: left; position: sticky; top: 0; z-index: 1; }
    .data-table td { padding: 0.75rem; border-bottom: 1px solid #e9ecef; }
    .data-table tr:hover { background: #f8f9fa; }
    .data-table td.empty { background: #fff3cd; color: #856404; font-style: italic; }
    .note { text-align: center; color: #6c757d; font-size: 0.9rem; margin-top: 1rem; }
  `]
})
export class DataPreviewComponent {
  @Input() preview: any;
}
