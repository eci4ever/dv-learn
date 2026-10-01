import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getViewer } from "../server/functions";
export function Shell({ children }: { children: React.ReactNode }) {
	const [open, setOpen] = useState(false);
	const [dark, setDark] = useState(false);
	const [error, setError] = useState("");
	const viewer = useQuery({
		queryKey: ["viewer"],
		queryFn: () => getViewer(),
		retry: false,
	});
	useEffect(() => {
		const preference = localStorage.getItem("dv-theme");
		setDark(preference === "dark");
		document.documentElement.dataset.theme =
			preference === "dark" ? "dark" : "light";
	}, []);
	function toggleTheme() {
		const next = !dark;
		setDark(next);
		localStorage.setItem("dv-theme", next ? "dark" : "light");
		document.documentElement.dataset.theme = next ? "dark" : "light";
	}
	async function signOut() {
		try {
			const result = await fetch("/api/auth/sign-out", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: "{}",
			});
			if (!result.ok) throw new Error();
			window.location.assign("/");
		} catch {
			setError("Log keluar gagal. Cuba sekali lagi.");
		}
	}
	return (
		<>
			<header className="site-header">
				<a className="brand" href="/">
					<span className="brand-mark">
						dv<span>↗</span>
					</span>{" "}
					DV Learn<span className="brand-dot">.</span>
				</a>
				<nav className={open ? "open" : ""}>
					<a href="/">Terokai kursus</a>
					<a href="/dashboard">Pembelajaran saya</a>
					<a href="/orders">Pesanan</a>
					{viewer.data?.role === "admin" && <a href="/admin">Studio</a>}
				</nav>
				<div className="header-actions">
					<button
						type="button"
						className="theme-toggle"
						aria-label={dark ? "Tema cerah" : "Tema gelap"}
						onClick={toggleTheme}
					>
						{dark ? "☀" : "◐"}
					</button>
					{viewer.data ? (
						<>
							<a href="/settings" className="login-link">
								{viewer.data.name}
							</a>
							<button
								type="button"
								className="button small secondary"
								onClick={() => void signOut()}
							>
								Log keluar
							</button>
						</>
					) : (
						<>
							<a href="/login" className="login-link">
								Log masuk
							</a>
							<a href="/register" className="button small">
								Mula belajar ↗
							</a>
						</>
					)}
					<button
						type="button"
						className="menu-toggle"
						onClick={() => setOpen(!open)}
						aria-label="Buka menu"
						aria-expanded={open}
					>
						☰
					</button>
				</div>
			</header>
			{error && <p role="alert">{error}</p>}
			<main>{children}</main>
			<footer>
				<a className="brand" href="/">
					DV Learn<span className="brand-dot">.</span>
				</a>
				<p>Ilmu baharu. Peluang baharu. Versi terbaik anda.</p>
				<span>© {new Date().getFullYear()} DV Learn</span>
				<a href="/admin">Pentadbir</a>
			</footer>
		</>
	);
}
