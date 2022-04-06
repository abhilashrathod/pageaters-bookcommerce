import {Component, OnInit} from '@angular/core';
import {FormBuilder} from '@angular/forms';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ActivatedRoute, Router} from '@angular/router';

import {BundleService} from '../../../core/services/bundle.service';
import {CategoryService} from '../../../core/services/category.service';
import {AuthorService} from '../../../core/services/author.service';
import {CollectionService} from '../../../core/services/collection.service';
import {BooksService} from '../../../core/services/books.service';
import {FilesService} from '../../../core/services/files.service';

import {IBook} from '../../../core/schema/book';
import {BUCKETS} from '../../../core/helpers/constants';

@Component({
  selector: 'app-order-view',
  templateUrl: 'order-view.component.html'
})

export class OrderViewComponent implements OnInit {
  book: IBook;
  isReady = false;

  constructor(private formBuilder: FormBuilder,
              private snackBar: MatSnackBar,
              private bundleService: BundleService,
              private categoryService: CategoryService,
              private authorService: AuthorService,
              private collectionService: CollectionService,
              private router: Router,
              private route: ActivatedRoute,
              private booksService: BooksService,
              private filesService: FilesService) {
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params.id) {
        this.getBookDetails(params.id);
      }
    });
  }

  getBookDetails(id): void {
    const book$ = this.booksService.getById(id);
    book$.subscribe(res => {
      this.book = res;
      this.book.poster = `${BUCKETS.BOOKS}/${this.book.poster}`;
      this.isReady = true;
      // this.buildForms(res);
    }, err => {
      this.snackBar.open(err.message, 'OKAY', {duration: 5000});
    });
  }
}
