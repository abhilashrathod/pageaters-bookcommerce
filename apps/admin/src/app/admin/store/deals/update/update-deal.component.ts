import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { UntypedFormBuilder, UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { get } from 'lodash';

import { FilesService } from '@services/files.service';
import { BUCKETS, FILE_UPLOAD_MODULES } from '@helpers/constants';
import { IProductSet } from '@schema/product-set';
import { AngularMultiSelect } from 'angular2-multiselect-dropdown';
import { DealsService } from '@services/deals.service';
import { CategoryService } from '@services/category.service';
import { ProductSetService } from '@services/product-set.service';
import { IDeal } from '@schema/deal';

// The settings interface is not exported from the package entry point.
type DropdownSettings = AngularMultiSelect['settings'];

@Component({
  selector: 'app-update-deal',
  templateUrl: 'update-deal.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class UpdateDealComponent implements OnInit {
  dealFormGroup: UntypedFormGroup;
  poster;
  selectedFile;
  selectedSets: Array<IProductSet> = [];
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
  deal: IDeal;

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
        this.poster = `${BUCKETS.ASSETS}/${this.deal.poster}`;
        this.selectedSets = this.deal.productSets.map((x) => x.set);
        this.buildForm(this.deal);
        this.getCategories();
        this.getProductSets();
      },
      (error) => {
        this.snackBar.open(error.message, 'OKAY', { duration: 5000 });
      },
    );
  }

  buildForm(deal: IDeal): void {
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
      reader.onload = (e) => (this.poster = reader.result);

      reader.readAsDataURL(file);

      this.selectedFile = file;
    }
  }

  uploadImage(): any {
    if (!this.dealFormGroup.get('title').value) {
      return this.snackBar.open('Please enter the title before file upload', 'OKAY', { duration: 3000 });
    }

    const formData: FormData = new FormData();
    formData.append('file', this.selectedFile, this.selectedFile.name);
    formData.append('title', this.dealFormGroup.get('title').value);
    formData.append('fileModule', FILE_UPLOAD_MODULES.ASSETS);
    const file$ = this.filesService.upload(formData);
    file$.subscribe(
      (res) => {
        this.poster = `${BUCKETS.ASSETS}/${res.fileUrl}`;
        this.snackBar.open('Image Uploaded!', 'OKAY', { duration: 5000 });
      },
      (err) => {
        this.snackBar.open(err.message, 'OKAY', { duration: 5000 });
      },
    );
  }

  onSubmit(): void {
    const { categories, ...rest } = this.dealFormGroup.value;

    const selectedSets = this.selectedSets.map((item, index) => {
      return {
        set: item,
        priority: index + 1,
      };
    });

    const payload = {
      ...rest,
      categories: categories.map((x) => x._id),
      productSets: selectedSets,
      poster: this.poster.split('/').pop(),
    };

    const update$ = this.dealsService.update(this.deal._id, payload);
    update$.subscribe(
      (res) => {
        this.router.navigate(['/', 'admin', 'store', 'deals']);
        this.snackBar.open('Deal Info Updated', 'OKAY', { duration: 5000 });
      },
      (error) => {
        this.snackBar.open(error.message, 'OKAY', { duration: 5000 });
      },
    );
  }
}
