import { Pipe, PipeTransform } from '@angular/core';
import { CourseStatus } from '../../core/models/course.model';

const COURSE_STATUS_LABELS: Record<CourseStatus, string> = {
  active: 'Activo',
  draft: 'Borrador',
  inactive: 'Inactivo',
};

@Pipe({
  name: 'courseStatus',
  standalone: true,
})
export class CourseStatusPipe implements PipeTransform {
  transform(value: CourseStatus | string | null | undefined): string {
    if (!value) {
      return '';
    }
    return COURSE_STATUS_LABELS[value as CourseStatus] ?? value;
  }
}
