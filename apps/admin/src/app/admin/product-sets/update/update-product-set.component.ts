import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { UntypedFormBuilder, UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { debounceTime } from 'rxjs/operators';
import { get } from 'lodash';
import { BooksService } from '@services/books.service';
import { ProductSetService } from '@services/product-set.service';
import { IProductSet } from '@schema/product-set';
import { CategoryService } from '@services/category.service';

@Component({
  selector: 'app-create-product-set',
  templateUrl: 'update-product-set.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class UpdateProductSetComponent implements OnInit {
  productSetFormGroup: UntypedFormGroup;
  books = [];
  categories = [];
  selectedBooks = [];
  productSet: IProductSet;
  isReady = false;

  DROPDOWN_OPTIONS = {
    enableSearchFilter: true,
    badgeShowLimit: '10',
    classes: 'custom-dropdown',
    primaryKey: '_id',
    singleSelection: false,
  };

  booksDropdownSettings = {
    text: 'Similar Books',
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
    private activatedRoute: ActivatedRoute,
    private snackBar: MatSnackBar,
    private categoryService: CategoryService,
    private productSetService: ProductSetService,
    private booksService: BooksService,
  ) {}

  ngOnInit(): void {
    this.activatedRoute.params.subscribe((params) => {
      if (params.id) {
        this.getProductSetDetails(params.id);
        this.getBooks();
        this.getCategories();
      }
    });
  }

  getProductSetDetails(id): void {
    const productSet$ = this.productSetService.getById(id);
    productSet$.subscribe(
      (res) => {
        this.productSet = res;
        this.buildForm(this.productSet);
        this.selectedBooks = this.productSet.products.map((x) => x.product);
      },
      (error) => {
        this.snackBar.open(error.message, 'OKAY', { duration: 5000 });
      },
    );
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

  buildForm(data: IProductSet): void {
    const products = data.products.map((x) => x.product);
    this.productSetFormGroup = this.formBuilder.group({
      title: [get(data, 'title', ''), Validators.required],
      description: [get(data, 'description', '')],
      books: [products],
      categories: [get(data, 'categories', [])],
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

    this.isReady = true;
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
        product: item,
        priority: index + 1,
      };
    });

    const payload = {
      title,
      description,
      categories: categories.map((x) => x._id),
      products: selectedBooks,
    };

    const update$ = this.productSetService.update(this.productSet._id, payload);
    update$.subscribe(
      (res) => {
        this.router.navigate(['/', 'admin', 'sets']);
        this.snackBar.open('Set Updated', 'OKAY', { duration: 5000 });
      },
      (error) => {
        this.snackBar.open(error.message, 'OKAY', { duration: 5000 });
      },
    );
  }
}
