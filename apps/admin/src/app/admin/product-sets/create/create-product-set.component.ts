import { Component, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { UntypedFormBuilder, UntypedFormControl, UntypedFormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { debounceTime } from 'rxjs/operators';
import { BooksService } from '@services/books.service';
import { ProductSetService } from '@services/product-set.service';
import { Router, RouterLink } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AngularMultiSelect, AngularMultiSelectModule } from 'angular2-multiselect-dropdown';
import { CategoryService } from '@services/category.service';
import { MatCard, MatCardHeader, MatCardTitle, MatCardContent, MatCardActions } from '@angular/material/card';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { SortablejsModule } from '@dustfoundation/ngx-sortablejs';
import { MatFabButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { TitleCasePipe, CurrencyPipe } from '@angular/common';
import { apiErrorMessage } from '@services/api-client';
import { DemoAdminService } from '@services/demo-admin.service';
import { DemoReadOnlyNoticeComponent } from '@components/demo-read-only-notice/demo-read-only-notice.component';

// The settings interface is not exported from the package entry point.
type DropdownSettings = AngularMultiSelect['settings'];

@Component({
  selector: 'app-create-product-set',
  templateUrl: 'create-product-set.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    DemoReadOnlyNoticeComponent,
    FormsModule,
    ReactiveFormsModule,
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent,
    MatFormField,
    MatLabel,
    MatInput,
    CdkTextareaAutosize,
    AngularMultiSelectModule,
    MatCardActions,
    SortablejsModule,
    MatFabButton,
    RouterLink,
    MatIcon,
    TitleCasePipe,
    CurrencyPipe,
  ],
})
export class CreateProductSetComponent implements OnInit {
  protected demoAdmin = inject(DemoAdminService);

  productSetFormGroup: UntypedFormGroup;
  books = [];
  categories = [];
  selectedBooks = [];

  DROPDOWN_OPTIONS: DropdownSettings = {
    enableSearchFilter: true,
    enableCheckAll: false,
    badgeShowLimit: 10,
    classes: 'custom-dropdown',
    primaryKey: '_id',
    singleSelection: false,
  };

  booksDropdownSettings = {
    text: 'Select Books',
    searchPlaceholderText: 'Search Books...',
    ...this.DROPDOWN_OPTIONS,
  };

  categoryDropdownSettings = {
    text: 'Book Categories',
    searchPlaceholderText: 'Search Categories...',
    ...this.DROPDOWN_OPTIONS,
  };

  searchBooksCtrl = new UntypedFormControl();
  searchCategoriesCtrl = new UntypedFormControl();

  filters = {
    limit: 25,
    page: 1,
  };

  constructor(
    private formBuilder: UntypedFormBuilder,
    private router: Router,
    private snackBar: MatSnackBar,
    private productSetService: ProductSetService,
    private categoryService: CategoryService,
    private booksService: BooksService,
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.getBooks();
    this.getCategories();
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

  buildForm(): void {
    this.productSetFormGroup = this.formBuilder.group({
      title: ['', Validators.required],
      description: [''],
      books: [[]],
      categories: [[]],
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

  addOrUpdateSelectedBooks(evt): void {
    const idx = this.selectedBooks.findIndex((x) => x.bookId === evt.bookId);
    if (idx === -1) {
      this.selectedBooks.push(evt);
    } else {
      this.selectedBooks.splice(idx, 1);
    }
  }

  onSubmit(): void {
    const { title, categories, description } = this.productSetFormGroup.value;

    const selectedBooks = this.selectedBooks.map((item, index) => {
      return {
        product: item._id,
        priority: index + 1,
      };
    });

    const payload = {
      title,
      description,
      categories: categories.map((x) => x._id),
      products: selectedBooks,
    };

    const create$ = this.productSetService.create(payload);
    create$.subscribe(
      (res) => {
        this.router.navigate(['/', 'admin', 'sets']);
        this.snackBar.open('New Set Added', 'OKAY', { duration: 5000 });
      },
      (error) => {
        this.snackBar.open(apiErrorMessage(error), 'OKAY', { duration: 5000 });
      },
    );
  }
}
