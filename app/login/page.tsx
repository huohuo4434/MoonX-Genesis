import { Section } from "@/components/ui";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = { title: "邮箱登录 | MoonX" };

export default function LoginPage() {
  return (
    <main>
      <Section spacing="lg">
        <LoginForm />
      </Section>
    </main>
  );
}
