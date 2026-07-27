import { Section, Text } from "@/components/ui";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = { title: "登录 | MoonX" };

export default function LoginPage() {
  return (
    <main>
      <Section spacing="lg">
        <Text variant="label" color="secondary" className="mb-4 block">
          MOONX ACCOUNT
        </Text>
        <LoginForm />
      </Section>
    </main>
  );
}
