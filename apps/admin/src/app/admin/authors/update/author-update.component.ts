import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormControl, FormGroup} from '@angular/forms';
import {get} from 'lodash';
import {debounceTime} from 'rxjs/operators';
import {BUCKETS, FILE_UPLOAD_MODULES} from '../../../core/helpers/constants';
import {MatSnackBar} from '@angular/material/snack-bar';
import {BooksService} from '../../../core/services/books.service';
import {AuthorService} from '../../../core/services/author.service';
import {ActivatedRoute, Router} from '@angular/router';
import {FilesService} from '../../../core/services/files.service';

@Component({
  selector: 'app-author-update',
  templateUrl: 'author-update.component.html'
})

export class AuthorUpdateComponent implements OnInit {
  authorFormGroup: FormGroup;
  avatar;
  selectedFile: File;

  books = [];
  author;
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

  isReady = false;

  constructor(private formBuilder: FormBuilder,
              private snackBar: MatSnackBar,
              private booksService: BooksService,
              private authorService: AuthorService,
              private route: ActivatedRoute,
              private router: Router,
              private filesService: FilesService) {
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params.id) {
        this.getAuthorDetails(params.id);
      }
    });
  }

  getAuthorDetails(id): void {
    const author$ = this.authorService.getById(id);
    author$.subscribe(res => {
      this.author = res;
      this.author.avatar = `${BUCKETS.AUTHORS}/${this.author.avatar}`;
      this.getBooks();
      this.searchBooks();
      this.buildForm(res);
      this.isReady = true;
    }, err => {
      this.snackBar.open(err.message, 'OKAY', {duration: 5000});
    });
  }

  getBooks(): void {
    this.booksService.getAllBooks({page: 1, limit: 10})
      .subscribe(res => {
        this.books = res.docs;
      }, error => {
        this.snackBar.open(error.message, 'OKAY', {duration: 5000});
      });
  }

  buildForm(data): void {
    this.authorFormGroup = this.formBuilder.group({
      name: [get(data, 'name', '')],
      intro: [get(data, 'intro', '')],
      avatar: [get(data, 'avatar', '')],
      books: [get(data, 'books', [])],
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
      reader.onload = e => this.author.avatar = reader.result;

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
      this.author.avatar = `${BUCKETS.AUTHORS}/${res.fileUrl}`;
      this.snackBar.open('Author Image Uploaded!', 'OKAY', {duration: 5000});
    }, err => {
      this.snackBar.open(err.message, 'OKAY', {duration: 5000});
    });
  }

  onSubmit(): void {
    const {books, ...rest} = this.authorFormGroup.value;
    const payload = {
      ...this.author,
      ...rest,
      books: books.map(x => x._id),
      avatar: this.author.avatar.split('/').pop(),
    };
    const author$ = this.authorService.update(this.author._id, payload);
    author$.subscribe(res => {
      this.router.navigate(['/', 'admin', 'authors']);
      this.snackBar.open('Author Info Updated', 'OKAY', {duration: 5000});
    }, error => {
      this.snackBar.open(error.message, 'OKAY', {duration: 5000});
    });
  }
}
