import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { ArrowRightIcon, BookOpenIcon, LockIcon, PlayIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { authClient } from "../lib/auth-client";
import { courseSynopsis } from "../lib/course-synopsis";
import { learningAuthHref, learningReturn } from "../lib/learning-return";
import { youtubeId } from "../lib/youtube";
import * as m from "../paraglide/messages.js";
import { getLocale } from "../paraglide/runtime.js";
import type { Course, Product } from "../server/contracts";
import * as api from "../server/functions";
import { Settings } from "./account-panels";
import { AppLink } from "./app-link";
import { CourseGlossary } from "./course-glossary";
import { FreeEnrollment } from "./free-enrollment";
import { LearningOutline } from "./learning-outline";
import { LessonBody } from "./lesson-body";
import { NotFoundPage } from "./not-found";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "./ui/accordion";
import { Alert, AlertDescription } from "./ui/alert";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { CardContent, Card as UiCard } from "./ui/card";
import { Empty } from "./ui/empty";
import { Input } from "./ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "./ui/input-group";
import { Label } from "./ui/label";
import { Progress } from "./ui/progress";
import { Spinner } from "./ui/spinner";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "./ui/table";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";
import { YoutubePlayer } from "./youtube-player";

const money = (n: number) =>
	new Intl.NumberFormat(getLocale() === "ms" ? "ms-MY" : "en-MY", {
		style: "currency",
		currency: "MYR",
		minimumFractionDigits: 2,
	}).format(n / 100);
const minutes = (n: number) => m.learner_minutes({ count: Math.ceil(n / 60) });
function platformError(error: unknown) {
	const message = error instanceof Error ? error.message : "";
	switch (message) {
		case "Course not found.":
			return m.course_missing();
		case "Lesson not found.":
			return m.lesson_missing();
		case "Please sign in to continue.":
			return m.sign_in_required();
		case "Please verify your email to continue.":
			return m.verification_required();
		case "Purchase this course to access this lesson.":
			return m.purchase_required();
		default:
			return m.connection_error();
	}
}
function Status({
	loading,
	error,
	onRetry,
	errorMessage,
}: {
	loading?: boolean;
	error?: unknown;
	onRetry?: () => void;
	errorMessage?: string;
}) {
	return loading ? (
		<Empty className="empty">
			<Spinner aria-label={m.loading()} />
			{m.loading_courses()}
		</Empty>
	) : error ? (
		<Empty className="empty error">
			<h3>{m.load_error()}</h3>
			<p>{errorMessage ?? platformError(error)}</p>
			{onRetry ? (
				<Button type="button" onClick={onRetry}>
					{m.try_again()}
				</Button>
			) : (
				<Button
					role="link"
					nativeButton={false}
					className="button"
					render={<AppLink href="/login" />}
				>
					{m.sign_in()}
				</Button>
			)}
		</Empty>
	) : null;
}
function Art({
	course,
	index = 0,
	compact = false,
}: {
	course: Course;
	index?: number;
	compact?: boolean;
}) {
	return (
		<div
			className={`course-art art-${index % 4}${compact ? " course-art-compact" : ""}`}
			aria-hidden={compact || undefined}
		>
			{course.imageUrl ? (
				<img src={course.imageUrl} alt={course.title} />
			) : (
				<>
					{!compact && <span className="art-label">{m.learning_series()}</span>}
					<div className="art-shape">
						<span />
						<span />
						<span />
					</div>
					{!compact && <strong>{course.title}</strong>}
					{!compact && <span className="art-bottom">{m.next_chapter()}</span>}
				</>
			)}
			{!compact && (
				<Badge variant="secondary" className="art-badge">
					{course.level}
				</Badge>
			)}
		</div>
	);
}
function Card({
	course,
	products,
	index = 0,
	progress,
}: {
	course: Course;
	products: Product[];
	index?: number;
	progress?: number;
}) {
	const product = products.find((p) => p.courseIds.includes(course.id));
	return (
		<AppLink className="course-card" href={`/courses/${course.slug}`}>
			<UiCard className="course-card-surface gap-0 py-0">
				<Art course={course} index={index} compact />
				<CardContent className="card-content">
					<div className="card-kicker">
						<span>{course.level}</span>
					</div>
					<h3>{course.title}</h3>
					<p lang={course.contentLanguage ?? "en"}>
						{courseSynopsis(course.description)}
					</p>
					<div className="instructor">
						<Avatar className="avatar">
							<AvatarFallback>{course.instructor.slice(0, 1)}</AvatarFallback>
						</Avatar>
						{course.instructor}
					</div>
					{progress !== undefined ? (
						<>
							<Progress
								value={progress}
								aria-label={m.progress_label({ title: course.title })}
							/>
							<small>{m.complete_percent({ count: progress })}</small>
						</>
					) : (
						<div className="card-bottom">
							<strong>
								{product ? money(product.priceCents) : m.view_course()}
							</strong>
							<span aria-hidden="true">↗</span>
						</div>
					)}
				</CardContent>
			</UiCard>
		</AppLink>
	);
}
export function Catalog() {
	const location = useLocation();
	const params = new URLSearchParams(location.searchStr);
	const q = useQuery({
		queryKey: ["catalog", getLocale()],
		queryFn: () => api.getCatalog(),
		staleTime: 30_000,
	});
	const [search, setSearch] = useState(params.get("q") ?? "");
	const [filter, setFilter] = useState(params.get("category") ?? "All courses");
	useEffect(() => {
		const url = new URL(window.location.href);
		search ? url.searchParams.set("q", search) : url.searchParams.delete("q");
		filter === "All courses"
			? url.searchParams.delete("category")
			: url.searchParams.set("category", filter);
		window.history.replaceState(window.history.state, "", url);
	}, [search, filter]);
	const courses = q.data?.courses ?? [];
	const levels = ["All courses", ...new Set(courses.map((c) => c.category))];
	const shown = courses.filter(
		(c) =>
			(filter === "All courses" || c.category === filter) &&
			`${c.title} ${c.description} ${c.instructor}`
				.toLowerCase()
				.includes(search.toLowerCase()),
	);
	return (
		<>
			<section className="hero landing-hero">
				<div className="hero-copy">
					<div className="eyebrow">
						<span className="green-dot" /> {m.own_pace_caps()}
					</div>
					<h1>
						{m.new_skills()}
						<br />
						{m.build()} <em>{m.confidence()}</em>
					</h1>
					<p>{m.hero_description()}</p>
					<Button
						role="link"
						nativeButton={false}
						className="button"
						render={<AppLink href="#catalog" />}
					>
						{m.browse_courses()} <span>↗</span>
					</Button>
				</div>
			</section>
			<section className="catalog section" id="catalog">
				<div className="section-heading">
					<div>
						<h2>{m.catalog_title()}</h2>
					</div>
					<InputGroup className="w-full sm:max-w-sm">
						<InputGroupAddon aria-hidden="true">⌕</InputGroupAddon>
						<InputGroupInput
							aria-label={m.search_courses()}
							placeholder={m.search_placeholder()}
							value={search}
							onChange={(e) => setSearch(e.target.value)}
						/>
						<InputGroupAddon align="inline-end" aria-hidden="true">
							↵
						</InputGroupAddon>
					</InputGroup>
				</div>
				<div className="catalog-toolbar">
					<ToggleGroup
						className="filters"
						value={[filter]}
						onValueChange={(values) => {
							if (values[0]) setFilter(values[0]);
						}}
						aria-label={m.course_categories()}
					>
						{levels.map((l) => (
							<ToggleGroupItem
								key={l}
								value={l}
								className={
									filter === l
										? "selected bg-primary! text-primary-foreground!"
										: ""
								}
							>
								{l === "All courses" ? m.all_courses() : l}
							</ToggleGroupItem>
						))}
					</ToggleGroup>
					<span role="status" aria-atomic="true">
						{m.available_courses({ count: shown.length })}
					</span>
				</div>
				<Status
					loading={q.isPending}
					error={q.error}
					onRetry={() => {
						void q.refetch();
					}}
				/>
				<div className="course-grid">
					{shown.map((c, i) => (
						<Card
							key={c.id}
							course={c}
							products={q.data?.products ?? []}
							index={i}
						/>
					))}
				</div>
				{!q.isPending && !q.error && !shown.length && (
					<Empty className="empty">
						<h3>{m.no_courses()}</h3>
						<p>
							{search ? m.no_matches({ query: search }) : m.published_courses()}
						</p>
						{(search || filter !== "All courses") && (
							<Button
								type="button"
								variant="outline"
								onClick={() => {
									setSearch("");
									setFilter("All courses");
								}}
							>
								{m.clear_search()}
							</Button>
						)}
					</Empty>
				)}
			</section>
		</>
	);
}
function CourseDetail({ slug }: { slug: string }) {
	const q = useQuery({
		queryKey: ["course", slug, getLocale()],
		queryFn: () => api.getCourse({ data: { slug } }),
		staleTime: 30_000,
	});
	const [error, setError] = useState("");
	const [busy, setBusy] = useState(false);
	const buy = async (id: string) => {
		setBusy(true);
		setError("");
		try {
			const r = await api.checkout({ data: { productId: id } });
			window.location.assign(r.url);
		} catch {
			setError(m.learner_unable_to_start_payment_please_try_again());
		} finally {
			setBusy(false);
		}
	};
	if (!q.data) return <Status loading={q.isPending} error={q.error} />;
	const d = q.data;
	const lessons = d.sections.flatMap((section) => section.lessons);
	const firstLesson = lessons.find((lesson) => d.hasAccess || lesson.preview);
	return (
		<section className="section course-detail">
			<Button
				variant="ghost"
				role="link"
				nativeButton={false}
				className="back-link"
				render={<AppLink className="back-link" href="/" />}
			>
				← {m.all_courses()}
			</Button>
			<div className="detail-grid">
				<div>
					<div className="eyebrow">{d.course.level} / DV LEARN</div>
					<h1 className="page-title" lang={d.course.contentLanguage ?? "en"}>
						{d.course.title}
					</h1>
					<p className="lead" lang={d.course.contentLanguage ?? "en"}>
						{d.course.description}
					</p>
					<section
						className="my-5 flex flex-wrap gap-3"
						aria-label={m.course_summary_label()}
					>
						<Badge variant="secondary">
							{m.course_summary({
								count: lessons.length,
								duration: minutes(
									lessons.reduce(
										(sum, lesson) => sum + lesson.durationSeconds,
										0,
									),
								),
							})}
						</Badge>
						{lessons.length > 0 &&
							lessons.every((lesson) => lesson.lessonType !== "video") && (
								<Badge variant="outline">{m.no_video()}</Badge>
							)}
						<Badge variant="outline">
							{m.course_language({
								language:
									d.course.contentLanguage === "ms"
										? "Bahasa Melayu"
										: m.english_language_name(),
							})}
						</Badge>
					</section>
					<p className="text-sm text-muted-foreground">
						{(d.course.availableContentLanguages?.length ?? 1) > 1
							? m.course_language_switch_hint()
							: m.ui_language_hint()}
					</p>
					{d.canEnrollFree && !d.hasAccess && firstLesson && (
						<Button
							className="my-5 min-h-11"
							role="link"
							nativeButton={false}
							render={<AppLink href={`/learn/${slug}/${firstLesson.id}`} />}
						>
							{m.start_course_free()}
						</Button>
					)}
					<div className="instructor">
						<Avatar className="avatar">
							<AvatarFallback>{d.course.instructor[0]}</AvatarFallback>
						</Avatar>
						{m.course_instructor({ name: d.course.instructor })}
					</div>
					<h2 className="curriculum-title">{m.course_content()}</h2>
					<Accordion
						multiple
						defaultValue={d.sections.map((section) => section.id)}
					>
						{d.sections.map((s, i) => (
							<AccordionItem className="curriculum" key={s.id} value={s.id}>
								<AccordionTrigger>
									<span>0{i + 1}</span>
									{s.title}
									<small>
										{m.section_lesson_count({ count: s.lessons.length })}
									</small>
								</AccordionTrigger>
								<AccordionContent>
									{s.lessons.map((l) => {
										const available = d.hasAccess || l.preview;
										const Icon = !available
											? LockIcon
											: l.lessonType === "video"
												? PlayIcon
												: BookOpenIcon;
										return (
											<AppLink
												className="course-lesson-link"
												href={
													d.hasAccess || l.preview
														? `/learn/${slug}/${l.id}`
														: "#purchase"
												}
												key={l.id}
											>
												<span
													className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted"
													aria-hidden="true"
												>
													<Icon className="size-4" />
												</span>
												<span className="min-w-0 flex-1">
													<span className="block font-medium">{l.title}</span>
													<span className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
														{l.preview && (
															<Badge variant="secondary">
																{d.canEnrollFree ? m.free() : m.preview()}
															</Badge>
														)}
														<span>{minutes(l.durationSeconds)}</span>
													</span>
												</span>
												<ArrowRightIcon
													aria-hidden="true"
													className="size-4 shrink-0 text-muted-foreground rtl:rotate-180"
												/>
											</AppLink>
										);
									})}
								</AccordionContent>
							</AccordionItem>
						))}
					</Accordion>
				</div>
				<UiCard className="self-start gap-0 p-6">
					<aside className="purchase" id="purchase">
						<Art course={d.course} />
						<div className="purchase-body">
							<h3>{m.start_here()}</h3>
							<p>{m.at_your_pace()}</p>
							{d.hasAccess && firstLesson ? (
								<Button
									role="link"
									nativeButton={false}
									className="button"
									render={<AppLink href={`/learn/${slug}/${firstLesson.id}`} />}
								>
									{d.hasAccess ? m.start_learning() : m.start_course_free()}
								</Button>
							) : (
								d.products.map((p) => (
									<UiCard className="product-option" key={p.id}>
										<h3>{p.title}</h3>
										<strong className="price">{money(p.priceCents)}</strong>
										<p>{p.description}</p>
										<Button
											type="button"
											className="button"
											disabled={busy}
											onClick={() => buy(p.id)}
										>
											{busy ? m.learner_please_wait() : m.learner_get_access()}
										</Button>
									</UiCard>
								))
							)}
							{d.canEnrollFree && !d.hasAccess && (
								<FreeEnrollment
									slug={slug}
									viewer={d.viewer}
									returnTo={`/courses/${slug}`}
								/>
							)}
							{error && (
								<Alert variant="destructive">
									<AlertDescription>{error}</AlertDescription>
								</Alert>
							)}
							<ul>
								<li>✓ {m.learn_anytime()}</li>
								<li>
									✓{" "}
									{d.hasAccess
										? m.mark_complete_hint()
										: m.progress_enrollment_hint()}
								</li>
								<li>✓ {m.learn_on_devices()}</li>
							</ul>
						</div>
					</aside>
				</UiCard>
			</div>
		</section>
	);
}
function Dashboard() {
	const q = useQuery({
		queryKey: ["dashboard"],
		queryFn: () => api.getDashboard(),
	});
	const resume = q.data?.courses.find(
		(course) => course.nextLessonId && course.lastStudiedAt !== null,
	);
	return (
		<section className="section">
			<div className="eyebrow uppercase">{m.your_learning()}</div>
			<h1 className="page-title">
				{q.data
					? m.welcome_back({ name: q.data.viewer.name })
					: m.my_learning()}
			</h1>
			<p className="lead">{m.pick_up_learning()}</p>
			<Status
				loading={q.isPending}
				error={q.error}
				errorMessage={m.dashboard_error()}
			/>
			{q.data && (
				<>
					{resume && (
						<UiCard
							className="mb-8 gap-4 p-6"
							aria-label={m.pick_up_learning()}
						>
							<p className="font-semibold text-muted-foreground uppercase">
								{m.continue_learning()}
							</p>
							<h2 className="text-2xl font-semibold">{resume.title}</h2>
							<p>{m.up_next({ title: resume.nextLessonTitle ?? "" })}</p>
							<Progress
								aria-label={m.resume_progress()}
								value={resume.progressPercent}
							/>
							<p className="text-muted-foreground">
								{m.lessons_complete({
									count: resume.completedLessons,
									total: resume.totalLessons,
								})}
							</p>
							<Button
								role="link"
								nativeButton={false}
								className="self-start min-h-11 text-base"
								render={
									<AppLink
										href={`/learn/${resume.slug}/${resume.nextLessonId}`}
									/>
								}
							>
								{m.resume_lesson()}
							</Button>
						</UiCard>
					)}
					<div className="stats">
						<UiCard className="gap-2 p-6">
							<strong>{q.data.courses.length}</strong>
							{m.my_courses()}
						</UiCard>
						<UiCard className="gap-2 p-6">
							<strong>
								{q.data.courses.reduce(
									(total, course) => total + course.completedLessons,
									0,
								)}
							</strong>
							{m.completed_lessons()}
						</UiCard>
						<UiCard className="gap-2 p-6">
							<strong>
								{
									q.data.courses.filter(
										(course) =>
											course.totalLessons > 0 &&
											course.completedLessons === course.totalLessons,
									).length
								}
							</strong>
							{m.completed_courses()}
						</UiCard>
					</div>
					<div className="course-grid">
						{q.data.courses.map((c, i) => (
							<div key={c.id}>
								<Card
									course={c}
									products={[]}
									index={i}
									progress={c.progressPercent}
								/>
								{c.nextLessonId && (
									<Button
										role="link"
										nativeButton={false}
										className="button continue"
										render={
											<AppLink href={`/learn/${c.slug}/${c.nextLessonId}`} />
										}
									>
										{m.continue_learning()} ↗
									</Button>
								)}
								{!c.nextLessonId && c.totalLessons > 0 && (
									<p className="mt-3 font-semibold">
										✓ {m.course_complete_short()}
									</p>
								)}
							</div>
						))}
					</div>
					{!q.data.courses.length && (
						<Empty className="empty">
							<h3>{m.start_first_course()}</h3>
							<p>{m.no_enrolled_courses()}</p>
							<Button
								role="link"
								nativeButton={false}
								className="button"
								render={<AppLink href="/" />}
							>
								{m.browse_courses()} ↗
							</Button>
						</Empty>
					)}
				</>
			)}
		</section>
	);
}
function Orders() {
	const [started] = useState(Date.now);
	const [message, setMessage] = useState("");
	const [checking, setChecking] = useState(false);
	const q = useQuery({
		queryKey: ["orders"],
		queryFn: () => api.getOrders(),
		refetchInterval: (query) =>
			Date.now() - started < 60_000 &&
			query.state.data?.some((order) => order.status === "pending")
				? 5000
				: false,
	});
	async function reconcile(orderId: string) {
		setChecking(true);
		try {
			const result = await api.reconcileOrder({ data: { orderId } });
			setMessage(
				result.paid
					? m.learner_payment_confirmed_your_course_is_ready()
					: m.learner_payment_is_still_pending(),
			);
			await q.refetch();
		} catch {
			setMessage(m.learner_unable_to_check_payment_please_try_again());
		} finally {
			setChecking(false);
		}
	}
	return (
		<section className="section">
			<div className="eyebrow">{m.learner_your_account()}</div>
			<h1 className="page-title">{m.learner_my_orders()}</h1>
			<p className="lead">
				{m.learner_view_your_purchases_and_payment_status()}
			</p>
			{message && (
				<Alert role="status">
					<AlertDescription>{message}</AlertDescription>
				</Alert>
			)}
			<Status loading={q.isPending} error={q.error} />
			{q.data?.length ? (
				<div className="table-wrap">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>{m.learner_course_or_bundle()}</TableHead>
								<TableHead>{m.learner_date()}</TableHead>
								<TableHead>{m.learner_amount()}</TableHead>
								<TableHead>{m.learner_status()}</TableHead>
								<TableHead />
							</TableRow>
						</TableHeader>
						<TableBody>
							{q.data.map((o) => (
								<TableRow key={o.id}>
									<TableCell>
										{o.productTitle}
										<small>{o.id}</small>
									</TableCell>
									<TableCell>
										{new Date(o.createdAt).toLocaleDateString(
											getLocale() === "ms" ? "ms-MY" : "en-MY",
										)}
									</TableCell>
									<TableCell>{money(o.amountCents)}</TableCell>
									<TableCell>
										<Badge variant="secondary" className={`badge ${o.status}`}>
											{
												{
													paid: m.learner_paid(),
													pending: m.learner_pending(),
													failed: m.learner_failed(),
													refunded: m.learner_refund_recorded(),
													creating: m.learner_processing(),
												}[o.status]
											}
										</Badge>
									</TableCell>
									<TableCell>
										{o.paymentUrl && o.status === "pending" && (
											<a href={o.paymentUrl}>{m.learner_pay()}</a>
										)}
										{o.billId && o.status === "pending" && (
											<Button
												type="button"
												disabled={checking}
												onClick={() => void reconcile(o.id)}
											>
												{m.learner_check_payment()}
											</Button>
										)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			) : (
				q.data && (
					<Empty className="empty">
						<p>{m.learner_no_orders_yet()}</p>
						<AppLink href="/">{m.learner_browse_courses()}</AppLink>
					</Empty>
				)
			)}
		</section>
	);
}
function Auth({ mode }: { mode: string }) {
	const location = useLocation();
	const returnTo = learningReturn(
		new URLSearchParams(location.searchStr).get("returnTo"),
	);
	const [ready, setReady] = useState(false);
	useEffect(() => setReady(true), []);
	const [message, setMessage] = useState("");
	const [busy, setBusy] = useState(false);
	const register = mode === "register",
		reset = mode === "reset-password",
		forgot = mode === "forgot-password",
		verify = mode === "verify-email";
	const title = register
		? m.learner_create_an_account()
		: reset
			? m.learner_set_a_new_password()
			: forgot
				? m.learner_reset_your_password()
				: verify
					? m.learner_check_your_inbox()
					: m.learner_welcome_back();
	async function submit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setBusy(true);
		setMessage("");
		const f = new FormData(e.currentTarget);
		const callbackURL = `${window.location.origin}${returnTo}`;
		try {
			const email = String(f.get("email") ?? "");
			const password = String(f.get("password") ?? "");
			const result = register
				? await authClient.signUp.email({
						name: String(f.get("name") ?? ""),
						email,
						password,
						callbackURL,
					})
				: reset
					? await authClient.resetPassword({
							newPassword: password,
							token:
								new URLSearchParams(window.location.search).get("token") ?? "",
						})
					: forgot
						? await authClient.requestPasswordReset({
								email,
								redirectTo: `${window.location.origin}/reset-password`,
							})
						: verify
							? await authClient.sendVerificationEmail({ email, callbackURL })
							: await authClient.signIn.email({ email, password, callbackURL });
			if (result.error) {
				const code = result.error.code;
				const recovery =
					code === "INVALID_EMAIL_OR_PASSWORD"
						? m.learner_the_email_or_password_is_incorrect_check_your_details_or_select_forgot_password_to_reset_it()
						: code === "EMAIL_NOT_VERIFIED"
							? m.learner_verify_your_email_first_check_your_inbox_or_select_resend_verification_email()
							: code === "INVALID_TOKEN" || code === "TOKEN_EXPIRED"
								? m.learner_this_reset_link_is_invalid_or_has_expired_select_forgot_password_to_request_a_new_one()
								: result.error.status === 429
									? m.learner_too_many_attempts_wait_a_moment_and_try_again()
									: code === "PASSWORD_TOO_SHORT"
										? m.learner_password_short()
										: code === "PASSWORD_TOO_LONG"
											? m.learner_password_long()
											: code === "INVALID_EMAIL"
												? m.learner_invalid_email()
												: code === "USER_ALREADY_EXISTS" ||
														code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL"
													? m.learner_account_exists()
													: m.learner_unable_to_complete_your_request_check_your_details_and_connection_then_try_again();
				setMessage(recovery);
				return;
			}
			if (register || forgot || verify)
				setMessage(m.learner_email_sent_check_your_inbox_for_the_next_step());
			else window.location.assign(reset ? "/login" : returnTo);
		} catch {
			setMessage(
				m.learner_unable_to_send_your_request_check_your_connection_and_try_again(),
			);
		} finally {
			setBusy(false);
		}
	}
	return (
		<section className="auth-layout">
			<div className="auth-story">
				<div className="eyebrow">{m.learner_dv_learn_start_learning()}</div>
				<h2>{m.learner_auth_story()}</h2>
				<span className="auth-star">✳</span>
				<p>{m.learner_learn_new_skills_and_put_them_into_practice()}</p>
			</div>
			<UiCard className="auth-form gap-0 p-6 sm:p-8 w-full">
				<Button
					variant="link"
					role="link"
					nativeButton={false}
					className="back-link"
					render={<AppLink className="back-link" href="/" />}
				>
					{m.learner_back_to_courses()}
				</Button>
				<h1>{title}</h1>
				<p>
					{register
						? m.learner_create_an_account_to_start_learning()
						: verify
							? m.learner_verify_your_email_to_access_your_courses()
							: m.learner_continue_learning()}
				</p>
				<form method="post" onSubmit={submit}>
					{register && (
						<Label className="flex-col items-stretch">
							{m.learner_full_name()}
							<Input
								name="name"
								autoComplete="name"
								required
								placeholder={m.learner_your_name()}
							/>
						</Label>
					)}
					{!reset && (
						<Label className="flex-col items-stretch">
							{m.learner_email_address()}
							<Input
								type="email"
								name="email"
								autoComplete="email"
								required
								placeholder={m.learner_name_example_com()}
							/>
						</Label>
					)}
					{!forgot && !verify && (
						<Label className="flex-col items-stretch">
							{m.learner_password()}
							<Input
								name="password"
								type="password"
								autoComplete={
									register || reset ? "new-password" : "current-password"
								}
								minLength={10}
								required
								placeholder={m.learner_at_least_10_characters()}
							/>
						</Label>
					)}
					{!register && !forgot && !verify && (
						<Button
							variant="link"
							role="link"
							nativeButton={false}
							className="forgot"
							render={<AppLink className="forgot" href="/forgot-password" />}
						>
							{m.learner_forgot_password()}
						</Button>
					)}
					<Button type="submit" className="button" disabled={busy || !ready}>
						{busy
							? m.learner_please_wait()
							: register
								? m.learner_create_account()
								: forgot
									? m.learner_send_reset_link()
									: verify
										? m.learner_send_verification_email()
										: reset
											? m.learner_save_password()
											: m.learner_sign_in()}
					</Button>
					{message && (
						<Alert role="status" className="form-message">
							<AlertDescription>{message}</AlertDescription>
						</Alert>
					)}
				</form>
				<p className="auth-switch">
					{register
						? m.learner_already_have_an_account()
						: m.learner_need_an_account()}{" "}
					<AppLink
						href={learningAuthHref(register ? "login" : "register", returnTo)}
					>
						{register ? m.sign_in() : m.learner_create_account_2()}
					</AppLink>
				</p>
				{!verify && (
					<Button
						variant="link"
						role="link"
						nativeButton={false}
						className="subtle"
						render={
							<AppLink
								className="subtle"
								href={learningAuthHref("verify-email", returnTo)}
							/>
						}
					>
						{m.learner_resend_verification_email()}
					</Button>
				)}
			</UiCard>
		</section>
	);
}
export function PlatformPage() {
	const path = useLocation().pathname.split("/").filter(Boolean);
	if (path[0] === "courses") return <CourseDetail slug={path[1] ?? ""} />;
	if (path[0] === "dashboard") return <Dashboard />;
	if (path[0] === "orders") return <Orders />;
	if (path[0] === "settings") return <Settings />;
	if (path[0] === "learn")
		return (
			<LessonPlayer
				key={`${path[1]}/${path[2]}`}
				slug={path[1] ?? ""}
				lessonId={path[2] ?? ""}
			/>
		);
	if (
		[
			"login",
			"register",
			"forgot-password",
			"reset-password",
			"verify-email",
		].includes(path[0] ?? "")
	)
		return <Auth key={path[0]} mode={path[0]} />;
	return <NotFoundPage />;
}
function LessonPlayer({ slug, lessonId }: { slug: string; lessonId: string }) {
	const navigate = useNavigate();
	const client = useQueryClient();
	const q = useQuery({
		queryKey: ["lesson", slug, lessonId],
		queryFn: () => api.getLesson({ data: { courseSlug: slug, lessonId } }),
	});
	const [saved, setSaved] = useState("");
	const [position, setPosition] = useState(0);
	const [completing, setCompleting] = useState(false);
	const [saveError, setSaveError] = useState(false);
	const lessonTitle = q.data?.lesson.title;
	useEffect(() => {
		if (lessonTitle) document.title = `${lessonTitle} — DV Learn`;
	}, [lessonTitle]);
	async function save(completed = false, currentPosition = position) {
		if (!q.data?.hasAccess) return;
		if (completed) setCompleting(true);
		try {
			const result = await api.saveProgress({
				data: { lessonId, positionSeconds: currentPosition, completed },
			});
			client.setQueryData<api.LessonResponse>(
				["lesson", slug, lessonId],
				(previous) =>
					previous
						? {
								...previous,
								progress: result,
								completedLessonIds: result.completed
									? [...new Set([...previous.completedLessonIds, lessonId])]
									: previous.completedLessonIds,
							}
						: previous,
			);
			setSaveError(false);
			setSaved(completed ? m.lesson_saved() : m.progress_saved());
			if (completed) {
				await client.invalidateQueries({ queryKey: ["dashboard"] });
				await client.invalidateQueries({ queryKey: ["lesson", slug] });
			}
		} catch (e) {
			setSaveError(true);
			setSaved(m.progress_error());
			throw e;
		} finally {
			if (completed) setCompleting(false);
		}
	}
	if (!q.data) return <Status loading={q.isPending} error={q.error} />;
	const d = q.data;
	const lessons = d.sections.flatMap((section) => section.lessons);
	const index = lessons.findIndex((lesson) => lesson.id === lessonId);
	const previous = lessons[index - 1];
	const next = lessons[index + 1];
	const courseComplete =
		d.hasAccess &&
		lessons.length > 0 &&
		lessons.every((lesson) => d.completedLessonIds.includes(lesson.id));
	function lessonLink(lesson: typeof next) {
		return !d.hasAccess && !lesson.preview
			? `/courses/${slug}`
			: `/learn/${slug}/${lesson.id}`;
	}
	async function completeAndContinue() {
		if (!next || !d.hasAccess || completing) return;
		try {
			await save(true);
			await navigate({
				to: "/$",
				params: { _splat: `learn/${slug}/${next.id}` },
			});
		} catch {
			// Save failure stays on this lesson with the existing recovery message.
		}
	}
	const id =
		d.lesson.lessonType === "video" && d.lesson.videoUrl
			? youtubeId(d.lesson.videoUrl)
			: null;
	return (
		<section className="section">
			<Button
				variant="link"
				role="link"
				nativeButton={false}
				className="back-link h-auto max-w-full justify-start whitespace-normal text-left [overflow-wrap:anywhere]"
				render={
					<AppLink
						className="back-link h-auto max-w-full justify-start whitespace-normal text-left [overflow-wrap:anywhere]"
						href={`/courses/${slug}`}
					/>
				}
			>
				← {d.course.title}
			</Button>
			<div className="lesson-layout">
				<div className="min-w-0">
					{id && (
						<div className="video-frame">
							<YoutubePlayer
								key={lessonId}
								videoId={id}
								start={d.progress?.positionSeconds ?? 0}
								onProgress={async (seconds, completed) => {
									setPosition(seconds);
									await save(completed, seconds);
								}}
								onError={(message) => {
									setSaveError(true);
									setSaved(message);
								}}
							/>
						</div>
					)}
					<header className="mb-6 grid gap-4">
						<div className="flex flex-wrap items-center gap-3">
							<Badge variant="secondary">
								{m.lesson_number({ index: index + 1, total: lessons.length })}
							</Badge>
							<Badge variant="outline">
								{d.lesson.lessonType === "interactive"
									? m.hands_on()
									: d.lesson.lessonType === "quiz"
										? m.practice_quiz()
										: d.lesson.lessonType === "video"
											? m.video_lesson()
											: m.reading_lesson()}
							</Badge>
							<span className="text-sm text-muted-foreground">
								{m.about_duration({
									duration: minutes(d.lesson.durationSeconds),
								})}
							</span>
						</div>
						<h1
							className="page-title !m-0"
							lang={
								d.lesson.contentLanguage ?? d.course.contentLanguage ?? "en"
							}
						>
							{d.lesson.title}
						</h1>
					</header>
					<p className="text-sm text-muted-foreground">
						{m.course_language({
							language:
								(d.lesson.contentLanguage ?? d.course.contentLanguage) === "ms"
									? "Bahasa Melayu"
									: m.english_language_name(),
						})}{" "}
						·{" "}
						{(d.course.availableContentLanguages?.length ?? 1) > 1
							? m.course_language_switch_hint()
							: m.ui_language_hint()}
					</p>
					{d.canEnrollFree && !d.hasAccess && (
						<FreeEnrollment
							slug={slug}
							viewer={d.viewer}
							returnTo={`/learn/${slug}/${lessonId}`}
						/>
					)}
					<CourseGlossary
						slug={slug}
						language={
							d.lesson.contentLanguage ?? d.course.contentLanguage ?? "en"
						}
					/>
					<div
						lang={d.lesson.contentLanguage ?? d.course.contentLanguage ?? "en"}
					>
						<LessonBody
							key={d.lesson.id}
							lesson={d.lesson}
							language={
								d.lesson.contentLanguage ?? d.course.contentLanguage ?? "en"
							}
							reviewLessons={lessons.map((lesson) => ({
								id: lesson.id,
								title: lesson.title,
								href:
									d.hasAccess || lesson.preview
										? `/learn/${slug}/${lesson.id}`
										: `/courses/${slug}`,
							}))}
						/>
					</div>
					<section
						className="lesson-finish mt-8 grid gap-5 rounded-xl bg-muted p-5"
						aria-label={m.lesson_completion()}
					>
						<p className="text-muted-foreground">
							{!d.hasAccess
								? m.preview_unsaved()
								: d.progress?.completed
									? m.lesson_complete_hint()
									: id
										? m.video_progress_hint()
										: m.mark_complete_hint()}
						</p>
						{next && (
							<p className="font-medium">{m.up_next({ title: next.title })}</p>
						)}
						<div className="flex flex-wrap gap-3">
							{next && d.hasAccess && !d.progress?.completed && (
								<Button
									disabled={completing}
									onClick={() => void completeAndContinue()}
									className="h-auto min-h-11 whitespace-normal"
								>
									{completing ? m.saving() : m.lesson_complete_continue()}
									<ArrowRightIcon
										aria-hidden="true"
										className="shrink-0 rtl:-scale-x-100"
									/>
								</Button>
							)}
							<Button
								variant={
									next && d.hasAccess && !d.progress?.completed
										? "outline"
										: "default"
								}
								disabled={
									!d.hasAccess || completing || Boolean(d.progress?.completed)
								}
								type="button"
								className="h-auto min-h-11 whitespace-normal"
								onClick={() => void save(true).catch(() => {})}
							>
								{completing
									? m.saving()
									: d.progress?.completed
										? m.complete()
										: m.mark_complete()}
							</Button>
						</div>
						{saved && (
							<Alert
								role="status"
								variant={saveError ? "destructive" : "default"}
							>
								<AlertDescription>{saved}</AlertDescription>
							</Alert>
						)}
						{courseComplete && (
							<Alert className="mt-8" role="status">
								<AlertDescription>{m.course_complete()}</AlertDescription>
							</Alert>
						)}
						<nav
							aria-label={m.lesson_navigation()}
							className="flex flex-wrap items-center justify-between gap-3"
						>
							{previous && (
								<Button
									variant="outline"
									disabled={completing}
									role="link"
									nativeButton={false}
									className="min-h-11 text-base"
									render={<AppLink href={lessonLink(previous)} />}
								>
									{m.previous_lesson()}
								</Button>
							)}
							{next ? (
								<Button
									disabled={completing}
									variant={
										d.progress?.completed || !d.hasAccess
											? "default"
											: "outline"
									}
									role="link"
									nativeButton={false}
									className="min-h-11 text-base"
									render={<AppLink href={lessonLink(next)} />}
								>
									{!d.hasAccess && !next.preview
										? m.get_access()
										: d.progress?.completed
											? m.continue_next()
											: m.next_lesson()}
								</Button>
							) : (
								<Button
									variant="outline"
									role="link"
									nativeButton={false}
									className="min-h-11 text-base"
									render={
										<AppLink
											href={d.hasAccess ? "/dashboard" : `/courses/${slug}`}
										/>
									}
								>
									{d.hasAccess ? m.back_learning() : m.back_course()}
								</Button>
							)}
						</nav>
					</section>
				</div>
				<LearningOutline data={d} />
			</div>
		</section>
	);
}
