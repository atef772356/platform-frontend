import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, Check, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, FileText, Menu, MessageCircle, PlayCircle, Star, X } from 'lucide-react';
import { completeLesson, createDiscussion, errorMessage, getCourseLearning, getLessonLearning, submitReview } from '../api';
import type { LearningCourse, LearningDiscussion, LearningLesson } from '../types';

function PlayerState({ title, message, action }: { title: string; message: string; action?: React.ReactNode }) {
  return <div className="player-state"><AlertCircle /><h2>{title}</h2><p>{message}</p>{action}</div>;
}
function learningError(error: unknown) {
  const status = (error as { response?: { status?: number } })?.response?.status;
  if (status === 403) return 'لا تملك صلاحية الوصول إلى هذه الدورة. إذا لم تكن مسجلًا فيها، سجّل أولًا من صفحة الدورة العامة.';
  if (status === 404) return 'لم نتمكن من العثور على هذه الدورة أو الدرس.';
  return errorMessage(error);
}

export function CoursePlayer() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<LearningCourse | null>(null);
  const [lesson, setLesson] = useState<LearningLesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [error, setError] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState('');

  const loadCourse = useCallback(async () => {
    if (!courseId) return;
    setLoading(true); setError('');
    const id = Number(courseId);
    if (!Number.isInteger(id) || id < 1) { setError('معرّف الدورة غير صالح.'); setLoading(false); return; }
    try { setCourse(await getCourseLearning(id)); }
    catch (e) { setError(learningError(e)); }
    finally { setLoading(false); }
  }, [courseId]);

  useEffect(() => { loadCourse(); }, [loadCourse]);
  useEffect(() => {
    if (!lessonId) { setLesson(null); return; }
    const id = Number(lessonId);
    if (!course || !course.modules.flatMap(m => m.lessons).some(item => item.id === id)) {
      if (course) setError('هذا الدرس غير متاح ضمن هذه الدورة.');
      return;
    }
    setLessonLoading(true); setCompleteError('');
    getLessonLearning(id).then(setLesson).catch(e => setError(learningError(e))).finally(() => setLessonLoading(false));
  }, [lessonId, course]);

  const lessons = useMemo(() => course?.modules.flatMap(module => module.lessons.map(item => ({ ...item, moduleTitle: module.title }))) ?? [], [course]);
  const currentIndex = lesson ? lessons.findIndex(item => item.id === lesson.id) : -1;
  const previous = currentIndex > 0 ? lessons[currentIndex - 1] : null;
  const next = currentIndex >= 0 && currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;

  async function markComplete() {
    if (!lesson || lesson.completed) return;
    setCompleting(true); setCompleteError('');
    try {
      await completeLesson(lesson.id);
      setLesson(current => current ? { ...current, completed: true } : current);
      setCourse(current => current ? { ...current, completedLessons: current.completedLessons + 1, progress: current.totalLessons ? ((current.completedLessons + 1) / current.totalLessons) * 100 : 0, modules: current.modules.map(module => ({ ...module, lessons: module.lessons.map(item => item.id === lesson.id ? { ...item, completed: true } : item) })) } : current);
    } catch (e) { setCompleteError(errorMessage(e)); }
    finally { setCompleting(false); }
  }

  const publicCourse = courseId ? `/courses/${courseId}` : '/courses';
  if (loading) return <div className="player-loading"><span className="loader" /></div>;
  if (error && !course) return <PlayerState title={error.includes('صلاحية') ? 'الوصول إلى الدورة غير متاح' : error.includes('العثور') ? 'الدورة غير موجودة' : 'تعذّر تحميل الدورة'} message={error} action={<Link className="btn" to={error.includes('صلاحية') ? publicCourse : '/courses'}>{error.includes('صلاحية') ? 'العودة إلى صفحة الدورة' : 'العودة إلى الدورات'}</Link>} />;
  if (!course) return <PlayerState title="الدورة غير موجودة" message="لم نتمكن من العثور على هذه الدورة." />;

  return <div className="course-player" dir="rtl">
    <div className="player-mobile-head"><button className="player-menu" onClick={() => setMobileOpen(true)} aria-label="فتح محتوى الدورة"><Menu /></button><strong>{course.title}</strong></div>
    <aside className={mobileOpen ? 'player-sidebar mobile-open' : 'player-sidebar'}>
      <div className="player-sidebar-head"><div><span>محتوى الدورة</span><h2>{course.title}</h2></div><button className="player-close" onClick={() => setMobileOpen(false)}><X /></button></div>
      <div className="player-progress"><div><span>تقدمك في الدورة</span><b>{Math.round(course.progress)}%</b></div><div className="progress"><span style={{ width: `${Math.min(100, course.progress)}%` }} /></div><small>{course.completedLessons} من {course.totalLessons} درس مكتمل</small></div>
      <nav className="player-curriculum">{course.modules.map((module, index) => <section key={module.id}><h3><span>{String(index + 1).padStart(2, '0')}</span>{module.title}</h3>{module.lessons.map(item => <Link key={item.id} to={`/learn/courses/${course.id}/lessons/${item.id}`} onClick={() => setMobileOpen(false)} className={item.id === lesson?.id ? 'current' : ''}><span className="lesson-status">{item.completed ? <CheckCircle2 /> : <PlayCircle />}</span><span>{item.title}</span>{item.completed && <Check />}</Link>)}</section>)}</nav>
    </aside>
    {mobileOpen && <button className="player-overlay" onClick={() => setMobileOpen(false)} aria-label="إغلاق القائمة" />}
    <main className="player-main">
      {error && <div className="player-inline-error">{error}</div>}
      {!lessonId ? <div className="player-welcome"><span className="eyebrow">مساحة التعلّم</span><h1>{course.title}</h1><p>{course.description}</p><Link className="btn" to={lessons[0] ? `/learn/courses/${course.id}/lessons/${lessons[0].id}` : publicCourse}>ابدأ التعلّم <ChevronLeft /></Link><ReviewSection courseId={course.id} averageRating={course.averageRating} onRated={rating => setCourse(current => current ? { ...current, averageRating: rating } : current)} /></div> :
       lessonLoading ? <div className="player-loading"><span className="loader" /></div> :
       !lesson ? <PlayerState title="الدرس غير موجود" message="هذا الدرس غير متاح ضمن الدورة الحالية." action={<Link className="btn" to={`/learn/courses/${course.id}`}>العودة إلى الدورة</Link>} /> :
       <article className="lesson-area"><div className="lesson-breadcrumb"><Link to={`/learn/courses/${course.id}`}>{course.title}</Link><ChevronLeft /><span>{lesson.module.title}</span></div><h1>{lesson.title}</h1>{lesson.videoUrl && <video className="lesson-video" controls src={lesson.videoUrl} />}{lesson.content && <div className="lesson-text">{lesson.content}</div>} {!lesson.videoUrl && !lesson.content && <div className="lesson-empty">لا يوجد محتوى إضافي لهذا الدرس.</div>}
         <div className="lesson-actions"><button className="btn" onClick={markComplete} disabled={completing || lesson.completed}>{lesson.completed ? <><CheckCircle2 /> تم إكمال الدرس</> : <><Check /> {completing ? 'جاري الحفظ...' : 'تمييز الدرس كمكتمل'}</>}</button>{completeError && <span className="action-error">{completeError}</span>}</div>
         <div className="lesson-nav">{previous ? <Link to={`/learn/courses/${course.id}/lessons/${previous.id}`}><ChevronRight /><span><small>الدرس السابق</small>{previous.title}</span></Link> : <span />}{next ? <Link to={`/learn/courses/${course.id}/lessons/${next.id}`}><span><small>الدرس التالي</small>{next.title}</span><ChevronLeft /></Link> : <span />}</div>
         <LessonExtras lesson={lesson} courseId={course.id} />
       </article>}
    </main>
  </div>;
}

function LessonExtras({ lesson, courseId }: { lesson: LearningLesson; courseId: number }) {
  return <div className="lesson-extras"><DiscussionSection lessonId={lesson.id} initialDiscussions={lesson.discussions} />
    {lesson.quizzes.length > 0 && <section className="extra-card"><h2><ClipboardList /> الاختبارات</h2><div className="extra-grid">{lesson.quizzes.map(quiz => <Link className="resource-card" key={quiz.id} to={`/learn/quizzes/${quiz.id}`} state={{ courseId, lessonId: lesson.id }}><b>{quiz.title}</b><span>{quiz.questions.length} أسئلة · النجاح من {quiz.passingScore}%</span><small>ابدأ الاختبار <ChevronLeft /></small></Link>)}</div></section>}
    {lesson.assignments.length > 0 && <section className="extra-card"><h2><FileText /> التكليفات</h2><div className="extra-grid">{lesson.assignments.map(assignment => <Link className="resource-card" key={assignment.id} to={`/learn/assignments/${assignment.id}`} state={{ courseId, lessonId: lesson.id }}><b>{assignment.title}</b><span>{assignment.description}</span><small>موعد التسليم: {new Date(assignment.dueDate).toLocaleDateString('ar-EG')} · عرض التكليف <ChevronLeft /></small></Link>)}</div></section>}
  </div>;
}

function DiscussionSection({ lessonId, initialDiscussions }: { lessonId: number; initialDiscussions: LearningDiscussion[] }) {
  const [discussions, setDiscussions] = useState(initialDiscussions);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function publish(parentId?: number) {
    if (!text.trim()) { setError('اكتب نصًا قبل النشر.'); return; }
    setLoading(true); setError('');
    try {
      const created = await createDiscussion(lessonId, text.trim(), parentId);
      if (parentId) setDiscussions(current => current.map(item => item.id === parentId ? { ...item, replies: [...(item.replies ?? []), created] } : item));
      else setDiscussions(current => [created, ...current]);
      setText(''); setReplyTo(null);
    } catch (e) { setError(errorMessage(e)); } finally { setLoading(false); }
  }
  return <section className="extra-card"><h2><MessageCircle /> النقاشات</h2><div className="discussion-form"><textarea value={text} onChange={event => setText(event.target.value)} placeholder={replyTo ? 'اكتب ردك...' : 'شارك سؤالك أو ملاحظتك...'} rows={3} /><div><button className="btn small" onClick={() => publish(replyTo ?? undefined)} disabled={loading}>{loading ? 'جاري النشر...' : replyTo ? 'نشر الرد' : 'نشر النقاش'}</button>{replyTo && <button className="text-link" onClick={() => setReplyTo(null)}>إلغاء الرد</button>}</div></div>{error && <p className="discussion-error">{error}</p>}{discussions.length ? discussions.map(item => <DiscussionItem key={item.id} item={item} onReply={() => { setReplyTo(item.id); setText(''); }} />) : <p className="muted">لا توجد مناقشات بعد.</p>}</section>;
}

function DiscussionItem({ item, onReply }: { item: LearningDiscussion; onReply: () => void }) {
  return <div className="discussion"><div className="discussion-head"><b>{item.user.name}</b><time>{new Date(item.createdAt).toLocaleDateString('ar-EG')}</time></div><p>{item.text}</p><button className="discussion-reply" onClick={onReply}>الرد</button>{item.replies?.map(reply => <div className="discussion reply" key={reply.id}><div className="discussion-head"><b>{reply.user.name}</b><time>{new Date(reply.createdAt).toLocaleDateString('ar-EG')}</time></div><p>{reply.text}</p></div>)}</div>;
}

function ReviewSection({ courseId, averageRating, onRated }: { courseId: number; averageRating: number; onRated: (rating: number) => void }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  async function save() {
    if (!rating) { setMessage('اختر تقييمًا من نجمة إلى خمس نجوم.'); return; }
    setSaving(true); setMessage('');
    try { const review = await submitReview(courseId, rating, comment.trim() || undefined); onRated(review.rating); setMessage('تم حفظ تقييمك وتحديث متوسط الدورة.'); }
    catch (e) { setMessage(errorMessage(e)); } finally { setSaving(false); }
  }
  return <section className="review-card"><div><h2>قيّم تجربتك</h2><p>متوسط التقييم الحالي: <b>{averageRating ? averageRating.toFixed(1) : 'لا يوجد تقييم بعد'}</b></p></div><div className="rating-input" aria-label="اختيار التقييم">{[1, 2, 3, 4, 5].map(value => <button type="button" key={value} className={value <= rating ? 'active' : ''} onClick={() => setRating(value)} aria-label={`${value} نجوم`}><Star fill="currentColor" /></button>)}</div><textarea value={comment} onChange={event => setComment(event.target.value)} placeholder="تعليق اختياري..." rows={3} /><button className="btn small" onClick={save} disabled={saving}>{saving ? 'جاري الحفظ...' : 'حفظ التقييم'}</button>{message && <p className="review-message">{message}</p>}</section>;
}
