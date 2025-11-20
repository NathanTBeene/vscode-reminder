import * as vscode from 'vscode';

export enum ReminderState {
  ACTIVE = 'active',
  PAUSED = 'paused',
  SNOOZED = 'snoozed',
}

export interface ReminderData {
  id: string;
  text: string;
  intervalMinutes: number;
  state: ReminderState;
  nextTriggerTime: number | null;
  createdAt: number;
}

export class Reminder {
  private _id: string;
  private _text: string;
  private _intervalMinutes: number;
  private _state: ReminderState;
  private _nextTriggerTime: number | null;
  private _createdAt: number;

  constructor(data: Partial<ReminderData> & { text: string, intervalMinutes: number }) {
    this._id = data.id || this.generateId();
    this._text = data.text;
    this._intervalMinutes = data.intervalMinutes;
    this._state = data.state || ReminderState.ACTIVE;
    this._nextTriggerTime = data.nextTriggerTime || null;
    this._createdAt = data.createdAt || Date.now();
  }

  get id(): string {
    return this._id;
  }

  get text(): string {
    return this._text;
  }

  get intervalMinutes(): number {
    return this._intervalMinutes;
  }

  get state(): ReminderState {
    return this._state;
  }

  get nextTriggerTime(): number | null {
    return this._nextTriggerTime;
  }

  get createdAt(): number {
    return this._createdAt;
  }

  get isActive(): boolean {
    return this._state === ReminderState.ACTIVE || this._state === ReminderState.SNOOZED;
  }

  get isPaused(): boolean {
    return this._state === ReminderState.PAUSED;
  }

  get isSnoozed(): boolean {
    return this._state === ReminderState.SNOOZED;
  }

  get timeUntilTrigger(): number | null {
    if (!this._nextTriggerTime) {
      return null;
    }
    return Math.max(0, this._nextTriggerTime - Date.now());
  }

  // State Transitions
  pause(): void {
    if (this._state === ReminderState.PAUSED) {
      return;
    }
    this._state = ReminderState.PAUSED;
    this._nextTriggerTime = null;
  }

  resume(): void {
    if (this._state !== ReminderState.PAUSED) {
      return;
    }
    this._state = ReminderState.ACTIVE;
    this._nextTriggerTime = this.calculateNextTriggerTime();
  }

  snooze(minutes: number = 5): void {
    this._state = ReminderState.SNOOZED;
    this._nextTriggerTime = Date.now() + minutes * 60000;
  }

  dismiss(): void {
    // Return to normal active state with regular interval
    this._state = ReminderState.ACTIVE;
    this._nextTriggerTime = this.calculateNextTriggerTime();
  }

  reschedule(): void {
    // For use when a reminder was missed.
    if (this.isActive) {
      this._nextTriggerTime = this.calculateNextTriggerTime();
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  private calculateNextTriggerTime(): number {
    return Date.now() + this._intervalMinutes * 60000;
  }

  validate(): { isValid: boolean; error?: string } {
    if (this._intervalMinutes <= 0) {
      return { isValid: false, error: 'Interval must be greater than zero.' };
    }

    if (!this._text || this._text.trim().length === 0) {
      return { isValid: false, error: 'Reminder text cannot be empty.' };
    }
    return { isValid: true };
  }

  // Serialization
  toJSON(): ReminderData {
    return {
      id: this._id,
      text: this._text,
      intervalMinutes: this._intervalMinutes,
      state: this._state,
      nextTriggerTime: this._nextTriggerTime,
      createdAt: this._createdAt,
    };
  }

  static fromJSON(data: ReminderData): Reminder {
    return new Reminder(data);
  }
}
