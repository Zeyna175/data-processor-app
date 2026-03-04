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
                    {{formatValue(row[col])}}
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
                    {{formatValue(row[col])}}
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
    .preview-container { margin: 2rem 0; padding: 1.5rem; background: #f8f9fa; border-radius: 12px; }
    h3 { font-size: 1.8rem; font-weight: 700; color: #1a202c; margin-bottom: 2rem; text-align: center; }
    .tables-wrapper { display: grid; grid-template-columns: 1fr 1fr; gap: 2.5rem; margin-bottom: 1.5rem; }
    @media (max-width: 1200px) { .tables-wrapper { grid-template-columns: 1fr; } }
    .table-section { background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
    h4 { font-size: 1.2rem; font-weight: 600; margin-bottom: 1.2rem; padding-bottom: 0.8rem; border-bottom: 3px solid #e2e8f0; }
    .table-scroll { overflow-x: auto; max-height: 450px; overflow-y: auto; border-radius: 8px; border: 1px solid #e2e8f0; }
    .data-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 0.95rem; font-family: 'Segoe UI', system-ui, sans-serif; }
    .data-table th { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1rem 0.9rem; text-align: left; font-weight: 600; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.5px; position: sticky; top: 0; z-index: 10; border-right: 1px solid rgba(255,255,255,0.2); }
    .data-table th:last-child { border-right: none; }
    .data-table td { padding: 0.9rem; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #f1f5f9; background: white; color: #2d3748; font-weight: 500; }
    .data-table td:last-child { border-right: none; }
    .data-table tbody tr:nth-child(even) td { background: #f7fafc; }
    .data-table tbody tr:hover td { background: #edf2f7; transition: background 0.2s ease; }
    .data-table td.empty { background: #fef3c7 !important; color: #92400e; font-style: italic; font-weight: 600; }
    .note { text-align: center; color: #4a5568; font-size: 0.95rem; font-weight: 500; margin-top: 1.5rem; padding: 0.8rem; background: white; border-radius: 8px; border-left: 4px solid #667eea; }
  `]
})
export class DataPreviewComponent {
  @Input() preview: any;

  formatValue(val: any): string {
    if (val === null || val === undefined || val === '') return 'NaN';
    if (typeof val === 'number') return val.toFixed(2);
    return String(val);
  }
}
