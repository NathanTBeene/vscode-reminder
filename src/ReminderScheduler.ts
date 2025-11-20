import { time } from "console";
import { Reminder } from "./Reminder";

export type ReminderTriggerCallback = (reminder: Reminder) => void | Promise<void>;

export class ReminderScheduler {
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private onTrigger: ReminderTriggerCallback;

  constructor(onTrigger: ReminderTriggerCallback) {
    this.onTrigger = onTrigger;
  }

  // Schedule a reminder to trigger at it's next trigger time
  schedule(reminder: Reminder): void {
    // Cancel any existing timer
    this.cancel(reminder.id);

    if (!reminder.isActive) {
      console.log(`Reminder ${reminder.id} is not active. Skipping scheduling.`);
      return;
    }

    const timeUntilTrigger = reminder.timeUntilTrigger;

    if (timeUntilTrigger === null) {
      console.log(`Reminder ${reminder.id} has no upcoming trigger time. Skipping scheduling.`);
      return;
    }

    if (timeUntilTrigger <= 0) {
      console.log(`Reminder ${reminder.id} trigger time is in the past. Triggering immediately.`);
      this.triggerImmediately(reminder);
      return;
    }

    const timer = setTimeout(() => {
      this.triggerImmediately(reminder);
    }, timeUntilTrigger);

    this.timers.set(reminder.id, timer);
    console.log(`Scheduled reminder ${reminder.id} to trigger in ${timeUntilTrigger} ms.`);
  }

  // Cancel a scheduled reminder
  cancel(reminderId: string): void {
    const timer = this.timers.get(reminderId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(reminderId);
      console.log(`Cancelled scheduled reminder ${reminderId}.`);
    }
  }

  // Cancel all scheduled reminders
  cancelAll(): void {
    for (const [reminderId, timer] of this.timers) {
      clearTimeout(timer);
      console.log(`Cancelled scheduled reminder ${reminderId}.`);
    }
    this.timers.clear();
  }

  // Reschedule a reminder (cancel and schedule again)
  reschedule(reminder: Reminder): void {
    this.cancel(reminder.id);
    this.schedule(reminder);
  }

  // Get number of currently scheduled reminders
  get activeTimerCount(): number {
    return this.timers.size;
  }

  // Check if a reminder is scheduled
  isScheduled(reminderId: string): boolean {
    return this.timers.has(reminderId);
  }

  private async triggerImmediately(reminder: Reminder): Promise<void> {
    // Remove from active timers
    this.timers.delete(reminder.id);

    // Call trigger callback
    try {
      await this.onTrigger(reminder);
    } catch (error) {
      console.error(`Error triggering reminder ${reminder.id}:`, error);
    }
  }

  // Cleanup method for deactivation
  dispose(): void {
    this.cancelAll();
  }
}
