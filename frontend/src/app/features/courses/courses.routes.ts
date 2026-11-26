import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';
import { CourseDetailComponent } from './course-detail/course-detail.component';
import { CourseHistoryComponent } from './course-history/course-history.component';
import { CourseListComponent } from './course-list/course-list.component';
import { StudentCourseViewComponent } from './student-course-view/student-course-view.component';

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
  {
    path: ':id/view',
    canActivate: [roleGuard],
    data: { roles: ['estudiante'] },
    component: StudentCourseViewComponent,
  },
  {
    path: ':id',
    canActivate: [roleGuard],
    data: { roles: ['admin', 'profesor'] },
    component: CourseDetailComponent,
  },
];
