import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormControl, FormGroup} from '@angular/forms';
import {MatSnackBar} from '@angular/material/snack-bar';
import {Router} from '@angular/router';
import {MatChipInputEvent} from '@angular/material/chips';
import {debounceTime} from 'rxjs/operators';
import {sumBy} from 'lodash';

import {BooksService} from '../../../core/services/books.service';
import {FilesService} from '../../../core/services/files.service';
import {BundleService} from '../../../core/services/bundle.service';
import {CollectionService} from '../../../core/services/collection.service';

import {BUCKETS, FILE_UPLOAD_MODULES, returnPercentageValue} from '../../../core/helpers/constants';

@Component({
  selector: 'app-bundle-create',
  templateUrl: 'bundle-create.component.html'
})

export class BundleCreateComponent implements OnInit {
  bundleFormGroup: FormGroup;
  poster;
  selectedFile: File;
  filters = {
    limit: 25,
    page: 1,
  };

  books = [];
  bundles = [];
  collections = [];

  searchBooksCtrl = new FormControl();
  searchCollectionsCtrl = new FormControl();
  searchBundlesCtrl = new FormControl();

  DROPDOWN_OPTIONS = {
    enableSearchFilter: true,
    badgeShowLimit: '10',
    classes: 'custom-dropdown',
    primaryKey: '_id',
    singleSelection: false
  };

  booksDropdownSettings = {
    text: 'Books in Bundle',
    searchPlaceholderText: 'Search Books...',
    ...this.DROPDOWN_OPTIONS,
  };

  bundleDropdownSettings = {
    text: 'Suggested Bundles',
    searchPlaceholderText: 'Search Bundles...',
    ...this.DROPDOWN_OPTIONS,
  };

  collectionsDropdownSettings = {
    text: 'Suggested Collections',
    searchPlaceholderText: 'Search Collections...',
    ...this.DROPDOWN_OPTIONS,
  };


  constructor(private formBuilder: FormBuilder,
              private snackBar: MatSnackBar,
              private router: Router,
              private bundleService: BundleService,
              private collectionService: CollectionService,
              private booksService: BooksService,
              private filesService: FilesService) {
  }

  get tags() {
    return this.bundleFormGroup.get('tags');
  }

  ngOnInit(): void {
    this.getSupportData();
    this.buildForm();
    this.search();
  }

  getSupportData(): void {
    this.getBooks();
    this.getBundles();
    this.getCollections();
  }

  getBooks(): void {
    this.booksService.getAllBooks(this.filters)
      .subscribe(res => this.books = res.docs);
  }

  searchBooks(q): void {
    this.booksService.searchBooks(q)
      .subscribe(res => this.books = res);
  }

  getBundles(): void {
    this.bundleService.getAllBundles(this.filters)
      .subscribe(res => this.bundles = res.docs);
  }

  searchBundles(q): void {
    this.bundleService.searchBundles(q)
      .subscribe(res => this.bundles = res);
  }

  getCollections(): void {
    this.collectionService.getAllCollections(this.filters)
      .subscribe(res => this.collections = res.docs);
  }

  searchCollections(q): void {
    this.collectionService.searchCollections(q)
      .subscribe(res => this.collections = res);
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
  }


  buildForm(): void {
    this.bundleFormGroup = this.formBuilder.group({
      title: [''],
      description: [''],
      tags: [[]],
      bundledBooks: [[]],
      relatedCollections: [[]],
      relatedBundles: [[]],
      currentDiscount: [0],
      weight: [0],
      price: [0],
      popularity: [0],
      priority: [0],
      membersPrice: [0],
    });
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

  calculateDiscountedPrices(): void {
    const {bundledBooks, currentDiscount} = this.bundleFormGroup.value;

    for (const book of bundledBooks) {
      book.discountedPrice = book.currentDiscount > 0 ? returnPercentageValue(100 - book.currentDiscount, book.price) : book.price;
    }

    const price = sumBy(bundledBooks, (x: any) => x.discountedPrice);
    const discountedPrice = returnPercentageValue(100 - currentDiscount, price);

    this.bundleFormGroup.patchValue({
      price: discountedPrice,
    });
  }

  calculatePrices(): void {
    const {bundledBooks} = this.bundleFormGroup.value;

    for (const book of bundledBooks) {
      book.discountedPrice = book.currentDiscount > 0 ? returnPercentageValue(100 - book.currentDiscount, book.price) : book.price;
    }
    const price = sumBy(bundledBooks, (x: any) => x.discountedPrice);
    const weight = sumBy(bundledBooks, (x: any) => x.weight);

    this.bundleFormGroup.patchValue({
      price,
      weight,
      membersPrice: price,
    });
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

  uploadImage(): any {
    if (!this.bundleFormGroup.get('title').value) {
      return this.snackBar.open('Please enter the title before file upload', 'OKAY', {duration: 3000});
    }

    if (!this.selectedFile) {
      return this.snackBar.open('Please select a file', 'OKAY', {duration: 3000});
    }

    const formData: FormData = new FormData();
    formData.append('file', this.selectedFile, this.selectedFile.name);
    formData.append('title', this.bundleFormGroup.get('title').value);
    formData.append('fileModule', FILE_UPLOAD_MODULES.BUNDLE);
    const file$ = this.filesService.upload(formData);
    file$.subscribe(res => {
      this.poster = `${BUCKETS.BUNDLES}/${res.fileUrl}`;
      this.snackBar.open('Image Uploaded!', 'OKAY', {duration: 5000});
    }, err => {
      this.snackBar.open(err.message, 'OKAY', {duration: 5000});
    });
  }

  onSubmit(): void {
    const {bundledBooks, relatedCollections, relatedBundles, ...rest} = this.bundleFormGroup.value;
    const payload = {
      ...rest,
      bundledBooks: bundledBooks.map(x => x._id),
      relatedCollections: relatedCollections.map(x => x._id),
      relatedBundles: relatedBundles.map(x => x._id),
      poster: this.poster.split('/').pop(),
    };

    const bundle$ = this.bundleService.create(payload);
    bundle$.subscribe((res) => {
      this.router.navigate(['/', 'admin', 'bundles']);
      this.snackBar.open('New Bundle Created', 'OKAY', {duration: 5000});
    }, error => {
      this.snackBar.open(error.message, 'OKAY', {duration: 5000});
    });
  }
}
