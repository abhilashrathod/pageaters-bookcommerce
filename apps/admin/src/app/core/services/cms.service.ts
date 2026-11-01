// Read-only store details from the CMS's public REST API (Payload globals). No credentials: the globals are public.
import { Injectable } from '@angular/core';
import { defer, Observable } from 'rxjs';
import { environment } from '@env/environment';

interface CmsLink {
  label?: string | null;
  href?: string | null;
}

export interface CmsAnnouncementBar {
  enabled?: boolean | null;
  message?: string | null;
  link?: CmsLink | null;
}

export interface CmsFooter {
  contact?: string | null;
  legal?: string | null;
}

export const cmsAdminUrl = (path: string) => `${environment.CMS_URL}/admin/${path}`;

@Injectable({ providedIn: 'root' })
export class CmsService {
  private global<T>(slug: string): Observable<T> {
    return defer(async () => {
      const res = await fetch(`${environment.CMS_URL}/api/globals/${slug}`, { credentials: 'omit' });
      if (!res.ok) throw new Error(`CMS answered ${res.status}`);
      return (await res.json()) as T;
    });
  }

  announcementBar(): Observable<CmsAnnouncementBar> {
    return this.global('announcement-bar');
  }

  footer(): Observable<CmsFooter> {
    return this.global('footer');
  }
}
