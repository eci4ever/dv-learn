import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { authClient } from "../lib/auth-client";
import { youtubeId } from "../lib/youtube";
import type { Course, Product } from "../server/contracts";
import * as api from "../server/functions";
import { Settings } from "./account-panels";
import { AppLink } from "./app-link";
import { IPAddressLab } from "./ip-address-lab";
import { LearningOutline } from "./learning-outline";
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
			<Spinner aria-label="Loading" />
			Loading your courses…
		</Empty>
	) : error ? (
		<Empty className="empty error">
			<h3>Unable to load content</h3>
			<p>
				{onRetry
					? "Unable to load content. Check your connection and try again."
					: error instanceof Error
						? error.message
						: "Please try again."}
			</p>
			{onRetry ? (
				<Button type="button" onClick={onRetry}>
					Try again
				</Button>
			) : (
				<Button
					role="link"
					nativeButton={false}
					className="button"
					render={<AppLink href="/login" />}
				>
					Sign in
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
					<span className="art-label">DV / LEARNING SERIES</span>
					<div className="art-shape">
						<span />
						<span />
						<span />
					</div>
					<strong>{course.title}</strong>
					<span className="art-bottom">BUILD YOUR NEXT CHAPTER ↗</span>
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
						<span>On-demand video</span>
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
								aria-label={`Progress ${course.title}`}
							/>
							<small>{progress}% complete</small>
						</>
					) : (
						<div className="card-bottom">
							<strong>
								{product ? money(product.priceCents) : "View course"}
							</strong>
							<span>Browse courses ↗</span>
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
						<span className="green-dot" /> LEARN AT YOUR OWN PACE
					</div>
					<h1>
						Learn new skills.
						<br />
						Build <em>confidence.</em>
						<svg viewBox="0 0 340 20" className="underline" aria-hidden="true">
							<path d="M4 15 Q150 -2 335 10" />
						</svg>
					</h1>
					<p>
						Build practical skills with experienced instructors, at your own
						pace.
					</p>
					<Button
						role="link"
						nativeButton={false}
						className="button"
						render={<AppLink href="#catalog" />}
					>
						Browse courses <span>↗</span>
					</Button>
					<div className="hero-note">
						<span className="note-icon">✦</span>
						<span>
							Skills you can use right away.
							<br />
							<strong>Start learning. Put it into practice.</strong>
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
							New skills
							<br />
							start with
							<br />
							<em>curiosity.</em>
						</h2>
						<Separator className="visual-divider" />
						<span>LEARN. PRACTISE. GROW.</span>
					</div>
					<UiCard className="floating-card">
						<span>✦</span>
						<div>
							Learn something new.
							<br />
							<strong>Find new possibilities.</strong>
						</div>
					</UiCard>
					<div className="visual-tag">TAKE YOUR NEXT STEP</div>
				</div>
			</section>
			<div className="benefits">
				<span>
					◷ <strong>Learn at your own pace</strong>
				</span>
				<span>
					▷ <strong>Watch videos anytime</strong>
				</span>
				<span>
					✧ <strong>Build practical skills</strong>
				</span>
				<span>
					↗ <strong>Put your skills to work</strong>
				</span>
			</div>
			<section className="catalog section" id="catalog">
				<div className="section-heading">
					<div>
						<div className="eyebrow">FIND YOUR NEXT COURSE</div>
						<h2>Find a course. Build your skills.</h2>
						<p>Explore courses to help you learn and grow.</p>
					</div>
					<InputGroup className="w-full sm:max-w-sm">
						<InputGroupAddon aria-hidden="true">⌕</InputGroupAddon>
						<InputGroupInput
							aria-label="Search courses"
							placeholder="Search courses or skills…"
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
						aria-label="Course categories"
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
								{l}
							</ToggleGroupItem>
						))}
					</ToggleGroup>
					<span>{shown.length} courses available</span>
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
						<h3>No courses found</h3>
						<p>
							{search
								? `No courses match “${search}”. Try another search.`
								: "Published courses will appear here."}
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
								Clear search
							</Button>
						)}
					</Empty>
				)}
			</section>
			<section className="callout">
				<span className="eyebrow">LEARN AT YOUR OWN PACE</span>
				<h2>
					Invest in
					<br />
					<em>your skills.</em>
				</h2>
				<p>Choose a course and start learning.</p>
				<Button
					role="link"
					nativeButton={false}
					className="button"
					render={<AppLink href="/register" />}
				>
					Join DV Learn ↗
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
		<section className="section">
			<Button
				variant="link"
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
					<h2 className="curriculum-title">Course content</h2>
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
									{s.lessons.map((l) => (
										<AppLink
											href={
												d.hasAccess || l.preview
													? `/learn/${slug}/${l.id}`
													: "#purchase"
											}
											key={l.id}
										>
											<span>{d.hasAccess || l.preview ? "▷" : "▢"}</span>
											{l.title}
											<small>
												{l.preview ? "Preview · " : ""}
												{minutes(l.durationSeconds)}
											</small>
										</AppLink>
									))}
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
				{q.data ? `Welcome back, ${q.data.viewer.name}.` : "My learning"}
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
						{register ? "Sign in" : "Create account"}
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
			setSaved(completed ? "Lesson marked as complete." : "Progress saved.");
			if (completed) {
				await client.invalidateQueries({ queryKey: ["dashboard"] });
				await client.invalidateQueries({ queryKey: ["lesson", slug] });
			}
		} catch (e) {
			setSaveError(true);
			setSaved(
				e instanceof Error
					? e.message
					: "Unable to save progress. Please try again.",
			);
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
	const labMode =
		d.lesson.lessonType === "interactive" || d.lesson.lessonType === "quiz"
			? d.lesson.activity
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
					<h1 className="page-title">{d.lesson.title}</h1>
					<p className="lead">{d.lesson.description}</p>
					<article className="lesson-content">{d.lesson.content}</article>
					{labMode && <IPAddressLab key={d.lesson.id} mode={labMode} />}
					{d.lesson.resourceLinks && (
						<aside>
							<h3>Learning resources</h3>
							<ul>
								{d.lesson.resourceLinks
									.split("\n")
									.filter((link) => link.trim())
									.map((link) => (
										<li key={link}>
											<a
												href={link.trim()}
												target="_blank"
												rel="noopener noreferrer"
											>
												{link.trim()}
											</a>
										</li>
									))}
							</ul>
						</aside>
					)}
					<section
						className="mt-8 grid gap-4 rounded-xl bg-muted p-5"
						aria-label="Lesson completion"
					>
						<p className="text-muted-foreground">
							{!d.hasAccess
								? "You can try this lesson without signing in. Practice results are not saved."
								: d.progress?.completed
									? "Lesson complete. Continue below or revisit the course content."
									: id
										? "Your video progress is saved automatically. You can also mark this lesson as complete."
										: "Finished this lesson? Mark it as complete to save your progress."}
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
								? "Saving…"
								: d.progress?.completed
									? "✓ Complete"
									: "Mark as complete"}
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
							<AlertDescription>
								Course complete. Well done! You can revisit any lesson to review
								what you learned.
							</AlertDescription>
						</Alert>
					)}
					<nav
						aria-label="Lesson navigation"
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
								← Previous lesson
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
									? "Get course access"
									: d.progress?.completed
										? "Continue to next lesson →"
										: "Next lesson →"}
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
								{d.hasAccess ? "Back to my learning" : "Back to course"}
							</Button>
						)}
					</nav>
				</div>
				<LearningOutline data={d} />
			</div>
		</section>
	);
}
