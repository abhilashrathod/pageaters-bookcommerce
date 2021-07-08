import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormControl, FormGroup} from '@angular/forms';

import {FilesService} from '../../../core/services/files.service';
import {FILE_UPLOAD_MODULES} from '../../../core/helpers/constants';
import {MatSnackBar} from '@angular/material/snack-bar';
import {BooksService} from '../../../core/services/books.service';
import {debounceTime} from 'rxjs/operators';
import {Router} from '@angular/router';
import {AuthorService} from '../../../core/services/author.service';

@Component({
  selector: 'app-author-create',
  templateUrl: 'author-create.component.html'
})

export class AuthorCreateComponent implements OnInit {

  authorFormGroup: FormGroup;
  avatar;
  selectedFile: File;

  books = [];
  searchBooksCtrl = new FormControl();
  dropdownSettings = {
    text: 'Select books for this Author',
    singleSelection: false,
    enableSearchFilter: true,
    badgeShowLimit: '10',
    classes: 'custom-dropdown',
    primaryKey: '_id',
    searchPlaceholderText: 'Search Books...'
  };

  constructor(private formBuilder: FormBuilder,
              private snackBar: MatSnackBar,
              private booksService: BooksService,
              private authorService: AuthorService,
              private router: Router,
              private filesService: FilesService) {
  }

  ngOnInit(): void {
    this.buildForm();
    this.getBooks();
    this.searchBooks();
  }

  getBooks(): void {
    this.booksService.getAllBooks({page: 1, limit: 10})
      .subscribe(res => {
        this.books = res.docs;
      }, error => {
        this.snackBar.open(error.message, 'OKAY', {duration: 5000});
      });
  }

  buildForm(): void {
    this.authorFormGroup = this.formBuilder.group({
      intro: [''],
      name: [''],
      avatar: [''],
      books: [[]],
    });
  }

  searchBooks(): void {
    this.searchBooksCtrl
      .valueChanges
      .pipe(
        debounceTime(750),
      )
      .subscribe(res => {

      });
  }

  previewImage(event): void {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];

      const reader = new FileReader();
      reader.onload = e => this.avatar = reader.result;

      reader.readAsDataURL(file);

      this.selectedFile = file;
    }
  }

  uploadImage(): any {
    if (!this.authorFormGroup.get('name').value) {
      return this.snackBar.open('Please enter the name first before file upload', 'OKAY', {duration: 3000});
    }

    const formData: FormData = new FormData();
    formData.append('file', this.selectedFile, this.selectedFile.name);
    formData.append('title', this.authorFormGroup.get('name').value);
    formData.append('fileModule', FILE_UPLOAD_MODULES.AUTHOR);
    const file$ = this.filesService.upload(formData);
    file$.subscribe(res => {
      this.avatar = res.fileUrl;
      this.snackBar.open('Author Image Uploaded!', 'OKAY', {duration: 5000});
    }, err => {
      this.snackBar.open(err.message, 'OKAY', {duration: 5000});
    });
  }

  onSubmit(): void {
    const {books, ...rest} = this.authorFormGroup.value;
    const payload = {
      ...rest,
      books: books.map(x => x.id),
      avatar: this.avatar,
    };
    const author$ = this.authorService.create(payload);
    author$.subscribe(res => {
      this.router.navigate(['/', 'admin', 'authors']);
      this.snackBar.open('New Author Added', 'OKAY', {duration: 5000});
    }, error => {
      this.snackBar.open(error.message, 'OKAY', {duration: 5000});
    });
  }
}
