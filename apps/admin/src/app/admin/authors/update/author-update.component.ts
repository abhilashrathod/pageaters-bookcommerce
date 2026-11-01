import { Component, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { UntypedFormBuilder, UntypedFormControl, UntypedFormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { get } from 'lodash';
import { debounceTime } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BooksService } from '@services/books.service';
import { AuthorService } from '@services/author.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FilesService } from '@services/files.service';
import { MatButton, MatFabButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { AngularMultiSelectModule } from 'angular2-multiselect-dropdown';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { MatIcon } from '@angular/material/icon';
import { TitleCasePipe } from '@angular/common';
import { apiErrorMessage } from '@services/api-client';
import { AdminFileModule } from '@pageaters/shared';
import { DemoAdminService } from '@services/demo-admin.service';
import { DemoReadOnlyNoticeComponent } from '@components/demo-read-only-notice/demo-read-only-notice.component';
import { FileDropDirective } from '@core/directives/file-drop.directive';

@Component({
  selector: 'app-author-update',
  templateUrl: 'author-update.component.html',
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
    CdkTextareaAutosize,
    MatFabButton,
    RouterLink,
    MatIcon,
    TitleCasePipe,
  ],
})
export class AuthorUpdateComponent implements OnInit {
  protected demoAdmin = inject(DemoAdminService);

  authorFormGroup: UntypedFormGroup;
  avatar;
  selectedFile: File;

  books = [];
  author;
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

  isReady = false;

  constructor(
    private formBuilder: UntypedFormBuilder,
    private snackBar: MatSnackBar,
    private booksService: BooksService,
    private authorService: AuthorService,
    private route: ActivatedRoute,
    private router: Router,
    private filesService: FilesService,
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      if (params.id) {
        this.getAuthorDetails(params.id);
      }
    });
  }

  getAuthorDetails(id): void {
    const author$ = this.authorService.getById(id);
    author$.subscribe(
      (res) => {
        this.author = res;
        this.getBooks();
        this.buildForm(res);
        this.isReady = true;
      },
      (err) => {
        this.snackBar.open(apiErrorMessage(err), 'OKAY', { duration: 5000 });
      },
    );
  }

  getBooks(): void {
    this.booksService.getAllBooks(this.filters).subscribe(
      (res) => {
        this.books = res.docs;
      },
      (error) => {
        this.snackBar.open(apiErrorMessage(error), 'OKAY', { duration: 5000 });
      },
    );
  }

  searchBooks(q): void {
    this.booksService.searchBooks(q).subscribe((res) => (this.books = res));
  }

  buildForm(data): void {
    this.authorFormGroup = this.formBuilder.group({
      name: [get(data, 'name', '')],
      intro: [get(data, 'intro', '')],
      avatar: [get(data, 'avatar', '')],
      books: [get(data, 'books', [])],
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
  }

  previewImage(event): void {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];

      const reader = new FileReader();
      // Upload as soon as the preview is ready, so a save can't send the local data: URL.
      reader.onload = () => {
        this.author.avatar = reader.result;
        this.uploadImage();
      };

      reader.readAsDataURL(file);

      this.selectedFile = file;
    }
  }

  uploadImage(): any {
    if (!this.authorFormGroup.get('name').value) {
      return this.snackBar.open('Please enter the name first before file upload', 'OKAY', { duration: 3000 });
    }

    const file$ = this.filesService.upload({
      file: this.selectedFile,
      fileName: this.selectedFile.name,
      title: this.authorFormGroup.get('name').value,
      fileModule: AdminFileModule.AUTHOR,
    });
    file$.subscribe(
      (res) => {
        this.author.avatar = res.fileUrl;
        this.snackBar.open('Author Image Uploaded!', 'OKAY', { duration: 5000 });
      },
      (err) => {
        this.snackBar.open(apiErrorMessage(err), 'OKAY', { duration: 5000 });
      },
    );
  }

  onSubmit(): void {
    const { books, ...rest } = this.authorFormGroup.value;
    const payload = {
      ...this.author,
      ...rest,
      books: books.map((x) => x._id),
      avatar: this.author.avatar,
    };
    const author$ = this.authorService.update(this.author._id, payload);
    author$.subscribe(
      (res) => {
        this.router.navigate(['/', 'admin', 'authors']);
        this.snackBar.open('Author Info Updated', 'OKAY', { duration: 5000 });
      },
      (error) => {
        this.snackBar.open(apiErrorMessage(error), 'OKAY', { duration: 5000 });
      },
    );
  }
}
