import { createFileRoute } from "@tanstack/react-router";
import { ProductPage } from "../components/studio/products";
export const Route = createFileRoute("/admin/products/$productId")({
	component: ProductPage,
});
