import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/c/$slug/")({
  loader: ({ params }) => {
    throw redirect({ to: "/c/$slug/careers", params: { slug: params.slug }, replace: true });
  },
});
