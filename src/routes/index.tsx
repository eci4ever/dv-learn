import { createFileRoute } from "@tanstack/react-router";
import { Catalog } from "../components/platform";
export const Route = createFileRoute("/")({ component: Catalog });
