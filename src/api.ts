import axios from 'axios';
import type {AdminCourse,AdminDashboard,AdminUser,Paginated,Course} from './types';
import type {AssignmentDetails,AssignmentSubmission,CertificateRecord,EnrolledCourse,InstructorCourse,InstructorDashboardResponse,InstructorDashboardSubmission,LearningCourse,LearningDiscussion,LearningLesson,QuizResult,QuizTake,ReviewRecord,StudentDashboardResponse} from './types';
export const api=axios.create({baseURL:import.meta.env.VITE_API_URL||'/api'});
api.interceptors.response.use(response=>response,error=>{if(error?.response?.status===401)window.dispatchEvent(new Event('lms:unauthorized'));if(error?.response?.status===403)window.dispatchEvent(new Event('lms:forbidden'));return Promise.reject(error)});
api.interceptors.request.use(c=>{const token=localStorage.getItem('lms_token');if(token)c.headers.Authorization=`Bearer ${token}`;return c});
export const errorMessage=(e:unknown)=>{const typed=e as {response?:{status?:number;data?:{message?:unknown}}};if(typed.response?.status===403)return 'لا تملك الصلاحية للوصول إلى هذا المورد.';if(typed.response?.status===401)return 'انتهت جلسة الدخول. سجّل الدخول مرة أخرى.';const m=typed.response?.data?.message;return Array.isArray(m)?m.join('، '):typeof m==='string'?m:'حدث خطأ غير متوقع'};
export async function getStudentDashboard(){const response=await api.get<StudentDashboardResponse>('/dashboard/student');return response.data}
export async function getInstructorDashboard(){const response=await api.get<InstructorDashboardResponse>('/dashboard/instructor');return response.data}
export async function getEnrolledCourses(params:Record<string,string|number>={}){const response=await api.get<Paginated<EnrolledCourse>>('/me/courses',{params});return response.data}
export async function generateCertificate(courseId:number){const response=await api.post(`/certificates/courses/${courseId}/generate`);return response.data}
export async function getCourseLearning(courseId:number){const response=await api.get<LearningCourse>(`/courses/${courseId}/learn`);return response.data}
export async function getLessonLearning(lessonId:number){const response=await api.get<LearningLesson>(`/lessons/${lessonId}/learn`);return response.data}
export async function completeLesson(lessonId:number){const response=await api.post(`/progress/lessons/${lessonId}/complete`);return response.data}
export async function getQuiz(quizId:number){const response=await api.get<QuizTake>(`/quizzes/${quizId}/take`);return response.data}
export async function submitQuiz(quizId:number,optionIds:number[]){const response=await api.post<QuizResult>(`/quizzes/${quizId}/submit`,{optionIds});return response.data}
export async function getAssignment(assignmentId:number){const response=await api.get<AssignmentDetails>(`/assignments/${assignmentId}`);return response.data}
export async function submitAssignment(assignmentId:number,file:File){const formData=new FormData();formData.append('file',file);const response=await api.post<AssignmentSubmission>(`/assignments/${assignmentId}/submissions`,formData);return response.data}
export async function listDiscussions(lessonId:number){const response=await api.get<LearningDiscussion[]>(`/lessons/${lessonId}/discussions`);return response.data}
export async function createDiscussion(lessonId:number,text:string,parentId?:number){const response=await api.post<LearningDiscussion>(`/lessons/${lessonId}/discussions`,{text,...(parentId ? {parentId} : {})});return response.data}
export async function submitReview(courseId:number,rating:number,comment?:string){const response=await api.post<ReviewRecord>(`/courses/${courseId}/reviews`,{rating,...(comment ? {comment} : {})});return response.data}
export async function getCertificates(){const response=await api.get<CertificateRecord[]>('/me/certificates');return response.data}
export async function getInstructorCourses(params:Record<string,string|number>={}){const response=await api.get<Paginated<InstructorCourse>>('/instructor/courses',{params});return response.data}
export async function createCourse(data:{title:string;description:string;price:number}){const response=await api.post<InstructorCourse>('/courses',data);return response.data}
export async function updateCourse(id:number,data:{title:string;description:string;price:number}){const response=await api.patch<InstructorCourse>(`/courses/${id}`,data);return response.data}
export async function deleteCourse(id:number){await api.delete(`/courses/${id}`)}
export async function createModule(courseId:number,data:{title:string;order:number}){const response=await api.post(`/courses/${courseId}/modules`,data);return response.data}
export async function reorderModules(courseId:number,moduleIds:number[]){const response=await api.patch(`/courses/${courseId}/modules/reorder`,{moduleIds});return response.data}
export async function createLesson(moduleId:number,data:{title:string;order:number;videoUrl?:string;content?:string}){const response=await api.post(`/modules/${moduleId}/lessons`,data);return response.data}
export async function createQuiz(lessonId:number,data:unknown){const response=await api.post(`/lessons/${lessonId}/quizzes`,data);return response.data}
export async function createAssignment(lessonId:number,data:{title:string;description:string;dueDate:string}){const response=await api.post(`/lessons/${lessonId}/assignments`,data);return response.data}
export async function gradeSubmission(id:number,data:{grade:number;feedback?:string}){const response=await api.patch(`/submissions/${id}/grade`,data);return response.data}
export async function getPendingSubmissions(params:Record<string,string|number>={}){const response=await api.get<Paginated<InstructorDashboardSubmission>>('/instructor/submissions',{params});return response.data}
export async function getPublicCourses(params:Record<string,string|number>={}){const response=await api.get<Paginated<Course>>('/courses',{params});return response.data}
export async function getAdminDashboard(){const response=await api.get<AdminDashboard>('/admin/dashboard');return response.data}
export async function getAdminUsers(params:Record<string,string|number>={}){const response=await api.get<Paginated<AdminUser>>('/admin/users',{params});return response.data}
export async function getAdminCourses(params:Record<string,string|number>={}){const response=await api.get<Paginated<AdminCourse>>('/admin/courses',{params});return response.data}
export async function changeUserRole(id:number,role:string){return (await api.patch(`/admin/users/${id}/role`,{role})).data}
export async function changeUserStatus(id:number,isActive:boolean){return (await api.patch(`/admin/users/${id}/status`,{isActive})).data}
export async function deleteAdminUser(id:number){return api.delete(`/admin/users/${id}`)}
export async function getAdminRecords(kind:'enrollments'|'submissions'|'certificates'|'reviews',params:Record<string,string|number>={}){return (await api.get<Paginated<unknown>>(`/admin/${kind}`,{params})).data}
export async function deleteAdminReview(id:number){return api.delete(`/admin/reviews/${id}`)}
