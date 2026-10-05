import { useQuery } from "@tanstack/react-query";
import { useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { authClient } from "../lib/auth-client";
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
	// biome-ignore lint/correctness/useExhaustiveDependencies: Route changes must dismiss the persistent mobile sheet.
	useEffect(() => {
		setOpen(false);
	}, [pathname]);
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
			setError("Unable to sign out. Please try again.");
		}
	}
	return (
		<>
			<a className="skip-link" href="#main-content">
				Skip to content
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
					className="desktop-navigation hidden min-[761px]:flex"
					aria-label="Main navigation"
				>
					<NavigationMenuList>
						<NavigationMenuItem>
							<NavigationMenuLink render={<AppLink href="/" />}>
								Browse courses
							</NavigationMenuLink>
						</NavigationMenuItem>
						<NavigationMenuItem>
							<NavigationMenuLink render={<AppLink href="/dashboard" />}>
								My learning
							</NavigationMenuLink>
						</NavigationMenuItem>
						<NavigationMenuItem>
							<NavigationMenuLink render={<AppLink href="/orders" />}>
								Orders
							</NavigationMenuLink>
						</NavigationMenuItem>
						{viewer.data?.emailVerified && viewer.data.role === "admin" && (
							<NavigationMenuItem>
								<NavigationMenuLink render={<AppLink href="/admin" />}>
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
						aria-label={dark ? "Light theme" : "Dark theme"}
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
									<AppLink
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
								Sign out
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
									<AppLink
										href="/login"
										className="login-link max-[760px]:hidden"
									/>
								}
							>
								Sign in
							</Button>
							<Button
								role="link"
								nativeButton={false}
								size="sm"
								className="button small max-[760px]:hidden"
								render={<AppLink href="/register" />}
							>
								Start learning ↗
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
									aria-label="Open menu"
								/>
							}
						>
							☰
						</SheetTrigger>
						<SheetContent>
							<SheetHeader>
								<SheetTitle>DV Learn</SheetTitle>
								<SheetDescription>Learning navigation</SheetDescription>
							</SheetHeader>
							<nav
								className="flex flex-col gap-2 p-4"
								aria-label="Mobile navigation"
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
									{viewer.data ? "Account settings" : "Sign in"}
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
										Start learning ↗
									</Button>
								)}
								<Button
									role="link"
									variant="ghost"
									nativeButton={false}
									className="justify-start"
									render={<AppLink onClick={() => setOpen(false)} href="/" />}
								>
									Browse courses
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
									My learning
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
									Orders
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
			<main id="main-content" tabIndex={-1}>
				{children}
			</main>
			<footer>
				<AppLink className="brand" href="/">
					DV Learn<span className="brand-dot">.</span>
				</AppLink>
				<p>Learn new skills. Build new possibilities.</p>
				<span>© {new Date().getFullYear()} DV Learn</span>
				<AppLink href="/admin">Admin</AppLink>
			</footer>
		</>
	);
}
