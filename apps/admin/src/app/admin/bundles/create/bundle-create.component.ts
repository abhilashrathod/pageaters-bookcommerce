import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormControl, FormGroup} from '@angular/forms';
import {MatSnackBar} from '@angular/material/snack-bar';
import {Router} from '@angular/router';
import {MatChipInputEvent} from '@angular/material/chips';
import {debounceTime} from 'rxjs/operators';
import {sumBy} from 'lodash';
import {BooksService} from '../../../core/services/books.service';
import {FilesService} from '../../../core/services/files.service';
import {FILE_UPLOAD_MODULES, returnPercentageValue} from '../../../core/helpers/constants';
import {BundleService} from '../../../core/services/bundle.service';

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
  totalPrice = 0;
  searchBooksCtrl = new FormControl();

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


  constructor(private formBuilder: FormBuilder,
              private snackBar: MatSnackBar,
              private router: Router,
              private bundleService: BundleService,
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
  }

  getBooks(): void {
    this.booksService.getAllBooks(this.filters)
      .subscribe(res => this.books = res.docs);
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
  }


  searchBooks(q): void {
    this.booksService.searchBooks(q)
      .subscribe(res => this.books = res);
  }


  buildForm(): void {
    this.bundleFormGroup = this.formBuilder.group({
      title: [''],
      description: [''],
      tags: [[]],
      books: [[]],
      currentDiscount: [0],
      price: [],
      membersPrice: [],
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
    const {books, currentDiscount} = this.bundleFormGroup.value;
    const price = sumBy(books, (x: any) => x.price);
    const membersPrice = sumBy(books, (x: any) => x.membersPrice);

    const discountedPrice = returnPercentageValue(100 - currentDiscount, price);
    const discountedMembersPrice = returnPercentageValue(100 - currentDiscount, membersPrice);

    this.bundleFormGroup.patchValue({
      price: discountedPrice,
      membersPrice: discountedMembersPrice,
    });
  }

  onItemSelect(): void {
    const {books} = this.bundleFormGroup.value;
    const price = sumBy(books, (x: any) => x.price);
    const membersPrice = sumBy(books, (x: any) => x.membersPrice);

    this.bundleFormGroup.patchValue({
      price,
      membersPrice,
    });
  }

  OnItemDeSelect(): void {
    const {books} = this.bundleFormGroup.value;
    const price = sumBy(books, (x: any) => x.price);
    const membersPrice = sumBy(books, (x: any) => x.membersPrice);

    this.bundleFormGroup.patchValue({
      price,
      membersPrice,
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
      this.poster = res.fileUrl;
      this.snackBar.open('Image Uploaded!', 'OKAY', {duration: 5000});
    }, err => {
      this.snackBar.open(err.message, 'OKAY', {duration: 5000});
    });
  }

  onSubmit(): void {
    const {books, ...rest} = this.bundleFormGroup.value;
    const payload = {
      ...rest,
      bundledBooks: books.map(x => x._id),
      poster: this.poster,
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
