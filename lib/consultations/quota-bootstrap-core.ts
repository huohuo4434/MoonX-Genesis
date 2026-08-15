export type PaidOrderQuotaCandidate={id:string;status:string;metadata:Record<string,unknown>;membership_expires_at:string|null};
export function isPaidOrderQuotaEligible(order:PaidOrderQuotaCandidate){return Boolean(order.membership_expires_at&&(order.status==="paid"||order.status==="overpaid"||(order.status==="manual_review"&&order.metadata.manualGoodwillState==="COMPLETED"&&order.metadata.membershipGranted===true)));}
export function orderedPaidOrderQuotaCandidates<T extends PaidOrderQuotaCandidate>(orders:T[]){return [...orders].filter(isPaidOrderQuotaEligible).sort((a,b)=>(a.membership_expires_at??"").localeCompare(b.membership_expires_at??"")||a.id.localeCompare(b.id));}
export function hasPendingPaidOrderPredecessor<T extends PaidOrderQuotaCandidate>(orders:T[],candidate:T,grantedOrderIds:ReadonlySet<string>){const ordered=orderedPaidOrderQuotaCandidates(orders);const index=ordered.findIndex(order=>order.id===candidate.id);return index>0&&ordered.slice(0,index).some(order=>!grantedOrderIds.has(order.id));}
export async function bootstrapPaidOrderQuotaCore<T extends PaidOrderQuotaCandidate>(orders:T[],deliver:(orderId:string)=>Promise<unknown>){
  const ordered=orderedPaidOrderQuotaCandidates(orders);
  let delivered=0;for(const order of ordered){await deliver(order.id);delivered+=1;}return delivered;
}
