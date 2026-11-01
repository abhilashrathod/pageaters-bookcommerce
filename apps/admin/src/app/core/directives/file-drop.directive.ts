import { Directive, HostBinding, HostListener, input } from '@angular/core';

// Makes an upload area accept dropped images: the files go into the form's (hidden) file input and its `change`
// event fires, so dropping runs the same handler as picking. Single inputs take the first image only.
@Directive({ selector: '[appFileDrop]' })
export class FileDropDirective {
  readonly appFileDrop = input.required<HTMLInputElement>();

  @HostBinding('class.file-drop-over') over = false;

  @HostListener('dragover', ['$event'])
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.over = true;
  }

  @HostListener('dragleave')
  onDragLeave(): void {
    this.over = false;
  }

  @HostListener('drop', ['$event'])
  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.over = false;
    const target = this.appFileDrop();
    const images = Array.from(event.dataTransfer?.files ?? []).filter((file) => file.type.startsWith('image/'));
    if (!images.length || target.disabled) return;

    const files = new DataTransfer();
    (target.multiple ? images : images.slice(0, 1)).forEach((file) => files.items.add(file));
    target.files = files.files;
    target.dispatchEvent(new Event('change'));
  }
}
