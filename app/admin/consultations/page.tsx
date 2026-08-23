import { notFound } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminConsultationQueue } from "@/components/admin/AdminConsultationQueue";
import { Heading,Section,Text } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/permissions";
export const dynamic="force-dynamic";export const revalidate=0;
export default async function AdminConsultationsPage(){const admin=await requireAdmin();if(!admin)notFound();return <main><Section spacing="lg"><AdminNav current="/admin/consultations"/><Heading as="h1" size="h2">会员问卦</Heading><Text variant="body-sm" color="secondary" className="mt-2 block">直接查看会员的问题、起卦信息和原始卦象，由易老师人工解答；系统不自动解卦。</Text><div className="mt-5"><AdminConsultationQueue/></div></Section></main>}
