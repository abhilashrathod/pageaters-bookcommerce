import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup} from '@angular/forms';
import {MatSnackBar} from '@angular/material/snack-bar';
import {Router} from '@angular/router';
import {FilesService} from '../../../core/services/files.service';
import {CategoryService} from '../../../core/services/category.service';
import {FILE_UPLOAD_MODULES} from '../../../core/helpers/constants';

@Component({
  selector: 'app-category-create',
  templateUrl: 'category-create.component.html'
})

export class CategoryCreateComponent implements OnInit {

  categoryFormGroup: FormGroup;
  avatar;
  selectedFile: File;


  constructor(private formBuilder: FormBuilder,
              private snackBar: MatSnackBar,
              private categoryService: CategoryService,
              private router: Router,
              private filesService: FilesService) {
  }

  ngOnInit(): void {
    this.buildForm();
  }

  buildForm(): void {
    this.categoryFormGroup = this.formBuilder.group({
      title: [''],
      description: [''],
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
    if (!this.categoryFormGroup.get('title').value) {
      return this.snackBar.open('Please enter the name first before file upload', 'OKAY', {duration: 3000});
    }

    if (!this.selectedFile) {
      return this.snackBar.open('Please select a file to upload', 'OKAY', {duration: 3000});
    }

    const formData: FormData = new FormData();
    formData.append('file', this.selectedFile, this.selectedFile.name);
    formData.append('title', this.categoryFormGroup.get('title').value);
    formData.append('fileModule', FILE_UPLOAD_MODULES.CATEGORY);
    const file$ = this.filesService.upload(formData);
    file$.subscribe(res => {
      this.avatar = res.fileUrl;
      this.snackBar.open('Category Thumbnail Uploaded!', 'OKAY', {duration: 5000});
    }, err => {
      this.snackBar.open(err.message, 'OKAY', {duration: 5000});
    });
  }

  onSubmit(): void {
    const payload = {
      ...this.categoryFormGroup.value,
      thumbnail: this.avatar,
    };
    const category$ = this.categoryService.create(payload);
    category$.subscribe(res => {
      this.router.navigate(['/', 'admin', 'categories']);
      this.snackBar.open('New Category Added', 'OKAY', {duration: 5000});
    }, error => {
      this.snackBar.open(error.message, 'OKAY', {duration: 5000});
    });
  }
}
