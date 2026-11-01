import { Component, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { AuthorService } from '@services/auth.service';
import { API_CLIENT, apiErrorMessage } from '@services/api-client';
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
  private client = inject(API_CLIENT);

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
        alert(apiErrorMessage(error));
      },
    );
  }

  // One click into the read-only demo admin (DEMO_MODE only; its password is random, so this is the only way in).
  demoLogin(): void {
    this.client.auth.demoAdminLogin().then(
      () => this.router.navigate(['/', 'admin']),
      (error) => alert(apiErrorMessage(error)),
    );
  }
}
