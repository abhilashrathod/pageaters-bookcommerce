import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { UntypedFormBuilder, UntypedFormControl, UntypedFormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { MatChipInputEvent, MatChipGrid, MatChipRow, MatChipRemove, MatChipInput } from '@angular/material/chips';
import { debounceTime } from 'rxjs/operators';
import { sumBy } from 'lodash';

import { BooksService } from '@services/books.service';
import { FilesService } from '@services/files.service';
import { BundleService } from '@services/bundle.service';
import { CollectionService } from '@services/collection.service';
import { CategoryService } from '@services/category.service';

import { BUCKETS, FILE_UPLOAD_MODULES, returnPercentageValue } from '@helpers/constants';
import { MatButton, MatFabButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { AngularMultiSelectModule } from 'angular2-multiselect-dropdown';
import { MatIcon } from '@angular/material/icon';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { TitleCasePipe } from '@angular/common';

@Component({
  selector: 'app-bundle-create',
  templateUrl: 'bundle-create.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatButton,
    MatFormField,
    MatLabel,
    MatInput,
    AngularMultiSelectModule,
    MatChipGrid,
    MatChipRow,
    MatIcon,
    MatChipRemove,
    MatChipInput,
    CdkTextareaAutosize,
    MatFabButton,
    RouterLink,
    TitleCasePipe,
  ],
})
export class BundleCreateComponent implements OnInit {
  bundleFormGroup: UntypedFormGroup;
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

  searchBooksCtrl = new UntypedFormControl();
  searchCollectionsCtrl = new UntypedFormControl();
  searchBundlesCtrl = new UntypedFormControl();
  searchCategoriesCtrl = new UntypedFormControl();

  DROPDOWN_OPTIONS = {
    enableSearchFilter: true,
    badgeShowLimit: '10',
    classes: 'custom-dropdown',
    primaryKey: '_id',
    singleSelection: false,
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

  categoryDropdownSettings = {
    text: 'Categories',
    searchPlaceholderText: 'Search Categories...',
    ...this.DROPDOWN_OPTIONS,
  };

  constructor(
    private formBuilder: UntypedFormBuilder,
    private snackBar: MatSnackBar,
    private router: Router,
    private bundleService: BundleService,
    private categoryService: CategoryService,
    private collectionService: CollectionService,
    private booksService: BooksService,
    private filesService: FilesService,
  ) {}

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
    this.getCategories();
  }

  getBooks(): void {
    this.booksService.getAllBooks(this.filters).subscribe((res) => (this.books = res.docs));
  }

  searchBooks(q): void {
    this.booksService.searchBooks(q).subscribe((res) => (this.books = res));
  }

  getBundles(): void {
    this.bundleService.getAllBundles(this.filters).subscribe((res) => (this.bundles = res.docs));
  }

  searchBundles(q): void {
    this.bundleService.searchBundles(q).subscribe((res) => (this.bundles = res));
  }

  getCollections(): void {
    this.collectionService.getAllCollections(this.filters).subscribe((res) => (this.collections = res.docs));
  }

  searchCollections(q): void {
    this.collectionService.searchCollections(q).subscribe((res) => (this.collections = res));
  }

  getCategories(): void {
    this.categoryService.getAllCategories(this.filters).subscribe((res) => (this.categories = res.docs));
  }

  searchCategories(q): void {
    this.categoryService.searchCategories(q).subscribe((res) => (this.categories = res));
  }

  search(): void {
    /* BOOKS */
    this.searchBooksCtrl.valueChanges.pipe(debounceTime(750)).subscribe((text) => {
      if (text) {
        this.searchBooks(text);
      } else {
        this.getBooks();
      }
    });

    this.searchCollectionsCtrl.valueChanges.pipe(debounceTime(500)).subscribe((res) => {
      if (res) {
        this.searchCollections(res);
      } else {
        this.filters.limit = 25;
        this.filters.page = 1;
        this.getCollections();
      }
    });

    /* BUNDLES */
    this.searchBundlesCtrl.valueChanges.pipe(debounceTime(500)).subscribe((res) => {
      if (res) {
        this.searchBundles(res);
      } else {
        this.filters.limit = 25;
        this.filters.page = 1;
        this.getBundles();
      }
    });

    /* CATEGORIES */
    this.searchCategoriesCtrl.valueChanges.pipe(debounceTime(750)).subscribe((text) => {
      if (text) {
        this.searchCategories(text);
      } else {
        this.getCategories();
      }
    });
  }

  buildForm(): void {
    this.bundleFormGroup = this.formBuilder.group({
      title: [''],
      description: [''],
      tags: [[]],
      bundledBooks: [[]],
      categories: [[]],
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
    const { bundledBooks, currentDiscount } = this.bundleFormGroup.value;

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
    const { bundledBooks } = this.bundleFormGroup.value;

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
      reader.onload = (e) => (this.poster = reader.result);

      reader.readAsDataURL(file);

      this.selectedFile = file;
    }
  }

  uploadImage(): any {
    if (!this.bundleFormGroup.get('title').value) {
      return this.snackBar.open('Please enter the title before file upload', 'OKAY', { duration: 3000 });
    }

    if (!this.selectedFile) {
      return this.snackBar.open('Please select a file', 'OKAY', { duration: 3000 });
    }

    const formData: FormData = new FormData();
    formData.append('file', this.selectedFile, this.selectedFile.name);
    formData.append('title', this.bundleFormGroup.get('title').value);
    formData.append('fileModule', FILE_UPLOAD_MODULES.BUNDLE);
    const file$ = this.filesService.upload(formData);
    file$.subscribe(
      (res) => {
        this.poster = `${BUCKETS.BUNDLES}/${res.fileUrl}`;
        this.snackBar.open('Image Uploaded!', 'OKAY', { duration: 5000 });
      },
      (err) => {
        this.snackBar.open(err.message, 'OKAY', { duration: 5000 });
      },
    );
  }

  onSubmit(): void {
    const { bundledBooks, relatedCollections, categories, relatedBundles, ...rest } = this.bundleFormGroup.value;
    const payload = {
      ...rest,
      bundledBooks: bundledBooks.map((x) => x._id),
      relatedCollections: relatedCollections.map((x) => x._id),
      categories: categories.map((x) => x._id),
      relatedBundles: relatedBundles.map((x) => x._id),
      poster: this.poster ? this.poster.split('/').pop() : '',
    };

    const bundle$ = this.bundleService.create(payload);
    bundle$.subscribe(
      (res) => {
        this.router.navigate(['/', 'admin', 'bundles']);
        this.snackBar.open('New Bundle Created', 'OKAY', { duration: 5000 });
      },
      (error) => {
        this.snackBar.open(error.message, 'OKAY', { duration: 5000 });
      },
    );
  }
}
