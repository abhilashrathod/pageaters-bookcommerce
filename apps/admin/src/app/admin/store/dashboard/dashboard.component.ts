import { Component, OnInit, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { MatCard, MatCardTitle, MatCardContent } from '@angular/material/card';
import { RouterLink } from '@angular/router';
import { DealsService } from '@services/deals.service';
import { CmsService, cmsAdminUrl, type CmsAnnouncementBar, type CmsFooter } from '@services/cms.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: 'dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatCard, RouterLink, MatCardTitle, MatCardContent],
})
export class DashboardComponent implements OnInit {
  private dealsService = inject(DealsService);
  private cms = inject(CmsService);

  announcement = signal<CmsAnnouncementBar | null>(null);
  footer = signal<CmsFooter | null>(null);
  cmsDown = signal(false);
  dealsStat = signal(0);

  editAnnouncement = cmsAdminUrl('globals/announcement-bar');
  editFooter = cmsAdminUrl('globals/footer');
  editFaq = cmsAdminUrl('collections/pages');

  ngOnInit(): void {
    const down = () => this.cmsDown.set(true);
    this.cms.announcementBar().subscribe({ next: (a) => this.announcement.set(a), error: down });
    this.cms.footer().subscribe({ next: (f) => this.footer.set(f), error: down });
    this.dealsService.getAllDeals({ page: 1, limit: 3 }).subscribe((res) => this.dealsStat.set(res.totalDocs));
  }
}
