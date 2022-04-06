import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';
import {MatSnackBar} from '@angular/material/snack-bar';
import {Router} from '@angular/router';
import {CategoryService} from '../../../core/services/category.service';
import {FilesService} from '../../../core/services/files.service';
import {CollectionService} from '../../../core/services/collection.service';
import {AuthorService} from '../../../core/services/author.service';
import {BooksService} from '../../../core/services/books.service';
import {
  BOOK_VERSIONS,
  BUCKETS,
  FILE_UPLOAD_MODULES,
  PRICING_PERCENTAGES,
  READING_LEVELS,
  returnPercentageValue
} from '../../../core/helpers/constants';
import {MatChipInputEvent} from '@angular/material/chips';
import {BundleService} from '../../../core/services/bundle.service';
import {debounceTime} from 'rxjs/operators';

@Component({
  selector: 'app-book-create',
  templateUrl: 'book-create.component.html'
})

export class BookCreateComponent implements OnInit {

  poster;
  selectedFile: File;

  filters = {
    limit: 25,
    page: 1,
  };

  books = [];
  bundles = [];
  collections = [];
  categories = [];
  authors = [];

  bookEditionOptions = BOOK_VERSIONS;
  readingLevelOptions = READING_LEVELS;

  DROPDOWN_OPTIONS = {
    enableSearchFilter: true,
    badgeShowLimit: '10',
    classes: 'custom-dropdown',
    primaryKey: '_id',
    singleSelection: false
  };

  collectionsDropdownSettings = {
    text: 'Suggested Collections',
    searchPlaceholderText: 'Search Collections...',
    ...this.DROPDOWN_OPTIONS,
  };

  booksDropdownSettings = {
    text: 'Similar Books',
    searchPlaceholderText: 'Search Books...',
    ...this.DROPDOWN_OPTIONS,
  };

  authorDropdownSettings = {
    ...this.DROPDOWN_OPTIONS,
    text: 'Author',
    searchPlaceholderText: 'Search Authors...',
    singleSelection: true,
  };

  categoryDropdownSettings = {
    text: 'Book Categories',
    searchPlaceholderText: 'Search Categories...',
    ...this.DROPDOWN_OPTIONS,
  };

  bundleDropdownSettings = {
    text: 'Suggested Bundles',
    searchPlaceholderText: 'Search Bundles...',
    ...this.DROPDOWN_OPTIONS,
  };

  searchBooksCtrl = new FormControl();
  searchCollectionsCtrl = new FormControl();
  searchAuthorsCtrl = new FormControl();
  searchCategoriesCtrl = new FormControl();
  searchBundlesCtrl = new FormControl();

  primaryFormGroup: FormGroup;
  shippingFormGroup: FormGroup;
  relatedInfoFormGroup: FormGroup;
  pricingFormGroup: FormGroup;

  constructor(private formBuilder: FormBuilder,
              private booksService: BooksService,
              private filesService: FilesService,
              private bundleService: BundleService,
              private categoryService: CategoryService,
              private authorService: AuthorService,
              private collectionService: CollectionService,
              private router: Router,
              private snackBar: MatSnackBar) {
  }

  get tags() {
    return this.primaryFormGroup.get('tags');
  }


  ngOnInit(): void {
    this.buildForms();
    this.getSupportData();
  }

  buildForms(): void {
    this.buildPrimaryForm();
  }

  buildPrimaryForm(): void {
    this.primaryFormGroup = this.formBuilder.group({
      title: [''],
      tagline: [''],
      author: ['', Validators.required],
      description: [''],
      tags: [[]],

      language: ['EN'],
      pages: [''],
      version: [''],
      readingLevel: [this.readingLevelOptions[0]],

      ISBN: [''],
      publicationYear: [''],
      publisher: [''],

      bestSeller: [false],
      editorsPick: [false],
    });
    this.shippingFormGroup = this.formBuilder.group({
      dimensions: [''],
      weight: [''],
    });
    this.pricingFormGroup = this.formBuilder.group({
      price: [0],
      rentPrice: [0],
      membersPrice: [0],
      membersRentPrice: [0],

      wholeSalePriceHistory: [0],
      inventory: [0],

      currentDiscount: [0],
    });
    this.relatedInfoFormGroup = this.formBuilder.group({
      relatedBooks: [[]],
      relatedCollections: [[]],
      relatedBundles: [[]],
      categories: [[]],
    });

    this.searchBooksCtrl.valueChanges
      .pipe(
        debounceTime(500),
      )
      .subscribe((res) => {
        if (res) {
          this.searchBooks(res);
        } else {
          this.filters.limit = 25;
          this.filters.page = 1;
          this.getBooks();
        }
      });

    this.searchCategoriesCtrl.valueChanges
      .pipe(
        debounceTime(500),
      )
      .subscribe((res) => {
        if (res) {
          this.searchCategories(res);
        } else {
          this.filters.limit = 25;
          this.filters.page = 1;
          this.getCategories();
        }
      });

    this.searchCollectionsCtrl.valueChanges
      .pipe(
        debounceTime(500),
      )
      .subscribe((res) => {
        if (res) {
          this.searchCollections(res);
        } else {
          this.filters.limit = 25;
          this.filters.page = 1;
          this.getCollections();
        }
      });


    this.searchBundlesCtrl.valueChanges
      .pipe(
        debounceTime(500),
      )
      .subscribe((res) => {
        if (res) {
          this.searchBundles(res);
        } else {
          this.filters.limit = 25;
          this.filters.page = 1;
          this.getBundles();
        }
      });

    this.searchAuthorsCtrl.valueChanges
      .pipe(
        debounceTime(500),
      )
      .subscribe((res) => {
        if (res) {
          this.searchAuthors(res);
        } else {
          this.filters.limit = 25;
          this.filters.page = 1;
          this.getAuthors();
        }
      });
  }

  getSupportData(): void {
    this.getBooks();
    this.getCategories();
    this.getCollections();
    this.getAuthors();
    this.getBundles();
  }


  getBooks(): void {
    this.booksService.getAllBooks(this.filters)
      .subscribe(res => this.books = res.docs);
  }

  searchBooks(q): void {
    this.booksService.searchBooks(q)
      .subscribe(res => this.books = res);
  }

  getCategories(): void {
    this.categoryService.getAllCategories(this.filters)
      .subscribe(res => this.categories = res.docs);
  }

  searchCategories(q): void {
    this.categoryService.searchCategories(q)
      .subscribe(res => this.categories = res);
  }

  getCollections(): void {
    this.collectionService.getAllCollections(this.filters)
      .subscribe(res => this.collections = res.docs);
  }

  searchCollections(q): void {
    this.collectionService.searchCollections(q)
      .subscribe(res => this.collections = res);
  }

  getAuthors(): void {
    this.authorService.getAllAuthors(this.filters)
      .subscribe(res => this.authors = res.docs);
  }

  searchAuthors(q): void {
    this.authorService.searchAuthors(q)
      .subscribe(res => this.authors = res);
  }

  getBundles(): void {
    this.bundleService.getAllBundles(this.filters)
      .subscribe(res => this.bundles = res.docs);
  }

  searchBundles(q): void {
    this.bundleService.searchBundles(q)
      .subscribe(res => this.bundles = res);
  }

  previewImage(event): void {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];

      const reader = new FileReader();
      reader.onload = e => this.poster = reader.result;

      reader.readAsDataURL(file);

      this.selectedFile = file;
    }
  }

  calculateAmounts(): void {
    const {price} = this.pricingFormGroup.value;

    this.pricingFormGroup.get('rentPrice').patchValue(returnPercentageValue(PRICING_PERCENTAGES.NON_MEMBER_RENT, price));
    this.pricingFormGroup.get('membersPrice').patchValue(returnPercentageValue(PRICING_PERCENTAGES.MEMBER_PRICE, price));
    this.pricingFormGroup.get('membersRentPrice').patchValue(returnPercentageValue(PRICING_PERCENTAGES.MEMBER_RENT, price));
  }

  add(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();
    if (value) {
      this.tags.value.push(value);
    }
    event.chipInput!.clear();
  }

  remove(index): void {
    this.tags.value.splice(index, 1);
    this.tags.updateValueAndValidity();
  }

  uploadImage(): any {
    if (!this.primaryFormGroup.get('title').value) {
      return this.snackBar.open('Please enter the name first before file upload', 'OKAY', {duration: 3000});
    }

    if (!this.selectedFile) {
      return this.snackBar.open('Please select a file to upload', 'OKAY', {duration: 3000});
    }

    const formData: FormData = new FormData();
    formData.append('file', this.selectedFile, this.selectedFile.name);
    formData.append('title', this.primaryFormGroup.get('title').value);
    formData.append('fileModule', FILE_UPLOAD_MODULES.STORE_BOOK);
    const file$ = this.filesService.upload(formData);
    file$.subscribe(res => {
      this.poster = `${BUCKETS.BOOKS}/${res.fileUrl}`;
      this.snackBar.open('Book Thumbnail Uploaded!', 'OKAY', {duration: 5000});
    }, err => {
      this.snackBar.open(err.message, 'OKAY', {duration: 5000});
    });
  }

  onSubmit(): void {
    const {relatedBooks, relatedCollections, relatedBundles, categories} = this.relatedInfoFormGroup.value;
    const {author} = this.primaryFormGroup.value;

    if (!this.poster) {
      this.snackBar.open('Please select poster', 'OKAY', {duration: 5000});
    }

    const payload = {
      ...this.primaryFormGroup.value,
      ...this.shippingFormGroup.value,
      ...this.pricingFormGroup.value,
      ...this.relatedInfoFormGroup.value,
      author: author[0]._id,
      relatedBooks: relatedBooks.map(x => x._id),
      relatedCollections: relatedCollections.map(x => x._id),
      relatedBundles: relatedBundles.map(x => x._id),
      categories: categories.map(x => x._id),
      poster: this.poster.split('/').pop()
    };
    const book$ = this.booksService.create(payload);
    book$.subscribe(res => {
      this.router.navigate(['/', 'admin', 'books']);
      this.snackBar.open('New Book Added', 'OKAY', {duration: 5000});
    }, error => {
      this.snackBar.open(error.message, 'OKAY', {duration: 5000});
    });
  }
}
