import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';
import { CourseHistoryComponent } from './course-history/course-history.component';
import { CourseListComponent } from './course-list/course-list.component';

export const COURSES_ROUTES: Routes = [
  {
    path: '',
    component: CourseListComponent,
  },
  {
    path: 'history',
    canActivate: [roleGuard],
    data: { roles: ['estudiante'] },
    component: CourseHistoryComponent,
  },
];
