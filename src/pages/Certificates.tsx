import { useCallback, useEffect, useState } from 'react';
import { Award, ExternalLink, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { errorMessage, generateCertificate, getCertificates, getEnrolledCourses } from '../api';
import { PageHead } from '../components';
import type { CertificateRecord, EnrolledCourse } from '../types';

export function Certificates() {
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState<number | null>(null);
  const [generationError, setGenerationError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [certificateList, enrolledCourses] = await Promise.all([getCertificates(), getEnrolledCourses()]);
      setCertificates(certificateList); setCourses(enrolledCourses.data);
    } catch (e) { setError(errorMessage(e)); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function issue(course: EnrolledCourse) {
    setGenerating(course.id); setGenerationError('');
    try {
      const certificate = await generateCertificate(course.id);
      setCertificates(current => [...current, { ...certificate, course: { id: course.id, title: course.title } }]);
      setCourses(current => current.map(item => item.id === course.id ? { ...item, certificate } : item));
    } catch (e) { setGenerationError(`${course.title}: ${errorMessage(e)}`); } finally { setGenerating(null); }
  }

  if (loading) return <div className="certificates-loading"><span className="loader" /></div>;
  return <><PageHead eyebrow="مساحتي التعليمية" title="شهاداتي" desc="احتفظ بسجل شهاداتك التعليمية وافتح رابط الشهادة عند توفره." />{error ? <div className="certificates-error"><p>{error}</p><button className="btn" onClick={load}><RefreshCw /> إعادة المحاولة</button></div> : <><section className="certificate-note"><Award /><p>هذه الصفحة تعرض سجلات الشهادات التي أنشأها النظام. قد يكون الرابط المتاح سجلًا أو مسارًا للملف حسب إعدادات الخادم؛ لا يتم إنشاء ملف PDF من الواجهة.</p></section><div className="certificate-grid">{certificates.map(certificate => <article className="certificate-card" key={certificate.id}><div className="certificate-icon"><Award /></div><div><h2>{certificate.course.title}</h2><p>صدرت في {new Date(certificate.issuedAt).toLocaleDateString('ar-EG')}</p>{certificate.url ? <a className="btn small" href={certificate.url} target="_blank" rel="noreferrer">فتح الرابط <ExternalLink /></a> : <span className="muted">لا يوجد رابط متاح</span>}</div></article>)}</div>{generationError && <p className="certificate-generation-error">{generationError}</p>}<section className="certificate-eligible"><h2>دورات مكتملة</h2>{courses.filter(course => course.nextLesson === null && course.progress >= 100 && !course.certificate && !certificates.some(certificate => certificate.course.id === course.id)).map(course => <div className="eligible-course" key={course.id}><span>{course.title}</span><button className="btn small" onClick={() => issue(course)} disabled={generating === course.id}>{generating === course.id ? 'جاري إنشاء السجل...' : 'إنشاء سجل الشهادة'}</button></div>)}{!courses.some(course => course.nextLesson === null && course.progress >= 100 && !course.certificate && !certificates.some(certificate => certificate.course.id === course.id)) && <p className="muted">لا توجد دورات مكتملة بلا شهادة حاليًا.</p>}</section></>}</>;
}
