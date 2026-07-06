import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/hireflow")({
  loader: () => {
    throw redirect({ href: "https://hireflow.yesp.space/", statusCode: 302 });
  },
  component: () => null,
});
