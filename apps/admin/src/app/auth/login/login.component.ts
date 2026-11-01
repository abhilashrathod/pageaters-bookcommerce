import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { AuthorService } from '@services/auth.service';
import { Router } from '@angular/router';
import { UntypedFormBuilder, UntypedFormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  templateUrl: 'login.component.html',
  styleUrls: ['./login.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [FormsModule, ReactiveFormsModule],
})
export class LoginComponent implements OnInit {
  loginFormGroup: UntypedFormGroup;

  constructor(
    private auth: AuthorService,
    private formBuilder: UntypedFormBuilder,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.buildForm();
  }

  buildForm(): void {
    this.loginFormGroup = this.formBuilder.group({
      email: ['', Validators.compose([Validators.required, Validators.email])],
      password: ['', Validators.compose([Validators.required])],
    });
  }

  handleSubmit(event): void {
    const { valid } = this.loginFormGroup;

    if (!valid) {
      return;
    }

    const login$ = this.auth.authenticate(event);
    login$.subscribe(
      (res) => {
        this.router.navigate(['/', 'admin']);
      },
      (error) => {
        alert(error);
      },
    );
  }
}
