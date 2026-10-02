export type Role='ADMIN'|'INSTRUCTOR'|'STUDENT';
export interface User{id:number;name:string;email:string;role:Role}
export interface Pagination{page:number;limit:number;totalItems:number;totalPages:number;hasPreviousPage:boolean;hasNextPage:boolean}
export interface Paginated<T>{data:T[];pagination:Pagination}
export interface Lesson{id:number;title:string;videoUrl?:string;content?:string;order:number}
export interface Section{id:number;title:string;order:number;lessons:Lesson[]}
export interface Course{id:number;title:string;description:string;price:number|string;averageRating:number;instructor?:{id:number;name:string};modules?:Section[];_count?:{modules:number;enrollments:number}}
export interface InstructorCourse extends Course{modules:Section[]}
export interface StudentDashboardNextLesson{id:number;title:string;moduleId:number;moduleTitle:string}
export interface StudentDashboardCourse{id:number;title:string;description:string;averageRating:number;instructor:{id:number;name:string};completedLessons:number;totalLessons:number;progress:number;nextLesson:StudentDashboardNextLesson|null}
export interface StudentDashboardResponse{enrolledCourses:number;completedLessons:number;totalLessons:number;averageProgress:number;certificates:number;quizAttempts:number;pendingAssignments:number;courses:StudentDashboardCourse[]}
export interface InstructorDashboardCourse{id:number;title:string;averageRating:number;studentsCount:number;modulesCount:number;lessonsCount:number;pendingSubmissions:number;createdAt:string}
export interface InstructorDashboardSubmission{id:number;student:{id:number;name:string};assignment:{id:number;title:string;course:{id:number;title:string}};fileUrl:string;grade:number|null;createdAt:string}
export interface InstructorDashboardResponse{coursesCount:number;studentsCount:number;pendingSubmissions:number;averageRating:number;lessonsCount:number;courses:InstructorDashboardCourse[];recentSubmissions:InstructorDashboardSubmission[]}
export interface StudentCertificate{id:number;url:string|null;issuedAt:string}
export interface CertificateRecord extends StudentCertificate{course:{id:number;title:string}}
export interface EnrolledCourse{ id:number;title:string;description:string;averageRating:number;instructor:{id:number;name:string};completedLessons:number;totalLessons:number;progress:number;nextLesson:{id:number;title:string;moduleId:number;moduleTitle:string}|null;certificate:StudentCertificate|null}
export interface LearningQuizQuestion{ id:number;text:string;options:{id:number;text:string}[] }
export interface LearningQuiz{ id:number;title:string;passingScore:number;questions:LearningQuizQuestion[] }
export interface QuizTakeQuestion{ id:number;text:string;options:{id:number;text:string}[];multiple?:boolean }
export interface QuizTake{ id:number;title:string;passingScore:number;questions:QuizTakeQuestion[] }
export interface QuizResult{ id:number;score:number;correctQuestions:number;totalQuestions:number;passed:boolean }
export interface LearningAssignment{ id:number;title:string;description:string;dueDate:string;submission:{id:number;fileUrl:string;grade:number|null;feedback:string|null;createdAt:string;updatedAt:string}|null }
export interface AssignmentDetails extends Omit<LearningAssignment,'submission'>{submission:LearningAssignment['submission']}
export type AssignmentSubmission=NonNullable<LearningAssignment['submission']>;
export interface LearningDiscussion{ id:number;text:string;createdAt:string;user:{id:number;name:string};replies?:LearningDiscussion[] }
export interface ReviewRecord{id:number;rating:number;comment?:string|null}
export interface LearningLesson extends Lesson{module:{id:number;title:string};course:{id:number;title:string;description:string;averageRating:number;instructor:{id:number;name:string}};completed:boolean;discussions:LearningDiscussion[];quizzes:LearningQuiz[];assignments:LearningAssignment[]}
export type LearningCourseLesson=Lesson&{moduleId:number;completed:boolean;quizzes:LearningQuiz[];assignments:LearningAssignment[]}
export interface LearningCourse extends Omit<Course,'modules'>{modules:(Omit<Section,'lessons'>&{lessons:LearningCourseLesson[]})[];completedLessons:number;totalLessons:number;progress:number;certificate:StudentCertificate|null}
export interface AdminDashboard{users:{total:number;students:number;instructors:number;admins:number;recentUsers:number};courses:{total:number;totalModules:number;totalLessons:number;averageRating:number};learning:{enrollments:number;completedLessons:number;quizAttempts:number;certificates:number};assignments:{total:number;submissions:number;pendingGrading:number;graded:number};recentUsers:User[];recentEnrollments:unknown[];recentSubmissions:unknown[];topCourses:Course[]}
export interface AdminUser extends User{isActive:boolean;createdAt:string;updatedAt:string;_count:{courses:number;enrollments:number;submissions:number;certificates:number}}
export interface AdminCourse extends Course{instructor:{id:number;name:string;email:string};_count:{modules:number;enrollments:number;reviews:number}}
