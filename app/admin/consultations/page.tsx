import { notFound } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminConsultationQueue } from "@/components/admin/AdminConsultationQueue";
import { Heading,Section,Text } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/permissions";
export const dynamic="force-dynamic";export const revalidate=0;
export default async function AdminConsultationsPage(){const admin=await requireAdmin();if(!admin)notFound();return <main><Section spacing="lg"><AdminNav current="/admin/consultations"/><Heading as="h1" size="h2">会员咨询复核队列</Heading><Text variant="body-sm" color="secondary" className="mt-2 block">其他管理员可分诊和修订；只有受信任的易老师账号可最终批准并消耗权益。</Text><div className="mt-5"><AdminConsultationQueue/></div></Section></main>}
