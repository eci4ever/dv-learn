import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "@tanstack/react-router";
import { ArrowRightIcon, BookOpenIcon, LockIcon, PlayIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { authClient } from "../lib/auth-client";
import { youtubeId } from "../lib/youtube";
import * as m from "../paraglide/messages.js";
import type { Course, Product } from "../server/contracts";
import * as api from "../server/functions";
import { Settings } from "./account-panels";
import { AppLink } from "./app-link";
import { LearningOutline } from "./learning-outline";
import { LessonBody } from "./lesson-body";
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
import { Separator } from "./ui/separator";
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
	new Intl.NumberFormat("en-MY", {
		style: "currency",
		currency: "MYR",
		minimumFractionDigits: 2,
	}).format(n / 100);
const minutes = (n: number) => `${Math.ceil(n / 60)} min`;
function Status({
	loading,
	error,
	onRetry,
}: {
	loading?: boolean;
	error?: unknown;
	onRetry?: () => void;
}) {
	return loading ? (
		<Empty className="empty">
			<Spinner aria-label={m.loading()} />
			{m.loading_courses()}
		</Empty>
	) : error ? (
		<Empty className="empty error">
			<h3>{m.load_error()}</h3>
			<p>
				{onRetry
					? m.connection_error()
					: error instanceof Error
						? error.message
						: m.please_retry()}
			</p>
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
function Art({ course, index = 0 }: { course: Course; index?: number }) {
	return (
		<div className={`course-art art-${index % 4}`}>
			{course.imageUrl ? (
				<img src={course.imageUrl} alt={course.title} />
			) : (
				<>
					<span className="art-label">{m.learning_series()}</span>
					<div className="art-shape">
						<span />
						<span />
						<span />
					</div>
					<strong>{course.title}</strong>
					<span className="art-bottom">{m.next_chapter()}</span>
				</>
			)}
			<Badge variant="secondary" className="art-badge">
				{course.level}
			</Badge>
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
				<Art course={course} index={index} />
				<CardContent className="card-content">
					<div className="card-kicker">
						<span>{course.level}</span>
						<span>{m.on_demand()}</span>
					</div>
					<h3>{course.title}</h3>
					<p>{course.description}</p>
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
							<span>{m.browse_courses()} ↗</span>
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
		queryKey: ["catalog"],
		queryFn: () => api.getCatalog(),
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
			<section className="hero">
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
					<div className="hero-note">
						<span className="note-icon">✦</span>
						<span>
							{m.immediate_skills()}
							<br />
							<strong>{m.practice_tagline()}</strong>
						</span>
					</div>
				</div>
				<div className="hero-visual">
					<div className="visual-grid" />
					<span className="visual-number">01 — ∞</span>
					<div className="orbit orbit-one" />
					<div className="orbit orbit-two" />
					<div className="visual-main">
						<div className="visual-icon">↗</div>
						<h2>
							{m.visual_skills()}
							<br />
							{m.visual_start()}
							<br />
							<em>{m.curiosity()}</em>
						</h2>
						<Separator className="visual-divider" />
						<span>{m.learn_practice()}</span>
					</div>
					<UiCard className="floating-card">
						<span>✦</span>
						<div>
							{m.learn_new()}
							<br />
							<strong>{m.new_possibilities()}</strong>
						</div>
					</UiCard>
					<div className="visual-tag">{m.next_step()}</div>
				</div>
			</section>
			<div className="benefits">
				<span>
					<span aria-hidden="true">◷</span>
					<strong>{m.own_pace()}</strong>
				</span>
				<span>
					<span aria-hidden="true">▷</span>
					<strong>{m.watch_anytime()}</strong>
				</span>
				<span>
					<span aria-hidden="true">✧</span>
					<strong>{m.practical_skills()}</strong>
				</span>
				<span>
					<span aria-hidden="true">↗</span>
					<strong>{m.skills_work()}</strong>
				</span>
			</div>
			<section className="catalog section" id="catalog">
				<div className="section-heading">
					<div>
						<div className="eyebrow">{m.find_next()}</div>
						<h2>{m.catalog_title()}</h2>
						<p>{m.catalog_description()}</p>
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
					<span>{m.available_courses({ count: shown.length })}</span>
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
			<section className="callout">
				<span className="eyebrow">{m.own_pace_caps()}</span>
				<h2>
					{m.invest_in()}
					<br />
					<em>{m.your_skills()}</em>
				</h2>
				<p>{m.choose_course()}</p>
				<Button
					role="link"
					nativeButton={false}
					className="button"
					render={<AppLink href="/register" />}
				>
					{m.join()}
				</Button>
				<span className="callout-star">✳</span>
			</section>
		</>
	);
}
function CourseDetail({ slug }: { slug: string }) {
	const q = useQuery({
		queryKey: ["course", slug],
		queryFn: () => api.getCourse({ data: { slug } }),
	});
	const [error, setError] = useState("");
	const [busy, setBusy] = useState(false);
	const buy = async (id: string) => {
		setBusy(true);
		setError("");
		try {
			const r = await api.checkout({ data: { productId: id } });
			window.location.assign(r.url);
		} catch (e) {
			setError(
				e instanceof Error
					? e.message
					: "Unable to start payment. Please try again.",
			);
		} finally {
			setBusy(false);
		}
	};
	if (!q.data) return <Status loading={q.isPending} error={q.error} />;
	const d = q.data;
	return (
		<section className="section course-detail">
			<Button
				variant="ghost"
				role="link"
				nativeButton={false}
				className="back-link"
				render={<AppLink className="back-link" href="/" />}
			>
				← All courses
			</Button>
			<div className="detail-grid">
				<div>
					<div className="eyebrow">{d.course.level} / DV LEARN</div>
					<h1 className="page-title">{d.course.title}</h1>
					<p className="lead">{d.course.description}</p>
					<div className="instructor">
						<Avatar className="avatar">
							<AvatarFallback>{d.course.instructor[0]}</AvatarFallback>
						</Avatar>
						With {d.course.instructor}
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
									<small>{s.lessons.length} lessons</small>
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
															<Badge variant="secondary">{m.preview()}</Badge>
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
				<UiCard className="gap-0 p-6">
					<aside className="purchase" id="purchase">
						<Art course={d.course} />
						<div className="purchase-body">
							<h3>Start learning here.</h3>
							<p>Watch lessons at your own pace.</p>
							{d.hasAccess ? (
								<Button
									role="link"
									nativeButton={false}
									className="button"
									render={
										<AppLink
											href={`/learn/${slug}/${d.sections.flatMap((s) => s.lessons)[0]?.id ?? ""}`}
										/>
									}
								>
									Continue learning ↗
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
											{busy ? "Please wait…" : "Get access ↗"}
										</Button>
									</UiCard>
								))
							)}
							{error && (
								<Alert variant="destructive">
									<AlertDescription>{error}</AlertDescription>
								</Alert>
							)}
							<ul>
								<li>✓ Learn anytime</li>
								<li>✓ Progress saved automatically</li>
								<li>✓ Learn on your computer or phone</li>
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
			<div className="eyebrow">YOUR LEARNING</div>
			<h1 className="page-title">
				{q.data ? `Welcome back, ${q.data.viewer.name}.` : m.my_learning()}
			</h1>
			<p className="lead">Pick up where you left off.</p>
			<Status loading={q.isPending} error={q.error} />
			{q.data && (
				<>
					{resume && (
						<UiCard
							className="mb-8 gap-4 p-6"
							aria-label="Pick up where you left off"
						>
							<p className="font-semibold text-muted-foreground">
								CONTINUE LEARNING
							</p>
							<h2 className="text-2xl font-semibold">{resume.title}</h2>
							<p>Up next: {resume.nextLessonTitle}</p>
							<Progress
								aria-label="Resume course progress"
								value={resume.progressPercent}
							/>
							<p className="text-muted-foreground">
								{resume.completedLessons} of {resume.totalLessons} lessons
								complete
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
								Resume lesson
							</Button>
						</UiCard>
					)}
					<div className="stats">
						<UiCard className="gap-2 p-6">
							<strong>{q.data.courses.length}</strong>My courses
						</UiCard>
						<UiCard className="gap-2 p-6">
							<strong>
								{q.data.courses.reduce(
									(total, course) => total + course.completedLessons,
									0,
								)}
							</strong>
							Completed lessons
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
							Completed courses
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
										Continue learning ↗
									</Button>
								)}
								{!c.nextLessonId && c.totalLessons > 0 && (
									<p className="mt-3 font-semibold">✓ Course complete</p>
								)}
							</div>
						))}
					</div>
					{!q.data.courses.length && (
						<Empty className="empty">
							<h3>Start your first course</h3>
							<p>
								You do not have any courses yet. Browse courses to start
								learning.
							</p>
							<Button
								role="link"
								nativeButton={false}
								className="button"
								render={<AppLink href="/" />}
							>
								Browse courses ↗
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
					? "Payment confirmed. Your course is ready."
					: "Payment is still pending.",
			);
			await q.refetch();
		} catch (error) {
			setMessage(
				error instanceof Error
					? error.message
					: "Unable to check payment. Please try again.",
			);
		} finally {
			setChecking(false);
		}
	}
	return (
		<section className="section">
			<div className="eyebrow">YOUR ACCOUNT</div>
			<h1 className="page-title">My orders</h1>
			<p className="lead">View your purchases and payment status.</p>
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
								<TableHead>Course or bundle</TableHead>
								<TableHead>Date</TableHead>
								<TableHead>Amount</TableHead>
								<TableHead>Status</TableHead>
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
										{new Date(o.createdAt).toLocaleDateString("en-MY")}
									</TableCell>
									<TableCell>{money(o.amountCents)}</TableCell>
									<TableCell>
										<Badge variant="secondary" className={`badge ${o.status}`}>
											{
												{
													paid: "Paid",
													pending: "Pending",
													failed: "Failed",
													refunded: "Refund recorded",
													creating: "Processing",
												}[o.status]
											}
										</Badge>
									</TableCell>
									<TableCell>
										{o.paymentUrl && o.status === "pending" && (
											<a href={o.paymentUrl}>Pay ↗</a>
										)}
										{o.billId && o.status === "pending" && (
											<Button
												type="button"
												disabled={checking}
												onClick={() => void reconcile(o.id)}
											>
												Check payment
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
						No orders yet. <AppLink href="/">Browse courses →</AppLink>
					</Empty>
				)
			)}
		</section>
	);
}
function Auth({ mode }: { mode: string }) {
	const [ready, setReady] = useState(false);
	useEffect(() => setReady(true), []);
	const [message, setMessage] = useState("");
	const [busy, setBusy] = useState(false);
	const register = mode === "register",
		reset = mode === "reset-password",
		forgot = mode === "forgot-password",
		verify = mode === "verify-email";
	const title = register
		? "Create an account."
		: reset
			? "Set a new password."
			: forgot
				? "Reset your password."
				: verify
					? "Check your inbox."
					: "Welcome back.";
	async function submit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setBusy(true);
		setMessage("");
		const f = new FormData(e.currentTarget);
		const callbackURL = `${window.location.origin}/dashboard`;
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
						? "The email or password is incorrect. Check your details or select ‘Forgot password?’ to reset it."
						: code === "EMAIL_NOT_VERIFIED"
							? "Verify your email first. Check your inbox or select ‘Resend verification email’."
							: code === "INVALID_TOKEN" || code === "TOKEN_EXPIRED"
								? "This reset link is invalid or has expired. Select ‘Forgot password?’ to request a new one."
								: result.error.status === 429
									? "Too many attempts. Wait a moment and try again."
									: "Unable to complete your request. Check your details and connection, then try again.";
				throw new Error(recovery);
			}
			if (register || forgot || verify)
				setMessage("Email sent. Check your inbox for the next step.");
			else window.location.assign(reset ? "/login" : "/dashboard");
		} catch (e) {
			setMessage(
				e instanceof Error && !(e instanceof TypeError)
					? e.message
					: "Unable to send your request. Check your connection and try again.",
			);
		} finally {
			setBusy(false);
		}
	}
	return (
		<section className="auth-layout">
			<div className="auth-story">
				<div className="eyebrow">DV LEARN / START LEARNING</div>
				<h2>
					Build skills
					<br />
					that help
					<br />
					<em>you grow.</em>
				</h2>
				<span className="auth-star">✳</span>
				<p>Learn new skills and put them into practice.</p>
			</div>
			<UiCard className="auth-form gap-0 p-6 sm:p-8 w-full">
				<Button
					variant="link"
					role="link"
					nativeButton={false}
					className="back-link"
					render={<AppLink className="back-link" href="/" />}
				>
					← Back to courses
				</Button>
				<h1>{title}</h1>
				<p>
					{register
						? "Create an account to start learning."
						: verify
							? "Verify your email to access your courses."
							: "Continue learning."}
				</p>
				<form method="post" onSubmit={submit}>
					{register && (
						<Label className="flex-col items-stretch">
							Name penuh
							<Input
								name="name"
								autoComplete="name"
								required
								placeholder="Your name"
							/>
						</Label>
					)}
					{!reset && (
						<Label className="flex-col items-stretch">
							Email address
							<Input
								type="email"
								name="email"
								autoComplete="email"
								required
								placeholder="name@example.com"
							/>
						</Label>
					)}
					{!forgot && !verify && (
						<Label className="flex-col items-stretch">
							Password
							<Input
								name="password"
								type="password"
								autoComplete={
									register || reset ? "new-password" : "current-password"
								}
								minLength={10}
								required
								placeholder="At least 10 characters"
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
							Forgot password?
						</Button>
					)}
					<Button type="submit" className="button" disabled={busy || !ready}>
						{busy
							? "Please wait…"
							: register
								? "Create account ↗"
								: forgot
									? "Send reset link ↗"
									: verify
										? "Send verification email ↗"
										: reset
											? "Save password ↗"
											: "Sign in ↗"}
					</Button>
					{message && (
						<Alert role="status" className="form-message">
							<AlertDescription>{message}</AlertDescription>
						</Alert>
					)}
				</form>
				<p className="auth-switch">
					{register ? "Already have an account?" : "Need an account?"}{" "}
					<AppLink href={register ? "/login" : "/register"}>
						{register ? m.sign_in() : "Create account"}
					</AppLink>
				</p>
				{!verify && (
					<Button
						variant="link"
						role="link"
						nativeButton={false}
						className="subtle"
						render={<AppLink className="subtle" href="/verify-email" />}
					>
						Resend verification email
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
	return (
		<Empty className="empty">
			<h1>Page not found.</h1>
			<Button
				role="link"
				nativeButton={false}
				className="button"
				render={<AppLink href="/" />}
			>
				Back to courses
			</Button>
		</Empty>
	);
}
function LessonPlayer({ slug, lessonId }: { slug: string; lessonId: string }) {
	const client = useQueryClient();
	const q = useQuery({
		queryKey: ["lesson", slug, lessonId],
		queryFn: () => api.getLesson({ data: { courseSlug: slug, lessonId } }),
	});
	const [saved, setSaved] = useState("");
	const [position, setPosition] = useState(0);
	const [completing, setCompleting] = useState(false);
	const [saveError, setSaveError] = useState(false);
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
			setSaved(e instanceof Error ? e.message : m.progress_error());
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
				className="back-link"
				render={<AppLink className="back-link" href={`/courses/${slug}`} />}
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
						<h1 className="page-title !m-0">{d.lesson.title}</h1>
					</header>
					<LessonBody key={d.lesson.id} lesson={d.lesson} />
					<section
						className="mt-8 grid gap-4 rounded-xl bg-muted p-5"
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
						<Button
							disabled={
								!d.hasAccess || completing || Boolean(d.progress?.completed)
							}
							type="button"
							className="button justify-self-start"
							onClick={() => void save(true).catch(() => {})}
						>
							{completing
								? m.saving()
								: d.progress?.completed
									? m.complete()
									: m.mark_complete()}
						</Button>
						{saved && (
							<Alert
								role="status"
								variant={saveError ? "destructive" : "default"}
							>
								<AlertDescription>{saved}</AlertDescription>
							</Alert>
						)}
					</section>
					{courseComplete && (
						<Alert className="mt-8" role="status">
							<AlertDescription>{m.course_complete()}</AlertDescription>
						</Alert>
					)}
					<nav
						aria-label={m.lesson_navigation()}
						className="mt-8 flex flex-wrap items-center justify-between gap-3"
					>
						{previous && (
							<Button
								variant="outline"
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
								variant={
									d.progress?.completed || !d.hasAccess ? "default" : "outline"
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
				</div>
				<LearningOutline data={d} />
			</div>
		</section>
	);
}
