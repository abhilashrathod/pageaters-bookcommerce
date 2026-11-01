import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Location } from '@angular/common';
import { UntypedFormBuilder, UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { CategoryService } from '@services/category.service';
import { FilesService } from '@services/files.service';
import { CollectionService } from '@services/collection.service';
import { AuthorService } from '@services/author.service';
import { BooksService } from '@services/books.service';
import {
  BOOK_AVAILABILITY,
  BOOK_VERSIONS,
  BUCKETS,
  FILE_UPLOAD_MODULES,
  PRICING_PERCENTAGES,
  PRODUCT_TYPES,
  READING_LEVELS,
  returnPercentageValue,
} from '@helpers/constants';
import { MatChipInputEvent } from '@angular/material/chips';
import { BundleService } from '@services/bundle.service';
import { debounceTime } from 'rxjs/operators';

@Component({
  selector: 'app-book-create',
  templateUrl: 'book-create.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class BookCreateComponent implements OnInit {
  poster;
  images: any[] = [];

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
  bookAvailabilityOptions = BOOK_AVAILABILITY;
  productTypeOptions = PRODUCT_TYPES;

  DROPDOWN_OPTIONS = {
    enableSearchFilter: true,
    badgeShowLimit: '10',
    classes: 'custom-dropdown',
    primaryKey: '_id',
    singleSelection: false,
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

  searchBooksCtrl = new UntypedFormControl();
  searchCollectionsCtrl = new UntypedFormControl();
  searchAuthorsCtrl = new UntypedFormControl();
  searchCategoriesCtrl = new UntypedFormControl();
  searchBundlesCtrl = new UntypedFormControl();

  primaryFormGroup: UntypedFormGroup;
  shippingFormGroup: UntypedFormGroup;
  relatedInfoFormGroup: UntypedFormGroup;
  pricingFormGroup: UntypedFormGroup;

  constructor(
    private formBuilder: UntypedFormBuilder,
    private booksService: BooksService,
    private filesService: FilesService,
    private bundleService: BundleService,
    private categoryService: CategoryService,
    private authorService: AuthorService,
    private location: Location,
    private collectionService: CollectionService,
    private router: Router,
    private snackBar: MatSnackBar,
  ) {}

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
      type: [this.productTypeOptions[0]],
      tagline: [''],
      eyebrow: [''],
      author: ['', Validators.required],
      description: [''],
      message: [''],
      tags: [[]],

      language: ['EN'],
      pages: [''],
      version: [''],
      readingLevel: [this.readingLevelOptions[0]],
      popularity: [0],
      availability: [this.bookAvailabilityOptions[0]],

      ISBN: [''],
      publicationYear: [''],
      publisher: [''],

      bestSeller: [false],
      editorsPick: [false],
      newRelease: [false],
      preOrder: [false],
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
      inventory: [1],

      currentDiscount: [15],
    });
    this.relatedInfoFormGroup = this.formBuilder.group({
      relatedBooks: [[]],
      relatedCollections: [[]],
      relatedBundles: [[]],
      categories: [[]],
    });

    this.searchBooksCtrl.valueChanges.pipe(debounceTime(500)).subscribe((res) => {
      if (res) {
        this.searchBooks(res);
      } else {
        this.filters.limit = 25;
        this.filters.page = 1;
        this.getBooks();
      }
    });

    this.searchCategoriesCtrl.valueChanges.pipe(debounceTime(500)).subscribe((res) => {
      if (res) {
        this.searchCategories(res);
      } else {
        this.filters.limit = 25;
        this.filters.page = 1;
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

    this.searchAuthorsCtrl.valueChanges.pipe(debounceTime(500)).subscribe((res) => {
      if (res) {
        this.searchAuthors(res);
      } else {
        this.filters.limit = 25;
        this.filters.page = 1;
        this.getAuthors();
      }
    });
  }

  goBack(): void {
    this.location.back();
  }

  getSupportData(): void {
    this.getBooks();
    this.getCategories();
    this.getCollections();
    this.getAuthors();
    this.getBundles();
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

  getCollections(): void {
    this.collectionService.getAllCollections(this.filters).subscribe((res) => (this.collections = res.docs));
  }

  searchCollections(q): void {
    this.collectionService.searchCollections(q).subscribe((res) => (this.collections = res));
  }

  getAuthors(): void {
    this.authorService.getAllAuthors(this.filters).subscribe((res) => (this.authors = res.docs));
  }

  searchAuthors(q): void {
    this.authorService.searchAuthors(q).subscribe((res) => (this.authors = res));
  }

  getBundles(): void {
    this.bundleService.getAllBundles(this.filters).subscribe((res) => (this.bundles = res.docs));
  }

  searchBundles(q): void {
    this.bundleService.searchBundles(q).subscribe((res) => (this.bundles = res));
  }

  detectFiles(event) {
    let files = event.target.files;

    if (files) {
      for (let file of files) {
        let reader = new FileReader();
        reader.onload = (e: any) => this.images.push({ url: reader.result, cloudUrl: '', isPoster: false, file });

        reader.readAsDataURL(file);
      }
    }
  }

  makePrimaryPoster(idx: number) {
    this.images = this.images.map((item, index) => {
      return {
        ...item,
        isPoster: index === idx,
      };
    });
    this.snackBar.open('Image marked as poster', 'OKAY', { duration: 3000 });
  }

  removeImage(index: number) {
    this.images.splice(index, 1);
    this.snackBar.open('Image removed from list', 'OKAY', { duration: 3000 });
  }

  calculateAmounts(): void {
    const { price } = this.pricingFormGroup.value;

    this.pricingFormGroup.get('rentPrice').patchValue(returnPercentageValue(PRICING_PERCENTAGES.NON_MEMBER_RENT, price));
    this.pricingFormGroup.get('membersPrice').patchValue(returnPercentageValue(PRICING_PERCENTAGES.MEMBER_PRICE, price));
    this.pricingFormGroup.get('membersRentPrice').patchValue(returnPercentageValue(PRICING_PERCENTAGES.MEMBER_RENT, price));
    this.pricingFormGroup.get('wholeSalePriceHistory').patchValue(returnPercentageValue(PRICING_PERCENTAGES.WHOLESALE_PRICE, price));
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

  uploadImages() {
    const posterImages = this.images.filter((x) => x.isPoster);

    if (posterImages.length <= 0) {
      return this.snackBar.open('Please select atleast one image as poster', 'OKAY', { duration: 3000 });
    }

    if (!this.primaryFormGroup.get('title').value) {
      return this.snackBar.open('Please enter the name first before file upload', 'OKAY', { duration: 3000 });
    }

    if (this.images.length === 0) {
      return this.snackBar.open('Please select images to upload', 'OKAY', { duration: 3000 });
    }

    const bookName = this.primaryFormGroup.get('title').value;

    this.images.forEach((image, index) => {
      const fileName = `${bookName}-image-${index}`;
      if (!image.cloudUrl) {
        this.uploadImage(image.file, fileName, index);
      }
    });
  }

  uploadImage(file, title, index): any {
    const formData: FormData = new FormData();
    formData.append('file', file, file.name);
    formData.append('title', title);
    formData.append('fileModule', FILE_UPLOAD_MODULES.STORE_BOOK);

    const file$ = this.filesService.upload(formData);
    file$.subscribe(
      (res) => {
        this.images[index].cloudUrl = res.fileUrl;
        this.snackBar.open('Book Thumbnail Uploaded!', 'OKAY', { duration: 5000 });
      },
      (err) => {
        this.snackBar.open(err.message, 'OKAY', { duration: 5000 });
      },
    );
  }

  onSubmit() {
    const { relatedBooks, relatedCollections, relatedBundles, categories } = this.relatedInfoFormGroup.value;
    const { author } = this.primaryFormGroup.value;

    if (this.images.length <= 0) {
      return this.snackBar.open('Please upload images and select a poster', 'OKAY', { duration: 5000 });
    }

    const uploadedImages = this.images.filter((x) => x.cloudUrl === '');
    if (uploadedImages.length > 0) {
      return this.snackBar.open('Please upload selected images first', 'OKAY', { duration: 5000 });
    }

    const posterImages = this.images.filter((x) => x.isPoster);
    if (posterImages.length <= 0) {
      return this.snackBar.open('Please select atleast one image as poster', 'OKAY', { duration: 3000 });
    }

    const payload = {
      ...this.primaryFormGroup.value,
      ...this.shippingFormGroup.value,
      ...this.pricingFormGroup.value,
      ...this.relatedInfoFormGroup.value,
      author: author[0]._id,
      relatedBooks: relatedBooks.map((x) => x._id),
      relatedCollections: relatedCollections.map((x) => x._id),
      relatedBundles: relatedBundles.map((x) => x._id),
      categories: categories.map((x) => x._id),
      poster: posterImages[0].cloudUrl.split('/').pop(),
      images: this.images.filter((x) => !x.isPoster).map((x) => x.cloudUrl),
    };
    const book$ = this.booksService.create(payload);
    book$.subscribe(
      (res) => {
        this.location.back();
        this.snackBar.open('New Book Added', 'OKAY', { duration: 5000 });
      },
      (error) => {
        this.snackBar.open(error.message, 'OKAY', { duration: 5000 });
      },
    );
  }
}
