import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { getPublicCourses } from '../api';
import { CourseCard, Empty, PageHead, Pagination } from '../components';
import type { Course, Pagination as PaginationMeta } from '../types';

export function Courses() {
  const [params, setParams] = useSearchParams();
  const page = Math.max(Number(params.get('page') || 1), 1);
  const search = params.get('search') || ''; const sort = params.get('sort') || 'createdAt'; const order = params.get('order') || 'desc';
  const [courses, setCourses] = useState<Course[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ page, limit: 6, totalItems: 0, totalPages: 0, hasPreviousPage: false, hasNextPage: false });
  const [loading, setLoading] = useState(true);
  useEffect(() => { setLoading(true); getPublicCourses({ page, limit: 6, search, sort, order }).then(r => { setCourses(r.data); setMeta(r.pagination); }).finally(() => setLoading(false)); }, [page, search, sort, order]);
  const updateSearch = (value: string) => setParams({ ...(value ? { search: value } : {}), page: '1', sort, order });
  return <><PageHead eyebrow="مكتبة التعلّم" title="اكتشف دورتك القادمة" desc="اختر من المسارات العملية المصممة لتطوير مهاراتك."/><div className="toolbar"><div className="search"><Search/><input value={search} onChange={e => updateSearch(e.target.value)} placeholder="ابحث عن دورة أو مهارة..."/></div><select value={sort} onChange={e=>setParams({search,page:'1',sort:e.target.value,order})}><option value="createdAt">الأحدث</option><option value="title">العنوان</option><option value="price">السعر</option><option value="averageRating">التقييم</option></select><select value={order} onChange={e=>setParams({search,page:'1',sort,order:e.target.value})}><option value="desc">تنازلي</option><option value="asc">تصاعدي</option></select></div>{loading?<div className="skeleton-grid">{[1,2,3,4,5,6].map(x=><div className="skeleton" key={x}/>)}</div>:courses.length?<><div className="course-grid">{courses.map(c=><CourseCard key={c.id} c={c}/>)}</div><Pagination {...meta} currentPage={meta.page} totalPages={meta.totalPages} onPageChange={next => setParams({search,page:String(next),sort,order})}/></>:<Empty title="لا توجد دورات مطابقة" desc="جرّب كلمة بحث مختلفة."/>}</>;
}
