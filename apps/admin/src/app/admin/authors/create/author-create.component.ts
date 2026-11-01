import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { UntypedFormBuilder, UntypedFormControl, UntypedFormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';

import { FilesService } from '@services/files.service';
import { BUCKETS, FILE_UPLOAD_MODULES } from '@helpers/constants';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BooksService } from '@services/books.service';
import { debounceTime } from 'rxjs/operators';
import { Router, RouterLink } from '@angular/router';
import { AuthorService } from '@services/author.service';
import { MatButton, MatFabButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { AngularMultiSelectModule } from 'angular2-multiselect-dropdown';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { MatIcon } from '@angular/material/icon';
import { TitleCasePipe } from '@angular/common';

@Component({
  selector: 'app-author-create',
  templateUrl: 'author-create.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatButton,
    MatFormField,
    MatLabel,
    MatInput,
    AngularMultiSelectModule,
    CdkTextareaAutosize,
    MatFabButton,
    RouterLink,
    MatIcon,
    TitleCasePipe,
  ],
})
export class AuthorCreateComponent implements OnInit {
  authorFormGroup: UntypedFormGroup;
  avatar;
  selectedFile: File;

  books = [];
  searchBooksCtrl = new UntypedFormControl();
  filters = {
    limit: 25,
    page: 1,
  };

  dropdownSettings = {
    text: 'Select books for this Author',
    singleSelection: false,
    enableSearchFilter: true,
    badgeShowLimit: '10',
    classes: 'custom-dropdown',
    primaryKey: '_id',
    searchPlaceholderText: 'Search Books...',
  };

  constructor(
    private formBuilder: UntypedFormBuilder,
    private snackBar: MatSnackBar,
    private booksService: BooksService,
    private authorService: AuthorService,
    private router: Router,
    private filesService: FilesService,
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.getBooks();

    this.searchBooksCtrl.valueChanges.pipe(debounceTime(500)).subscribe((res) => {
      if (res) {
        this.searchBooks(res);
      } else {
        this.filters.limit = 25;
        this.filters.page = 1;
        this.getBooks();
      }
    });
  }

  getBooks(): void {
    this.booksService.getAllBooks(this.filters).subscribe(
      (res) => {
        this.books = res.docs;
      },
      (error) => {
        this.snackBar.open(error.message, 'OKAY', { duration: 5000 });
      },
    );
  }

  buildForm(): void {
    this.authorFormGroup = this.formBuilder.group({
      intro: [''],
      name: [''],
      avatar: [''],
      books: [[]],
    });
  }

  searchBooks(q): void {
    this.booksService.searchBooks(q).subscribe((res) => (this.books = res));
  }

  previewImage(event): void {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];

      const reader = new FileReader();
      reader.onload = (e) => (this.avatar = reader.result);

      reader.readAsDataURL(file);

      this.selectedFile = file;
    }
  }

  uploadImage(): any {
    if (!this.authorFormGroup.get('name').value) {
      return this.snackBar.open('Please enter the name first before file upload', 'OKAY', { duration: 3000 });
    }

    if (!this.selectedFile) {
      return this.snackBar.open('Please select a file to upload', 'OKAY', { duration: 3000 });
    }

    const formData: FormData = new FormData();
    formData.append('file', this.selectedFile, this.selectedFile.name);
    formData.append('title', this.authorFormGroup.get('name').value);
    formData.append('fileModule', FILE_UPLOAD_MODULES.AUTHOR);
    const file$ = this.filesService.upload(formData);
    file$.subscribe(
      (res) => {
        this.avatar = `${BUCKETS.AUTHORS}/${res.fileUrl}`;
        this.snackBar.open('Author Image Uploaded!', 'OKAY', { duration: 5000 });
      },
      (err) => {
        this.snackBar.open(err.message, 'OKAY', { duration: 5000 });
      },
    );
  }

  onSubmit(): void {
    const { books, ...rest } = this.authorFormGroup.value;
    const payload = {
      ...rest,
      books: books.map((x) => x._id),
      avatar: this.avatar.split('/').pop(),
    };
    const author$ = this.authorService.create(payload);
    author$.subscribe(
      (res) => {
        this.router.navigate(['/', 'admin', 'authors']);
        this.snackBar.open('New Author Added', 'OKAY', { duration: 5000 });
      },
      (error) => {
        this.snackBar.open(error.message, 'OKAY', { duration: 5000 });
      },
    );
  }
}
