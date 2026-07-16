export interface DataQualityMetrics {
  focus_loss_count: number;
  focus_loss_seconds: number;
  technical_error_count: number;
}

export class DataQualityTracker {
  private activeFocusLossStartMs: number | null = null;
  private isStarted = false;
  private metrics: DataQualityMetrics = {
    focus_loss_count: 0,
    focus_loss_seconds: 0,
    technical_error_count: 0,
  };

  constructor(private readonly now = Date.now) {}

  start() {
    if (this.isStarted || typeof window === 'undefined') {
      return;
    }

    window.addEventListener('blur', this.handleFocusLoss);
    window.addEventListener('focus', this.handleFocusReturn);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('error', this.handleGlobalTechnicalError);
    window.addEventListener(
      'unhandledrejection',
      this.handleGlobalTechnicalError,
    );
    this.isStarted = true;
  }

  stop() {
    if (!this.isStarted || typeof window === 'undefined') {
      return;
    }

    window.removeEventListener('blur', this.handleFocusLoss);
    window.removeEventListener('focus', this.handleFocusReturn);
    document.removeEventListener(
      'visibilitychange',
      this.handleVisibilityChange,
    );
    window.removeEventListener('error', this.handleGlobalTechnicalError);
    window.removeEventListener(
      'unhandledrejection',
      this.handleGlobalTechnicalError,
    );
    this.endFocusLoss();
    this.isStarted = false;
  }

  getMetrics() {
    return {
      ...this.metrics,
      focus_loss_seconds:
        this.metrics.focus_loss_seconds + this.getActiveFocusLossSeconds(),
    };
  }

  recordTechnicalError() {
    this.metrics.technical_error_count++;
  }

  /**
   * Uncaught window errors and unhandled promise rejections are counted as
   * a data-quality covariate ONLY — the error/reason payload is deliberately
   * never read or stored (no message, stack, URL or rejection value), so
   * non-Error rejection values are safe by construction and no participant
   * or environment detail can leak into research data. The event is not
   * cancelled, preserving the browser's default console reporting. The
   * handler body cannot throw: it only increments a counter.
   */
  private readonly handleGlobalTechnicalError = () => {
    this.recordTechnicalError();
  };

  private readonly handleFocusLoss = () => {
    this.beginFocusLoss();
  };

  private readonly handleFocusReturn = () => {
    this.endFocusLoss();
  };

  private readonly handleVisibilityChange = () => {
    if (document.hidden) {
      this.beginFocusLoss();
      return;
    }

    this.endFocusLoss();
  };

  private beginFocusLoss() {
    if (this.activeFocusLossStartMs !== null) {
      return;
    }

    this.activeFocusLossStartMs = this.now();
    this.metrics.focus_loss_count++;
  }

  private endFocusLoss() {
    if (this.activeFocusLossStartMs === null) {
      return;
    }

    this.metrics.focus_loss_seconds += this.getActiveFocusLossSeconds();
    this.activeFocusLossStartMs = null;
  }

  private getActiveFocusLossSeconds() {
    if (this.activeFocusLossStartMs === null) {
      return 0;
    }

    return Math.max(
      0,
      Math.floor((this.now() - this.activeFocusLossStartMs) / 1000),
    );
  }
}
