import { Component, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { UntypedFormBuilder, UntypedFormControl, UntypedFormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { debounceTime } from 'rxjs/operators';
import { get, sumBy } from 'lodash';
import { MatChipInputEvent, MatChipGrid, MatChipRow, MatChipRemove, MatChipInput } from '@angular/material/chips';
import { FileDropDirective } from '@core/directives/file-drop.directive';

import { CategoryService } from '@services/category.service';
import { BundleService } from '@services/bundle.service';
import { BooksService } from '@services/books.service';
import { FilesService } from '@services/files.service';
import { CollectionService } from '@services/collection.service';

import { returnPercentageValue } from '@helpers/constants';
import { MatButton, MatFabButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { AngularMultiSelectModule } from 'angular2-multiselect-dropdown';
import { MatIcon } from '@angular/material/icon';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { TitleCasePipe } from '@angular/common';
import { apiErrorMessage } from '@services/api-client';
import { AdminFileModule } from '@pageaters/shared';
import { DemoAdminService } from '@services/demo-admin.service';
import { DemoReadOnlyNoticeComponent } from '@components/demo-read-only-notice/demo-read-only-notice.component';

@Component({
  selector: 'app-bundle-update',
  templateUrl: 'bundle-update.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [FileDropDirective, 
    DemoReadOnlyNoticeComponent,
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
export class BundleUpdateComponent implements OnInit {
  protected demoAdmin = inject(DemoAdminService);

  bundleFormGroup: UntypedFormGroup;
  poster;
  bundle;
  isReady = false;
  selectedFile: File;
  filters = {
    limit: 25,
    page: 1,
  };

  DROPDOWN_OPTIONS = {
    enableSearchFilter: true,
    badgeShowLimit: '10',
    classes: 'custom-dropdown',
    primaryKey: '_id',
    singleSelection: false,
  };

  books = [];
  bundles = [];
  collections = [];
  categories = [];

  searchBooksCtrl = new UntypedFormControl();
  searchCollectionsCtrl = new UntypedFormControl();
  searchBundlesCtrl = new UntypedFormControl();
  searchCategoriesCtrl = new UntypedFormControl();

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
    searchPlaceholderText: 'Search Books...',
    ...this.DROPDOWN_OPTIONS,
  };

  constructor(
    private formBuilder: UntypedFormBuilder,
    private snackBar: MatSnackBar,
    private router: Router,
    private route: ActivatedRoute,
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
    this.route.params.subscribe((params) => {
      if (params.id) {
        this.getBundleDetails(params.id);
      }
    });

    this.getSupportData();

    this.search();
  }

  getBundleDetails(id): void {
    const bundle$ = this.bundleService.getById(id);
    bundle$.subscribe((res) => {
      this.bundle = res;
      this.buildForm(res);
    });
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

  getCategories(): void {
    this.categoryService.getAllCategories(this.filters).subscribe((res) => (this.categories = res.docs));
  }

  searchCategories(q): void {
    this.categoryService.searchCategories(q).subscribe((res) => (this.categories = res));
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

  search(): void {
    /* BOOKS */
    this.searchBooksCtrl.valueChanges.pipe(debounceTime(750)).subscribe((text) => {
      if (text) {
        this.searchBooks(text);
      } else {
        this.getBooks();
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

    this.searchCollectionsCtrl.valueChanges.pipe(debounceTime(500)).subscribe((res) => {
      if (res) {
        this.searchCollections(res);
      } else {
        this.filters.limit = 25;
        this.filters.page = 1;
        this.getCollections();
      }
    });

    this.searchBundlesCtrl.valueChanges.pipe(debounceTime(500)).subscribe((res) => {
      if (res) {
        this.searchBundles(res);
      } else {
        this.filters.limit = 25;
        this.filters.page = 1;
        this.getBundles();
      }
    });
  }

  buildForm(data): void {
    this.bundleFormGroup = this.formBuilder.group({
      title: [get(data, 'title', '')],
      description: [get(data, 'description', '')],
      tags: [get(data, 'tags', [])],
      bundledBooks: [get(data, 'bundledBooks', [])],
      categories: [get(data, 'categories', [])],
      relatedBundles: [get(data, 'relatedBundles', [])],
      relatedCollections: [get(data, 'relatedCollections', [])],
      price: [get(data, 'price', 0)],
      weight: [get(data, 'weight', 0)],
      membersPrice: [get(data, 'membersPrice', 0)],
      currentDiscount: [get(data, 'currentDiscount', 0)],
      popularity: [get(data, 'popularity', 0)],
      priority: [get(data, 'priority', 0)],
    });

    this.isReady = true;
  }

  add(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();
    if (value) {
      this.tags.value.push(value);
    }
    event.chipInput.clear();
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

  remove(index): void {
    this.tags.value.splice(index, 1);
    this.tags.updateValueAndValidity();
  }

  previewImage(event): void {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];

      const reader = new FileReader();
      // Upload as soon as the preview is ready, so a save can't send the local data: URL.
      reader.onload = () => {
        this.bundle.poster = reader.result;
        this.uploadImage();
      };

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

    const file$ = this.filesService.upload({
      file: this.selectedFile,
      fileName: this.selectedFile.name,
      title: this.bundleFormGroup.get('title').value,
      fileModule: AdminFileModule.BUNDLE,
    });
    file$.subscribe(
      (res) => {
        this.bundle.poster = res.fileUrl;
        this.snackBar.open('Image Uploaded!', 'OKAY', { duration: 5000 });
      },
      (err) => {
        this.snackBar.open(apiErrorMessage(err), 'OKAY', { duration: 5000 });
      },
    );
  }

  onSubmit(): void {
    const { bundledBooks, categories, relatedCollections, relatedBundles, ...rest } = this.bundleFormGroup.value;
    const payload = {
      ...this.bundle,
      ...rest,
      bundledBooks: bundledBooks.map((x) => x._id),
      relatedCollections: relatedCollections.map((x) => x._id),
      categories: categories.map((x) => x._id),
      relatedBundles: relatedBundles.map((x) => x._id),
      poster: this.bundle.poster ? this.bundle.poster : '',
    };

    const bundle$ = this.bundleService.update(this.bundle._id, payload);
    bundle$.subscribe(
      (res) => {
        this.router.navigate(['/', 'admin', 'bundles']);
        this.snackBar.open('Bundle Updated', 'OKAY', { duration: 5000 });
      },
      (error) => {
        this.snackBar.open(apiErrorMessage(error), 'OKAY', { duration: 5000 });
      },
    );
  }
}
