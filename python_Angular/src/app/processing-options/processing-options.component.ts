import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-processing-options',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './processing-options.component.html',
  styleUrls: ['./processing-options.component.css']
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
