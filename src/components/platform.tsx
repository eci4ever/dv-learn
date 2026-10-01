import { useQuery } from "@tanstack/react-query";
import { useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { youtubeId } from "../lib/youtube";
import type { Course, Product } from "../server/contracts";
import * as api from "../server/functions";
import { AdminOperations, Settings } from "./account-panels";
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
		<div className="empty">
			<span className="spinner" />
			Memuatkan ruang pembelajaran anda…
		</div>
	) : error ? (
		<div className="empty error">
			<h3>Belum dapat memuatkan kandungan</h3>
			<p>{error instanceof Error ? error.message : "Sila cuba semula."}</p>
			<a className="button" href="/login">
				Log masuk
			</a>
		</div>
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
			<span className="art-badge">{course.level}</span>
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
		<a className="course-card" href={`/courses/${course.slug}`}>
			<Art course={course} index={index} />
			<div className="card-content">
				<div className="card-kicker">
					<span>{course.level}</span>
					<span>Video atas permintaan</span>
				</div>
				<h3>{course.title}</h3>
				<p>{course.description}</p>
				<div className="instructor">
					<span className="avatar">{course.instructor.slice(0, 1)}</span>
					{course.instructor}
				</div>
				{progress !== undefined ? (
					<>
						<div className="progress-track">
							<span style={{ width: `${progress}%` }} />
						</div>
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
			</div>
		</a>
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
					<a href="#catalog" className="button">
						Terokai kursus <span>↗</span>
					</a>
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
						<div className="visual-divider" />
						<span>BELAJAR. CIPTA. BERKEMBANG.</span>
					</div>
					<div className="floating-card">
						<span>✦</span>
						<div>
							Satu kemahiran baharu.
							<br />
							<strong>Seribu kemungkinan.</strong>
						</div>
					</div>
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
					<label className="search">
						<span>⌕</span>
						<input
							aria-label="Cari kursus"
							placeholder="Cari kursus atau kemahiran…"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
						/>
						<span>↵</span>
					</label>
				</div>
				<div className="catalog-toolbar">
					<div className="filters">
						{levels.map((l) => (
							<button
								type="button"
								key={l}
								className={filter === l ? "selected" : ""}
								onClick={() => setFilter(l)}
							>
								{l}
							</button>
						))}
					</div>
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
					<div className="empty">
						<h3>Ruang untuk sesuatu yang baharu</h3>
						<p>
							{search
								? "Tiada kursus sepadan. Cuba kata kunci lain."
								: "Kursus akan tersedia di sini apabila diterbitkan."}
						</p>
					</div>
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
				<a className="button" href="/register">
					Sertai DV Learn ↗
				</a>
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
			<a className="back-link" href="/">
				← Semua kursus
			</a>
			<div className="detail-grid">
				<div>
					<div className="eyebrow">{d.course.level} / DV LEARN</div>
					<h1 className="page-title">{d.course.title}</h1>
					<p className="lead">{d.course.description}</p>
					<div className="instructor">
						<span className="avatar">{d.course.instructor[0]}</span>Bersama{" "}
						{d.course.instructor}
					</div>
					<h2 className="curriculum-title">Perjalanan pembelajaran anda</h2>
					{d.sections.map((s, i) => (
						<details className="curriculum" key={s.id} open>
							<summary>
								<span>0{i + 1}</span>
								{s.title}
								<small>{s.lessons.length} pelajaran</small>
							</summary>
							{s.lessons.map((l) => (
								<a
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
								</a>
							))}
						</details>
					))}
				</div>
				<aside className="purchase" id="purchase">
					<Art course={d.course} />
					<div className="purchase-body">
						<h3>Langkah seterusnya bermula di sini.</h3>
						<p>
							Video pembelajaran yang boleh anda ikuti mengikut masa sendiri.
						</p>
						{d.hasAccess ? (
							<a
								className="button"
								href={`/learn/${slug}/${d.sections.flatMap((s) => s.lessons)[0]?.id ?? ""}`}
							>
								Teruskan belajar ↗
							</a>
						) : (
							d.products.map((p) => (
								<div className="product-option" key={p.id}>
									<h3>{p.title}</h3>
									<strong className="price">{money(p.priceCents)}</strong>
									<p>{p.description}</p>
									<button
										type="button"
										className="button"
										disabled={busy}
										onClick={() => buy(p.id)}
									>
										{busy ? "Sila tunggu…" : "Dapatkan akses ↗"}
									</button>
								</div>
							))
						)}
						{error && <p className="error">{error}</p>}
						<ul>
							<li>✓ Belajar pada bila-bila masa</li>
							<li>✓ Kemajuan disimpan secara automatik</li>
							<li>✓ Akses melalui komputer dan telefon</li>
						</ul>
					</div>
				</aside>
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
						<div>
							<strong>{q.data.courses.length}</strong>Kursus saya
						</div>
						<div>
							<strong>
								{q.data.progress.filter((p) => p.completed).length}
							</strong>
							Pelajaran selesai
						</div>
						<div>
							<strong>∞</strong>Peluang untuk berkembang
						</div>
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
									<a
										className="button continue"
										href={`/learn/${c.slug}/${c.nextLessonId}`}
									>
										Sambung belajar ↗
									</a>
								)}
							</div>
						))}
					</div>
					{!q.data.courses.length && (
						<div className="empty">
							<h3>Bab pertama anda menanti.</h3>
							<p>
								Anda belum mempunyai akses kursus. Terokai kursus untuk mula
								belajar.
							</p>
							<a className="button" href="/">
								Terokai kursus ↗
							</a>
						</div>
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
			{message && <p role="status">{message}</p>}
			<Status loading={q.isPending} error={q.error} />
			{q.data?.length ? (
				<div className="table-wrap">
					<table>
						<thead>
							<tr>
								<th>Kursus / pakej</th>
								<th>Tarikh</th>
								<th>Jumlah</th>
								<th>Status</th>
								<th />
							</tr>
						</thead>
						<tbody>
							{q.data.map((o) => (
								<tr key={o.id}>
									<td>
										{o.productTitle}
										<small>{o.id}</small>
									</td>
									<td>{new Date(o.createdAt).toLocaleDateString("ms-MY")}</td>
									<td>{money(o.amountCents)}</td>
									<td>
										<span className={`badge ${o.status}`}>
											{
												{
													paid: "Dibayar",
													pending: "Menunggu",
													failed: "Gagal",
													refunded: "Refund direkod",
													creating: "Diproses",
												}[o.status]
											}
										</span>
									</td>
									<td>
										{o.paymentUrl && o.status === "pending" && (
											<a href={o.paymentUrl}>Bayar ↗</a>
										)}
										{o.billId && o.status === "pending" && (
											<button
												type="button"
												disabled={checking}
												onClick={() => void reconcile(o.id)}
											>
												Semak pembayaran
											</button>
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			) : (
				q.data && (
					<div className="empty">
						Belum ada pesanan. <a href="/">Terokai kursus →</a>
					</div>
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
		const endpoint = register
			? "sign-up/email"
			: reset
				? "reset-password"
				: forgot
					? "request-password-reset"
					: verify
						? "send-verification-email"
						: "sign-in/email";
		const body = register
			? {
					name: f.get("name"),
					email: f.get("email"),
					password: f.get("password"),
					callbackURL,
				}
			: reset
				? {
						newPassword: f.get("password"),
						token: new URLSearchParams(window.location.search).get("token"),
					}
				: forgot
					? {
							email: f.get("email"),
							redirectTo: `${window.location.origin}/reset-password`,
						}
					: verify
						? { email: f.get("email"), callbackURL }
						: {
								email: f.get("email"),
								password: f.get("password"),
								callbackURL,
							};
		try {
			const res = await fetch(`/api/auth/${endpoint}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
			const data = await res.json();
			if (!res.ok)
				throw new Error(
					typeof data === "object" && data !== null && "message" in data
						? String(data.message)
						: "Sila semak maklumat anda.",
				);
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
			<div className="auth-form">
				<a className="back-link" href="/">
					← Kembali ke kursus
				</a>
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
						<label>
							Nama penuh
							<input
								name="name"
								autoComplete="name"
								required
								placeholder="Nama anda"
							/>
						</label>
					)}
					{!reset && (
						<label>
							Alamat e-mel
							<input
								type="email"
								name="email"
								autoComplete="email"
								required
								placeholder="anda@contoh.com"
							/>
						</label>
					)}
					{!forgot && !verify && (
						<label>
							Kata laluan
							<input
								name="password"
								type="password"
								autoComplete={
									register || reset ? "new-password" : "current-password"
								}
								minLength={10}
								required
								placeholder="Sekurang-kurangnya 10 aksara"
							/>
						</label>
					)}
					{!register && !forgot && !verify && !reset && (
						<a className="forgot" href="/forgot-password">
							Lupa kata laluan?
						</a>
					)}
					<button type="submit" className="button" disabled={busy || !ready}>
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
					</button>
					{message && (
						<div className="form-message" role="status">
							{message}
						</div>
					)}
				</form>
				<p className="auth-switch">
					{register ? "Sudah mempunyai akaun?" : "Belum mempunyai akaun?"}{" "}
					<a href={register ? "/login" : "/register"}>
						{register ? "Log masuk" : "Daftar sekarang"}
					</a>
				</p>
				{!verify && (
					<a className="subtle" href="/verify-email">
						Hantar semula e-mel pengesahan
					</a>
				)}
			</div>
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
		return <Auth mode={path[0]} />;
	return (
		<section className="empty">
			<h1>Halaman tidak ditemui.</h1>
			<a className="button" href="/">
				Kembali ke kursus
			</a>
		</section>
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
			<a className="back-link" href={`/courses/${slug}`}>
				← {d.course.title}
			</a>
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
						<button
							disabled={!d.hasAccess}
							type="button"
							className="button"
							onClick={() => void save(true).catch(() => {})}
						>
							✓ {d.progress?.completed ? "Selesai" : "Tandakan selesai"}
						</button>
					</div>
					{saved && <p role="status">{saved}</p>}
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
				<aside className="lesson-sidebar">
					<h3>Kandungan kursus</h3>
					{d.sections.map((s) => (
						<div key={s.id}>
							<h4>{s.title}</h4>
							{s.lessons.map((l) => (
								<a
									className={l.id === lessonId ? "current" : ""}
									key={l.id}
									href={`/learn/${slug}/${l.id}`}
								>
									<span>▷</span>
									{l.title}
									<small>{minutes(l.durationSeconds)}</small>
								</a>
							))}
						</div>
					))}
				</aside>
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
		<label key={name}>
			{label}
			<input
				name={name}
				type={type}
				defaultValue={String(
					editing?.[name] ?? (name === "category" ? "Umum" : ""),
				)}
				required={!["imageUrl", "videoUrl", "sortOrder"].includes(name)}
			/>
		</label>
	);
	const check = (name: string, label: string) => (
		<label className="checkbox">
			<input
				type="checkbox"
				name={name}
				defaultChecked={Boolean(editing?.[name])}
			/>
			{label}
		</label>
	);
	return (
		<section className="section">
			<div className="eyebrow">PENGURUSAN PLATFORM</div>
			<h1 className="page-title">Studio DV Learn</h1>
			<Status loading={q.isPending} error={q.error} />
			{d && (
				<>
					<AdminOperations />
					<div className="filters admin-tabs">
						{[
							["courses", "Kursus"],
							["sections", "Seksyen"],
							["lessons", "Pelajaran"],
							["products", "Produk"],
							["access", "Akses"],
						].map(([key, label]) => (
							<button
								type="button"
								key={key}
								className={tab === key ? "selected" : ""}
								onClick={() => {
									setTab(key);
									setEditing(null);
								}}
							>
								{label}
							</button>
						))}
					</div>
					{msg && (
						<div className="form-message" role="status">
							{msg}
						</div>
					)}
					<div className="admin-grid">
						<div className="admin-list">
							<button
								type="button"
								className="button"
								onClick={() => setEditing({})}
							>
								+ {tab === "access" ? "Beri akses" : "Tambah baharu"}
							</button>
							{collections?.[tab as keyof typeof collections].map((item, i) => {
								const row = item as unknown as Record<string, unknown>;
								return (
									<button
										type="button"
										className="admin-row"
										draggable={["courses", "sections", "lessons"].includes(tab)}
										onDragStart={(event) =>
											event.dataTransfer.setData("text/plain", String(row.id))
										}
										onDragOver={(event) => event.preventDefault()}
										onDrop={(event) => void dropContent(event, String(row.id))}
										key={String(row.id ?? i)}
										onClick={() => setEditing(row)}
									>
										<strong>
											{String(row.title ?? `${row.userId} → ${row.courseId}`)}
										</strong>
										<span>{String(row.slug ?? row.id ?? "")} ↗</span>
									</button>
								);
							})}
						</div>
						{editing && (
							<form className="admin-form" onSubmit={submit}>
								<h2>
									{editing.id
										? "Edit kandungan"
										: tab === "access"
											? "Beri akses kursus"
											: "Kandungan baharu"}
								</h2>
								{["courses", "sections", "lessons", "products"].includes(tab) &&
									field("title", "Tajuk")}
								{["courses", "lessons", "products"].includes(tab) && (
									<label>
										Penerangan
										<textarea
											name="description"
											defaultValue={String(editing.description ?? "")}
										/>
									</label>
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
									<label>
										Kursus
										<select
											name="courseId"
											defaultValue={String(editing.courseId ?? "")}
											required
										>
											<option value="">Pilih kursus</option>
											{d.courses.map((c) => (
												<option value={c.id} key={c.id}>
													{c.title}
												</option>
											))}
										</select>
									</label>
								)}
								{tab === "access" && (
									<label>
										Pelajar
										<select
											name="userId"
											required
											defaultValue={String(editing.userId ?? "")}
										>
											<option value="">Pilih pelajar</option>
											{d.users.map((u) => (
												<option key={u.id} value={u.id}>
													{u.name} ({u.email})
												</option>
											))}
										</select>
									</label>
								)}
								{tab === "lessons" && (
									<>
										<label>
											Seksyen
											<select
												name="sectionId"
												required
												defaultValue={String(editing.sectionId ?? "")}
											>
												<option value="">Pilih seksyen</option>
												{d.sections.map((s) => (
													<option key={s.id} value={s.id}>
														{d.courses.find((c) => c.id === s.courseId)?.title}{" "}
														/ {s.title}
													</option>
												))}
											</select>
										</label>
										{field("videoUrl", "URL YouTube")}
										{field("durationSeconds", "Durasi (saat)", "number")}
										<label>
											Pautan bahan (HTTPS, satu setiap baris)
											<textarea
												name="resourceLinks"
												defaultValue={String(editing.resourceLinks ?? "")}
											/>
										</label>
										<label>
											Nota pelajaran
											<textarea
												name="content"
												defaultValue={String(editing.content ?? "")}
											/>
										</label>
										{check("preview", "Pratonton percuma")}
										{check("published", "Diterbitkan")}
									</>
								)}
								{tab === "products" && (
									<>
										<label>
											Harga (RM)
											<input
												type="number"
												min="0"
												step="0.01"
												name="price"
												required
												defaultValue={Number(editing.priceCents ?? 0) / 100}
											/>
										</label>
										<p>Kursus dalam pakej</p>
										{d.courses.map((c) => (
											<label className="checkbox" key={c.id}>
												<input
													type="checkbox"
													name="courseIds"
													value={c.id}
													defaultChecked={(
														editing.courseIds as string[] | undefined
													)?.includes(c.id)}
												/>
												{c.title}
											</label>
										))}
										{check("active", "Produk aktif")}
									</>
								)}
								{["courses", "sections", "lessons"].includes(tab) &&
									field("sortOrder", "Turutan", "number")}
								<button type="submit" className="button" disabled={busy}>
									{busy ? "Menyimpan…" : "Simpan perubahan ↗"}
								</button>
							</form>
						)}
					</div>
				</>
			)}
		</section>
	);
}
