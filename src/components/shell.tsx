import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { authClient } from "../lib/auth-client";
import { getViewer } from "../server/functions";
import { Alert, AlertDescription } from "./ui/alert";
import { Button } from "./ui/button";
import {
	NavigationMenu,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
} from "./ui/navigation-menu";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "./ui/sheet";
export function Shell({ children }: { children: React.ReactNode }) {
	const [open, setOpen] = useState(false);
	const [dark, setDark] = useState(false);
	const [hydrated, setHydrated] = useState(false);
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
		setHydrated(true);
	}, []);
	function toggleTheme() {
		const next = !dark;
		setDark(next);
		localStorage.setItem("dv-theme", next ? "dark" : "light");
		document.documentElement.dataset.theme = next ? "dark" : "light";
	}
	async function signOut() {
		try {
			const result = await authClient.signOut();
			if (result.error) throw new Error(result.error.message);
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
				<NavigationMenu
					className="desktop-navigation hidden min-[761px]:flex"
					aria-label="Navigasi utama"
				>
					<NavigationMenuList>
						<NavigationMenuItem>
							<NavigationMenuLink render={<a href="/" />}>
								Terokai kursus
							</NavigationMenuLink>
						</NavigationMenuItem>
						<NavigationMenuItem>
							<NavigationMenuLink render={<a href="/dashboard" />}>
								Pembelajaran saya
							</NavigationMenuLink>
						</NavigationMenuItem>
						<NavigationMenuItem>
							<NavigationMenuLink render={<a href="/orders" />}>
								Pesanan
							</NavigationMenuLink>
						</NavigationMenuItem>
						{viewer.data?.role === "admin" && (
							<NavigationMenuItem>
								<NavigationMenuLink render={<a href="/admin" />}>
									Studio
								</NavigationMenuLink>
							</NavigationMenuItem>
						)}
					</NavigationMenuList>
				</NavigationMenu>
				<div className="header-actions">
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="theme-toggle"
						disabled={!hydrated}
						aria-label={dark ? "Tema cerah" : "Tema gelap"}
						onClick={toggleTheme}
					>
						{dark ? "☀" : "◐"}
					</Button>
					{viewer.data ? (
						<>
							<Button
								variant="link"
								role="link"
								nativeButton={false}
								className="login-link max-[760px]:hidden"
								render={
									<a
										href="/settings"
										className="login-link max-[760px]:hidden"
									/>
								}
							>
								{viewer.data.name}
							</Button>
							<Button
								type="button"
								variant="secondary"
								size="sm"
								className="button small secondary max-[760px]:hidden"
								onClick={() => void signOut()}
							>
								Log keluar
							</Button>
						</>
					) : (
						<>
							<Button
								variant="link"
								role="link"
								nativeButton={false}
								className="login-link max-[760px]:hidden"
								render={
									<a href="/login" className="login-link max-[760px]:hidden" />
								}
							>
								Log masuk
							</Button>
							<Button
								role="link"
								nativeButton={false}
								size="sm"
								className="button small max-[760px]:hidden"
								render={<a href="/register" />}
							>
								Mula belajar ↗
							</Button>
						</>
					)}
					<Sheet open={open} onOpenChange={setOpen}>
						<SheetTrigger
							render={
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="menu-toggle hidden max-[760px]:inline-flex"
									disabled={!hydrated}
									aria-label="Buka menu"
								/>
							}
						>
							☰
						</SheetTrigger>
						<SheetContent>
							<SheetHeader>
								<SheetTitle>DV Learn</SheetTitle>
								<SheetDescription>Navigasi pembelajaran anda</SheetDescription>
							</SheetHeader>
							<nav
								className="flex flex-col gap-2 p-4"
								aria-label="Navigasi mudah alih"
							>
								<Button
									role="link"
									variant="link"
									nativeButton={false}
									render={<a href={viewer.data ? "/settings" : "/login"} />}
								>
									{viewer.data ? "Tetapan akaun" : "Log masuk"}
								</Button>
								{!viewer.data && (
									<Button
										role="link"
										nativeButton={false}
										render={<a href="/register" />}
									>
										Mula belajar ↗
									</Button>
								)}
								<Button
									role="link"
									variant="ghost"
									nativeButton={false}
									className="justify-start"
									render={<a href="/" />}
								>
									Terokai kursus
								</Button>
								<Button
									role="link"
									variant="ghost"
									nativeButton={false}
									className="justify-start"
									render={<a href="/dashboard" />}
								>
									Pembelajaran saya
								</Button>
								<Button
									role="link"
									variant="ghost"
									nativeButton={false}
									className="justify-start"
									render={<a href="/orders" />}
								>
									Pesanan
								</Button>
								{viewer.data?.role === "admin" && (
									<Button
										role="link"
										variant="ghost"
										nativeButton={false}
										render={<a href="/admin" />}
									>
										Studio
									</Button>
								)}
							</nav>
						</SheetContent>
					</Sheet>
				</div>
			</header>
			{error && (
				<Alert variant="destructive">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}
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
