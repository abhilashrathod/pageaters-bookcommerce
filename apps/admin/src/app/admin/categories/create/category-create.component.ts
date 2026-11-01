import { Component, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { FilesService } from '@services/files.service';
import { CategoryService } from '@services/category.service';
import { MatButton, MatFabButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { MatIcon } from '@angular/material/icon';
import { apiErrorMessage } from '@services/api-client';
import { AdminFileModule } from '@pageaters/shared';
import { DemoAdminService } from '@services/demo-admin.service';
import { DemoReadOnlyNoticeComponent } from '@components/demo-read-only-notice/demo-read-only-notice.component';
import { FileDropDirective } from '@core/directives/file-drop.directive';

@Component({
  selector: 'app-category-create',
  templateUrl: 'category-create.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [FileDropDirective, 
    DemoReadOnlyNoticeComponent,
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
export class CategoryCreateComponent implements OnInit {
  protected demoAdmin = inject(DemoAdminService);

  categoryFormGroup: UntypedFormGroup;
  avatar;
  selectedFile: File;

  constructor(
    private formBuilder: UntypedFormBuilder,
    private snackBar: MatSnackBar,
    private categoryService: CategoryService,
    private router: Router,
    private filesService: FilesService,
  ) {}

  ngOnInit(): void {
    this.buildForm();
  }

  buildForm(): void {
    this.categoryFormGroup = this.formBuilder.group({
      title: [''],
      description: [''],
      popularity: [0],
      priority: [0],
    });
  }

  previewImage(event): void {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];

      const reader = new FileReader();
      // Upload as soon as the preview is ready, so a save can't send the local data: URL.
      reader.onload = () => {
        this.avatar = reader.result;
        this.uploadImage();
      };

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

    const file$ = this.filesService.upload({
      file: this.selectedFile,
      fileName: this.selectedFile.name,
      title: this.categoryFormGroup.get('title').value,
      fileModule: AdminFileModule.CATEGORY,
    });
    file$.subscribe(
      (res) => {
        this.avatar = res.fileUrl;
        this.snackBar.open('Category Thumbnail Uploaded!', 'OKAY', { duration: 5000 });
      },
      (err) => {
        this.snackBar.open(apiErrorMessage(err), 'OKAY', { duration: 5000 });
      },
    );
  }

  onSubmit(): void {
    const payload = {
      ...this.categoryFormGroup.value,
      thumbnail: this.avatar,
    };
    const category$ = this.categoryService.create(payload);
    category$.subscribe(
      (res) => {
        this.router.navigate(['/', 'admin', 'categories']);
        this.snackBar.open('New Category Added', 'OKAY', { duration: 5000 });
      },
      (error) => {
        this.snackBar.open(apiErrorMessage(error), 'OKAY', { duration: 5000 });
      },
    );
  }
}
