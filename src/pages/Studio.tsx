import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { BookPlus, ClipboardList, FileText, GripVertical, Layers, Pencil, PlaySquare, Plus, Trash2, UploadCloud, Search } from 'lucide-react';
import { createAssignment, createCourse, createLesson, createModule, createQuiz, deleteCourse, errorMessage, getInstructorCourses, getPendingSubmissions, gradeSubmission, reorderModules, updateCourse } from '../api';
import { PageHead, Pagination, Toast } from '../components';
import { useSearchParams } from 'react-router-dom';
import type { InstructorCourse, InstructorDashboardSubmission, Section, Pagination as PaginationMeta } from '../types';

type Tab = 'courses' | 'modules' | 'lessons' | 'quiz' | 'assignment' | 'submissions';
const emptyCourse = { title: '', description: '', price: 0 };

export function Studio() {
  const [courses, setCourses] = useState<InstructorCourse[]>([]);
  const [coursePage, setCoursePage] = useState(1);
  const [searchParams, setSearchParams] = useSearchParams();
  const courseSearch = searchParams.get('search') || '';
  const [courseMeta, setCourseMeta] = useState<PaginationMeta>({page:1,limit:5,totalItems:0,totalPages:0,hasPreviousPage:false,hasNextPage:false});
  const [selectedCourseId, setSelectedCourseId] = useState<number | ''>('');
  const [selectedModuleId, setSelectedModuleId] = useState<number | ''>('');
  const [tab, setTab] = useState<Tab>('courses');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [courseForm, setCourseForm] = useState(emptyCourse);
  const [editingCourse, setEditingCourse] = useState<number | null>(null);
  const selectedCourse = courses.find(course => course.id === selectedCourseId);
  const selectedModule = selectedCourse?.modules.find(module => module.id === selectedModuleId);

  const refresh = useCallback(async (keepCourse = true) => {
    setLoading(true);
    try {
      const result = await getInstructorCourses({page:coursePage,limit:5,search:courseSearch,sort:searchParams.get('sort') || 'createdAt',order:searchParams.get('order') || 'desc'});
      setCourses(result.data); setCourseMeta(result.pagination);
      if (keepCourse && selectedCourseId && result.data.some(item => item.id === selectedCourseId)) setSelectedCourseId(selectedCourseId);
      else setSelectedCourseId(result.data[0]?.id ?? '');
    } catch (error) { setMessage({ text: errorMessage(error), error: true }); }
    finally { setLoading(false); }
  }, [selectedCourseId, coursePage, courseSearch]);
  useEffect(() => { refresh(false); }, [coursePage, courseSearch]);
  useEffect(() => { if (selectedCourse && !selectedCourse.modules.some(module => module.id === selectedModuleId)) setSelectedModuleId(selectedCourse.modules[0]?.id ?? ''); }, [selectedCourse, selectedModuleId]);

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true); setMessage(null);
    try { await action(); await refresh(); setMessage({ text: success }); }
    catch (error) { setMessage({ text: errorMessage(error), error: true }); }
    finally { setBusy(false); }
  }
  async function saveCourse(event: FormEvent) {
    event.preventDefault();
    const data = { ...courseForm, price: Number(courseForm.price) };
    await run(() => editingCourse ? updateCourse(editingCourse, data) : createCourse(data), editingCourse ? 'تم تحديث الدورة' : 'تم إنشاء الدورة');
    setCourseForm(emptyCourse); setEditingCourse(null); setTab('courses');
  }
  async function removeCourse(course: InstructorCourse) {
    if (!window.confirm(`هل تريد حذف دورة «${course.title}»؟ لا يمكن التراجع عن هذا الإجراء.`)) return;
    await run(() => deleteCourse(course.id), 'تم حذف الدورة');
  }
  function selectCourse(id: number) { setSelectedCourseId(id); setTab('modules'); }
  const tabs: [Tab, string, React.ElementType][] = [['courses', 'الدورات', BookPlus], ['modules', 'الوحدات', Layers], ['lessons', 'الدروس', PlaySquare], ['quiz', 'الاختبارات', ClipboardList], ['assignment', 'التكليفات', FileText], ['submissions', 'التسليمات', UploadCloud]];
  return <><PageHead eyebrow="مساحة المدرّس" title="استوديو المحتوى" desc="أنشئ محتواك ونظّمه من خلال اختيارات واضحة دون إدخال أي معرّفات تقنية." />{message && <Toast text={message.text} type={message.error ? 'error' : 'ok'} />}<div className="toolbar"><div className="search"><Search/><input value={courseSearch} onChange={e=>{setCoursePage(1);setSearchParams({search:e.target.value,sort:searchParams.get('sort')||'createdAt',order:searchParams.get('order')||'desc'})}} placeholder="ابحث في دوراتك..."/></div></div><div className="studio-layout"><aside className="stepnav">{tabs.map(([value, label, Icon]) => <button key={value} className={tab === value ? 'active' : ''} onClick={() => setTab(value)}><span><Icon size={17} /></span><div><b>{label}</b><small>{value === 'courses' ? 'إنشاء وتحرير' : value === 'submissions' ? 'مراجعة ودرجات' : 'إدارة المحتوى'}</small></div></button>)}</aside><section className="studio-workspace">{loading ? <div className="studio-empty">جاري تحميل محتوى المدرّس...</div> : <><div className="studio-context"><label>الدورة<select value={selectedCourseId} onChange={event => selectCourse(Number(event.target.value))}><option value="">اختر الدورة</option>{courses.map(course => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label>{tab !== 'courses' && tab !== 'submissions' && <label>الوحدة<select value={selectedModuleId} onChange={event => setSelectedModuleId(Number(event.target.value))}><option value="">اختر الوحدة</option>{selectedCourse?.modules.map(module => <option key={module.id} value={module.id}>{module.title}</option>)}</select></label>}</div>{tab === 'courses' ? <CourseManager courses={courses} onSelect={selectCourse} onEdit={course => { setEditingCourse(course.id); setCourseForm({ title: course.title, description: course.description, price: Number(course.price) }); }} onDelete={removeCourse} onNew={() => { setEditingCourse(null); setCourseForm(emptyCourse); }} editing={editingCourse !== null} form={courseForm} setForm={setCourseForm} onSubmit={saveCourse} busy={busy} /> : tab === 'modules' ? <ModuleManager course={selectedCourse} busy={busy} run={run} onCourseRefresh={refresh} /> : tab === 'lessons' ? <LessonManager module={selectedModule} busy={busy} run={run} /> : tab === 'quiz' ? <QuizManager modules={selectedCourse?.modules ?? []} busy={busy} run={run} /> : tab === 'assignment' ? <AssignmentManager modules={selectedCourse?.modules ?? []} busy={busy} run={run} /> : <SubmissionManager busy={busy} run={run} />}</>}<Pagination {...courseMeta} currentPage={courseMeta.page} totalPages={courseMeta.totalPages} onPageChange={setCoursePage}/></section></div></>;
}

function CourseManager({ courses, onSelect, onEdit, onDelete, onNew, editing, form, setForm, onSubmit, busy }: { courses: InstructorCourse[]; onSelect: (id: number) => void; onEdit: (course: InstructorCourse) => void; onDelete: (course: InstructorCourse) => void; onNew: () => void; editing: boolean; form: typeof emptyCourse; setForm: (value: typeof emptyCourse) => void; onSubmit: (event: FormEvent) => void; busy: boolean }) {
  return <><div className="studio-panel-head"><div><h2>{editing ? 'تعديل الدورة' : 'دوراتي'}</h2><p>اختر دورة لإدارة وحداتها ودروسها.</p></div><button className="btn small" onClick={onNew}><Plus /> دورة جديدة</button></div>{(editing || courses.length === 0) && <form className="pro-form studio-inline-form" onSubmit={onSubmit}><label>عنوان الدورة<input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required /></label><label>الوصف<textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} required /></label><label>السعر<input type="number" min="0" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} required /></label><button className="btn" disabled={busy}><UploadCloud /> حفظ</button></form>}<div className="studio-course-grid">{courses.map(course => <article className="studio-course-card" key={course.id}><button className="studio-course-select" onClick={() => onSelect(course.id)}><b>{course.title}</b><span>{course.modules.length} وحدات · {course.modules.reduce((n, m) => n + m.lessons.length, 0)} دروس</span></button><div><button className="icon-action" onClick={() => onEdit(course)} aria-label="تعديل"><Pencil /></button><button className="icon-action danger" onClick={() => onDelete(course)} aria-label="حذف"><Trash2 /></button></div></article>)}</div>{courses.length === 0 && <div className="studio-empty">لا توجد دورات بعد. أنشئ دورتك الأولى.</div>}</>;
}

function CourseSelector({ modules, value, onChange }: { modules: Section[]; value: number | ''; onChange: (id: number) => void }) {
  return <label>الوحدة<select value={value} onChange={event => onChange(Number(event.target.value))} required><option value="">اختر الوحدة</option>{modules.map(module => <option key={module.id} value={module.id}>{module.title}</option>)}</select></label>;
}

function ModuleManager({ course, busy, run, onCourseRefresh }: { course?: InstructorCourse; busy: boolean; run: (action: () => Promise<unknown>, success: string) => Promise<void>; onCourseRefresh: () => Promise<void> }) {
  const [title, setTitle] = useState('');
  if (!course) return <div className="studio-empty">اختر دورة من تبويب الدورات أولًا.</div>;
  const currentCourse = course;
  async function add() { if (!title.trim()) return; await run(() => createModule(currentCourse.id, { title: title.trim(), order: currentCourse.modules.length + 1 }), 'تمت إضافة الوحدة'); setTitle(''); }
  async function move(index: number, direction: number) { const next = [...currentCourse.modules]; const target = index + direction; if (target < 0 || target >= next.length) return; [next[index], next[target]] = [next[target], next[index]]; await run(() => reorderModules(currentCourse.id, next.map(module => module.id)), 'تم تحديث ترتيب الوحدات'); }
  return <><div className="studio-panel-head"><div><h2>وحدات «{currentCourse.title}»</h2><p>اختر وحدة لإضافة الدروس والاختبارات والتكليفات.</p></div></div><div className="studio-add-row"><input value={title} onChange={e => setTitle(e.target.value)} placeholder="اسم الوحدة الجديدة" /><button className="btn small" onClick={add} disabled={busy}><Plus /> إضافة</button></div><div className="module-list">{currentCourse.modules.map((module, index) => <div className="module-row" key={module.id}><GripVertical /><b>{module.title}</b><span>{module.lessons.length} دروس</span><button onClick={() => move(index, -1)} disabled={index === 0 || busy}>↑</button><button onClick={() => move(index, 1)} disabled={index === currentCourse.modules.length - 1 || busy}>↓</button></div>)}</div>{currentCourse.modules.length === 0 && <div className="studio-empty">لا توجد وحدات. أضف الوحدة الأولى.</div>}</>;
}

function LessonManager({ module, busy, run }: { module?: Section; busy: boolean; run: (action: () => Promise<unknown>, success: string) => Promise<void> }) {
  const [form, setForm] = useState({ title: '', videoUrl: '', content: '' });
  if (!module) return <div className="studio-empty">اختر وحدة من تبويب الوحدات أولًا.</div>;
  const currentModule = module;
  async function add(event: FormEvent) { event.preventDefault(); await run(() => createLesson(currentModule.id, { ...form, order: currentModule.lessons.length + 1, videoUrl: form.videoUrl || undefined, content: form.content || undefined }), 'تمت إضافة الدرس'); setForm({ title: '', videoUrl: '', content: '' }); }
  return <><div className="studio-panel-head"><div><h2>دروس «{currentModule.title}»</h2><p>أضف فيديو أو محتوى نصيًا للدرس.</p></div></div><form className="pro-form studio-inline-form" onSubmit={add}><label>عنوان الدرس<input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required /></label><label>رابط الفيديو<input type="url" value={form.videoUrl} onChange={e => setForm({ ...form, videoUrl: e.target.value })} /></label><label>المحتوى<textarea rows={4} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} /></label><button className="btn" disabled={busy}>إضافة الدرس</button></form><div className="module-list">{currentModule.lessons.map(lesson => <div className="module-row" key={lesson.id}><PlaySquare /><b>{lesson.title}</b><span>{lesson.videoUrl ? 'فيديو' : 'محتوى نصي'}</span></div>)}</div></>;
}

function LessonPicker({ modules, value, onChange }: { modules: Section[]; value: number | ''; onChange: (id: number) => void }) {
  const lessons = useMemo(() => modules.flatMap(module => module.lessons.map(lesson => ({ ...lesson, moduleTitle: module.title }))), [modules]);
  return <label>الدرس<select value={value} onChange={event => onChange(Number(event.target.value))} required><option value="">اختر الدرس</option>{lessons.map(lesson => <option key={lesson.id} value={lesson.id}>{lesson.moduleTitle} — {lesson.title}</option>)}</select></label>;
}

function QuizManager({ modules, busy, run }: { lesson?: { id: number }; modules: Section[]; busy: boolean; run: (action: () => Promise<unknown>, success: string) => Promise<void> }) {
  const [lessonId, setLessonId] = useState<number | ''>(''); const [title, setTitle] = useState(''); const [passingScore, setPassingScore] = useState(60); const [questions, setQuestions] = useState([{ text: '', options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }] }]);
  function updateQuestion(index: number, text: string) { setQuestions(current => current.map((q, i) => i === index ? { ...q, text } : q)); }
  async function save(event: FormEvent) { event.preventDefault(); await run(() => createQuiz(Number(lessonId), { title, passingScore, questions }), 'تم إنشاء الاختبار'); setTitle(''); setQuestions([{ text: '', options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }] }]); }
  return <form className="pro-form" onSubmit={save}><h2>إنشاء اختبار</h2><LessonPicker modules={modules} value={lessonId} onChange={setLessonId} /><label>عنوان الاختبار<input value={title} onChange={e => setTitle(e.target.value)} required /></label><label>درجة النجاح<input type="number" min="0" max="100" value={passingScore} onChange={e => setPassingScore(Number(e.target.value))} required /></label>{questions.map((question, index) => <div className="nested-form" key={index}><label>السؤال {index + 1}<input value={question.text} onChange={e => updateQuestion(index, e.target.value)} required /></label>{question.options.map((option, optionIndex) => <label key={optionIndex}>الخيار {optionIndex + 1}<input value={option.text} onChange={e => setQuestions(current => current.map((q, i) => i === index ? { ...q, options: q.options.map((o, oi) => oi === optionIndex ? { ...o, text: e.target.value } : o) } : q))} required /><span><input type="checkbox" checked={option.isCorrect} onChange={e => setQuestions(current => current.map((q, i) => i === index ? { ...q, options: q.options.map((o, oi) => oi === optionIndex ? { ...o, isCorrect: e.target.checked } : o) } : q))} /> إجابة صحيحة</span></label>)}</div>)}<button className="btn" type="button" onClick={() => setQuestions([...questions, { text: '', options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }] }])}><Plus /> سؤال</button><button className="btn" disabled={busy}>حفظ الاختبار</button></form>;
}

function AssignmentManager({ modules, busy, run }: { modules: Section[]; busy: boolean; run: (action: () => Promise<unknown>, success: string) => Promise<void> }) {
  const [lessonId, setLessonId] = useState<number | ''>(''); const [title, setTitle] = useState(''); const [description, setDescription] = useState(''); const [dueDate, setDueDate] = useState('');
  async function save(event: FormEvent) { event.preventDefault(); await run(() => createAssignment(Number(lessonId), { title, description, dueDate: new Date(dueDate).toISOString() }), 'تم إنشاء التكليف'); setTitle(''); setDescription(''); }
  return <form className="pro-form" onSubmit={save}><h2>إنشاء تكليف</h2><LessonPicker modules={modules} value={lessonId} onChange={setLessonId} /><label>العنوان<input value={title} onChange={e => setTitle(e.target.value)} required /></label><label>الوصف<textarea value={description} onChange={e => setDescription(e.target.value)} required rows={4} /></label><label>موعد التسليم<input type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)} required /></label><button className="btn" disabled={busy}>حفظ التكليف</button></form>;
}

function SubmissionManager({ busy, run }: { busy: boolean; run: (action: () => Promise<unknown>, success: string) => Promise<void> }) {
  const [submissions, setSubmissions] = useState<InstructorDashboardSubmission[]>([]); const [loaded, setLoaded] = useState(false);
  const [submissionPage, setSubmissionPage] = useState(1); const [submissionMeta, setSubmissionMeta] = useState<PaginationMeta>({page:1,limit:10,totalItems:0,totalPages:0,hasPreviousPage:false,hasNextPage:false});
  const [error, setError] = useState('');
  useEffect(() => {
    getPendingSubmissions({page:submissionPage,limit:10})
      .then(result => { setSubmissions(result.data); setSubmissionMeta(result.pagination); })
      .catch(error => setError(errorMessage(error)))
      .finally(() => setLoaded(true));
  }, [submissionPage]);
  const [grades, setGrades] = useState<Record<number, { grade: string; feedback: string }>>({});
  if (!loaded) return <div className="studio-empty">جاري تحميل التسليمات...</div>;
  return <><div className="studio-panel-head"><div><h2>التسليمات المعلقة</h2><p>راجع ملفات الطلاب وأدخل الدرجة والملاحظات.</p></div></div>{error ? <div className="studio-empty"><p>{error}</p><button className="btn small" onClick={() => window.location.reload()}>إعادة المحاولة</button></div> : submissions.length === 0 ? <div className="studio-empty">لا توجد تسليمات معلقة.</div> : <><div className="submission-review-list">{submissions.map(submission => { const value = grades[submission.id] ?? { grade: '', feedback: '' }; return <article className="submission-review" key={submission.id}><b>{submission.assignment.title}</b><span>{submission.student.name} · {submission.assignment.course.title}</span><a href={submission.fileUrl} target="_blank" rel="noreferrer">فتح الملف</a><input type="number" min="0" max="100" placeholder="الدرجة" value={value.grade} onChange={e => setGrades({ ...grades, [submission.id]: { ...value, grade: e.target.value } })} /><textarea placeholder="ملاحظات اختيارية" value={value.feedback} onChange={e => setGrades({ ...grades, [submission.id]: { ...value, grade: value.grade, feedback: e.target.value } })} /><button className="btn small" disabled={busy || value.grade === ''} onClick={() => run(() => gradeSubmission(submission.id, { grade: Number(value.grade), feedback: value.feedback || undefined }), 'تم حفظ التقييم')}>حفظ الدرجة</button></article>; })}</div><Pagination {...submissionMeta} currentPage={submissionMeta.page} totalPages={submissionMeta.totalPages} onPageChange={setSubmissionPage}/></>}</>;
}
