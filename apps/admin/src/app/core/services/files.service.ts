import { Injectable, inject } from '@angular/core';
import { defer } from 'rxjs';
import { fileUploadForm, fileUploadRequest, type FileUploadInput } from '@pageaters/api-client';
import { API_CLIENT } from './api-client';

@Injectable({ providedIn: 'root' })
export class FilesService {
  private client = inject(API_CLIENT);

  /** Uploads to Vercel Blob through the API; `fileUrl` is the stored file's full https URL. */
  upload(input: FileUploadInput) {
    return defer(() => this.client.request(fileUploadRequest(fileUploadForm(input))));
  }
}
