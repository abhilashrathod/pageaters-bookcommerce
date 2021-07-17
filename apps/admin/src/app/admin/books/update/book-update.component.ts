import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormControl, FormGroup} from '@angular/forms';
import {get} from 'lodash';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ActivatedRoute, Router} from '@angular/router';
import {MatChipInputEvent} from '@angular/material/chips';
import {CategoryService} from '../../../core/services/category.service';
import {AuthorService} from '../../../core/services/author.service';
import {CollectionService} from '../../../core/services/collection.service';
import {BooksService} from '../../../core/services/books.service';
import {FilesService} from '../../../core/services/files.service';
import {BOOK_VERSIONS, FILE_UPLOAD_MODULES, PRICING_PERCENTAGES} from '../../../core/helpers/constants';
import {BundleService} from '../../../core/services/bundle.service';

@Component({
  selector: 'app-book-update',
  templateUrl: 'book-update.component.html'
})

export class BookUpdateComponent implements OnInit {

  book;
  isReady = false;
  avatar;
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
  bookEditions = BOOK_VERSIONS;

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

  get tags() {
    return this.primaryFormGroup.get('tags');
  }


  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params.id) {
        this.getBookDetails(params.id);
      }
    });

    this.getSupportData();
  }

  getBookDetails(id): void {
    const book$ = this.booksService.getById(id);
    book$.subscribe(res => {
      this.book = res;
      this.buildForms(res);
    }, err => {
      this.snackBar.open(err.message, 'OKAY', {duration: 5000});
    });
  }

  buildForms(data): void {
    this.primaryFormGroup = this.formBuilder.group({
      title: [get(data, 'title', '')],
      tagline: [get(data, 'tagline', '')],
      author: [data?.author ? [data.author] : []],
      description: [get(data, 'description', '')],
      tags: [get(data, 'tags', [])],

      language: [get(data, 'language', '')],
      pages: [get(data, 'pages', '')],
      version: [get(data, 'version', '')],

      ISBN: [get(data, 'ISBN', '')],
      publicationYear: [get(data, 'publicationYear', '')],
      publisher: [get(data, 'publisher', '')],

      bestSeller: [get(data, 'bestSeller', false)],
      editorsPick: [get(data, 'editorsPick', false)],
    });

    this.shippingFormGroup = this.formBuilder.group({
      dimensions: [get(data, 'dimensions', '')],
      weight: [get(data, 'weight', '')],
    });

    this.pricingFormGroup = this.formBuilder.group({
      price: [get(data, 'price', '')],
      rentPrice: [get(data, 'rentPrice', '')],
      membersPrice: [get(data, 'membersPrice', '')],
      membersRentPrice: [get(data, 'membersRentPrice', '')],
      wholeSalePriceHistory: [get(data, 'wholeSalePriceHistory', '')],
      inventory: [get(data, 'inventory', '')],
      currentDiscount: [get(data, 'currentDiscount', '')],
    });

    this.relatedInfoFormGroup = this.formBuilder.group({
      relatedBooks: [get(data, 'relatedBooks', [])],
      relatedCollections: [get(data, 'relatedCollections', [])],
      relatedBundles: [get(data, 'relatedBundles', [])],
      categories: [get(data, 'categories', [])],
    });

    this.isReady = true;
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

  getBundles(): void {
    this.bundleService.getAllBundles(this.filters)
      .subscribe(res => this.bundles = res.docs);
  }

  previewImage(event): void {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];

      const reader = new FileReader();
      reader.onload = e => this.book.poster = reader.result;

      reader.readAsDataURL(file);

      this.selectedFile = file;
    }
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

  calculateAmounts(): void {
    const {price} = this.pricingFormGroup.value;

    this.pricingFormGroup.get('rentPrice').patchValue(this.returnPercentageValue(PRICING_PERCENTAGES.NON_MEMBER_RENT, price));
    this.pricingFormGroup.get('membersPrice').patchValue(this.returnPercentageValue(PRICING_PERCENTAGES.MEMBER_PRICE, price));
    this.pricingFormGroup.get('membersRentPrice').patchValue(this.returnPercentageValue(PRICING_PERCENTAGES.MEMBER_RENT, price));
  }

  returnPercentageValue(percent, total): number {
    return ((percent / 100) * total);
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
    formData.append('fileModule', FILE_UPLOAD_MODULES.CATEGORY);
    const file$ = this.filesService.upload(formData);
    file$.subscribe(res => {
      this.book.poster = res.fileUrl;
      this.snackBar.open('Book Thumbnail Uploaded!', 'OKAY', {duration: 5000});
    }, err => {
      this.snackBar.open(err.message, 'OKAY', {duration: 5000});
    });
  }

  onSubmit(): void {
    const {relatedBooks, relatedCollections, relatedBundles, categories} = this.relatedInfoFormGroup.value;
    const {author} = this.primaryFormGroup.value;

    const payload = {
      ...this.book,
      ...this.primaryFormGroup.value,
      ...this.shippingFormGroup.value,
      ...this.pricingFormGroup.value,
      ...this.relatedInfoFormGroup.value,
      author: author[0]._id,
      relatedBooks: relatedBooks.map(x => x._id),
      relatedCollections: relatedCollections.map(x => x._id),
      relatedBundles: relatedBundles.map(x => x._id),
      categories: categories.map(x => x._id),
      poster: this.book.poster,
    };

    const book$ = this.booksService.update(this.book._id, payload);
    book$.subscribe(res => {
      this.router.navigate(['/', 'admin', 'books']);
      this.snackBar.open('Book Info Updated', 'OKAY', {duration: 5000});
    }, error => {
      this.snackBar.open(error.message, 'OKAY', {duration: 5000});
    });
  }
}
