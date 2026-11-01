import {Injectable} from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import {Observable, throwError} from 'rxjs';
import {catchError, map} from 'rxjs/operators';

import {environment} from '@env/environment';
import {IResponse} from '@schema/responses';

@Injectable({
  providedIn: 'root'
})
export class FilesService {

  constructor(private httpClient: HttpClient) {
  }

  upload(formData): Observable<any> {
    const url = `${environment.BASE_PATH}/file/upload`;
    return new Observable(observer => {
      const xhr: XMLHttpRequest = new XMLHttpRequest();
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            let data = xhr.response;
            data = JSON.parse(data);
            observer.next(data.data);
            observer.complete();
          } else {
            let err = xhr.response;
            err = JSON.parse(err);
            observer.error(err.error);
          }
        }
      };
      xhr.open('POST', url, true);
      xhr.withCredentials = true;
      xhr.send(formData);
    });
  }

  handleError(err: any): any {
    return throwError(err.error);
  }
}
