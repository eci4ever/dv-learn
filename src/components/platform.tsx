import { useQuery } from "@tanstack/react-query";
import { useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { authClient } from "../lib/auth-client";
import { youtubeId } from "../lib/youtube";
import type { Course, Product } from "../server/contracts";
import * as api from "../server/functions";
import { AdminOperations, Settings } from "./account-panels";
import { AdminUsers } from "./admin-users";
import { AppLink } from "./app-link";
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
import { Checkbox } from "./ui/checkbox";
import { Empty } from "./ui/empty";
import { Input } from "./ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "./ui/input-group";
import { Label } from "./ui/label";
import { NativeSelect, NativeSelectOption } from "./ui/native-select";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Textarea } from "./ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";
import { YoutubePlayer } from "./youtube-player";

const money = (n: number) =>
	new Intl.NumberFormat("ms-MY", {
		style: "currency",
		currency: "MYR",
		minimumFractionDigits: 2,
	}).format(n / 100);
const minutes = (n: number) => `${Math.ceil(n / 60)} min`;
function Status({ loading, error }: { loading?: boolean; error?: unknown }) {
	return loading ? (
		<Empty className="empty">
			<Spinner aria-label="Memuatkan" />
			Memuatkan ruang pembelajaran anda…
		</Empty>
	) : error ? (
		<Empty className="empty error">
			<h3>Belum dapat memuatkan kandungan</h3>
			<p>{error instanceof Error ? error.message : "Sila cuba semula."}</p>
			<Button
				role="link"
				nativeButton={false}
				className="button"
				render={<AppLink href="/login" />}
			>
				Log masuk
			</Button>
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
						<span>Video atas permintaan</span>
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
								aria-label={`Kemajuan ${course.title}`}
							/>
							<small>{progress}% selesai</small>
						</>
					) : (
						<div className="card-bottom">
							<strong>
								{product ? money(product.priceCents) : "Lihat kursus"}
							</strong>
							<span>Terokai kursus ↗</span>
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
	const [filter, setFilter] = useState(
		params.get("category") ?? "Semua kursus",
	);
	useEffect(() => {
		const url = new URL(window.location.href);
		search ? url.searchParams.set("q", search) : url.searchParams.delete("q");
		filter === "Semua kursus"
			? url.searchParams.delete("category")
			: url.searchParams.set("category", filter);
		window.history.replaceState(window.history.state, "", url);
	}, [search, filter]);
	const courses = q.data?.courses ?? [];
	const levels = ["Semua kursus", ...new Set(courses.map((c) => c.category))];
	const shown = courses.filter(
		(c) =>
			(filter === "Semua kursus" || c.category === filter) &&
			`${c.title} ${c.description} ${c.instructor}`
				.toLowerCase()
				.includes(search.toLowerCase()),
	);
	return (
		<>
			<section className="hero">
				<div className="hero-copy">
					<div className="eyebrow">
						<span className="green-dot" /> RUANG UNTUK BERKEMBANG
					</div>
					<h1>
						Langkah kecil.
						<br />
						Kemahiran <em>besar.</em>
						<svg viewBox="0 0 340 20" className="underline" aria-hidden="true">
							<path d="M4 15 Q150 -2 335 10" />
						</svg>
					</h1>
					<p>
						Belajar sesuatu yang bermakna. Bina kemahiran praktikal bersama
						pengajar berpengalaman — mengikut rentak anda sendiri.
					</p>
					<Button
						role="link"
						nativeButton={false}
						className="button"
						render={<AppLink href="#catalog" />}
					>
						Terokai kursus <span>↗</span>
					</Button>
					<div className="hero-note">
						<span className="note-icon">✦</span>
						<span>
							Ilmu yang boleh terus anda gunakan.
							<br />
							<strong>Dari langkah pertama, ke peluang seterusnya.</strong>
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
							Masa depan
							<br />
							bermula dengan
							<br />
							<em>rasa ingin tahu.</em>
						</h2>
						<Separator className="visual-divider" />
						<span>BELAJAR. CIPTA. BERKEMBANG.</span>
					</div>
					<UiCard className="floating-card">
						<span>✦</span>
						<div>
							Satu kemahiran baharu.
							<br />
							<strong>Seribu kemungkinan.</strong>
						</div>
					</UiCard>
					<div className="visual-tag">DIREKA UNTUK LANGKAH SETERUSNYA</div>
				</div>
			</section>
			<div className="benefits">
				<span>
					◷ <strong>Belajar ikut rentak anda</strong>
				</span>
				<span>
					▷ <strong>Akses video bila-bila masa</strong>
				</span>
				<span>
					✧ <strong>Ilmu praktikal, dalam Bahasa Melayu</strong>
				</span>
				<span>
					↗ <strong>Terus aplikasikan kemahiran</strong>
				</span>
			</div>
			<section className="catalog section" id="catalog">
				<div className="section-heading">
					<div>
						<div className="eyebrow">PILIH LANGKAH SETERUSNYA</div>
						<h2>Temui minat. Bina kemahiran.</h2>
						<p>Kursus yang membantu anda bergerak lebih jauh.</p>
					</div>
					<InputGroup className="w-full sm:max-w-sm">
						<InputGroupAddon aria-hidden="true">⌕</InputGroupAddon>
						<InputGroupInput
							aria-label="Cari kursus"
							placeholder="Cari kursus atau kemahiran…"
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
						aria-label="Kategori kursus"
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
					<span>{shown.length} kursus untuk diterokai</span>
				</div>
				<Status loading={q.isPending} error={q.error} />
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
						<h3>Ruang untuk sesuatu yang baharu</h3>
						<p>
							{search
								? "Tiada kursus sepadan. Cuba kata kunci lain."
								: "Kursus akan tersedia di sini apabila diterbitkan."}
						</p>
					</Empty>
				)}
			</section>
			<section className="callout">
				<span className="eyebrow">PERJALANAN ANDA, RENTAK ANDA</span>
				<h2>
					Pelaburan terbaik?
					<br />
					<em>Diri anda sendiri.</em>
				</h2>
				<p>
					Mulakan dengan rasa ingin tahu. Kami bantu anda dengan langkah
					seterusnya.
				</p>
				<Button
					role="link"
					nativeButton={false}
					className="button"
					render={<AppLink href="/register" />}
				>
					Sertai DV Learn ↗
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
				e instanceof Error ? e.message : "Pembayaran tidak dapat dimulakan.",
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
				← Semua kursus
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
						Bersama {d.course.instructor}
					</div>
					<h2 className="curriculum-title">Perjalanan pembelajaran anda</h2>
					<Accordion
						multiple
						defaultValue={d.sections.map((section) => section.id)}
					>
						{d.sections.map((s, i) => (
							<AccordionItem className="curriculum" key={s.id} value={s.id}>
								<AccordionTrigger>
									<span>0{i + 1}</span>
									{s.title}
									<small>{s.lessons.length} pelajaran</small>
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
												{l.preview ? "Pratonton · " : ""}
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
							<h3>Langkah seterusnya bermula di sini.</h3>
							<p>
								Video pembelajaran yang boleh anda ikuti mengikut masa sendiri.
							</p>
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
									Teruskan belajar ↗
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
											{busy ? "Sila tunggu…" : "Dapatkan akses ↗"}
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
								<li>✓ Belajar pada bila-bila masa</li>
								<li>✓ Kemajuan disimpan secara automatik</li>
								<li>✓ Akses melalui komputer dan telefon</li>
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
	return (
		<section className="section">
			<div className="eyebrow">RUANG PEMBELAJARAN ANDA</div>
			<h1 className="page-title">
				{q.data
					? `Selamat kembali, ${q.data.viewer.name}.`
					: "Pembelajaran saya"}
			</h1>
			<p className="lead">Setiap langkah kecil membawa anda lebih jauh.</p>
			<Status loading={q.isPending} error={q.error} />
			{q.data && (
				<>
					<div className="stats">
						<UiCard className="gap-2 p-6">
							<strong>{q.data.courses.length}</strong>Kursus saya
						</UiCard>
						<UiCard className="gap-2 p-6">
							<strong>
								{q.data.progress.filter((p) => p.completed).length}
							</strong>
							Pelajaran selesai
						</UiCard>
						<UiCard className="gap-2 p-6">
							<strong>∞</strong>Peluang untuk berkembang
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
										Sambung belajar ↗
									</Button>
								)}
							</div>
						))}
					</div>
					{!q.data.courses.length && (
						<Empty className="empty">
							<h3>Bab pertama anda menanti.</h3>
							<p>
								Anda belum mempunyai akses kursus. Terokai kursus untuk mula
								belajar.
							</p>
							<Button
								role="link"
								nativeButton={false}
								className="button"
								render={<AppLink href="/" />}
							>
								Terokai kursus ↗
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
					? "Pembayaran disahkan. Akses kursus sudah tersedia."
					: "Pembayaran masih belum selesai.",
			);
			await q.refetch();
		} catch (error) {
			setMessage(error instanceof Error ? error.message : "Semakan gagal.");
		} finally {
			setChecking(false);
		}
	}
	return (
		<section className="section">
			<div className="eyebrow">AKAUN ANDA</div>
			<h1 className="page-title">Pesanan saya</h1>
			<p className="lead">Semua pelaburan pembelajaran anda, di satu tempat.</p>
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
								<TableHead>Kursus / pakej</TableHead>
								<TableHead>Tarikh</TableHead>
								<TableHead>Jumlah</TableHead>
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
										{new Date(o.createdAt).toLocaleDateString("ms-MY")}
									</TableCell>
									<TableCell>{money(o.amountCents)}</TableCell>
									<TableCell>
										<Badge variant="secondary" className={`badge ${o.status}`}>
											{
												{
													paid: "Dibayar",
													pending: "Menunggu",
													failed: "Gagal",
													refunded: "Refund direkod",
													creating: "Diproses",
												}[o.status]
											}
										</Badge>
									</TableCell>
									<TableCell>
										{o.paymentUrl && o.status === "pending" && (
											<a href={o.paymentUrl}>Bayar ↗</a>
										)}
										{o.billId && o.status === "pending" && (
											<Button
												type="button"
												disabled={checking}
												onClick={() => void reconcile(o.id)}
											>
												Semak pembayaran
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
						Belum ada pesanan. <AppLink href="/">Terokai kursus →</AppLink>
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
		? "Mulakan bab baharu."
		: reset
			? "Tetapkan kata laluan baharu."
			: forgot
				? "Kembali ke ruang anda."
				: verify
					? "Semak peti masuk anda."
					: "Selamat kembali.";
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
			if (result.error)
				throw new Error(result.error.message ?? "Sila semak maklumat anda.");
			if (register || forgot || verify)
				setMessage(
					"E-mel telah dihantar. Semak peti masuk anda untuk langkah seterusnya.",
				);
			else window.location.assign(reset ? "/login" : "/dashboard");
		} catch (e) {
			setMessage(e instanceof Error ? e.message : "Sila cuba semula.");
		} finally {
			setBusy(false);
		}
	}
	return (
		<section className="auth-layout">
			<div className="auth-story">
				<div className="eyebrow">DV LEARN / LANGKAH SETERUSNYA</div>
				<h2>
					Rasa ingin tahu
					<br />
					anda membawa
					<br />
					<em>anda lebih jauh.</em>
				</h2>
				<span className="auth-star">✳</span>
				<p>Ruang untuk belajar, mencuba dan menjadi versi terbaik diri anda.</p>
			</div>
			<UiCard className="auth-form gap-0 p-6 sm:p-8 w-full">
				<Button
					variant="link"
					role="link"
					nativeButton={false}
					className="back-link"
					render={<AppLink className="back-link" href="/" />}
				>
					← Kembali ke kursus
				</Button>
				<h1>{title}</h1>
				<p>
					{register
						? "Cipta akaun dan temui kemahiran seterusnya."
						: verify
							? "Sahkan alamat e-mel untuk mengakses pembelajaran anda."
							: "Teruskan perjalanan pembelajaran anda."}
				</p>
				<form method="post" onSubmit={submit}>
					{register && (
						<Label className="flex-col items-stretch">
							Nama penuh
							<Input
								name="name"
								autoComplete="name"
								required
								placeholder="Nama anda"
							/>
						</Label>
					)}
					{!reset && (
						<Label className="flex-col items-stretch">
							Alamat e-mel
							<Input
								type="email"
								name="email"
								autoComplete="email"
								required
								placeholder="anda@contoh.com"
							/>
						</Label>
					)}
					{!forgot && !verify && (
						<Label className="flex-col items-stretch">
							Kata laluan
							<Input
								name="password"
								type="password"
								autoComplete={
									register || reset ? "new-password" : "current-password"
								}
								minLength={10}
								required
								placeholder="Sekurang-kurangnya 10 aksara"
							/>
						</Label>
					)}
					{!register && !forgot && !verify && !reset && (
						<Button
							variant="link"
							role="link"
							nativeButton={false}
							className="forgot"
							render={<AppLink className="forgot" href="/forgot-password" />}
						>
							Lupa kata laluan?
						</Button>
					)}
					<Button type="submit" className="button" disabled={busy || !ready}>
						{busy
							? "Sila tunggu…"
							: register
								? "Cipta akaun ↗"
								: forgot
									? "Hantar pautan tetapan semula ↗"
									: verify
										? "Hantar e-mel pengesahan ↗"
										: reset
											? "Simpan kata laluan ↗"
											: "Log masuk ↗"}
					</Button>
					{message && (
						<Alert role="status" className="form-message">
							<AlertDescription>{message}</AlertDescription>
						</Alert>
					)}
				</form>
				<p className="auth-switch">
					{register ? "Sudah mempunyai akaun?" : "Belum mempunyai akaun?"}{" "}
					<AppLink href={register ? "/login" : "/register"}>
						{register ? "Log masuk" : "Daftar sekarang"}
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
						Hantar semula e-mel pengesahan
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
		return <LessonPlayer slug={path[1] ?? ""} lessonId={path[2] ?? ""} />;
	if (path[0] === "admin") return <Admin />;
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
			<h1>Halaman tidak ditemui.</h1>
			<Button
				role="link"
				nativeButton={false}
				className="button"
				render={<AppLink href="/" />}
			>
				Kembali ke kursus
			</Button>
		</Empty>
	);
}
function LessonPlayer({ slug, lessonId }: { slug: string; lessonId: string }) {
	const q = useQuery({
		queryKey: ["lesson", slug, lessonId],
		queryFn: () => api.getLesson({ data: { courseSlug: slug, lessonId } }),
	});
	const [saved, setSaved] = useState("");
	const [position, setPosition] = useState(0);
	async function save(completed = false, currentPosition = position) {
		if (!q.data?.hasAccess) return;
		try {
			await api.saveProgress({
				data: { lessonId, positionSeconds: currentPosition, completed },
			});
			setSaved(
				completed ? "Pelajaran ditandakan selesai." : "Kemajuan disimpan.",
			);
			if (completed) await q.refetch();
		} catch (e) {
			setSaved(
				e instanceof Error ? e.message : "Tidak dapat menyimpan kemajuan.",
			);
			throw e;
		}
	}
	if (!q.data) return <Status loading={q.isPending} error={q.error} />;
	const d = q.data;
	const id = d.lesson.videoUrl ? youtubeId(d.lesson.videoUrl) : null;
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
				<div>
					<div className="video-frame">
						{id ? (
							<YoutubePlayer
								key={lessonId}
								videoId={id}
								start={d.progress?.positionSeconds ?? 0}
								onProgress={async (seconds, completed) => {
									setPosition(seconds);
									await save(completed, seconds);
								}}
								onError={setSaved}
							/>
						) : (
							<div>Video belum tersedia untuk pelajaran ini.</div>
						)}
					</div>
					<h1 className="page-title">{d.lesson.title}</h1>
					<p className="lead">{d.lesson.description}</p>
					<div className="lesson-actions">
						<p>Kemajuan disimpan automatik semasa anda belajar.</p>
						<Button
							disabled={!d.hasAccess}
							type="button"
							className="button"
							onClick={() => void save(true).catch(() => {})}
						>
							✓ {d.progress?.completed ? "Selesai" : "Tandakan selesai"}
						</Button>
					</div>
					{saved && (
						<Alert role="status">
							<AlertDescription>{saved}</AlertDescription>
						</Alert>
					)}
					<article className="lesson-content">{d.lesson.content}</article>
					{d.lesson.resourceLinks && (
						<aside>
							<h3>Bahan pembelajaran</h3>
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
				</div>
				<UiCard className="gap-0 p-6">
					<aside className="lesson-sidebar">
						<h3>Kandungan kursus</h3>
						{d.sections.map((s) => (
							<div key={s.id}>
								<h4>{s.title}</h4>
								{s.lessons.map((l) => (
									<AppLink
										className={l.id === lessonId ? "current" : ""}
										key={l.id}
										href={`/learn/${slug}/${l.id}`}
									>
										<span>▷</span>
										{l.title}
										<small>{minutes(l.durationSeconds)}</small>
									</AppLink>
								))}
							</div>
						))}
					</aside>
				</UiCard>
			</div>
		</section>
	);
}
function Admin() {
	const q = useQuery({
		queryKey: ["admin"],
		queryFn: () => api.getAdminData(),
	});
	const [tab, setTab] = useState("courses");
	const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
	const [msg, setMsg] = useState("");
	const [busy, setBusy] = useState(false);
	const d = q.data;
	const collections = d
		? {
				courses: d.courses,
				sections: d.sections,
				lessons: d.lessons,
				products: d.products,
				access: d.enrollments,
			}
		: null;
	async function dropContent(event: React.DragEvent, targetId: string) {
		event.preventDefault();
		if (!d || !["courses", "sections", "lessons"].includes(tab)) return;
		const records =
			tab === "sections"
				? d.sections.map((item) => ({ ...item, parent: item.courseId }))
				: tab === "lessons"
					? d.lessons.map((item) => ({ ...item, parent: item.sectionId }))
					: d.courses.map((item) => ({ ...item, parent: "" }));
		const target = records.find((item) => item.id === targetId);
		const draggedId = event.dataTransfer.getData("text/plain");
		const dragged = records.find((item) => item.id === draggedId);
		if (
			!target ||
			!dragged ||
			target.parent !== dragged.parent ||
			target.id === dragged.id
		)
			return;
		const group = records
			.filter((item) => item.parent === target.parent)
			.sort((a, b) => a.sortOrder - b.sortOrder);
		const ids = group.map((item) => item.id).filter((id) => id !== draggedId);
		ids.splice(ids.indexOf(targetId), 0, draggedId);
		if (tab !== "courses" && tab !== "sections" && tab !== "lessons") return;
		try {
			await api.reorderContent({ data: { kind: tab, ids } });
			await q.refetch();
			setMsg("Turutan disimpan.");
		} catch (error) {
			setMsg(error instanceof Error ? error.message : "Tidak dapat menyusun.");
		}
	}
	async function submit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setBusy(true);
		setMsg("");
		const f = new FormData(e.currentTarget);
		const str = (k: string) => String(f.get(k) ?? "");
		const num = (k: string) => Number(f.get(k) ?? 0);
		const id = editing?.id ? String(editing.id) : undefined;
		try {
			if (tab === "courses")
				await api.saveCourse({
					data: {
						id,
						title: str("title"),
						slug: str("slug"),
						description: str("description"),
						imageUrl: str("imageUrl") || null,
						instructor: str("instructor"),
						level: str("level"),
						category: str("category") || "Umum",
						archived: f.has("archived"),
						published: f.has("published"),
						sortOrder: num("sortOrder"),
					},
				});
			if (tab === "sections")
				await api.saveSection({
					data: {
						id,
						courseId: str("courseId"),
						title: str("title"),
						sortOrder: num("sortOrder"),
					},
				});
			if (tab === "lessons")
				await api.saveLesson({
					data: {
						id,
						sectionId: str("sectionId"),
						title: str("title"),
						description: str("description"),
						videoUrl: str("videoUrl") || null,
						content: str("content"),
						resourceLinks: str("resourceLinks"),
						durationSeconds: num("durationSeconds"),
						preview: f.has("preview"),
						published: f.has("published"),
						sortOrder: num("sortOrder"),
					},
				});
			if (tab === "products")
				await api.saveProduct({
					data: {
						id,
						title: str("title"),
						description: str("description"),
						priceCents: Math.round(num("price") * 100),
						active: f.has("active"),
						courseIds: f.getAll("courseIds").map(String),
					},
				});
			if (tab === "access")
				await api.grantAccess({
					data: { userId: str("userId"), courseId: str("courseId") },
				});
			setEditing(null);
			setMsg("Perubahan berjaya disimpan.");
			await q.refetch();
		} catch (e) {
			setMsg(e instanceof Error ? e.message : "Tidak dapat menyimpan.");
		} finally {
			setBusy(false);
		}
	}
	const field = (name: string, label: string, type = "text") => (
		<Label className="flex-col items-stretch" key={name}>
			{label}
			<Input
				name={name}
				type={type}
				defaultValue={String(
					editing?.[name] ?? (name === "category" ? "Umum" : ""),
				)}
				required={!["imageUrl", "videoUrl", "sortOrder"].includes(name)}
			/>
		</Label>
	);
	const check = (name: string, label: string) => (
		<Label className="checkbox">
			<Checkbox name={name} defaultChecked={Boolean(editing?.[name])} />
			{label}
		</Label>
	);
	return (
		<section className="section">
			<div className="eyebrow">PENGURUSAN PLATFORM</div>
			<h1 className="page-title">Studio DV Learn</h1>
			<Status loading={q.isPending} error={q.error} />
			{d && (
				<>
					<AdminOperations />
					<AdminUsers />
					<Tabs
						value={tab}
						onValueChange={(value) => {
							if (typeof value === "string") {
								setTab(value);
								setEditing(null);
							}
						}}
					>
						<TabsList className="admin-tabs" aria-label="Pengurusan kandungan">
							{[
								["courses", "Kursus"],
								["sections", "Seksyen"],
								["lessons", "Pelajaran"],
								["products", "Produk"],
								["access", "Akses"],
							].map(([key, label]) => (
								<TabsTrigger key={key} value={key}>
									{label}
								</TabsTrigger>
							))}
						</TabsList>
						<TabsContent value={tab}>
							{msg && (
								<Alert role="status" className="form-message">
									<AlertDescription>{msg}</AlertDescription>
								</Alert>
							)}
							<div className="admin-grid">
								<div className="admin-list">
									<Button
										type="button"
										className="button"
										onClick={() => setEditing({})}
									>
										+ {tab === "access" ? "Beri akses" : "Tambah baharu"}
									</Button>
									{collections?.[tab as keyof typeof collections].map(
										(item, i) => {
											const row = item as unknown as Record<string, unknown>;
											return (
												<Button
													type="button"
													variant="ghost"
													className="admin-row h-auto whitespace-normal justify-between"
													draggable={[
														"courses",
														"sections",
														"lessons",
													].includes(tab)}
													onDragStart={(event) =>
														event.dataTransfer.setData(
															"text/plain",
															String(row.id),
														)
													}
													onDragOver={(event) => event.preventDefault()}
													onDrop={(event) =>
														void dropContent(event, String(row.id))
													}
													key={String(row.id ?? i)}
													onClick={() => setEditing(row)}
												>
													<strong>
														{String(
															row.title ?? `${row.userId} → ${row.courseId}`,
														)}
													</strong>
													<span>{String(row.slug ?? row.id ?? "")} ↗</span>
												</Button>
											);
										},
									)}
								</div>
								{editing && (
									<UiCard className="gap-0 p-6">
										<form className="admin-form" onSubmit={submit}>
											<h2>
												{editing.id
													? "Edit kandungan"
													: tab === "access"
														? "Beri akses kursus"
														: "Kandungan baharu"}
											</h2>
											{["courses", "sections", "lessons", "products"].includes(
												tab,
											) && field("title", "Tajuk")}
											{["courses", "lessons", "products"].includes(tab) && (
												<Label className="flex-col items-stretch">
													Penerangan
													<Textarea
														name="description"
														defaultValue={String(editing.description ?? "")}
													/>
												</Label>
											)}
											{tab === "courses" && (
												<>
													{field("slug", "Slug")}
													{field("instructor", "Pengajar")}
													{field("level", "Tahap")}
													{field("category", "Kategori")}
													{check("archived", "Arkibkan kursus")}
													{field("imageUrl", "URL gambar")}
													{check("published", "Diterbitkan")}
												</>
											)}
											{["sections", "access"].includes(tab) && (
												<Label className="flex-col items-stretch">
													Kursus
													<NativeSelect
														name="courseId"
														defaultValue={String(editing.courseId ?? "")}
														required
													>
														<NativeSelectOption value="">
															Pilih kursus
														</NativeSelectOption>
														{d.courses.map((c) => (
															<NativeSelectOption value={c.id} key={c.id}>
																{c.title}
															</NativeSelectOption>
														))}
													</NativeSelect>
												</Label>
											)}
											{tab === "access" && (
												<Label className="flex-col items-stretch">
													Pelajar
													<NativeSelect
														name="userId"
														required
														defaultValue={String(editing.userId ?? "")}
													>
														<NativeSelectOption value="">
															Pilih pelajar
														</NativeSelectOption>
														{d.users.map((u) => (
															<NativeSelectOption key={u.id} value={u.id}>
																{u.name} ({u.email})
															</NativeSelectOption>
														))}
													</NativeSelect>
												</Label>
											)}
											{tab === "lessons" && (
												<>
													<Label className="flex-col items-stretch">
														Seksyen
														<NativeSelect
															name="sectionId"
															required
															defaultValue={String(editing.sectionId ?? "")}
														>
															<NativeSelectOption value="">
																Pilih seksyen
															</NativeSelectOption>
															{d.sections.map((s) => (
																<NativeSelectOption key={s.id} value={s.id}>
																	{
																		d.courses.find((c) => c.id === s.courseId)
																			?.title
																	}{" "}
																	/ {s.title}
																</NativeSelectOption>
															))}
														</NativeSelect>
													</Label>
													{field("videoUrl", "URL YouTube")}
													{field("durationSeconds", "Durasi (saat)", "number")}
													<Label className="flex-col items-stretch">
														Pautan bahan (HTTPS, satu setiap baris)
														<Textarea
															name="resourceLinks"
															defaultValue={String(editing.resourceLinks ?? "")}
														/>
													</Label>
													<Label className="flex-col items-stretch">
														Nota pelajaran
														<Textarea
															name="content"
															defaultValue={String(editing.content ?? "")}
														/>
													</Label>
													{check("preview", "Pratonton percuma")}
													{check("published", "Diterbitkan")}
												</>
											)}
											{tab === "products" && (
												<>
													<Label className="flex-col items-stretch">
														Harga (RM)
														<Input
															type="number"
															min="0"
															step="0.01"
															name="price"
															required
															defaultValue={
																Number(editing.priceCents ?? 0) / 100
															}
														/>
													</Label>
													<p>Kursus dalam pakej</p>
													{d.courses.map((c) => (
														<Label className="checkbox" key={c.id}>
															<Checkbox
																name="courseIds"
																value={c.id}
																defaultChecked={(
																	editing.courseIds as string[] | undefined
																)?.includes(c.id)}
															/>
															{c.title}
														</Label>
													))}
													{check("active", "Produk aktif")}
												</>
											)}
											{["courses", "sections", "lessons"].includes(tab) &&
												field("sortOrder", "Turutan", "number")}
											<Button type="submit" className="button" disabled={busy}>
												{busy ? "Menyimpan…" : "Simpan perubahan ↗"}
											</Button>
										</form>
									</UiCard>
								)}
							</div>
						</TabsContent>
					</Tabs>
				</>
			)}
		</section>
	);
}
