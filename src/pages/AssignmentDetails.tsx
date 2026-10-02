import { useEffect, useRef, useState } from 'react';
import { AlertCircle, CalendarDays, CheckCircle2, Clock3, ExternalLink, FileText, Link as LinkIcon, Upload, X } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { errorMessage, getAssignment, submitAssignment } from '../api';
import type { AssignmentDetails as AssignmentDetailsType, AssignmentSubmission } from '../types';

type AssignmentLocationState = { courseId?: number; lessonId?: number };
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'application/vnd.oasis.opendocument.text']);

function AssignmentState({ title, message, action }: { title: string; message: string; action?: React.ReactNode }) {
  return <div className="assignment-state"><AlertCircle /><h2>{title}</h2><p>{message}</p>{action}</div>;
}

function requestError(error: unknown) {
  const status = (error as { response?: { status?: number } })?.response?.status;
  if (status === 403) return 'لا تملك صلاحية الوصول إلى هذا التكليف. يجب أن تكون مسجلًا في الدورة.';
  if (status === 404) return 'لم نتمكن من العثور على هذا التكليف.';
  return errorMessage(error);
}

function formatSize(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(2)} ميجابايت`;
}

export function AssignmentDetailsPage() {
  const { assignmentId } = useParams();
  const location = useLocation();
  const state = (location.state as AssignmentLocationState | null) ?? {};
  const [assignment, setAssignment] = useState<AssignmentDetailsType | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [fileError, setFileError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const id = Number(assignmentId);
  const lessonPath = state.courseId && state.lessonId ? `/learn/courses/${state.courseId}/lessons/${state.lessonId}` : '/learning';

  useEffect(() => {
    if (!Number.isInteger(id) || id < 1) { setError('معرّف التكليف غير صالح.'); setLoading(false); return; }
    getAssignment(id).then(setAssignment).catch(requestError).then(result => { if (typeof result === 'string') setError(result); }).finally(() => setLoading(false));
  }, [id]);

  const dueDate = assignment ? new Date(assignment.dueDate) : null;
  const isPastDue = dueDate ? dueDate.getTime() < Date.now() : false;

  function chooseFile(nextFile: File | undefined) {
    setNotice(''); setFileError('');
    if (!nextFile) return;
    if (!ACCEPTED_TYPES.has(nextFile.type)) {
      setFileError('نوع الملف غير مدعوم. ارفع PDF أو Word أو OpenDocument أو ملفًا نصيًا.');
      setFile(null);
      return;
    }
    if (nextFile.size > MAX_FILE_SIZE) {
      setFileError('حجم الملف يتجاوز الحد المسموح وهو 10 ميجابايت.');
      setFile(null);
      return;
    }
    setFile(nextFile);
  }

  async function upload() {
    if (!file) { setFileError('اختر ملفًا قبل الإرسال.'); return; }
    if (isPastDue) { setFileError('انتهى موعد التسليم ولا يمكن إرسال ملفات جديدة.'); return; }
    setUploading(true); setNotice(''); setFileError('');
    try {
      const submission = await submitAssignment(id, file);
      setAssignment(current => current ? { ...current, submission } : current);
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
      setNotice('تم رفع التكليف بنجاح. يمكنك استبدال الملف قبل انتهاء الموعد.');
    } catch (uploadError) {
      setFileError(requestError(uploadError));
    } finally { setUploading(false); }
  }

  if (loading) return <div className="assignment-loading"><span className="loader" /></div>;
  if (error) return <AssignmentState title={error.includes('صلاحية') ? 'الوصول إلى التكليف غير متاح' : error.includes('العثور') ? 'التكليف غير موجود' : 'تعذّر تحميل التكليف'} message={error} action={<Link className="btn" to={lessonPath}>العودة إلى الدرس</Link>} />;
  if (!assignment) return <AssignmentState title="التكليف غير موجود" message="لم نتمكن من تحميل بيانات التكليف." />;

  return <main className="assignment-page" dir="rtl">
    <div className="assignment-top"><Link className="text-link" to={lessonPath}>العودة إلى الدرس</Link><span className={isPastDue ? 'due-badge passed' : 'due-badge'}>{isPastDue ? <><AlertCircle /> انتهى موعد التسليم</> : <><Clock3 /> مفتوح للتسليم</>}</span></div>
    <section className="assignment-hero"><span className="eyebrow"><FileText /> تكليف</span><h1>{assignment.title}</h1><div className="assignment-meta"><span><CalendarDays /> موعد التسليم: {dueDate?.toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}</span><span>{isPastDue ? 'انتهى الموعد' : 'يمكن استبدال الملف قبل الموعد'}</span></div></section>
    <div className="assignment-layout"><article className="assignment-description"><h2>تفاصيل التكليف</h2><p>{assignment.description}</p></article><aside className="submission-panel"><h2>تسليمك</h2>{assignment.submission ? <div className="current-submission"><div className="submission-file"><FileText /><div><b>الملف المرفوع</b><a href={assignment.submission.fileUrl} target="_blank" rel="noreferrer">{assignment.submission.fileUrl.split(/[\\/]/).pop()} <ExternalLink /></a></div></div>{assignment.submission.grade !== null && <div className="submission-grade"><CheckCircle2 /><span>الدرجة<b>{assignment.submission.grade}</b></span></div>}{assignment.submission.feedback && <div className="submission-feedback"><b>ملاحظات المدرّس</b><p>{assignment.submission.feedback}</p></div>}</div> : <p className="submission-empty">لم ترفع ملفًا لهذا التكليف بعد.</p>}{!isPastDue && <><div className="file-picker" onClick={() => inputRef.current?.click()}><Upload /><b>{file ? file.name : assignment.submission ? 'اختر ملفًا بديلًا' : 'اختر ملف التكليف'}</b><span>{file ? formatSize(file.size) : 'PDF أو Word أو OpenDocument أو TXT · حتى 10 ميجابايت'}</span><input ref={inputRef} type="file" accept=".pdf,.doc,.docx,.odt,.txt" onChange={event => chooseFile(event.target.files?.[0])} /></div>{fileError && <p className="assignment-error">{fileError}</p>}{notice && <p className="assignment-success">{notice}</p>}<button className="btn assignment-submit" onClick={upload} disabled={uploading}>{uploading ? 'جاري رفع الملف...' : assignment.submission ? 'استبدال الملف' : 'رفع التكليف'}<Upload /></button></>}</aside></div>
  </main>;
}
