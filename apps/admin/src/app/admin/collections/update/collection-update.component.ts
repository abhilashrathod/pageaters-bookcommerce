import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormControl, FormGroup} from '@angular/forms';
import {MatSnackBar} from '@angular/material/snack-bar';
import {MatChipInputEvent} from '@angular/material/chips';
import {ActivatedRoute, Router} from '@angular/router';
import {debounceTime} from 'rxjs/operators';
import {get} from 'lodash';
import {range} from 'lodash';

import {CategoryService} from '../../../core/services/category.service';
import {CollectionService} from '../../../core/services/collection.service';
import {BooksService} from '../../../core/services/books.service';
import {AuthorService} from '../../../core/services/author.service';
import {FilesService} from '../../../core/services/files.service';

import {FILE_UPLOAD_MODULES} from '../../../core/helpers/constants';


@Component({
  selector: 'app-collection-update',
  templateUrl: 'collection-update.component.html'
})

export class CollectionUpdateComponent implements OnInit {

  collectionFormGroup: FormGroup;
  poster;
  collection;
  selectedFile: File;
  filters = {
    limit: 25,
    page: 1,
  };
  isReady = false;
  books = [];
  collections = [];
  categories = [];
  authors = [];

  searchBooksCtrl = new FormControl();
  searchCollectionsCtrl = new FormControl();
  searchAuthorsCtrl = new FormControl();
  searchCategoriesCtrl = new FormControl();
  priority = range(1, 26, 1);

  DROPDOWN_OPTIONS = {
    enableSearchFilter: true,
    badgeShowLimit: '10',
    classes: 'custom-dropdown',
    primaryKey: '_id',
    singleSelection: false
  };

  collectionsDropdownSettings = {
    text: 'Related Collections',
    searchPlaceholderText: 'Search Collections...',
    ...this.DROPDOWN_OPTIONS,
  };

  booksDropdownSettings = {
    text: 'Books in Collection',
    searchPlaceholderText: 'Search Books...',
    ...this.DROPDOWN_OPTIONS,
  };

  authorDropdownSettings = {
    text: 'Featured Authors',
    searchPlaceholderText: 'Search Books...',
    ...this.DROPDOWN_OPTIONS,
  };

  categoryDropdownSettings = {
    text: 'Related Categories',
    searchPlaceholderText: 'Search Books...',
    ...this.DROPDOWN_OPTIONS,
  };

  constructor(private formBuilder: FormBuilder,
              private snackBar: MatSnackBar,
              private router: Router,
              private route: ActivatedRoute,
              private categoryService: CategoryService,
              private collectionService: CollectionService,
              private booksService: BooksService,
              private authorService: AuthorService,
              private filesService: FilesService) {
  }

  get tags() {
    return this.collectionFormGroup.get('tags');
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params.id) {
        this.getCollectionDetails(params.id);
      }
    });

    this.search();
    this.getSupportData();
  }

  getCollectionDetails(id): void {
    this.collectionService.getById(id)
      .subscribe(res => {
        this.collection = res;
        this.buildForm(res);
      });
  }

  buildForm(collection): void {
    this.collectionFormGroup = this.formBuilder.group({
      title: [get(collection, 'title', '')],
      description: [get(collection, 'description', '')],
      tags: [get(collection, 'tags', [])],
      books: [get(collection, 'books', [])],
      relatedCollections: [get(collection, 'relatedCollections', [])],
      relatedCategories: [get(collection, 'relatedCategories', [])],
      featuredAuthors: [get(collection, 'featuredAuthors', [])],
      priority: [get(collection, 'priority', [])],
      popularity: [get(collection, 'popularity', [])],
    });

    this.isReady = true;
  }

  getSupportData(): void {
    this.getBooks();
    this.getCategories();
    this.getCollections();
    this.getAuthors();
  }

  getBooks(): void {
    this.booksService.getAllBooks(this.filters)
      .subscribe(res => this.books = res.docs);
  }

  getCategories(): void {
    this.categoryService.getAllCategories(this.filters)
      .subscribe(res => this.categories = res.docs);
  }

  getCollections(): void {
    this.collectionService.getAllCollections(this.filters)
      .subscribe(res => this.collections = res.docs);
  }

  getAuthors(): void {
    this.authorService.getAllAuthors(this.filters)
      .subscribe(res => this.authors = res.docs);
  }

  search(): void {
    /* BOOKS */
    this.searchBooksCtrl
      .valueChanges
      .pipe(
        debounceTime(750),
      )
      .subscribe((text) => {
        if (text) {
          this.searchBooks(text);
        } else {
          this.getBooks();
        }
      });

    /* AUTHORS */
    this.searchAuthorsCtrl
      .valueChanges
      .pipe(
        debounceTime(750),
      )
      .subscribe((text) => {
        if (text) {
          this.searchAuthors(text);
        } else {
          this.getAuthors();
        }
      });


    /* CATEGORIES */
    this.searchCategoriesCtrl
      .valueChanges
      .pipe(
        debounceTime(750),
      )
      .subscribe((text) => {
        if (text) {
          this.searchCategories(text);
        } else {
          this.getCategories();
        }
      });

    /* COLLECTIONS */
    this.searchCollectionsCtrl
      .valueChanges
      .pipe(
        debounceTime(750),
      )
      .subscribe((text) => {
        if (text) {
          this.searchCollections(text);
        } else {
          this.getCollections();
        }
      });
  }

  searchBooks(q): void {
    this.booksService.searchBooks(q)
      .subscribe(res => this.books = res);
  }

  searchAuthors(q): void {
    this.authorService.searchAuthors(q)
      .subscribe(res => this.authors = res);
  }

  searchCollections(q): void {
    this.collectionService.searchCollections(q)
      .subscribe(res => this.collections = res);
  }

  searchCategories(q): void {
    this.categoryService.searchCategories(q)
      .subscribe(res => this.categories = res);
  }

  add(event: MatChipInputEvent) {
    const value = (event.value || '').trim();
    if (value) {
      this.tags.value.push(value);
    }
    event.chipInput!.clear();
  }

  remove(index) {
    this.tags.value.splice(index, 1);
    this.tags.updateValueAndValidity();
  }


  previewImage(event): void {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];

      const reader = new FileReader();
      reader.onload = e => this.collection.poster = reader.result;

      reader.readAsDataURL(file);

      this.selectedFile = file;
    }
  }

  uploadImage(): any {
    if (!this.collectionFormGroup.get('title').value) {
      return this.snackBar.open('Please enter the title before file upload', 'OKAY', {duration: 3000});
    }

    const formData: FormData = new FormData();
    formData.append('file', this.selectedFile, this.selectedFile.name);
    formData.append('title', this.collectionFormGroup.get('title').value);
    formData.append('fileModule', FILE_UPLOAD_MODULES.COLLECTION);
    const file$ = this.filesService.upload(formData);
    file$.subscribe(res => {
      this.collection.poster = res.fileUrl;
      this.snackBar.open('Image Uploaded!', 'OKAY', {duration: 5000});
    }, err => {
      this.snackBar.open(err.message, 'OKAY', {duration: 5000});
    });
  }

  onSubmit(): void {
    const {books, relatedCollections, relatedCategories, featuredAuthors, ...rest} = this.collectionFormGroup.value;
    const payload = {
      ...this.collection,
      ...rest,
      books: books.map(x => x._id),
      relatedCollections: relatedCollections.map(x => x._id),
      relatedCategories: relatedCategories.map(x => x._id),
      featuredAuthors: featuredAuthors.map(x => x._id),
    };

    const collection$ = this.collectionService.update(this.collection._id, payload);
    collection$.subscribe((res) => {
      this.router.navigate(['/', 'admin', 'collections']);
      this.snackBar.open('Collection Updated', 'OKAY', {duration: 5000});
    }, error => {
      this.snackBar.open(error.message, 'OKAY', {duration: 5000});
    });
  }
}
