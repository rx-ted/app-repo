import { DurableObject } from 'cloudflare:workers';

export interface CounterState {
  current: number;
  pending: number;
  lastFlushAt: number;
}

const FLUSH_THRESHOLD = 100;
const ALARM_INTERVAL_MS = 30_000;

interface CounterDurableObjectState {
  storage: {
    get<T = unknown>(key: string): Promise<T | undefined>;
    put<T = unknown>(key: string, value: T): Promise<void>;
    delete(key: string): Promise<void>;
    getAlarm?(): Promise<number | null>;
    setAlarm?(time: number): Promise<void>;
  };
}

export class CounterDO extends DurableObject {
  private doState: CounterDurableObjectState;
  private alarmState: CounterState = { current: 0, pending: 0, lastFlushAt: 0 };

  constructor(state: CounterDurableObjectState, env: unknown) {
    super(state as any, env);
    this.doState = state;
  }

  private async getAlarmTime(): Promise<number | null> {
    if (typeof this.ctx.getAlarm === 'function') return this.ctx.getAlarm();
    if (this.doState.storage.getAlarm) return this.doState.storage.getAlarm();
    return null;
  }

  private async setAlarmTime(time: number): Promise<void> {
    if (typeof this.ctx.setAlarm === 'function') {
      await this.ctx.setAlarm(time);
    } else if (this.doState.storage.setAlarm) {
      await this.doState.storage.setAlarm(time);
    }
  }

  async initialize(): Promise<void> {
    const stored = await this.doState.storage.get<CounterState>('counter');
    if (stored) {
      this.alarmState = stored;
    }
  }

  async increment(delta: number = 1): Promise<number> {
    this.alarmState.current += delta;
    this.alarmState.pending += delta;
    await this.doState.storage.put('counter', this.alarmState);

    if (this.alarmState.pending >= FLUSH_THRESHOLD) {
      // Threshold hit — the driver will handle flush
    } else {
      const existingAlarm = await this.getAlarmTime();
      if (!existingAlarm) {
        await this.setAlarmTime(Date.now() + ALARM_INTERVAL_MS);
      }
    }

    return this.alarmState.current;
  }

  async decrement(delta: number = 1): Promise<number> {
    this.alarmState.current -= delta;
    this.alarmState.pending -= delta;
    await this.doState.storage.put('counter', this.alarmState);
    return this.alarmState.current;
  }

  async getValue(): Promise<number> {
    return this.alarmState.current;
  }

  async getPending(): Promise<number> {
    return this.alarmState.pending;
  }

  async alarm(): Promise<void> {
    if (this.alarmState.pending === 0) return;
    await this.setAlarmTime(Date.now() + ALARM_INTERVAL_MS);
  }

  async consumePending(): Promise<number> {
    const delta = this.alarmState.pending;
    if (delta === 0) return 0;

    this.alarmState.pending = 0;
    this.alarmState.lastFlushAt = Date.now();
    await this.doState.storage.put('counter', this.alarmState);
    return delta;
  }

  async reset(): Promise<void> {
    this.alarmState = { current: 0, pending: 0, lastFlushAt: 0 };
    await this.doState.storage.put('counter', this.alarmState);
  }
}
