import { Component, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { UntypedFormBuilder, UntypedFormControl, UntypedFormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatChipInputEvent, MatChipGrid, MatChipRow, MatChipRemove, MatChipInput } from '@angular/material/chips';
import { debounceTime } from 'rxjs/operators';
import { range } from 'lodash';
import { FileDropDirective } from '@core/directives/file-drop.directive';

import { BooksService } from '@services/books.service';
import { AuthorService } from '@services/author.service';
import { FilesService } from '@services/files.service';
import { CategoryService } from '@services/category.service';
import { CollectionService } from '@services/collection.service';

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
  selector: 'app-collection-create',
  templateUrl: 'collection-create.component.html',
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
export class CollectionCreateComponent implements OnInit {
  protected demoAdmin = inject(DemoAdminService);

  collectionFormGroup: UntypedFormGroup;
  poster;
  selectedFile: File;
  filters = {
    limit: 25,
    page: 1,
  };

  books = [];
  collections = [];
  categories = [];
  authors = [];

  searchBooksCtrl = new UntypedFormControl();
  searchCollectionsCtrl = new UntypedFormControl();
  searchAuthorsCtrl = new UntypedFormControl();
  searchCategoriesCtrl = new UntypedFormControl();

  DROPDOWN_OPTIONS = {
    enableSearchFilter: true,
    badgeShowLimit: '10',
    classes: 'custom-dropdown',
    primaryKey: '_id',
    singleSelection: false,
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
    searchPlaceholderText: 'Search Categories...',
    ...this.DROPDOWN_OPTIONS,
  };

  constructor(
    private formBuilder: UntypedFormBuilder,
    private snackBar: MatSnackBar,
    private router: Router,
    private categoryService: CategoryService,
    private collectionService: CollectionService,
    private booksService: BooksService,
    private authorService: AuthorService,
    private filesService: FilesService,
  ) {}

  get tags() {
    return this.collectionFormGroup.get('tags');
  }

  ngOnInit(): void {
    this.getSupportData();
    this.buildForm();
    this.search();
  }

  getSupportData(): void {
    this.getBooks();
    this.getCategories();
    this.getCollections();
    this.getAuthors();
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

  search(): void {
    /* BOOKS */
    this.searchBooksCtrl.valueChanges.pipe(debounceTime(750)).subscribe((text) => {
      if (text) {
        this.searchBooks(text);
      } else {
        this.getBooks();
      }
    });

    /* AUTHORS */
    this.searchAuthorsCtrl.valueChanges.pipe(debounceTime(750)).subscribe((text) => {
      if (text) {
        this.searchAuthors(text);
      } else {
        this.getAuthors();
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

    /* COLLECTIONS */
    this.searchCollectionsCtrl.valueChanges.pipe(debounceTime(750)).subscribe((text) => {
      if (text) {
        this.searchCollections(text);
      } else {
        this.getCollections();
      }
    });
  }

  searchBooks(q): void {
    this.booksService.searchBooks(q).subscribe((res) => (this.books = res));
  }

  searchAuthors(q): void {
    this.authorService.searchAuthors(q).subscribe((res) => (this.authors = res));
  }

  searchCollections(q): void {
    this.collectionService.searchCollections(q).subscribe((res) => (this.collections = res));
  }

  searchCategories(q): void {
    this.categoryService.searchCategories(q).subscribe((res) => (this.categories = res));
  }

  buildForm(): void {
    this.collectionFormGroup = this.formBuilder.group({
      title: [''],
      description: [''],
      tags: [[]],
      poster: [''],
      books: [[]],
      relatedCollections: [[]],
      relatedCategories: [[]],
      featuredAuthors: [[]],
      priority: [0],
      popularity: [0],
    });
  }

  add(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();
    if (value) {
      this.tags.value.push(value);
    }
    event.chipInput.clear();
  }

  remove(index) {
    this.tags.value.splice(index, 1);
    this.tags.updateValueAndValidity();
  }

  previewImage(event): void {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];

      const reader = new FileReader();
      // Upload as soon as the preview is ready, so a save can't send the local data: URL.
      reader.onload = () => {
        this.poster = reader.result;
        this.uploadImage();
      };

      reader.readAsDataURL(file);

      this.selectedFile = file;
    }
  }

  uploadImage(): any {
    if (!this.collectionFormGroup.get('title').value) {
      return this.snackBar.open('Please enter the title before file upload', 'OKAY', { duration: 3000 });
    }

    const file$ = this.filesService.upload({
      file: this.selectedFile,
      fileName: this.selectedFile.name,
      title: this.collectionFormGroup.get('title').value,
      fileModule: AdminFileModule.COLLECTION,
    });
    file$.subscribe(
      (res) => {
        this.poster = res.fileUrl;
        this.snackBar.open('Image Uploaded!', 'OKAY', { duration: 5000 });
      },
      (err) => {
        this.snackBar.open(apiErrorMessage(err), 'OKAY', { duration: 5000 });
      },
    );
  }

  onSubmit(): void {
    const { books, relatedCollections, relatedCategories, featuredAuthors, ...rest } = this.collectionFormGroup.value;
    const payload = {
      ...rest,
      books: books.map((x) => x._id),
      relatedCollections: relatedCollections.map((x) => x._id),
      relatedCategories: relatedCategories.map((x) => x._id),
      featuredAuthors: featuredAuthors.map((x) => x._id),
      poster: this.poster,
    };

    const collection$ = this.collectionService.create(payload);
    collection$.subscribe(
      (res) => {
        this.router.navigate(['/', 'admin', 'collections']);
        this.snackBar.open('New Collection Created', 'OKAY', { duration: 5000 });
      },
      (error) => {
        this.snackBar.open(apiErrorMessage(error), 'OKAY', { duration: 5000 });
      },
    );
  }
}
