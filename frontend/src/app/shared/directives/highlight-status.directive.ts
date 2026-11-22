import { Directive, HostBinding, Input } from '@angular/core';
import { CourseStatus } from '../../core/models/course.model';

interface StatusStyle {
  backgroundColor: string;
  color: string;
  borderColor: string;
}

const STATUS_STYLES: Record<CourseStatus, StatusStyle> = {
  active: {
    backgroundColor: 'var(--zegel-success-soft)',
    color: 'var(--zegel-success)',
    borderColor: 'var(--zegel-success-border)',
  },
  draft: {
    backgroundColor: 'var(--zegel-warning-soft)',
    color: 'var(--zegel-warning)',
    borderColor: 'var(--zegel-warning-border)',
  },
  inactive: {
    backgroundColor: 'var(--zegel-neutral-soft)',
    color: 'var(--zegel-muted)',
    borderColor: 'var(--zegel-neutral-border)',
  },
};

@Directive({
  selector: '[appHighlightStatus]',
  standalone: true,
})
export class HighlightStatusDirective {
  @Input() appHighlightStatus!: CourseStatus;

  private get currentStyle(): StatusStyle {
    return STATUS_STYLES[this.appHighlightStatus] ?? STATUS_STYLES.inactive;
  }

  @HostBinding('style.backgroundColor')
  get backgroundColor(): string {
    return this.currentStyle.backgroundColor;
  }

  @HostBinding('style.color')
  get color(): string {
    return this.currentStyle.color;
  }

  @HostBinding('style.border')
  get border(): string {
    return `2px solid ${this.currentStyle.borderColor}`;
  }

  @HostBinding('style.display')
  readonly display = 'inline-flex';

  @HostBinding('style.alignItems')
  readonly alignItems = 'center';

  @HostBinding('style.padding')
  readonly padding = '2px 10px';

  @HostBinding('style.borderRadius')
  readonly borderRadius = '9999px';

  @HostBinding('style.fontSize')
  readonly fontSize = '12px';

  @HostBinding('style.fontWeight')
  readonly fontWeight = '500';

  @HostBinding('style.lineHeight')
  readonly lineHeight = '1.5';
}
