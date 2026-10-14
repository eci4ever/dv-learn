import { useQuery } from "@tanstack/react-query";
import { useLocation } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { authClient } from "../lib/auth-client";
import * as m from "../paraglide/messages.js";
import { getLocale, setLocale } from "../paraglide/runtime.js";
import { getViewer } from "../server/functions";
import { AppLink } from "./app-link";
import { Alert, AlertDescription } from "./ui/alert";
import { Button } from "./ui/button";
import {
	NavigationMenu,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
} from "./ui/navigation-menu";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./ui/select";
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
	const pathname = useLocation({ select: (location) => location.pathname });
	const previousPath = useRef(pathname);
	useEffect(() => {
		if (previousPath.current === pathname) return;
		previousPath.current = pathname;
		const main = document.getElementById("main-content");
		if (!main) return;
		const focusHeading = () => {
			const heading = main.querySelector("h1");
			if (!heading) return false;
			heading.tabIndex = -1;
			heading.focus({ preventScroll: true });
			return true;
		};
		if (focusHeading()) return;
		main.focus({ preventScroll: true });
		// Query-backed views can commit their heading after the route resolves.
		const observer = new MutationObserver(() => {
			if (
				document.activeElement !== main &&
				document.activeElement !== document.body
			) {
				observer.disconnect();
				return;
			}
			if (focusHeading()) observer.disconnect();
		});
		observer.observe(main, { childList: true, subtree: true });
		return () => observer.disconnect();
	}, [pathname]);
	// biome-ignore lint/correctness/useExhaustiveDependencies: Route changes must dismiss the persistent mobile sheet.
	useEffect(() => {
		setOpen(false);
	}, [pathname]);
	const [dark, setDark] = useState(false);
	const [hydrated, setHydrated] = useState(false);
	const [error, setError] = useState("");
	const [signingOut, setSigningOut] = useState(false);
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
		if (signingOut) return;
		setSigningOut(true);
		setError("");
		try {
			const result = await authClient.signOut();
			if (result.error) throw new Error(result.error.message);
			window.location.assign("/");
		} catch {
			setError(m.sign_out_error());
		} finally {
			setSigningOut(false);
		}
	}
	return (
		<>
			<a className="skip-link" href="#main-content">
				{m.skip_content()}
			</a>
			<header className="site-header">
				<AppLink className="brand" href="/">
					<svg
						className="brand-mark"
						viewBox="0 0 48 48"
						fill="none"
						aria-hidden="true"
					>
						<rect width="48" height="48" rx="12" fill="var(--foreground)" />
						<path
							d="M14 33V22C14 17.6 16.9 15 20.5 15C24.1 15 27 17.6 27 22V33"
							stroke="var(--background)"
							strokeWidth="5"
							strokeLinecap="round"
						/>
						<circle cx="34.5" cy="32.5" r="2.8" fill="var(--background)" />
					</svg>{" "}
					DV Learn<span className="brand-dot">.</span>
				</AppLink>
				<NavigationMenu
					className="desktop-navigation hidden min-[1101px]:flex"
					aria-label={m.main_navigation()}
				>
					<NavigationMenuList>
						<NavigationMenuItem>
							<NavigationMenuLink render={<AppLink href="/" />}>
								{m.browse_courses()}
							</NavigationMenuLink>
						</NavigationMenuItem>
						<NavigationMenuItem>
							<NavigationMenuLink render={<AppLink href="/dashboard" />}>
								{m.my_learning()}
							</NavigationMenuLink>
						</NavigationMenuItem>
						<NavigationMenuItem>
							<NavigationMenuLink render={<AppLink href="/orders" />}>
								{m.orders()}
							</NavigationMenuLink>
						</NavigationMenuItem>
						{viewer.data?.emailVerified && viewer.data.role === "admin" && (
							<NavigationMenuItem>
								<NavigationMenuLink render={<AppLink href="/admin" />}>
									{m.studio()}
								</NavigationMenuLink>
							</NavigationMenuItem>
						)}
					</NavigationMenuList>
				</NavigationMenu>
				<div className="header-actions">
					<Select
						items={[
							{ value: "en", label: "EN" },
							{ value: "ms", label: "BM" },
						]}
						value={getLocale()}
						disabled={!hydrated}
						onValueChange={(locale) => {
							if (locale === "en" || locale === "ms") setLocale(locale);
						}}
					>
						<SelectTrigger
							aria-label={m.language()}
							className="min-h-11 shrink-0"
						>
							<SelectValue />
						</SelectTrigger>
						<SelectContent alignItemWithTrigger={false} align="end">
							<SelectItem value="en" lang="en">
								EN
							</SelectItem>
							<SelectItem value="ms" lang="ms">
								BM
							</SelectItem>
						</SelectContent>
					</Select>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="theme-toggle"
						disabled={!hydrated}
						aria-label={dark ? m.light_theme() : m.dark_theme()}
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
								className="login-link max-[1100px]:hidden"
								render={
									<AppLink
										href="/settings"
										className="login-link max-[1100px]:hidden"
									/>
								}
							>
								{viewer.data.name}
							</Button>
							<Button
								type="button"
								variant="secondary"
								size="sm"
								className="button small secondary max-[1100px]:hidden"
								disabled={signingOut}
								onClick={() => void signOut()}
							>
								{m.sign_out()}
							</Button>
						</>
					) : (
						<>
							<Button
								variant="link"
								role="link"
								nativeButton={false}
								className="login-link max-[1100px]:hidden"
								render={
									<AppLink
										href="/login"
										className="login-link max-[1100px]:hidden"
									/>
								}
							>
								{m.sign_in()}
							</Button>
							<Button
								role="link"
								nativeButton={false}
								size="sm"
								className="button small max-[1100px]:hidden"
								render={<AppLink href="/register" />}
							>
								{m.start_learning()}
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
									className="menu-toggle hidden max-[1100px]:inline-flex"
									disabled={!hydrated}
									aria-label={m.open_menu()}
								/>
							}
						>
							☰
						</SheetTrigger>
						<SheetContent>
							<SheetHeader>
								<SheetTitle>DV Learn</SheetTitle>
								<SheetDescription>{m.learning_navigation()}</SheetDescription>
							</SheetHeader>
							<nav
								className="flex flex-col gap-2 p-4"
								aria-label={m.mobile_navigation()}
							>
								<Button
									role="link"
									variant="link"
									nativeButton={false}
									render={
										<AppLink
											onClick={() => setOpen(false)}
											href={viewer.data ? "/settings" : "/login"}
										/>
									}
								>
									{viewer.data ? m.account_settings() : m.sign_in()}
								</Button>
								{!viewer.data && (
									<Button
										role="link"
										nativeButton={false}
										render={
											<AppLink
												onClick={() => setOpen(false)}
												href="/register"
											/>
										}
									>
										{m.start_learning()}
									</Button>
								)}
								<Button
									role="link"
									variant="ghost"
									nativeButton={false}
									className="justify-start"
									render={<AppLink onClick={() => setOpen(false)} href="/" />}
								>
									{m.browse_courses()}
								</Button>
								<Button
									role="link"
									variant="ghost"
									nativeButton={false}
									className="justify-start"
									render={
										<AppLink onClick={() => setOpen(false)} href="/dashboard" />
									}
								>
									{m.my_learning()}
								</Button>
								<Button
									role="link"
									variant="ghost"
									nativeButton={false}
									className="justify-start"
									render={
										<AppLink onClick={() => setOpen(false)} href="/orders" />
									}
								>
									{m.orders()}
								</Button>
								{viewer.data?.emailVerified && viewer.data.role === "admin" && (
									<Button
										role="link"
										variant="ghost"
										nativeButton={false}
										render={
											<AppLink onClick={() => setOpen(false)} href="/admin" />
										}
									>
										{m.studio()}
									</Button>
								)}
							</nav>
							{viewer.data && (
								<div className="grid gap-3 px-4 pb-4">
									{error && (
										<Alert variant="destructive">
											<AlertDescription>{error}</AlertDescription>
										</Alert>
									)}
									<Button
										type="button"
										variant="secondary"
										disabled={signingOut}
										onClick={() => void signOut()}
									>
										{m.sign_out()}
									</Button>
								</div>
							)}
						</SheetContent>
					</Sheet>
				</div>
			</header>
			{error && !open && (
				<Alert variant="destructive">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}
			<main id="main-content" tabIndex={-1}>
				{children}
			</main>
			<footer>
				<AppLink className="brand" href="/">
					DV Learn<span className="brand-dot">.</span>
				</AppLink>
				<p>{m.footer_tagline()}</p>
				<span>© {new Date().getFullYear()} DV Learn</span>
				<AppLink href="/admin">{m.admin()}</AppLink>
			</footer>
		</>
	);
}
