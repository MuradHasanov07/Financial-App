import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

export interface InputDialogData {
  title: string;
  message: string;
  inputLabel: string;
  inputType: string;
  initialValue?: any;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: string;
  min?: number;
  max?: number;
  step?: number;
}

@Component({
  selector: 'app-input-dialog',
  templateUrl: './input-dialog.component.html',
  styleUrls: ['./input-dialog.component.scss'],
})
export class InputDialogComponent {
  inputForm: FormGroup;

  constructor(
    public dialogRef: MatDialogRef<InputDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: InputDialogData,
    private fb: FormBuilder
  ) {
    // Set default values
    this.data.confirmText = this.data.confirmText || 'Tamam';
    this.data.cancelText = this.data.cancelText || 'İptal';
    this.data.confirmColor = this.data.confirmColor || 'primary';
    this.data.inputType = this.data.inputType || 'text';
    this.data.step = this.data.step || 0.000001;

    // Create form with validation
    const validators = [Validators.required];

    if (this.data.inputType === 'number') {
      if (this.data.min !== undefined) {
        validators.push(Validators.min(this.data.min));
      }
      if (this.data.max !== undefined) {
        validators.push(Validators.max(this.data.max));
      }
    }

    this.inputForm = this.fb.group({
      inputValue: [this.data.initialValue || '', validators],
    });
  }

  onNoClick(): void {
    this.dialogRef.close(null);
  }

  onYesClick(): void {
    if (this.inputForm.valid) {
      const value = this.inputForm.get('inputValue')?.value;
      this.dialogRef.close(
        this.data.inputType === 'number' ? parseFloat(value) : value
      );
    }
  }

  getErrorMessage(): string {
    const control = this.inputForm.get('inputValue');
    if (control?.errors) {
      if (control.errors['required']) {
        return `${this.data.inputLabel} gereklidir`;
      }
      if (control.errors['min']) {
        return `Minimum değer: ${this.data.min}`;
      }
      if (control.errors['max']) {
        return `Maksimum değer: ${this.data.max}`;
      }
    }
    return '';
  }
}
