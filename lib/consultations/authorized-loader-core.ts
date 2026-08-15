export async function authorizeThenLoad<TUser,TModules>(input:{authorize:()=>Promise<TUser|null>;load:()=>Promise<TModules>}){
  const user=await input.authorize();
  if(!user)return {ok:false as const,user:null,modules:null};
  return {ok:true as const,user,modules:await input.load()};
}
