import {Component, OnInit} from '@angular/core';
import {FormControl, FormGroup} from '@angular/forms';
import {BooksService} from '../../../core/services/books.service';
import {Observable} from 'rxjs';
import {debounceTime, distinctUntilChanged, map, startWith, switchMap} from 'rxjs/operators';
import {IBook} from '../../../core/schema/book';
import {MatAutocompleteSelectedEvent} from '@angular/material/autocomplete';

@Component({
  selector: 'app-book-create',
  templateUrl: 'book-create.component.html'
})

export class BookCreateComponent implements OnInit {
  mainFormGroup: FormGroup;
  otherFormGroup: FormGroup;

  bookSearchControl = new FormControl();
  filteredBooks: Observable<any>;

  selectedBook: IBook;

  constructor(private _books: BooksService) {
  }

  ngOnInit(): void {
    this.filteredBooks = this.bookSearchControl.valueChanges
      .pipe(
        startWith(''),
        debounceTime(1000),
        switchMap((val) => {
          if (val) {
            return this._filterValues(val || '');
          } else {
            return [];
          }

        })
      );
  }

  selected(event: MatAutocompleteSelectedEvent) {
    console.log(event);
  }


  private _filterValues(value: string) {
    const filterValue = value.toLowerCase();
    return this._books.searchBooks(filterValue);
  }
}
