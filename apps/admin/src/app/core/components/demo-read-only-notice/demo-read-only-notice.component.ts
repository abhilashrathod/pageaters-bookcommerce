import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DemoAdminService } from '@services/demo-admin.service';

@Component({
  selector: 'app-demo-read-only-notice',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (demoAdmin.readOnly()) {
      <p class="alert alert-warning" role="status">Demo admin: catalog is read-only — changes won't be saved</p>
    }
  `,
})
export class DemoReadOnlyNoticeComponent {
  protected demoAdmin = inject(DemoAdminService);
}
