import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { barHeights } from '@helpers/analytics';

export interface BarPoint {
  label: string; // axis label (short)
  value: number;
  title: string; // hover text
}

// A plain CSS bar chart: one bar per point, height relative to the largest value.
@Component({
  selector: 'app-bar-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bars" role="img" [attr.aria-label]="label()">
      @for (bar of bars(); track $index) {
        <div class="bar-col" [title]="bar.title">
          <div class="bar" [style.height.%]="bar.height"></div>
          <span class="bar-label">{{ bar.label }}</span>
        </div>
      }
    </div>
  `,
  styles: `
    .bars { display: flex; align-items: flex-end; gap: 3px; height: 160px; }
    .bar-col { flex: 1; display: flex; flex-direction: column; justify-content: flex-end; height: 100%; min-width: 0; }
    .bar { background: var(--bs-primary, #3f51b5); border-radius: 3px 3px 0 0; min-height: 1px; opacity: 0.85; }
    .bar-col:hover .bar { opacity: 1; }
    .bar-label { font-size: 10px; color: #6c757d; text-align: center; white-space: nowrap; overflow: hidden; height: 14px; }
  `,
})
export class BarChartComponent {
  points = input.required<BarPoint[]>();
  label = input('Bar chart');

  bars = computed(() => {
    const heights = barHeights(this.points().map((p) => p.value));
    return this.points().map((p, i) => ({ ...p, height: heights[i] }));
  });
}
