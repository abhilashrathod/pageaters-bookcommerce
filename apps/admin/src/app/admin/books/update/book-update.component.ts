import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { UntypedFormBuilder, UntypedFormControl, UntypedFormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Location, TitleCasePipe } from '@angular/common';
import { get } from 'lodash';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { MatChipInputEvent, MatChipGrid, MatChipRow, MatChipRemove, MatChipInput } from '@angular/material/chips';
import { CategoryService } from '@services/category.service';
import { AuthorService } from '@services/author.service';
import { CollectionService } from '@services/collection.service';
import { BooksService } from '@services/books.service';
import { FilesService } from '@services/files.service';
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
import { BundleService } from '@services/bundle.service';
import { debounceTime } from 'rxjs/operators';
import { AppLoaderService } from '@components/app-loader/app-loader.service';
import { MatStepper, MatStep, MatStepLabel } from '@angular/material/stepper';
import { MatMiniFabButton, MatButton, MatFabButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatRadioGroup, MatRadioButton } from '@angular/material/radio';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { AngularMultiSelectModule } from 'angular2-multiselect-dropdown';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/autocomplete';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';

@Component({
  selector: 'app-book-update',
  templateUrl: 'book-update.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    MatStepper,
    MatStep,
    MatStepLabel,
    FormsModule,
    ReactiveFormsModule,
    MatMiniFabButton,
    MatIcon,
    MatButton,
    MatRadioGroup,
    MatRadioButton,
    MatFormField,
    MatLabel,
    MatInput,
    AngularMultiSelectModule,
    MatSelect,
    MatOption,
    MatChipGrid,
    MatChipRow,
    MatChipRemove,
    MatChipInput,
    MatSlideToggle,
    CdkTextareaAutosize,
    MatFabButton,
    TitleCasePipe,
  ],
})
export class BookUpdateComponent implements OnInit {
  book;
  images: any[] = [];
  isReady = false;
  avatar;

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
    disabled: true,
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
    private snackBar: MatSnackBar,
    private bundleService: BundleService,
    private categoryService: CategoryService,
    private authorService: AuthorService,
    private collectionService: CollectionService,
    private router: Router,
    private appLoader: AppLoaderService,
    private route: ActivatedRoute,
    private location: Location,
    private booksService: BooksService,
    private filesService: FilesService,
  ) {}

  get tags() {
    return this.primaryFormGroup.get('tags');
  }

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      if (params.id) {
        this.getBookDetails(params.id);
      }
    });

    this.getSupportData();
  }

  getBookDetails(id): void {
    const book$ = this.booksService.getById(id);
    book$.subscribe(
      (res) => {
        this.book = res;
        this.prepareImages(this.book);
        this.buildForms(res);
      },
      (err) => {
        this.snackBar.open(err.message, 'OKAY', { duration: 5000 });
      },
    );
  }

  prepareImages(book: any): void {
    this.images = book.images.map((image: string, idx: number) => {
      return {
        url: '',
        cloudUrl: `${BUCKETS.BOOKS}/${image}`,
        isPoster: image === book.poster,
        file: null,
      };
    });
    this.images.unshift({
      url: '',
      cloudUrl: `${BUCKETS.BOOKS}/${book.poster}`,
      isPoster: true,
      file: null,
    });
  }

  buildForms(data): void {
    this.primaryFormGroup = this.formBuilder.group({
      title: [get(data, 'title', '')],
      type: [get(data, 'type', '')],
      tagline: [get(data, 'tagline', '')],
      eyebrow: [get(data, 'eyebrow', '')],
      author: [data?.author ? [data.author] : []],
      description: [get(data, 'description', '')],
      message: [get(data, 'message', '')],
      tags: [get(data, 'tags', [])],

      language: [get(data, 'language', '')],
      pages: [get(data, 'pages', '')],
      readingLevel: [get(data, 'readingLevel', '')],
      version: [get(data, 'version', '')],
      popularity: [get(data, 'popularity', 0)],
      availability: [get(data, 'availability', this.bookAvailabilityOptions[0])],

      ISBN: [get(data, 'ISBN', '')],
      publicationYear: [get(data, 'publicationYear', '')],
      publisher: [get(data, 'publisher', '')],

      bestSeller: [get(data, 'bestSeller', false)],
      editorsPick: [get(data, 'editorsPick', false)],
      newRelease: [get(data, 'newRelease', false)],
      preOrder: [get(data, 'preOrder', false)],
    });

    this.shippingFormGroup = this.formBuilder.group({
      dimensions: [get(data, 'dimensions', '')],
      weight: [get(data, 'weight', '')],
    });

    this.pricingFormGroup = this.formBuilder.group({
      price: [get(data, 'price', 0)],
      rentPrice: [get(data, 'rentPrice', 0)],
      membersPrice: [get(data, 'membersPrice', 0)],
      membersRentPrice: [get(data, 'membersRentPrice', 0)],
      wholeSalePriceHistory: [get(data, 'wholeSalePriceHistory', 0)],
      inventory: [get(data, 'inventory', 1)],
      currentDiscount: [get(data, 'currentDiscount', 15)],
    });

    this.relatedInfoFormGroup = this.formBuilder.group({
      relatedBooks: [get(data, 'relatedBooks', [])],
      relatedCollections: [get(data, 'relatedCollections', [])],
      relatedBundles: [get(data, 'relatedBundles', [])],
      categories: [get(data, 'categories', [])],
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

    this.isReady = true;
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

  getCategories(): void {
    this.categoryService.getAllCategories(this.filters).subscribe((res) => (this.categories = res.docs));
  }

  getCollections(): void {
    this.collectionService.getAllCollections(this.filters).subscribe((res) => (this.collections = res.docs));
  }

  getAuthors(): void {
    this.authorService.getAllAuthors(this.filters).subscribe((res) => (this.authors = res.docs));
  }

  getBundles(): void {
    this.bundleService.getAllBundles(this.filters).subscribe((res) => (this.bundles = res.docs));
  }

  searchBooks(q): void {
    this.booksService.searchBooks(q).subscribe((res) => (this.books = res));
  }

  searchCategories(q): void {
    this.categoryService.searchCategories(q).subscribe((res) => (this.categories = res));
  }

  searchCollections(q): void {
    this.collectionService.searchCollections(q).subscribe((res) => (this.collections = res));
  }

  searchAuthors(q): void {
    this.authorService.searchAuthors(q).subscribe((res) => (this.authors = res));
  }

  searchBundles(q): void {
    this.bundleService.searchBundles(q).subscribe((res) => (this.bundles = res));
  }

  detectFiles(event) {
    const files = event.target.files;

    if (files) {
      for (const file of files) {
        const reader = new FileReader();
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
      const fileName = image.isPoster ? `${bookName}-poster-${index}` : `${bookName}-image-${index}`;

      if (!image.cloudUrl) {
        this.uploadImage(image.file, fileName, index);
      }
    });
  }

  uploadImage(file, title, index) {
    const formData: FormData = new FormData();
    formData.append('file', file, file.name);
    formData.append('title', title);
    formData.append('fileModule', FILE_UPLOAD_MODULES.STORE_BOOK);

    const file$ = this.filesService.upload(formData);
    file$.subscribe(
      (res) => {
        this.images[index].cloudUrl = `${BUCKETS.BOOKS}/${res.fileUrl}`;
        this.snackBar.open('Book Thumbnail Uploaded!', 'OKAY', { duration: 5000 });
      },
      (err) => {
        this.snackBar.open(err.message, 'OKAY', { duration: 5000 });
      },
    );
  }

  add(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();
    if (value) {
      this.tags.value.push(value);
    }
    event.chipInput.clear();
  }

  remove(index): void {
    this.tags.value.splice(index, 1);
    this.tags.updateValueAndValidity();
  }

  calculateAmounts(): void {
    const { price } = this.pricingFormGroup.value;

    this.pricingFormGroup.get('rentPrice').patchValue(returnPercentageValue(PRICING_PERCENTAGES.NON_MEMBER_RENT, price));
    this.pricingFormGroup.get('membersPrice').patchValue(returnPercentageValue(PRICING_PERCENTAGES.MEMBER_PRICE, price));
    this.pricingFormGroup.get('membersRentPrice').patchValue(returnPercentageValue(PRICING_PERCENTAGES.MEMBER_RENT, price));
    this.pricingFormGroup.get('wholeSalePriceHistory').patchValue(returnPercentageValue(PRICING_PERCENTAGES.WHOLESALE_PRICE, price));
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
      ...this.book,
      ...this.primaryFormGroup.value,
      ...this.shippingFormGroup.value,
      ...this.pricingFormGroup.value,
      ...this.relatedInfoFormGroup.value,
      author: author.length && author[0] ? author[0]._id : null,
      relatedBooks: relatedBooks.map((x) => x._id),
      relatedCollections: relatedCollections.map((x) => x._id),
      relatedBundles: relatedBundles.map((x) => x._id),
      categories: categories.map((x) => x._id),
      poster: posterImages[0].cloudUrl.split('/').pop(),
      images: this.images.filter((x) => !x.isPoster).map((x) => x.cloudUrl.split('/').pop()),
    };
    const book$ = this.booksService.update(this.book._id, payload);
    book$.subscribe(
      (res) => {
        this.location.back();
        this.snackBar.open('Book Info Updated', 'OKAY', { duration: 5000 });
      },
      (error) => {
        this.snackBar.open(error.message, 'OKAY', { duration: 5000 });
      },
    );
  }
}
