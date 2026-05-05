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
