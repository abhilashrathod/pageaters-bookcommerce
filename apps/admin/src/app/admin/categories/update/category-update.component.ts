import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { get } from 'lodash';
import { CategoryService } from '@services/category.service';
import { FilesService } from '@services/files.service';
import { BUCKETS, FILE_UPLOAD_MODULES } from '@helpers/constants';
import { MatButton, MatFabButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-category-update',
  templateUrl: 'category-update.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatButton,
    MatFormField,
    MatLabel,
    MatInput,
    CdkTextareaAutosize,
    MatFabButton,
    RouterLink,
    MatIcon,
  ],
})
export class CategoryUpdateComponent implements OnInit {
  categoryFormGroup: UntypedFormGroup;
  avatar;
  selectedFile: File;
  category;
  isReady = false;

  constructor(
    private formBuilder: UntypedFormBuilder,
    private snackBar: MatSnackBar,
    private categoryService: CategoryService,
    private route: ActivatedRoute,
    private router: Router,
    private filesService: FilesService,
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((param) => {
      if (param.id) {
        this.getCategoryDetails(param.id);
      }
    });
  }

  getCategoryDetails(id): void {
    const category$ = this.categoryService.getById(id);
    category$.subscribe((res) => {
      this.category = res;
      this.category.thumbnail = `${BUCKETS.CATEGORIES}/${this.category.thumbnail}`;
      this.buildForm(res);
      this.isReady = true;
    });
  }

  buildForm(category): void {
    this.categoryFormGroup = this.formBuilder.group({
      title: [get(category, 'title', '')],
      description: [get(category, 'description', '')],
      popularity: [get(category, 'popularity', 0)],
      priority: [get(category, 'priority', 0)],
    });
  }

  previewImage(event): void {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];

      const reader = new FileReader();
      reader.onload = (e) => (this.category.thumbnail = reader.result);

      reader.readAsDataURL(file);

      this.selectedFile = file;
    }
  }

  uploadImage(): any {
    if (!this.categoryFormGroup.get('title').value) {
      return this.snackBar.open('Please enter the name first before file upload', 'OKAY', { duration: 3000 });
    }

    if (!this.selectedFile) {
      return this.snackBar.open('Please select a file to upload', 'OKAY', { duration: 3000 });
    }

    const formData: FormData = new FormData();
    formData.append('file', this.selectedFile, this.selectedFile.name);
    formData.append('title', this.categoryFormGroup.get('title').value);
    formData.append('fileModule', FILE_UPLOAD_MODULES.CATEGORY);
    const file$ = this.filesService.upload(formData);
    file$.subscribe(
      (res) => {
        this.category.thumbnail = `${BUCKETS.CATEGORIES}/${res.fileUrl}`;
        this.snackBar.open('Category Thumbnail Uploaded!', 'OKAY', { duration: 5000 });
      },
      (err) => {
        this.snackBar.open(err.message, 'OKAY', { duration: 5000 });
      },
    );
  }

  onSubmit(): void {
    const payload = {
      ...this.category,
      ...this.categoryFormGroup.value,
      thumbnail: this.category.thumbnail.split('/').pop(),
    };
    const category$ = this.categoryService.update(this.category._id, payload);
    category$.subscribe(
      (res) => {
        this.router.navigate(['/', 'admin', 'categories']);
        this.snackBar.open('Category Updated', 'OKAY', { duration: 5000 });
      },
      (error) => {
        this.snackBar.open(error.message, 'OKAY', { duration: 5000 });
      },
    );
  }
}
