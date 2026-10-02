import { createFileRoute } from "@tanstack/react-router";
import { AdminUsers } from "../components/admin-users";
export const Route = createFileRoute("/admin/users")({ component: AdminUsers });
