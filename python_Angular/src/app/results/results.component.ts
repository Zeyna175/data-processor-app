import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataPreviewComponent } from '../data-preview/data-preview.component';

@Component({
  selector: 'app-results',
  standalone: true,
  imports: [CommonModule, DataPreviewComponent],
  templateUrl: './results.component.html',
  styleUrls: ['./results.component.css']
})
export class ResultsComponent {
  @Input() stats: any;
  @Input() filename: string = '';
  @Output() download = new EventEmitter<void>();
  @Output() newFile = new EventEmitter<void>();
  @Output() viewPreview = new EventEmitter<void>();

  hasMissingValues() { return this.stats?.missing_values && Object.keys(this.stats.missing_values).length > 0; }
  hasOutliers() { return this.stats?.outliers && Object.keys(this.stats.outliers).length > 0; }
  getTotalMissing() { return Object.values(this.stats?.missing_values || {}).reduce((a: number, b: any) => a + Number(b), 0); }
  getTotalOutliers() { return Object.values(this.stats?.outliers || {}).reduce((a: number, b: any) => a + Number(b), 0); }
  getMissingItems() { return Object.entries(this.stats?.missing_values || {}).map(([key, value]) => ({ key, value })); }
  getOutlierItems() { return Object.entries(this.stats?.outliers || {}).map(([key, value]) => ({ key, value })); }

  getNormalizationLabel() {
    const m = this.stats?.normalization_method || 'standard';
    return m === 'standard' ? 'Standard (Z-score)' : m === 'minmax' ? 'Min-Max [0, 1]' : 'Aucune';
  }

  onDownload() { this.download.emit(); }
  onNewFile() { this.newFile.emit(); }
}
