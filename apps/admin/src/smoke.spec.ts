import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

@Component({ selector: 'app-smoke', template: '<p>ok</p>' })
class SmokeComponent {}

describe('test harness', () => {
  it('renders a standalone component', () => {
    const fixture = TestBed.createComponent(SmokeComponent);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('ok');
  });
});
