import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataProcessorService } from '../services/data-processor.service';

@Component({
  selector: 'app-results',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './results.component.html',
  styleUrls: ['./results.component.css']
})
export class ResultsComponent implements OnChanges {
  @Input() stats: any;
  @Input() filename: string = '';
  @Output() download = new EventEmitter<void>();
  @Output() newFile = new EventEmitter<void>();

  showPreview = false;
  previewLoading = false;
  previewError = '';
  previewColumns: string[] = [];
  previewData: any[] = [];

  constructor(private dataService: DataProcessorService) { }

  ngOnInit() {
    if (this.filename) {
      this.openPreview();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['filename'] && !changes['filename'].firstChange && this.filename) {
      this.openPreview();
    }
  }

  togglePreview() {
    this.showPreview = !this.showPreview;
    if (this.showPreview && this.previewColumns.length === 0) {
      this.openPreview();
    }
  }

  openPreview() {
    this.showPreview = true;
    if (this.previewColumns.length > 0) return;

    this.previewLoading = true;
    this.previewError = '';

    this.dataService.downloadFile(this.filename).subscribe({
      next: (blob: Blob) => {
        this.parseBlob(blob);
      },
      error: () => {
        this.previewLoading = false;
        this.previewError = 'Impossible de charger l\'aperçu.';
      }
    });
  }

  parseBlob(blob: Blob) {
    const ext = this.filename.split('.').pop()?.toLowerCase();

    if (ext === 'json') {
      blob.text().then(text => {
        try {
          const data = JSON.parse(text);
          const arr = Array.isArray(data) ? data : [data];
          this.previewColumns = arr.length > 0 ? Object.keys(arr[0]) : [];
          this.previewData = arr.slice(0, 50);
          this.previewLoading = false;
        } catch {
          this.previewLoading = false;
          this.previewError = 'Erreur de tri du JSON.';
        }
      });
    } else if (ext === 'csv') {
      blob.text().then(text => {
        try {
          const lines = text.split('\n').filter(l => l.trim());
          if (lines.length < 2) throw new Error();
          const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
          this.previewColumns = headers;
          this.previewData = lines.slice(1, 51).map(line => {
            const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            const row: any = {};
            headers.forEach((h, i) => row[h] = vals[i] ?? '');
            return row;
          });
          this.previewLoading = false;
        } catch {
          this.previewLoading = false;
          this.previewError = 'Erreur de tri du CSV.';
        }
      });
    } else {
      this.previewLoading = false;
      this.previewError = 'Aperçu non disponible pour ce format.';
    }
  }

  formatVal(v: any): string {
    if (typeof v === 'number') return Number.isInteger(v) ? v.toString() : v.toFixed(4);
    return String(v);
  }

  hasMissingValues() { return this.stats?.missing_values && Object.keys(this.stats.missing_values).length > 0; }
  hasOutliers() { return this.stats?.outliers && Object.keys(this.stats.outliers).length > 0; }
  getTotalMissing() { return Object.values(this.stats?.missing_values || {}).reduce((a: number, b: any) => a + Number(b), 0); }
  getTotalOutliers() { return Object.values(this.stats?.outliers || {}).reduce((a: number, b: any) => a + Number(b), 0); }
  getMissingItems() { return Object.entries(this.stats?.missing_values || {}).map(([key, value]) => ({ key, value })); }
  getOutlierItems() { return Object.entries(this.stats?.outliers || {}).map(([key, value]) => ({ key, value })); }

  getNormalizationLabel() {
    const m = this.stats?.normalization_method || 'standard';
    return m === 'standard' ? 'Standard (Z-score)' : 'Min-Max [0, 1]';
  }

  onDownload() { this.download.emit(); }
  onNewFile() { this.newFile.emit(); }
}
