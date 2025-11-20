import * as vscode from 'vscode';
import { Reminder, ReminderData, ReminderState } from './Reminder';
import { ReminderScheduler } from './ReminderScheduler';

export type ReminderChangeListener = () => void;

export class ReminderManager {
  private reminders: Map<string, Reminder> = new Map();
  private scheduler: ReminderScheduler;
  private changeListeners: Set<ReminderChangeListener> = new Set();

  constructor(
    private readonly context: vscode.ExtensionContext,
    onReminderTrigger: (reminder: Reminder) => void | Promise<void>
  ) {
    this.scheduler = new ReminderScheduler(async (reminder) => {
      await onReminderTrigger(reminder);
    });

    this.load();
  }

  // Add a new reminder
  add(text: string, intervalMinutes: number): { success: boolean, error?: string, reminder?: Reminder } {
    const reminder = new Reminder({ text, intervalMinutes });

    const validation = reminder.validate();
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    // ensures the next trigger time is set
    reminder.reschedule();

    this.reminders.set(reminder.id, reminder);
    this.scheduler.schedule(reminder);
    this.save();
    this.notifyChange();

    return { success: true, reminder };
  }

  // Get a reminder by id
  get(id: string): Reminder | undefined {
    return this.reminders.get(id);
  }

  // Get all reminders
  getAll(): Reminder[] {
    return Array.from(this.reminders.values());
  }

  // Delete a reminder by id
  delete(id: string): boolean {
    const reminder = this.reminders.get(id);
    if (!reminder) {
      return false;
    }

    this.scheduler.cancel(id);
    this.reminders.delete(id);
    this.save();
    this.notifyChange();
    return true;
  }

  // Toggle a reminder between active and paused
  toggle(id: string): boolean {
    const reminder = this.reminders.get(id);
    if (!reminder) {
      return false;
    }

    if (reminder.isPaused) {
      reminder.resume();
      this.scheduler.schedule(reminder);
    } else {
      reminder.pause();
      this.scheduler.cancel(id);
    }

    this.save();
    this.notifyChange();
    return true;
  }

  // Snooze a reminder
  snooze(id: string, minutes: number = 5): boolean {
    const reminder = this.reminders.get(id);
    if (!reminder) {
      return false;
    }

    reminder.snooze(minutes);
    this.scheduler.reschedule(reminder);
    this.save();
    this.notifyChange();
    return true;
  }

  // Dismiss a reminder
  dismiss(id: string): boolean {
    const reminder = this.reminders.get(id);
    if (!reminder) {
      return false;
    }

    reminder.dismiss();
    this.scheduler.reschedule(reminder);
    this.save();
    this.notifyChange();
    return true;
  }

  // Pause a reminder
  pause(id: string): boolean {
    const reminder = this.reminders.get(id);
    if (!reminder) {
      return false;
    }

    reminder.pause();
    this.scheduler.cancel(id);
    this.save();
    this.notifyChange();
    return true;
  }

  // Register a listener for reminder changes
  onChange(listener: ReminderChangeListener): vscode.Disposable {
    this.changeListeners.add(listener);
    return new vscode.Disposable(() => {
      this.changeListeners.delete(listener);
    });
  }

  // Save reminders to persistent storage
  private save(): void {
    const data = this.getAll().map(r => r.toJSON());
    this.context.globalState.update('reminders', data);
    console.log('Reminders saved.');
  }

  // Load reminders from persistent storage
  private load(): void {
    const saved = this.context.globalState.get<any[]>('reminders', []);

    if (!saved || saved.length === 0) {
      console.log('No saved reminders found.');
      return;
    }

    console.log('Loading reminders from storage...');

    for (const data of saved) {
      try {
        // Handle migration of old format to new
        let reminderData: ReminderData;

        if ('isActive' in data || 'isSnoozed' in data) {
          reminderData = {
            id: data.id,
            text: data.text,
            intervalMinutes: data.intervalMinutes,
            state: data.isSnoozed ? ReminderState.SNOOZED :
              (data.isActive ? ReminderState.ACTIVE : ReminderState.PAUSED),
            nextTriggerTime: data.nextTriggerTime,
            createdAt: data.createdAt || Date.now(),
          };
        } else {
          reminderData = data as ReminderData;
        }

        const reminder = Reminder.fromJSON(reminderData);
        this.reminders.set(reminder.id, reminder);

        // Reschedule only active reminders
        if (reminder.isActive) {
          if (reminder.nextTriggerTime && reminder.nextTriggerTime <= Date.now()) {
            if (!reminder.isSnoozed) {
              reminder.reschedule();
            }
          }
          this.scheduler.schedule(reminder);
        }
      } catch (error) {
        console.error('Failed to load reminder:', error);
      }
    }

    this.save(); // Save back any migrated data
    console.log(`Loaded ${this.reminders.size} reminders.`);
  }

  // Notify all registered listeners of changes
  private notifyChange(): void {
    for (const listener of this.changeListeners) {
      try {
        listener();
      } catch (error) {
        console.error('Error in change listener:', error);
      }
    }
  }

  // Get reminder stats
  getStats(): { total: number; active: number; paused: number; snoozed: number } {
    let active = 0;
    let paused = 0;
    let snoozed = 0;

    for (const reminder of this.reminders.values()) {
      if (reminder.isPaused) {
        paused++;
        break;
      } else if (reminder.isSnoozed) {
        snoozed++;
        break;
      } else if (reminder.isActive) {
        active++;
        break;
      }
    }

    return { total: this.reminders.size, active, paused, snoozed };
  }

  // Cleanup
  dispose(): void {
    this.scheduler.dispose();
    this.changeListeners.clear();
  }
}
