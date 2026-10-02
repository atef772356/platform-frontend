import { useEffect, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Award, BookOpen, Check, ChevronDown, ClipboardCheck, GraduationCap,
  Layers, Search, Trash2, UserCheck, Users, X,
} from 'lucide-react';
import {
  changeUserRole, changeUserStatus, deleteAdminUser, getAdminCourses,
  getAdminDashboard, getAdminUsers, getAdminRecords, deleteAdminReview, errorMessage,
} from '../api';
import { Empty, PageHead, Pagination, Toast } from '../components';
import type { AdminCourse, AdminDashboard as DashboardData, AdminUser, Pagination as PaginationMeta } from '../types';
import type { LucideIcon } from 'lucide-react';

const emptyMeta: PaginationMeta = { page: 1, limit: 10, totalItems: 0, totalPages: 0, hasPreviousPage: false, hasNextPage: false };
const roleLabels: Record<string, string> = { ADMIN: 'مدير النظام', INSTRUCTOR: 'مدرّس', STUDENT: 'طالب' };

export function AdminMetricCard({ icon: Icon, label, value, detail, tone }: { icon: LucideIcon; label: string; value: number; detail: string; tone: 'purple' | 'green' | 'blue' | 'orange' }) {
  return <article className={`admin-metric-card ${tone}`}><span className="admin-metric-icon"><Icon size={21}/></span><div><span className="admin-metric-label">{label}</span><strong>{value.toLocaleString('ar-EG')}</strong><small>{detail}</small></div></article>;
}

export function AdminSearchInput({ value, placeholder, onChange, onClear }: { value: string; placeholder: string; onChange: (value: string) => void; onClear?: () => void }) {
  return <label className="admin-search"><Search size={18}/><span className="sr-only">بحث</span><input value={value} placeholder={placeholder} aria-label={placeholder} onChange={e => onChange(e.target.value)}/>{value && <button type="button" onClick={onClear || (() => onChange(''))} aria-label="مسح البحث"><X size={16}/></button>}</label>;
}

export function AdminSelect({ value, label, onChange, children }: { value: string; label: string; onChange: (value: string) => void; children: ReactNode }) {
  return <label className="admin-select"><span>{label}</span><div><select value={value} aria-label={label} onChange={e => onChange(e.target.value)}>{children}</select><ChevronDown size={16}/></div></label>;
}

export function AdminStatusBadge({ active }: { active: boolean }) {
  return <span className={`admin-status ${active ? 'active' : 'suspended'}`}><i/>{active ? 'نشط' : 'موقوف'}</span>;
}

export function AdminToolbar({ children, search }: { children: ReactNode; search: ReactNode }) {
  return <div className="admin-toolbar"><div className="admin-toolbar-search">{search}</div><div className="admin-toolbar-filters">{children}</div></div>;
}

export function AdminLoadingSkeleton({ kind }: { kind: 'metrics' | 'users' | 'courses' }) {
  if (kind === 'metrics') return <div className="admin-metrics-grid">{Array.from({ length: 8 }, (_, i) => <div className="admin-skeleton admin-skeleton-metric" key={i}/>)}</div>;
  if (kind === 'users') return <div className="admin-table-skeleton">{Array.from({ length: 5 }, (_, i) => <div className="admin-skeleton" key={i}/>)}</div>;
  return <div className="admin-course-grid">{Array.from({ length: 6 }, (_, i) => <div className="admin-skeleton admin-skeleton-course" key={i}/>)}</div>;
}

export function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { getAdminDashboard().then(setData).catch(e => setError(errorMessage(e))); }, []);
  const metrics = data ? [
    [Users, 'إجمالي المستخدمين', data.users.total, 'كل الحسابات المسجلة', 'purple'],
    [GraduationCap, 'الطلاب', data.users.students, 'حسابات الطلاب', 'green'],
    [UserCheck, 'المدرّسون', data.users.instructors, 'منشئو المحتوى', 'blue'],
    [BookOpen, 'الدورات', data.courses.total, 'دورات المنصة', 'orange'],
    [Layers, 'التسجيلات', data.learning.enrollments, 'التسجيل في الدورات', 'purple'],
    [BookOpen, 'الدروس', data.courses.totalLessons, 'المحتوى التعليمي', 'blue'],
    [ClipboardCheck, 'بانتظار التقييم', data.assignments.pendingGrading, 'تسليمات معلّقة', 'orange'],
    [Award, 'الشهادات', data.learning.certificates, 'شهادات صادرة', 'green'],
  ] as const : [];
  return <><PageHead eyebrow="إدارة المنصة" title="لوحة إدارة المنصة" desc="نظرة مركزية على المستخدمين والمحتوى ونشاط التعلّم."/>
    {error && <Toast text={error} type="error"/>}
    <section className="admin-dashboard-section"><div className="admin-section-heading"><span>ملخص المنصة</span><h2>المؤشرات الرئيسية</h2><p>بيانات مباشرة من قاعدة البيانات</p></div>{data ? <div className="admin-metrics-grid">{metrics.map(([icon, label, value, detail, tone]) => <AdminMetricCard key={label} icon={icon} label={label} value={value} detail={detail} tone={tone}/>)}</div> : <AdminLoadingSkeleton kind="metrics" />}</section>
    <section className="panel admin-shortcuts"><div className="panel-head"><div><span className="admin-kicker">وصول سريع</span><h3>اختصارات الإدارة</h3><p>انتقل إلى قوائم المنصة الكاملة.</p></div></div><div className="dashboard-actions"><Link className="admin-shortcut" to="/admin/users"><Users size={19}/><span>إدارة المستخدمين</span><Check size={16}/></Link><Link className="admin-shortcut" to="/admin/courses"><BookOpen size={19}/><span>إدارة الدورات</span><Check size={16}/></Link></div></section>
  </>;
}

export function AdminUsers() {
  const [params, setParams] = useSearchParams(); const page = Number(params.get('page') || 1); const search = params.get('search') || ''; const role = params.get('role') || '';
  const [data, setData] = useState<AdminUser[]>([]); const [meta, setMeta] = useState(emptyMeta); const [toast, setToast] = useState(''); const [loading, setLoading] = useState(true);
  const load = () => { setLoading(true); return getAdminUsers({ page, limit: 10, search, role }).then(r => { setData(r.data); setMeta(r.pagination); }).catch(e => setToast(errorMessage(e))).finally(() => setLoading(false)); };
  useEffect(() => { void load(); }, [page, search, role]);
  const update = (next: number) => setParams({ ...(search ? { search } : {}), ...(role ? { role } : {}), page: String(next) });
  const updateSearch = (value: string) => setParams({ ...(role ? { role } : {}), ...(value ? { search: value } : {}), page: '1' });
  const updateRole = (value: string) => setParams({ ...(search ? { search } : {}), ...(value ? { role: value } : {}), page: '1' });
  return <><PageHead eyebrow="إدارة المنصة" title="إدارة المستخدمين" desc="ابحث في حسابات المنصة وعدّل الأدوار والحالة بأمان."/><AdminToolbar search={<AdminSearchInput value={search} placeholder="ابحث بالاسم أو البريد الإلكتروني" onChange={updateSearch}/>}><AdminSelect value={role} label="الدور" onChange={updateRole}><option value="">كل الأدوار</option><option value="ADMIN">مدير النظام</option><option value="INSTRUCTOR">مدرّس</option><option value="STUDENT">طالب</option></AdminSelect></AdminToolbar>{toast && <Toast text={toast} type="error"/>}<section className="panel admin-table-panel">{loading ? <AdminLoadingSkeleton kind="users"/> : <><div className="table-wrap"><table className="admin-table"><thead><tr><th>الاسم</th><th>البريد</th><th>الدور</th><th>الحالة</th><th>إجراءات</th></tr></thead><tbody>{data.map(user => <tr key={user.id}><td><strong>{user.name}</strong></td><td className="admin-email">{user.email}</td><td><AdminSelect value={user.role} label={`دور ${user.name}`} onChange={value => changeUserRole(user.id, value).then(load).catch(e => setToast(errorMessage(e)))}><option value="ADMIN">{roleLabels.ADMIN}</option><option value="INSTRUCTOR">{roleLabels.INSTRUCTOR}</option><option value="STUDENT">{roleLabels.STUDENT}</option></AdminSelect></td><td><AdminStatusBadge active={user.isActive}/></td><td><div className="admin-actions"><button className="admin-action secondary" onClick={() => changeUserStatus(user.id, !user.isActive).then(load).catch(e => setToast(errorMessage(e)))}>{user.isActive ? 'إيقاف' : 'تفعيل'}</button><button className="admin-action danger" onClick={() => window.confirm('تأكيد حذف الحساب؟') && deleteAdminUser(user.id).then(load).catch(e => setToast(errorMessage(e)))}><Trash2 size={14}/> حذف</button></div></td></tr>)}</tbody></table></div>{!data.length && <Empty title="لا يوجد مستخدمون" desc="لا توجد نتائج مطابقة."/>}<Pagination {...meta} currentPage={meta.page} totalPages={meta.totalPages} onPageChange={update}/></>}</section></>;
}

export function AdminCourses() {
  const [params, setParams] = useSearchParams(); const page = Number(params.get('page') || 1); const search = params.get('search') || ''; const sort = params.get('sort') || 'createdAt'; const order = params.get('order') || 'desc';
  const [data, setData] = useState<AdminCourse[]>([]); const [meta, setMeta] = useState({ ...emptyMeta, limit: 6 }); const [toast, setToast] = useState(''); const [loading, setLoading] = useState(true);
  useEffect(() => { setLoading(true); getAdminCourses({ page, limit: 6, search, sort, order }).then(r => { setData(r.data); setMeta(r.pagination); }).catch(e => setToast(errorMessage(e))).finally(() => setLoading(false)); }, [page, search, sort, order]);
  const update = (values: Record<string, string>) => setParams({ ...values, page: '1' });
  return <><PageHead eyebrow="إدارة المنصة" title="إدارة الدورات" desc="استعرض محتوى المنصة وملكية الدورات دون استخدام استوديو المدرّس."/><AdminToolbar search={<AdminSearchInput value={search} placeholder="ابحث بعنوان الدورة" onChange={value => update({ search: value, sort, order })}/>}><AdminSelect value={sort} label="ترتيب حسب" onChange={value => update({ search, sort: value, order })}><option value="createdAt">الأحدث</option><option value="title">العنوان</option><option value="averageRating">التقييم</option><option value="enrollments">التسجيلات</option></AdminSelect><AdminSelect value={order} label="الاتجاه" onChange={value => update({ search, sort, order: value })}><option value="desc">تنازلي</option><option value="asc">تصاعدي</option></AdminSelect></AdminToolbar>{toast && <Toast text={toast} type="error"/>}{loading ? <AdminLoadingSkeleton kind="courses"/> : <><div className="admin-course-grid">{data.map(course => <article className="admin-course-card" key={course.id}><div className="admin-course-accent"><BookOpen size={22}/><span>{course._count.modules} وحدات</span></div><div className="admin-course-content"><h3>{course.title}</h3><p>{course.description}</p><small>المدرّس: {course.instructor.name}</small><div className="course-foot"><span>{course._count.enrollments} تسجيلات</span><b>{Number(course.price).toLocaleString('ar-EG')} ج.م</b></div></div></article>)}</div>{!data.length && <Empty title="لا توجد دورات" desc="لا توجد نتائج مطابقة."/>}<Pagination {...meta} currentPage={meta.page} totalPages={meta.totalPages} onPageChange={next => setParams({ ...(search ? { search } : {}), sort, order, page: String(next) })}/></>}</>;
}

export function AdminRecords({ kind, title }: { kind: 'enrollments'|'submissions'|'certificates'|'reviews'; title: string }) {
  const [params, setParams] = useSearchParams(); const page = Number(params.get('page') || 1); const [data, setData] = useState<unknown[]>([]); const [meta, setMeta] = useState(emptyMeta); const load = () => getAdminRecords(kind, { page, limit: 10 }).then(r => { setData(r.data); setMeta(r.pagination); }); useEffect(() => { void load(); }, [page, kind]);
  return <><PageHead eyebrow="إدارة المنصة" title={title} desc="سجلات حقيقية من PostgreSQL مع تنقل بين الصفحات."/><section className="panel"><div className="table-wrap"><table><thead><tr><th>السجل</th><th>التفاصيل</th><th>التاريخ</th>{kind === 'reviews' && <th>إجراء</th>}</tr></thead><tbody>{data.map((item: any) => <tr key={item.id}><td>#{item.id}</td><td>{item.course?.title || item.assignment?.title || item.user?.name || item.url || '—'}</td><td>{item.createdAt || item.issuedAt || item.enrolledAt ? new Date(item.createdAt || item.issuedAt || item.enrolledAt).toLocaleDateString('ar-EG') : '—'}</td>{kind === 'reviews' && <td><button className="btn small danger" onClick={() => window.confirm('تأكيد حذف التقييم؟') && deleteAdminReview(item.id).then(load)}>حذف</button></td>}</tr>)}</tbody></table></div><Pagination {...meta} currentPage={meta.page} totalPages={meta.totalPages} onPageChange={next => setParams({ page: String(next) })}/></section></>;
}
