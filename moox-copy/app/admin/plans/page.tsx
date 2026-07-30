import { redirect } from "next/navigation";

export default function AdminPlansRedirect() {
  redirect("/admin/users");
}
