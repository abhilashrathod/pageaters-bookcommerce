import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';
import {MatSnackBar} from '@angular/material/snack-bar';
import {DropdownSettings} from 'angular2-multiselect-dropdown/lib/multiselect.interface';
import {Router} from '@angular/router';

import {FilesService} from '../../../../core/services/files.service';
import {CategoryService} from '../../../../core/services/category.service';
import {ProductSetService} from '../../../../core/services/product-set.service';

import {BUCKETS, FILE_UPLOAD_MODULES} from '../../../../core/helpers/constants';
import {IProductSet} from '../../../../core/schema/product-set';
import {DealsService} from '../../../../core/services/deals.service';

@Component({
  selector: 'app-add-deal',
  templateUrl: 'add-deal.component.html'
})

export class AddDealComponent implements OnInit {
  dealFormGroup: FormGroup;
  poster;
  selectedFile;
  selectedSets: Array<IProductSet> = [];
  categories = [];
  productSets = [];

  searchCategoriesCtrl = new FormControl();

  DROPDOWN_OPTIONS: DropdownSettings = {
    enableSearchFilter: true,
    enableCheckAll: false,
    badgeShowLimit: 10,
    classes: 'custom-dropdown',
    primaryKey: '_id',
    labelKey: 'title',
    singleSelection: false
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

  constructor(private formBuilder: FormBuilder,
              private dealsService: DealsService,
              private filesService: FilesService,
              private snackBar: MatSnackBar,
              private categoryService: CategoryService,
              private productSetService: ProductSetService,
              private router: Router) {
  }

  ngOnInit(): void {
    this.buildForm();
    this.getCategories();
    this.getProductSets();
  }

  buildForm(): void {
    this.dealFormGroup = this.formBuilder.group({
      title: ['', Validators.compose([Validators.required])],
      description: [''],
      ctaText: ['', Validators.compose([Validators.required])],
      ctaLink: ['', Validators.compose([Validators.required])],
      priority: [0],
      categories: [[]],
      productSets: [[]],
    });
  }

  getCategories(): void {
    this.categoryService.getAllCategories(this.filters)
      .subscribe(res => this.categories = res.docs);
  }

  getProductSets(): void {
    this.productSetService.getAllProductSet({page: 1, limit: 1000})
      .subscribe(res => this.productSets = res.docs);
  }

  addOrUpdateSelectedCategory(evt): void {
    let {categories} = this.dealFormGroup.value;
    categories = categories.map(x => x._id);
    this.productSetService.getAllProductSet({page: 1, limit: 1000, categories})
      .subscribe(res => this.productSets = res.docs);
  }

  addOrUpdateSelectedBooks(evt): void {
    const idx = this.selectedSets.findIndex(x => x._id === evt._id);
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
      reader.onload = e => this.poster = reader.result;

      reader.readAsDataURL(file);

      this.selectedFile = file;
    }
  }

  uploadImage(): any {
    if (!this.dealFormGroup.get('title').value) {
      return this.snackBar.open('Please enter the title before file upload', 'OKAY', {duration: 3000});
    }

    const formData: FormData = new FormData();
    formData.append('file', this.selectedFile, this.selectedFile.name);
    formData.append('title', this.dealFormGroup.get('title').value);
    formData.append('fileModule', FILE_UPLOAD_MODULES.ASSETS);
    const file$ = this.filesService.upload(formData);
    file$.subscribe(res => {
      this.poster = `${BUCKETS.ASSETS}/${res.fileUrl}`;
      this.snackBar.open('Image Uploaded!', 'OKAY', {duration: 5000});
    }, err => {
      this.snackBar.open(err.message, 'OKAY', {duration: 5000});
    });
  }

  onSubmit(): void {
    const {title, description, code, ctaText, ctaLink, priority, categories} = this.dealFormGroup.value;

    const selectedSets = this.selectedSets.map((item, index) => {
      return {
        set: item,
        priority: index + 1
      };
    });

    const payload = {
      title,
      description,
      code,
      ctaText, ctaLink, priority,
      categories: categories.map(x => x._id),
      productSets: selectedSets,
      poster: this.poster ? this.poster.split('/').pop() : ''
    };

    const create$ = this.dealsService.create(payload);
    create$.subscribe(res => {
      this.router.navigate(['/', 'admin', 'store', 'deals']);
      this.snackBar.open('New Deal Added', 'OKAY', {duration: 5000});
    }, error => {
      this.snackBar.open(error.message, 'OKAY', {duration: 5000});
    });
  }
}
