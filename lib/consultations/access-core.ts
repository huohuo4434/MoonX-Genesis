export function consultationMemberAccess(input:{authenticated:boolean;userId:string|null;isActiveMember:boolean;isAdmin:boolean}){
  if(!input.authenticated||!input.userId)return {ok:false as const,status:401,error:"LOGIN_REQUIRED"};
  if(!input.isActiveMember&&!input.isAdmin)return {ok:false as const,status:403,error:"MEMBERSHIP_REQUIRED"};
  return {ok:true as const,userId:input.userId};
}
export function consultationDeviceAccess(input:{status:"LOGIN_REQUIRED"|"MEMBERSHIP_REQUIRED"|"DEVICE_REQUIRED"|"ALLOWED";access:{userId:string|null}}){
  if(input.status==="LOGIN_REQUIRED"||!input.access.userId)return {ok:false as const,status:401,error:"LOGIN_REQUIRED"};
  if(input.status==="MEMBERSHIP_REQUIRED")return {ok:false as const,status:403,error:"MEMBERSHIP_REQUIRED"};
  if(input.status==="DEVICE_REQUIRED")return {ok:false as const,status:403,error:"DEVICE_REQUIRED"};
  return {ok:true as const,userId:input.access.userId};
}
export function consultationAdminActionAccess(input:{isAdmin:boolean;isPrimary:boolean},action:string){
  if(!input.isAdmin)return {ok:false as const,status:403,error:"FORBIDDEN"};
  if(action==="APPROVE"&&!input.isPrimary)return {ok:false as const,status:403,error:"PRIMARY_REVIEWER_REQUIRED"};
  return {ok:true as const};
}
