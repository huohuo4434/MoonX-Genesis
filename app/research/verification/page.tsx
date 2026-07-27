import { redirect } from "next/navigation";

/** Canonical verification route — redirects to the verification section on /research. */
export default function ResearchVerificationRedirect() {
  redirect("/research#verification");
}
