import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronLeft, RotateCcw } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { errorMessage, getQuiz, submitQuiz } from '../api';
import type { QuizResult, QuizTake } from '../types';

type QuizLocationState = { courseId?: number; lessonId?: number };

function QuizState({ title, message, action }: { title: string; message: string; action?: React.ReactNode }) {
  return <div className="quiz-state"><AlertCircle /><h2>{title}</h2><p>{message}</p>{action}</div>;
}

function apiError(error: unknown) {
  const status = (error as { response?: { status?: number } })?.response?.status;
  if (status === 403) return 'لا تملك صلاحية الوصول إلى هذا الاختبار. يجب أن تكون مسجلًا في الدورة.';
  if (status === 404) return 'لم نتمكن من العثور على هذا الاختبار.';
  return errorMessage(error);
}

export function QuizPlayer() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = (location.state as QuizLocationState | null) ?? {};
  const [quiz, setQuiz] = useState<QuizTake | null>(null);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [selected, setSelected] = useState<Record<number, number[]>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [validation, setValidation] = useState('');

  async function loadQuiz() {
    const id = Number(quizId);
    if (!Number.isInteger(id) || id < 1) {
      setError('معرّف الاختبار غير صالح.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    setSelected({});
    try {
      const response = await getQuiz(id);
      // Keep the answer surface limited to fields intended for learners.
      setQuiz({ ...response, questions: response.questions.map(question => ({ id: question.id, text: question.text, multiple: question.multiple === true, options: question.options.map(option => ({ id: option.id, text: option.text })) })) });
    } catch (requestError) {
      setError(apiError(requestError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadQuiz(); }, [quizId]);

  const allSelected = useMemo(() => Object.values(selected).flat(), [selected]);
  const returnPath = routeState.courseId && routeState.lessonId
    ? `/learn/courses/${routeState.courseId}/lessons/${routeState.lessonId}`
    : '/learning';

  function selectOption(questionId: number, optionId: number, multiple: boolean) {
    setValidation('');
    setSelected(current => {
      const currentOptions = current[questionId] ?? [];
      const nextOptions = multiple
        ? currentOptions.includes(optionId) ? currentOptions.filter(id => id !== optionId) : [...currentOptions, optionId]
        : [optionId];
      return { ...current, [questionId]: nextOptions };
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!quiz || !allSelected.length) {
      setValidation('اختر إجابة واحدة على الأقل قبل إرسال الاختبار.');
      return;
    }
    setSubmitting(true);
    setValidation('');
    try {
      setResult(await submitQuiz(quiz.id, allSelected));
    } catch (requestError) {
      setValidation(apiError(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="quiz-loading"><span className="loader" /></div>;
  if (error) return <QuizState title={error.includes('صلاحية') ? 'الوصول إلى الاختبار غير متاح' : error.includes('العثور') ? 'الاختبار غير موجود' : 'تعذّر تحميل الاختبار'} message={error} action={<Link className="btn" to={returnPath}>{routeState.lessonId ? 'العودة إلى الدرس' : 'العودة إلى التعلّم'}</Link>} />;
  if (!quiz) return <QuizState title="الاختبار غير موجود" message="لم نتمكن من تحميل بيانات الاختبار." />;

  return <main className="quiz-page" dir="rtl">
    <div className="quiz-header"><div><span className="eyebrow">اختبار قصير</span><h1>{quiz.title}</h1><p>{quiz.questions.length} أسئلة · اختر الإجابة الأنسب لكل سؤال</p></div><Link className="text-link" to={returnPath}>العودة إلى الدرس <ChevronLeft /></Link></div>
    {result ? <section className={`quiz-result ${result.passed ? 'passed' : 'failed'}`}><div className="quiz-result-icon">{result.passed ? <CheckCircle2 /> : <AlertCircle />}</div><span className="eyebrow">{result.passed ? 'أحسنت، لقد اجتزت الاختبار' : 'يمكنك المحاولة مرة أخرى'}</span><strong>{Math.round(result.score)}%</strong><div className="quiz-result-stats"><span><b>{result.correctQuestions}</b>إجابات صحيحة</span><span><b>{result.totalQuestions}</b>إجمالي الأسئلة</span><span><b>{result.passed ? 'ناجح' : 'بحاجة إلى مراجعة'}</b>النتيجة</span></div><div className="quiz-result-actions"><Link className="btn" to={returnPath}>العودة إلى الدرس <ChevronLeft /></Link><button className="btn secondary" onClick={loadQuiz}><RotateCcw /> إعادة المحاولة</button></div></section> :
      <form className="quiz-form" onSubmit={handleSubmit}><div className="quiz-cards">{quiz.questions.map((question, index) => <fieldset className="quiz-question" key={question.id}><legend><span>{String(index + 1).padStart(2, '0')}</span><b>{question.text}</b></legend><div className="quiz-options">{question.options.map(option => { const checked = (selected[question.id] ?? []).includes(option.id); const inputType = question.multiple === true ? 'checkbox' : 'radio'; return <label className={checked ? 'quiz-option selected' : 'quiz-option'} key={option.id}><input type={inputType} name={`question-${question.id}`} value={option.id} checked={checked} onChange={() => selectOption(question.id, option.id, question.multiple === true)} /><span className="quiz-control" /><span>{option.text}</span></label>; })}</div></fieldset>)}</div>{validation && <p className="quiz-validation">{validation}</p>}<button className="btn quiz-submit" type="submit" disabled={submitting}>{submitting ? 'جاري إرسال الإجابات...' : 'إرسال الاختبار'}</button></form>}
  </main>;
}
