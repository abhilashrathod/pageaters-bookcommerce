import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormControl, FormGroup} from '@angular/forms';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ActivatedRoute, Router} from '@angular/router';
import {get} from 'lodash';
import {BundleService} from '../../../core/services/bundle.service';
import {BooksService} from '../../../core/services/books.service';
import {FilesService} from '../../../core/services/files.service';
import {debounceTime} from 'rxjs/operators';
import {MatChipInputEvent} from '@angular/material/chips';
import {BUCKETS, FILE_UPLOAD_MODULES} from '../../../core/helpers/constants';

@Component({
  selector: 'app-bundle-update',
  templateUrl: 'bundle-update.component.html'
})

export class BundleUpdateComponent implements OnInit {
  bundleFormGroup: FormGroup;
  poster;
  bundle;
  isReady = false;
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
    ...this.DROPDOWN_OPTIONS,
    text: 'Books in Bundle',
    searchPlaceholderText: 'Search Books...',
    disabled: true,
  };


  constructor(private formBuilder: FormBuilder,
              private snackBar: MatSnackBar,
              private router: Router,
              private route: ActivatedRoute,
              private bundleService: BundleService,
              private booksService: BooksService,
              private filesService: FilesService) {
  }

  get tags() {
    return this.bundleFormGroup.get('tags');
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params.id) {
        this.getBundleDetails(params.id);
      }
    });

    this.getSupportData();

    this.search();
  }

  getBundleDetails(id): void {
    const bundle$ = this.bundleService.getById(id);
    bundle$.subscribe(res => {
      this.bundle = res;
      this.bundle.poster = `${BUCKETS.BUNDLES}/${this.bundle.poster}`;
      this.buildForm(res);
    });
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


  buildForm(data): void {
    this.bundleFormGroup = this.formBuilder.group({
      title: [get(data, 'title', '')],
      description: [get(data, 'description', '')],
      tags: [get(data, 'tags', [])],
      books: [get(data, 'bundledBooks', [])],
      price: [get(data, 'price', '')],
      membersPrice: [get(data, 'membersPrice', '')],
      currentDiscount: [get(data, 'currentDiscount', '')],
    });

    this.isReady = true;
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

  previewImage(event): void {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];

      const reader = new FileReader();
      reader.onload = e => this.bundle.poster = reader.result;

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
      this.bundle.poster = `${BUCKETS.BUNDLES}/${res.fileUrl}`;
      this.snackBar.open('Image Uploaded!', 'OKAY', {duration: 5000});
    }, err => {
      this.snackBar.open(err.message, 'OKAY', {duration: 5000});
    });
  }

  onSubmit(): void {
    const {books, ...rest} = this.bundleFormGroup.value;
    const payload = {
      ...this.bundle,
      ...rest,
      bundledBooks: books.map(x => x._id),
      poster: this.bundle.poster.split('/').pop(),
    };

    const bundle$ = this.bundleService.update(this.bundle._id, payload);
    bundle$.subscribe((res) => {
      this.router.navigate(['/', 'admin', 'bundles']);
      this.snackBar.open('Bundle Updated', 'OKAY', {duration: 5000});
    }, error => {
      this.snackBar.open(error.message, 'OKAY', {duration: 5000});
    });
  }
}
