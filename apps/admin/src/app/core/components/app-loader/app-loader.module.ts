import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AppLoaderService } from './app-loader.service';
import { AppLoaderComponent } from './app-loader.component';

@NgModule({
  imports: [CommonModule, MatDialogModule, MatIconModule, MatProgressSpinnerModule, AppLoaderComponent],
  providers: [AppLoaderService],
})
export class AppLoaderModule {}
