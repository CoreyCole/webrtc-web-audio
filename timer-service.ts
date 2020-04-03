export class TimerService {
  timers: Array<HighResolutionTimer | null> = [];

  constructor() {}

  /**
   * Returns the `timerIndex` used to stop the timer
   * @param durationMs
   * @param callback
   */
  startInterval(
    durationMs: number,
    callback: (currentTime: number, deltaTime: number, avgDeltaTime: number) => Promise<any>,
  ): number {
    console.log('[TimerService]: starting interval with duration = ', durationMs);
    const timer = new HighResolutionTimer(durationMs, callback);
    timer.run();
    this.timers.push(timer);
    return this.timers.length - 1;
  }

  /**
   * Stops the given interval
   * @param timerIndex return value from `startInterval`
   */
  stopInterval(timerIndex: number): boolean {
    try {
      if (timerIndex > this.timers.length || this.timers[timerIndex] === null) return false;
      this.timers[timerIndex].stop();
      this.timers[timerIndex] = null;
      return true;
    } catch (err) {
      console.error(err.message, err.stack);
      return false;
    }
  }

  timeout(ms: number): Promise<number> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export class HighResolutionTimer {
  private _running = false;
  private _totalTicks = 1;
  private _timer: NodeJS.Timeout | null;
  private _startTime: number | null;
  private _currentTime: number | null;
  private _deltaTime: number | null;
  private _totalDeltaTime = 0;
  private _avgDeltaTime: number | null;

  constructor(
    private _durationMs: number,
    private _callback: (currentTime: number, deltaTime: number, avgDeltaTime: number) => Promise<any>,
  ) {}

  run() {
    this._running = true;
    let lastTime = this._currentTime;

    // performance.now() returns DOMHighResTimeStamp
    // which is milliseconds since last page reload
    // https://developer.mozilla.org/en-US/docs/Web/API/DOMHighResTimeStamp
    // in chrome, fractions of millisecond accuracy is clamped to 100us with pseudorandom jitter on top
    // https://chromium-review.googlesource.com/c/chromium/src/+/853505
    this._currentTime = performance.now();

    if (!this._startTime) {
      this._startTime = this._currentTime;
      console.log('[HighResolutionTimer]: startTime = ', this._startTime);
    }
    if (!this._deltaTime) {
      this._deltaTime = this._durationMs;
      this._avgDeltaTime = this._durationMs;
    } else {
      this._deltaTime = this._currentTime - lastTime;
    }

    this._totalDeltaTime += this._deltaTime;
    this._avgDeltaTime = this._totalDeltaTime / this._totalTicks;
    this._callback(this._currentTime, this._deltaTime, this._avgDeltaTime);

    let nextTick =
      this._durationMs - (performance.now() - (this._startTime + (this._totalTicks - 1) * this._durationMs));
    this._totalTicks++;

    if (this._running) {
      this._timer = setTimeout(() => {
        this.run();
      }, nextTick);
    }
  }

  stop() {
    this._running = false;
    if (this._timer !== null) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  }
}
