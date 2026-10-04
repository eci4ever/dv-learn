export interface Course {
	category: string;
	archived: boolean;
	id: string;
	slug: string;
	title: string;
	description: string;
	imageUrl: string | null;
	instructor: string;
	level: string;
	published: boolean;
	sortOrder: number;
}
export interface Section {
	id: string;
	courseId: string;
	title: string;
	sortOrder: number;
}
export interface Lesson {
	lessonType: "video" | "reading" | "interactive" | "quiz";
	activity: "ipv4" | "private" | "subnet" | "quiz" | null;
	resourceLinks: string;
	id: string;
	sectionId: string;
	title: string;
	description: string;
	videoUrl: string | null;
	content: string;
	durationSeconds: number;
	preview: boolean;
	published: boolean;
	sortOrder: number;
}
export interface Product {
	id: string;
	title: string;
	description: string;
	priceCents: number;
	currency: "MYR";
	active: boolean;
	courseIds: string[];
}
export interface Progress {
	lessonId: string;
	positionSeconds: number;
	completed: boolean;
	updatedAt: number;
}
export interface Order {
	id: string;
	productId: string;
	productTitle: string;
	amountCents: number;
	currency: string;
	status: "creating" | "pending" | "paid" | "failed" | "refunded";
	billId: string | null;
	paymentUrl: string | null;
	createdAt: number;
	paidAt: number | null;
}
export interface Viewer {
	id: string;
	name: string;
	email: string;
	emailVerified: boolean;
	role: "admin" | "student";
}
export type CourseInput = Omit<Course, "id"> & { id?: string };
export type SectionInput = Omit<Section, "id"> & { id?: string };
export type LessonInput = Omit<Lesson, "id"> & { id?: string };
export type ProductInput = Omit<Product, "id" | "currency"> & {
	id?: string;
	currency?: "MYR";
};
export interface CatalogResponse {
	courses: Course[];
	products: Product[];
	viewer: Viewer | null;
}
export interface CourseResponse {
	course: Course;
	sections: (Section & {
		lessons: Omit<
			Lesson,
			"videoUrl" | "content" | "resourceLinks" | "activity"
		>[];
	})[];
	products: Product[];
	hasAccess: boolean;
	viewer: Viewer | null;
}
export interface DashboardResponse {
	viewer: Viewer;
	courses: (Course & {
		totalLessons: number;
		completedLessons: number;
		progressPercent: number;
		nextLessonId: string | null;
	})[];
	progress: Progress[];
}
export interface LessonResponse {
	course: Course;
	lesson: Lesson;
	sections: CourseResponse["sections"];
	progress: Progress | null;
	hasAccess: boolean;
}
