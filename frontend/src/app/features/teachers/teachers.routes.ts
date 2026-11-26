import { Routes } from '@angular/router';
import { TeacherListComponent } from './teacher-list/teacher-list.component';

export const TEACHERS_ROUTES: Routes = [
  {
    path: '',
    component: TeacherListComponent,
  },
];
