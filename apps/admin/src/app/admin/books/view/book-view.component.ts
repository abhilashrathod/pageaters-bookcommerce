import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { UntypedFormBuilder } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';

import { BundleService } from '@services/bundle.service';
import { CategoryService } from '@services/category.service';
import { AuthorService } from '@services/author.service';
import { CollectionService } from '@services/collection.service';
import { BooksService } from '@services/books.service';
import { FilesService } from '@services/files.service';

import type { Book } from '@pageaters/shared';
import { MatCard, MatCardTitle, MatCardContent } from '@angular/material/card';
import { apiErrorMessage } from '@services/api-client';

@Component({
  selector: 'app-book-view',
  templateUrl: 'book-view.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [MatCard, MatCardTitle, MatCardContent],
})
export class BookViewComponent implements OnInit {
  book: Book;
  isReady = false;

  constructor(
    private formBuilder: UntypedFormBuilder,
    private snackBar: MatSnackBar,
    private bundleService: BundleService,
    private categoryService: CategoryService,
    private authorService: AuthorService,
    private collectionService: CollectionService,
    private router: Router,
    private route: ActivatedRoute,
    private booksService: BooksService,
    private filesService: FilesService,
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      if (params.id) {
        this.getBookDetails(params.id);
      }
    });
  }

  getBookDetails(id): void {
    const book$ = this.booksService.getById(id);
    book$.subscribe(
      (res) => {
        this.book = res;
        this.isReady = true;
      },
      (err) => {
        this.snackBar.open(apiErrorMessage(err), 'OKAY', { duration: 5000 });
      },
    );
  }
}
