import { Component, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { UntypedFormBuilder, UntypedFormControl, UntypedFormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { get } from 'lodash';
import { FileDropDirective } from '@core/directives/file-drop.directive';

import { FilesService } from '@services/files.service';
import { AngularMultiSelect, AngularMultiSelectModule } from 'angular2-multiselect-dropdown';
import { DealsService } from '@services/deals.service';
import { CategoryService } from '@services/category.service';
import { ProductSetService } from '@services/product-set.service';
import type { Deal, ProductSet } from '@pageaters/shared';
import { MatCard, MatCardHeader, MatCardTitle, MatCardContent } from '@angular/material/card';
import { MatButton, MatFabButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { SortablejsModule } from '@dustfoundation/ngx-sortablejs';
import { MatIcon } from '@angular/material/icon';
import { apiErrorMessage } from '@services/api-client';
import { AdminFileModule } from '@pageaters/shared';
import { DemoAdminService } from '@services/demo-admin.service';
import { DemoReadOnlyNoticeComponent } from '@components/demo-read-only-notice/demo-read-only-notice.component';

// The settings interface is not exported from the package entry point.
type DropdownSettings = AngularMultiSelect['settings'];

@Component({
  selector: 'app-update-deal',
  templateUrl: 'update-deal.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [FileDropDirective, 
    DemoReadOnlyNoticeComponent,
    FormsModule,
    ReactiveFormsModule,
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent,
    MatButton,
    MatFormField,
    MatLabel,
    MatInput,
    CdkTextareaAutosize,
    AngularMultiSelectModule,
    SortablejsModule,
    MatFabButton,
    RouterLink,
    MatIcon,
  ],
})
export class UpdateDealComponent implements OnInit {
  protected demoAdmin = inject(DemoAdminService);

  dealFormGroup: UntypedFormGroup;
  poster;
  selectedFile;
  selectedSets: ProductSet[] = [];
  categories = [];
  productSets = [];

  searchCategoriesCtrl = new UntypedFormControl();

  DROPDOWN_OPTIONS: DropdownSettings = {
    enableSearchFilter: true,
    enableCheckAll: false,
    badgeShowLimit: 10,
    classes: 'custom-dropdown',
    primaryKey: '_id',
    labelKey: 'title',
    singleSelection: false,
  };

  productSetDropdownSettings = {
    text: 'Select Product Sets',
    searchPlaceholderText: 'Search...',
    ...this.DROPDOWN_OPTIONS,
  };

  categoryDropdownSettings = {
    text: 'Categories',
    searchPlaceholderText: 'Search...',
    ...this.DROPDOWN_OPTIONS,
  };

  filters = {
    limit: 100,
    page: 1,
  };

  isReady = false;
  deal: Deal;

  constructor(
    private formBuilder: UntypedFormBuilder,
    private dealsService: DealsService,
    private filesService: FilesService,
    private snackBar: MatSnackBar,
    private categoryService: CategoryService,
    private activatedRoute: ActivatedRoute,
    private productSetService: ProductSetService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.activatedRoute.params.subscribe((params) => {
      if (params.id) {
        this.getDetails(params.id);
      }
    });
  }

  getDetails(id): void {
    const deal$ = this.dealsService.getById(id);
    deal$.subscribe(
      (res) => {
        this.deal = res;
        this.poster = this.deal.poster;
        this.selectedSets = this.deal.productSets.map((x) => x.set as ProductSet); // GET /deals/:id populates the sets
        this.buildForm(this.deal);
        this.getCategories();
        this.getProductSets();
      },
      (error) => {
        this.snackBar.open(apiErrorMessage(error), 'OKAY', { duration: 5000 });
      },
    );
  }

  buildForm(deal: Deal): void {
    const sets = deal.productSets.map((x) => x.set);

    this.dealFormGroup = this.formBuilder.group({
      title: [get(deal, 'title', ''), Validators.compose([Validators.required])],
      description: [get(deal, 'description', '')],
      code: [get(deal, 'code', ''), Validators.compose([Validators.required])],
      poster: [get(deal, 'poster', ''), Validators.compose([Validators.required])],
      ctaText: [get(deal, 'ctaText', ''), Validators.compose([Validators.required])],
      ctaLink: [get(deal, 'ctaLink', ''), Validators.compose([Validators.required])],
      priority: [get(deal, 'priority', 0)],
      categories: [get(deal, 'categories', [])],
      productSets: [sets],
    });

    this.isReady = true;
  }

  getCategories(): void {
    this.categoryService.getAllCategories(this.filters).subscribe((res) => (this.categories = res.docs));
  }

  getProductSets(): void {
    this.productSetService.getAllProductSet({ page: 1, limit: 1000 }).subscribe((res) => (this.productSets = res.docs));
  }

  addOrUpdateSelectedCategory(evt): void {
    let { categories } = this.dealFormGroup.value;
    categories = categories.map((x) => x._id);
    this.productSetService.getAllProductSet({ page: 1, limit: 1000, categories }).subscribe((res) => (this.productSets = res.docs));
  }

  addOrUpdateSelectedBooks(evt): void {
    const idx = this.selectedSets.findIndex((x) => x._id === evt._id);
    if (idx === -1) {
      this.selectedSets.push(evt);
    } else {
      this.selectedSets.splice(idx, 1);
    }
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
    if (!this.dealFormGroup.get('title').value) {
      return this.snackBar.open('Please enter the title before file upload', 'OKAY', { duration: 3000 });
    }

    const file$ = this.filesService.upload({
      file: this.selectedFile,
      fileName: this.selectedFile.name,
      title: this.dealFormGroup.get('title').value,
      fileModule: AdminFileModule.ASSETS,
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
    const { categories, ...rest } = this.dealFormGroup.value;

    const selectedSets = this.selectedSets.map((item, index) => {
      return {
        set: item._id,
        priority: index + 1,
      };
    });

    const payload = {
      ...rest,
      categories: categories.map((x) => x._id),
      productSets: selectedSets,
      poster: this.poster,
    };

    const update$ = this.dealsService.update(this.deal._id, payload);
    update$.subscribe(
      (res) => {
        this.router.navigate(['/', 'admin', 'store', 'deals']);
        this.snackBar.open('Deal Info Updated', 'OKAY', { duration: 5000 });
      },
      (error) => {
        this.snackBar.open(apiErrorMessage(error), 'OKAY', { duration: 5000 });
      },
    );
  }
}
