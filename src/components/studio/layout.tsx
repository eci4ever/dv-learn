import { Link, Outlet, useHydrated, useLocation } from "@tanstack/react-router";

export function StudioLayout() {
	const hydrated = useHydrated();
	const pathname = useLocation({ select: (l) => l.pathname });
	const links = [
		["/admin/courses", "Kursus"],
		["/admin/products", "Produk"],
		["/admin/users", "Pengguna"],
		["/admin/access", "Akses"],
		["/admin/operations", "Jualan/Operasi"],
	] as const;
	return (
		<div className="studio grid gap-6 min-w-0">
			<header className="grid gap-4">
				<div>
					<p className="text-sm text-muted-foreground">DV Learn</p>
					<h1>Studio Admin</h1>
				</div>
				<nav
					aria-label="Studio Admin"
					className="flex flex-wrap gap-2 border-b pb-4"
				>
					{links.map(([to, label]) => (
						<Link
							key={to}
							to={to}
							search={{
								page: 1,
								q: "",
								category: "",
								status: "all",
								source: "all",
								tab: to === "/admin/operations" ? "orders" : "info",
							}}
							aria-current={pathname.startsWith(to) ? "page" : undefined}
							className={`rounded-md px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring ${pathname.startsWith(to) ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
						>
							{label}
						</Link>
					))}
				</nav>
			</header>
			<fieldset
				disabled={!hydrated}
				className="contents"
				aria-label="Ruang kerja Studio"
				aria-busy={!hydrated}
			>
				<Outlet />
			</fieldset>
		</div>
	);
}
