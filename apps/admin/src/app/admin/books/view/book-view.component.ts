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

import { IBook } from '@schema/book';
import { BUCKETS } from '@helpers/constants';

@Component({
  selector: 'app-book-view',
  templateUrl: 'book-view.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class BookViewComponent implements OnInit {
  book: IBook;
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
        this.book.poster = `${BUCKETS.BOOKS}/${this.book.poster}`;
        this.isReady = true;
      },
      (err) => {
        this.snackBar.open(err.message, 'OKAY', { duration: 5000 });
      },
    );
  }
}
