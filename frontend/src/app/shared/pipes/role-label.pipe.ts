import { Pipe, PipeTransform } from '@angular/core';
import { UserRole } from '../../core/models/user.model';

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  profesor: 'Profesor',
  estudiante: 'Estudiante',
};

@Pipe({
  name: 'roleLabel',
  standalone: true,
})
export class RoleLabelPipe implements PipeTransform {
  transform(value: UserRole | string | null | undefined): string {
    if (!value) {
      return '';
    }
    return ROLE_LABELS[value as UserRole] ?? value;
  }
}
